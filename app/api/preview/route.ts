import { createLogger } from "@/lib/common/logs/console/logger";
import { isBlockedHostname } from "@/lib/common/net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { PreviewError, preview } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800";
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export async function GET(request: Request): Promise<Response> {
    const targetUrl = extractTargetUrl(request.url);
    if (!targetUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    try {
        const page = await preview(targetUrl, {
            fetch: safeFetch,
            headers: {
                Accept: "text/html,application/xhtml+xml",
                "User-Agent": USER_AGENT,
            },
            retry: 2,
            timeout: FETCH_TIMEOUT_MS,
        });

        if (!page.image) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageUrl = toSafeUrl(page.image);
        if (!imageUrl) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageResponse = await fetchWithRedirects(imageUrl, {
            headers: {
                Accept: "image/*",
                Referer: toSafeUrl(page.url) ?? targetUrl,
                "User-Agent": USER_AGENT,
            },
        });

        if (!imageResponse.ok) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageContentType =
            imageResponse.headers.get("content-type") ?? "";
        if (!imageContentType.startsWith("image/")) {
            return new Response("Unsupported preview", { status: 415 });
        }

        return new Response(imageResponse.body, {
            headers: {
                "cache-control": CACHE_CONTROL_HEADER,
                "content-type": imageContentType,
            },
            status: 200,
        });
    } catch (error) {
        if (error instanceof PreviewError) {
            log.warn("Preview failed", {
                code: error.code,
                message: error.message,
                targetUrl,
            });

            if (error.code === "INVALID_URL") {
                return new Response("Invalid URL", { status: 400 });
            }
        } else {
            log.warn("Failed to resolve preview", {
                error: error instanceof Error ? error.message : String(error),
                targetUrl,
            });
        }

        return new Response("Preview not found", { status: 404 });
    }
}

const safeFetch: typeof fetch = (input, init) => {
    let rawUrl: string;
    if (typeof input === "string") {
        rawUrl = input;
    } else if (input instanceof URL) {
        rawUrl = input.href;
    } else {
        rawUrl = input.url;
    }

    const safeUrl = toSafeUrl(rawUrl);
    if (!safeUrl) {
        return Promise.resolve(new Response("Invalid URL", { status: 400 }));
    }

    return fetchWithRedirects(safeUrl, init);
};

async function fetchWithRedirects(
    initialUrl: string,
    init: RequestInit | undefined
): Promise<Response> {
    let requestUrl = initialUrl;

    for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount++
    ) {
        const response = await fetchWithTimeout(
            requestUrl,
            { ...init, redirect: "manual" },
            FETCH_TIMEOUT_MS
        );

        if (!isRedirectStatus(response.status)) {
            return response;
        }

        const location = response.headers.get("location");
        if (!location) {
            return response;
        }

        const redirectUrl = resolveRedirectUrl(location, requestUrl);
        if (!redirectUrl) {
            return new Response("Invalid URL", { status: 400 });
        }

        requestUrl = redirectUrl;
    }

    return new Response("Too many redirects", { status: 508 });
}

function resolveRedirectUrl(location: string, baseUrl: string): string | null {
    try {
        return toSafeUrl(new URL(location, baseUrl).href);
    } catch {
        return null;
    }
}

function extractTargetUrl(requestUrl: string): string | null {
    const rawUrl = new URL(requestUrl).searchParams.get("url")?.trim();
    if (!rawUrl) {
        return null;
    }

    const normalizedUrl = toValidUrl(rawUrl);
    if (normalizedUrl === "about:blank") {
        return null;
    }

    return toSafeUrl(normalizedUrl);
}

function toSafeUrl(rawUrl: string): string | null {
    try {
        const parsedUrl = new URL(rawUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return null;
        }

        if (isBlockedHostname(parsedUrl.hostname)) {
            return null;
        }

        return parsedUrl.href;
    } catch {
        return null;
    }
}

function isRedirectStatus(status: number): boolean {
    return status >= 300 && status < 400;
}
