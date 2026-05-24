import { isAbortError } from "@/lib/common/abort";
import { FALLBACK_URL } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseHttpUrl } from "@/lib/common/net";
import { getRedisClient } from "@/lib/common/redis";
import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { resolveCobaltPreview } from "@/lib/integrations/cobalt/service";
import { isCobaltHost } from "@/lib/integrations/cobalt/utils";
import { cacheLife, cacheTag } from "next/cache";
import { createHash } from "node:crypto";
import { Duplex } from "node:stream";
import { createZstdCompress } from "node:zlib";
import { PreviewError, createCache, preview, withCache } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER =
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const VERCEL_CDN_CACHE_CONTROL_HEADER =
    "public, max-age=604800, stale-while-revalidate=604800";
const VERCEL_CACHE_TAG_HEADER = "Vercel-Cache-Tag";
const VERCEL_CDN_CACHE_CONTROL_HEADER_NAME = "Vercel-CDN-Cache-Control";
const NO_STORE_HEADER = "private, no-store";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 2;
const MAX_TARGET_URL_LENGTH = 4096;
const MAX_IMAGE_CONTENT_LENGTH_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_CONTENT_LENGTH_BYTES = 200 * 1024 * 1024;
const PREVIEW_METADATA_CACHE_TTL_SECONDS = 86_400;
const PREVIEW_METADATA_CACHE_TTL_MS = PREVIEW_METADATA_CACHE_TTL_SECONDS * 1000;
const COBALT_RETRY_ATTEMPTS = 2;
const COBALT_RETRY_DELAY_MS = 500;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HTTP_RANGE_HEADER_PATTERN =
    /^bytes=(?:\d+-\d*|\d*-\d+)(?:,(?:\d+-\d*|\d*-\d+))*$/;

const redis = getRedisClient();

const cache = redis
    ? createCache({
          delete: async (key) => {
              await redis.del(key);
          },
          get: (key) => redis.get(key),
          set: async (key, value) => {
              await redis.setex(key, PREVIEW_METADATA_CACHE_TTL_SECONDS, value);
          },
      })
    : undefined;
const getPagePreview = cache ? withCache(cache, preview) : preview;

function acceptsZstd(request: Request): boolean {
    const acceptEncoding = request.headers.get("accept-encoding");
    return acceptEncoding?.toLowerCase().includes("zstd") ?? false;
}

function createZstdTransform() {
    return Duplex.toWeb(createZstdCompress()) as unknown as {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;
    };
}

export async function GET(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const targetUrl = await extractTargetUrl(request.url);
    if (!targetUrl) {
        return textResponse("Invalid URL", 400);
    }

    const type = parsePreviewType(requestUrl.searchParams.get("type"));
    if (!type) {
        return textResponse("Unsupported preview type", 400);
    }

    const useZstd = acceptsZstd(request);

    if (type === "video") {
        return handleVideoPreview(targetUrl, request);
    }

    try {
        const previewResult = await resolvePreviewImage(targetUrl);
        if (!previewResult?.imageUrl) {
            return textResponse("Preview not found", 404);
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
            return textResponse("Preview not found", 404);
        }

        const imageContentType =
            imageResponse.headers.get("content-type") ?? "";
        if (!imageContentType.startsWith("image/")) {
            return textResponse("Unsupported preview", 415);
        }

        if (
            isContentLengthOverLimit(
                imageResponse.headers,
                MAX_IMAGE_CONTENT_LENGTH_BYTES
            )
        ) {
            return textResponse("Preview too large", 413);
        }

        const body =
            useZstd && imageResponse.body
                ? imageResponse.body.pipeThrough(createZstdTransform())
                : imageResponse.body;

        return new Response(body, {
            headers: {
                "cache-control": CACHE_CONTROL_HEADER,
                "content-type": imageContentType,
                ...createPreviewCacheHeaders(targetUrl, "image"),
                ...(useZstd ? { "content-encoding": "zstd" } : {}),
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
                return textResponse("Invalid URL", 400);
            }
        } else {
            log.warn("Failed to resolve preview", {
                error: error instanceof Error ? error.message : String(error),
                targetUrl,
            });
        }

        return textResponse("Preview not found", 404);
    }
}

async function resolvePreviewImage(targetUrl: string) {
    "use cache";
    cacheLife("days");
    cacheTag(`preview:${hashTargetUrl(targetUrl)}`);

    const page = await getPagePreview(targetUrl, {
        cacheTtl: PREVIEW_METADATA_CACHE_TTL_MS,
        fetch: safeFetch,
        headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": USER_AGENT,
        },
    });

    const imageUrl = parseHttpUrl(page.image ?? page.favicon ?? "")?.href;
    if (!imageUrl) {
        return null;
    }

    return {
        imageUrl,
        pageUrl: parseHttpUrl(page.url ?? "")?.href,
    };
}

async function handleVideoPreview(
    targetUrl: string,
    request: Request
): Promise<Response> {
    try {
        const { signal } = request;
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
                return textResponse(
                    "Video preview temporarily unavailable due to rate limiting",
                    429
                );
            }
            if (
                errorCode.includes("fetch") ||
                errorCode.includes("unreachable")
            ) {
                return textResponse(
                    "Video preview temporarily unavailable",
                    503
                );
            }
            if (errorCode.includes("not_found")) {
                return textResponse("Video preview not found", 404);
            }

            return textResponse("Video preview not available", 404);
        }

        return proxyVideoResponse(videoResult.videoUrl, targetUrl, request);
    } catch (error) {
        if (isAbortError(error)) {
            return new Response(null, { status: 499 });
        }

        log.warn("Failed to resolve video preview", {
            error: error instanceof Error ? error.message : String(error),
            targetUrl,
        });

        return textResponse("Video preview not found", 404);
    }
}

async function proxyVideoResponse(
    videoUrl: string,
    targetUrl: string,
    request: Request
): Promise<Response> {
    try {
        const rangeHeader = parseRangeHeader(request.headers.get("range"));
        const useZstd = acceptsZstd(request);
        const tunnelResponse = await fetchWithRedirects(
            videoUrl,
            {
                headers: {
                    Accept: "video/*",
                    ...(rangeHeader ? { Range: rangeHeader } : {}),
                    "User-Agent": USER_AGENT,
                },
            },
            request.signal
        );

        if (!tunnelResponse.ok) {
            return textResponse(
                "Video not available",
                toSafeUpstreamStatus(tunnelResponse.status)
            );
        }

        const headers = new Headers();
        const contentType =
            tunnelResponse.headers.get("content-type") ?? "video/mp4";
        if (!isSupportedVideoContentType(contentType)) {
            return textResponse("Unsupported video preview", 415);
        }

        if (
            isContentLengthOverLimit(
                tunnelResponse.headers,
                MAX_VIDEO_CONTENT_LENGTH_BYTES
            )
        ) {
            return textResponse("Video preview too large", 413);
        }

        const contentLength = tunnelResponse.headers.get("content-length");
        const contentRange = tunnelResponse.headers.get("content-range");
        headers.set("content-type", contentType);
        if (contentLength) {
            headers.set("content-length", contentLength);
        }
        if (contentRange) {
            headers.set("content-range", contentRange);
        }
        headers.set("accept-ranges", "bytes");
        headers.set("cache-control", CACHE_CONTROL_HEADER);
        setPreviewCacheHeaders(headers, targetUrl, "video");

        const responseBody =
            useZstd && !rangeHeader && tunnelResponse.body
                ? tunnelResponse.body.pipeThrough(createZstdTransform())
                : tunnelResponse.body;

        if (useZstd && !rangeHeader) {
            headers.delete("content-length");
            headers.delete("content-range");
            headers.delete("accept-ranges");
            headers.set("content-encoding", "zstd");
        }

        return new Response(responseBody, {
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

        return textResponse("Video preview not found", 404);
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

        return fetchWithRedirects(rawUrl, init);
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
        const publicUrl = await parsePublicHttpUrl(requestUrl);
        if (!publicUrl) {
            return textResponse("Invalid URL", 400);
        }

        const response = await fetchWithTimeout(
            publicUrl.href,
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

        const redirectUrl = resolveRedirectUrl(location, publicUrl);
        if (!redirectUrl) {
            return textResponse("Invalid URL", 400);
        }

        requestUrl = redirectUrl;
    }

    return textResponse("Too many redirects", 508);
}

function resolveRedirectUrl(location: string, baseUrl: URL): string | null {
    try {
        return parseHttpUrl(new URL(location, baseUrl).href)?.href ?? null;
    } catch {
        return null;
    }
}

async function extractTargetUrl(requestUrl: string): Promise<string | null> {
    const rawUrl = new URL(requestUrl).searchParams.get("url")?.trim();
    if (!rawUrl) {
        return null;
    }
    if (rawUrl.length > MAX_TARGET_URL_LENGTH) {
        return null;
    }
    const normalizedUrl = toValidUrl(rawUrl);
    if (normalizedUrl === FALLBACK_URL) {
        return null;
    }
    return (await parsePublicHttpUrl(normalizedUrl))?.href ?? null;
}

function isRedirectStatus(status: number): boolean {
    return status >= 300 && status < 400;
}

function parsePreviewType(type: string | null): "image" | "video" | null {
    if (type === null || type === "image") {
        return "image";
    }
    if (type === "video") {
        return "video";
    }
    return null;
}

function textResponse(body: string, status: number): Response {
    return new Response(body, {
        headers: {
            "cache-control": NO_STORE_HEADER,
            "content-type": "text/plain; charset=utf-8",
        },
        status,
    });
}

function parseRangeHeader(rangeHeader: string | null): string | null {
    if (!rangeHeader) {
        return null;
    }
    return HTTP_RANGE_HEADER_PATTERN.test(rangeHeader) ? rangeHeader : null;
}

function isSupportedVideoContentType(contentType: string): boolean {
    const mimeType = contentType.split(";")[0]?.trim().toLowerCase();
    return (
        mimeType?.startsWith("video/") ||
        mimeType === "application/octet-stream"
    );
}

function isContentLengthOverLimit(
    headers: Headers,
    maxContentLengthBytes: number
): boolean {
    const contentLength = headers.get("content-length");
    if (!contentLength) {
        return false;
    }

    const contentLengthBytes = Number(contentLength);
    return (
        Number.isFinite(contentLengthBytes) &&
        contentLengthBytes > maxContentLengthBytes
    );
}

function toSafeUpstreamStatus(status: number): number {
    if (status >= 400 && status <= 599) {
        return status;
    }
    return 502;
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
