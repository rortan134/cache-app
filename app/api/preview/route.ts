import { serverEnv } from "@/env/server";
import { isAbortError } from "@/lib/common/abort";
import { FALLBACK_URL } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { isBlockedHostname } from "@/lib/common/net";
import { getRedisClient } from "@/lib/common/redis";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { isCobaltHost, toValidUrl } from "@/lib/common/url";
import { resolveCobaltPreview } from "@/lib/integrations/cobalt/service";
import { cacheLife, cacheTag } from "next/cache";
import { createHash } from "node:crypto";
import { PreviewError, createCache, preview, withCache } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER =
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const VERCEL_CDN_CACHE_CONTROL_HEADER =
    "public, max-age=604800, stale-while-revalidate=604800";
const VERCEL_CACHE_TAG_HEADER = "Vercel-Cache-Tag";
const VERCEL_CDN_CACHE_CONTROL_HEADER_NAME = "Vercel-CDN-Cache-Control";
const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 2;
const COBALT_RETRY_ATTEMPTS = 2;
const COBALT_RETRY_DELAY_MS = 500;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const redis = getRedisClient();

const cache = redis
    ? createCache({
          delete: (key) => {
              redis.del(key);
          },
          get: (key) => redis.get(key),
          set: (key, value) => {
              redis.setex(key, 3600, value);
          },
      })
    : undefined;

export async function GET(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const targetUrl = extractTargetUrl(request.url);
    if (!targetUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    const type = requestUrl.searchParams.get("type") ?? "image";

    if (type === "video") {
        return handleVideoPreview(targetUrl, request.signal);
    }

    try {
        const previewResult = await resolvePreviewImage(targetUrl);
        if (!previewResult?.imageUrl) {
            return new Response("Preview not found", { status: 404 });
        }

        const { imageUrl, pageUrl } = previewResult;

        const imageResponse = await fetchWithRedirects(
            imageUrl,
            {
                headers: {
                    Accept: "image/*",
                    Referer: pageUrl ?? targetUrl,
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
                ...createPreviewCacheHeaders(targetUrl, "image"),
            },
            status: 200,
        });
    } catch (error) {
        if (isAbortError(error)) {
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

async function resolvePreviewImage(targetUrl: string) {
    "use cache";
    cacheLife("days");
    cacheTag(`preview:${hashTargetUrl(targetUrl)}`);

    const getPagePreview = cache ? withCache(cache, preview) : preview;
    const page = await getPagePreview(targetUrl, {
        fetch: safeFetch,
        headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": USER_AGENT,
        },
    });

    if (!page.image) {
        return null;
    }

    return {
        imageUrl: toSafeUrl(page.image),
        pageUrl: toSafeUrl(page.url),
    };
}

async function handleVideoPreview(
    targetUrl: string,
    signal?: AbortSignal
): Promise<Response> {
    try {
        if (signal?.aborted) {
            return new Response(null, { status: 499 });
        }

        const videoResult = await resolvePreviewVideo(targetUrl);
        if (!videoResult?.videoUrl) {
            log.debug("Video preview resolved to null", {
                errorCode: videoResult?.errorCode,
                targetUrl,
            });

            const errorCode = videoResult?.errorCode ?? "";
            if (errorCode.includes("rate")) {
                return new Response(
                    "Video preview temporarily unavailable due to rate limiting",
                    { status: 429 }
                );
            }
            if (
                errorCode.includes("fetch") ||
                errorCode.includes("unreachable")
            ) {
                return new Response("Video preview temporarily unavailable", {
                    status: 503,
                });
            }
            if (errorCode.includes("not_found")) {
                return new Response("Video preview not found", { status: 404 });
            }

            return new Response("Video preview not available", { status: 404 });
        }

        return proxyVideoResponse(videoResult.videoUrl, targetUrl, signal);
    } catch (error) {
        if (isAbortError(error)) {
            return new Response(null, { status: 499 });
        }

        log.warn("Failed to resolve video preview", {
            error: error instanceof Error ? error.message : String(error),
            targetUrl,
        });

        return new Response("Video preview not found", { status: 404 });
    }
}

async function proxyVideoResponse(
    videoUrl: string,
    targetUrl: string,
    signal?: AbortSignal
): Promise<Response> {
    try {
        const tunnelResponse = await fetchWithRedirects(
            videoUrl,
            {
                headers: {
                    Accept: "video/*",
                    "User-Agent": USER_AGENT,
                },
            },
            signal
        );

        if (!tunnelResponse.ok) {
            return new Response("Video not available", {
                status: tunnelResponse.status,
            });
        }

        const headers = new Headers();
        const contentType =
            tunnelResponse.headers.get("content-type") ?? "video/mp4";
        const contentLength = tunnelResponse.headers.get("content-length");
        headers.set("content-type", contentType);
        if (contentLength) {
            headers.set("content-length", contentLength);
        }
        headers.set("accept-ranges", "bytes");
        headers.set("cache-control", CACHE_CONTROL_HEADER);
        setPreviewCacheHeaders(headers, targetUrl, "video");

        return new Response(tunnelResponse.body, {
            headers,
            status: tunnelResponse.status,
        });
    } catch (error) {
        if (isAbortError(error)) {
            return new Response(null, { status: 499 });
        }

        log.warn("Failed to proxy video response", {
            error: error instanceof Error ? error.message : String(error),
            videoUrl,
        });

        return new Response("Video preview not found", { status: 404 });
    }
}

async function resolvePreviewVideo(
    targetUrl: string
): Promise<{ errorCode?: string; videoUrl: string | null }> {
    "use cache";
    cacheLife("minutes");
    cacheTag(`preview:video:${hashTargetUrl(targetUrl)}`);

    const isSupported = isCobaltHost(targetUrl);
    if (!isSupported) {
        log.debug("Host not supported for video preview", { targetUrl });
        return { videoUrl: null };
    }

    let lastErrorCode: string | null = null;
    for (let attempt = 1; attempt <= COBALT_RETRY_ATTEMPTS; attempt++) {
        const result = await resolveCobaltPreview(targetUrl);
        if (result.status === "SUCCESS" && result.videoPreviewUrl) {
            return { videoUrl: result.videoPreviewUrl };
        }

        lastErrorCode = result.status === "ERROR" ? result.errorCode : null;
        const shouldRetry =
            lastErrorCode != null &&
            (lastErrorCode.includes("fetch") ||
                lastErrorCode.includes("unreachable"));

        if (!shouldRetry || attempt === COBALT_RETRY_ATTEMPTS) {
            break;
        }

        log.debug("Retrying Cobalt preview after fetch failure", {
            attempt,
            errorCode: lastErrorCode,
            targetUrl,
        });
        await delay(COBALT_RETRY_DELAY_MS);
    }

    log.debug("Cobalt preview did not return video", {
        errorCode: lastErrorCode,
        status: "ERROR",
        targetUrl,
    });
    return { errorCode: lastErrorCode ?? undefined, videoUrl: null };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const safeFetch: typeof fetch = Object.assign(
    (
        input: URL | RequestInfo,
        init?: RequestInit | undefined
    ): Promise<Response> => {
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
            return Promise.resolve(
                new Response("Invalid URL", { status: 400 })
            );
        }

        return fetchWithRedirects(safeUrl, init);
    },
    {
        preconnect: () => {
            // No-op
        },
    }
);

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
        if (
            isBlockedHostname(parsedUrl.hostname) &&
            serverEnv.NODE_ENV === "production"
        ) {
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

function hashTargetUrl(targetUrl: string): string {
    return createHash("sha256").update(targetUrl).digest("hex").slice(0, 16);
}

function createPreviewCacheHeaders(
    targetUrl: string,
    type: "image" | "video"
): Record<string, string> {
    const tag = createPreviewCacheTag(targetUrl, type);
    return {
        [VERCEL_CDN_CACHE_CONTROL_HEADER_NAME]: VERCEL_CDN_CACHE_CONTROL_HEADER,
        [VERCEL_CACHE_TAG_HEADER]: tag,
    };
}

function setPreviewCacheHeaders(
    headers: Headers,
    targetUrl: string,
    type: "image" | "video"
): void {
    headers.set(
        VERCEL_CDN_CACHE_CONTROL_HEADER_NAME,
        VERCEL_CDN_CACHE_CONTROL_HEADER
    );
    headers.set(
        VERCEL_CACHE_TAG_HEADER,
        createPreviewCacheTag(targetUrl, type)
    );
}

function createPreviewCacheTag(
    targetUrl: string,
    type: "image" | "video"
): string {
    const hashedTargetUrl = hashTargetUrl(targetUrl);
    if (type === "image") {
        return `preview:${hashedTargetUrl},preview:image:${hashedTargetUrl}`;
    }
    return `preview:video:${hashedTargetUrl}`;
}
