import { FALLBACK_URL } from "@/lib/common/constants";
import { buildIdentifierKey } from "@/lib/common/identifier";
import { createLogger } from "@/lib/common/logs/console/logger";
import { isBlockedHostname } from "@/lib/common/net";
import { redis } from "@/lib/common/redis";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { PreviewError, preview, type PreviewResult } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800";
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const PREVIEW_CACHE_TTL_SECONDS = 300;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function getPreviewCacheKey(url: string) {
    return buildIdentifierKey(`preview:metadata:${url}`, "cache");
}

async function getCachedPreview(url: string): Promise<PreviewResult | null> {
    try {
        const cached = await redis.get(getPreviewCacheKey(url));
        if (typeof cached === "string") {
            return JSON.parse(cached) as PreviewResult;
        }
    } catch {
        // Fail open: if Redis is unreachable, fetch directly.
    }
    return null;
}

async function setCachedPreview(
    url: string,
    result: PreviewResult
): Promise<void> {
    try {
        await redis.set(getPreviewCacheKey(url), JSON.stringify(result), {
            ex: PREVIEW_CACHE_TTL_SECONDS,
        });
    } catch {
        // Non-critical: missing the cache only costs an extra fetch later.
    }
}

export async function GET(request: Request): Promise<Response> {
    const targetUrl = extractTargetUrl(request.url);
    if (!targetUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    try {
        let page = await getCachedPreview(targetUrl);
        if (!page) {
            page = await preview(targetUrl, {
                fetch: safeFetch,
                headers: {
                    Accept: "text/html,application/xhtml+xml",
                    "User-Agent": USER_AGENT,
                },
                retry: 2,
                timeout: FETCH_TIMEOUT_MS,
            });

            if (page.image) {
                await setCachedPreview(targetUrl, page);
            }
        }

        if (!page.image) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageUrl = toSafeUrl(page.image);
        if (!imageUrl) {
            return new Response("Preview not found", { status: 404 });
        }

        const imageResponse = await fetchWithRedirects(
            imageUrl,
            {
                headers: {
                    Accept: "image/*",
                    Referer: toSafeUrl(page.url) ?? targetUrl,
                    "User-Agent": USER_AGENT,
                },
            },
            request.signal
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
        if (error instanceof Error && error.name === "AbortError") {
            return new Response(null, { status: 499 });
        }

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
    init: RequestInit | undefined,
    signal?: AbortSignal
): Promise<Response> {
    let requestUrl = initialUrl;
    // Build once instead of re-spreading inside the hot redirect loop.
    const redirectInit = init
        ? { ...init, redirect: "manual" as const }
        : { redirect: "manual" as const };

    for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount++
    ) {
        const response = await fetchWithTimeout(
            requestUrl,
            redirectInit,
            FETCH_TIMEOUT_MS,
            signal
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
    if (normalizedUrl === FALLBACK_URL) {
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
