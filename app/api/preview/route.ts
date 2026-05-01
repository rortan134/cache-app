import { createLogger } from "@/lib/common/logs/console/logger";
import { isBlockedHostname } from "@/lib/common/net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { preview } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800";
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export async function GET(request: Request): Promise<Response> {
    const targetUrl = readTargetUrl(request.url);

    if (!targetUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    try {
        const page = await preview(targetUrl, {
            fetch: fetchPreviewPage,
            headers: {
                Accept: "text/html,application/xhtml+xml",
                "User-Agent": USER_AGENT,
            },
            includeOembed: true,
            timeout: FETCH_TIMEOUT_MS,
        });

        if (!page.image) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageUrl = readTargetHref(page.image);

        if (!imageUrl) {
            return new Response("Preview not found", { status: 404 });
        }

        const pageUrl = readTargetHref(page.url) ?? targetUrl;
        const imageResponse = await fetchExternalWithTimeout(
            imageUrl,
            {
                headers: {
                    Accept: "image/*",
                    Referer: pageUrl,
                    "User-Agent": USER_AGENT,
                },
            },
            FETCH_TIMEOUT_MS
        );

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
        log.warn("Failed to resolve Open Graph image", {
            error: error instanceof Error ? error.message : String(error),
            targetUrl,
        });

        return new Response("Preview not found", { status: 404 });
    }
}

const fetchPreviewPage: typeof fetch = async (input, init) => {
    const requestUrl = readFetchUrl(input);

    if (!requestUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    const response = await fetchExternalWithTimeout(
        requestUrl,
        { ...init },
        FETCH_TIMEOUT_MS
    );

    const responseUrl = readTargetHref(response.url || requestUrl);
    if (!responseUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    if (!response.ok) {
        return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
        return new Response("Unsupported content", { status: 415 });
    }

    return response;
};

async function fetchExternalWithTimeout(
    initialUrl: string,
    init: RequestInit,
    timeoutMs: number
): Promise<Response> {
    let requestUrl = initialUrl;

    for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount += 1
    ) {
        const response = await fetchWithTimeout(
            requestUrl,
            {
                ...init,
                redirect: "manual",
            },
            timeoutMs
        );

        if (!isRedirectResponse(response.status)) {
            return response;
        }

        const location = response.headers.get("location");
        if (!location) {
            return response;
        }

        const redirectUrl = readRedirectHref(location, requestUrl);
        if (!redirectUrl) {
            return new Response("Invalid redirect", { status: 400 });
        }

        requestUrl = redirectUrl;
    }

    return new Response("Too many redirects", { status: 508 });
}

function readFetchUrl(input: RequestInfo | URL): string | null {
    if (typeof input === "string") {
        return readTargetHref(input);
    }

    if (input instanceof URL) {
        return readTargetHref(input.href);
    }

    return readTargetHref(input.url);
}

function readRedirectHref(location: string, baseUrl: string): string | null {
    try {
        return readTargetHref(new URL(location, baseUrl).href);
    } catch {
        return null;
    }
}

function readTargetHref(rawUrl: string): string | null {
    try {
        const parsedUrl = new URL(rawUrl);
        if (!isSupportedProtocol(parsedUrl.protocol)) {
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

function readTargetUrl(requestUrl: string): string | null {
    const rawUrl = new URL(requestUrl).searchParams.get("url")?.trim();
    if (!rawUrl) {
        return null;
    }

    const normalizedUrl = toValidUrl(rawUrl);
    if (normalizedUrl === "about:blank") {
        return null;
    }

    return readTargetHref(normalizedUrl);
}

function isSupportedProtocol(protocol: string): boolean {
    return protocol === "http:" || protocol === "https:";
}

function isRedirectResponse(status: number): boolean {
    return status >= 300 && status < 400;
}
