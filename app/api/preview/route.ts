import { abortAfterAny, isAbortError } from "@/lib/common/abort";
import { MIME_TYPES } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseHttpUrl } from "@/lib/common/net";
import { getRedisClient } from "@/lib/common/redis";
import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { parseStandaloneUrl } from "@/lib/common/url";
import {
    classifyCobaltError,
    resolveCobaltPreview,
} from "@/lib/integrations/cobalt/service";
import { isCobaltHost } from "@/lib/integrations/cobalt/utils";
import {
    tiktokOembedThumbnailUrl,
    tiktokOembedUrl,
} from "@/lib/integrations/tiktok/oembed";
import { getPreviewFromContent } from "link-preview-js";
import { cacheLife, cacheTag } from "next/cache";
import { createHash } from "node:crypto";
import { Duplex } from "node:stream";
import { createZstdCompress } from "node:zlib";

const log = createLogger("api:library:preview");

type PreviewType = "image" | "video";

const CACHE_CONTROL_HEADER =
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const VERCEL_CDN_CACHE_CONTROL_HEADER =
    "public, max-age=604800, stale-while-revalidate=604800";
const VERCEL_CACHE_TAG_HEADER = "Vercel-Cache-Tag";
const VERCEL_CDN_CACHE_CONTROL_HEADER_NAME = "Vercel-CDN-Cache-Control";
const NO_STORE_HEADER = "private, no-store";
const PLAIN_TEXT_CONTENT_TYPE = `${MIME_TYPES.text}; charset=utf-8`;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_TARGET_URL_LENGTH = 4096;
const MAX_PREVIEW_METADATA_BODY_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_CONTENT_LENGTH_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_CONTENT_LENGTH_BYTES = 200 * 1024 * 1024;
const COBALT_CACHE_TTL_SECONDS = 60 * 60;
const COBALT_CACHE_KEY_PREFIX = "cobalt-preview:";
const USER_AGENT =
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const GOOGLEBOT_USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HTTP_SINGLE_RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;
const XHTML_CONTENT_TYPE_PATTERN = /^application\/xhtml\+xml/i;
const ABORTED_RESPONSE = new Response(null, { status: 499 });

interface VideoRangeRequest {
    endByte: number | null;
    header: string;
    startByte: number | null;
}

interface ResolvedImagePreview {
    imageUrl: string;
    pageUrl: string;
}

function acceptsZstd(request: Request): boolean {
    const acceptEncoding = request.headers.get("accept-encoding");
    return acceptEncoding?.toLowerCase().includes("zstd") ?? false;
}

function getUserAgent(url: string): string {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (
            hostname === "instagram.com" ||
            hostname.endsWith(".instagram.com")
        ) {
            return GOOGLEBOT_USER_AGENT;
        }
    } catch {
        // fall through
    }
    return USER_AGENT;
}

function createZstdTransform() {
    return Duplex.toWeb(createZstdCompress()) as unknown as {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;
    };
}

export async function GET(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    const targetUrl = await extractTargetUrl(
        requestUrl.searchParams.get("url")
    );
    if (!targetUrl) {
        return textResponse("Invalid URL", 400);
    }

    const contentType = parsePreviewType(requestUrl.searchParams.get("type"));
    if (!contentType) {
        return textResponse("Unsupported preview type", 400);
    }

    const shouldUseZstd = acceptsZstd(request);

    if (contentType === "video") {
        return resolveVideoPreview(targetUrl, request);
    }

    try {
        const preview = await resolveImagePreview(targetUrl.href);
        if (!preview?.imageUrl) {
            return textResponse("Preview not found", 404);
        }

        const imageResponse = await fetchWithRedirects(
            await parsePublicHttpUrl(preview.imageUrl),
            {
                headers: {
                    Accept: "image/*",
                    Referer: preview.pageUrl ?? targetUrl.href,
                    "User-Agent": getUserAgent(targetUrl.href),
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
            shouldUseZstd && imageResponse.body
                ? imageResponse.body.pipeThrough(createZstdTransform())
                : imageResponse.body;

        return new Response(body, {
            headers: {
                "cache-control": CACHE_CONTROL_HEADER,
                "content-type": imageContentType,
                ...buildPreviewCacheHeaders(targetUrl.href, "image"),
                ...(shouldUseZstd ? { "content-encoding": "zstd" } : {}),
            },
            status: 200,
        });
    } catch (error) {
        return handlePreviewError(
            error,
            "resolve preview",
            "Preview not found",
            { targetUrl: targetUrl.href }
        );
    }
}

async function resolveImagePreview(
    targetUrl: string
): Promise<ResolvedImagePreview | null> {
    "use cache";
    cacheTag(buildPreviewCacheTag(targetUrl, "image"));

    const oembedUrl = tiktokOembedUrl(targetUrl);
    if (oembedUrl) {
        cacheLife("hours");
        return resolveTikTokImagePreview(targetUrl, oembedUrl);
    }

    cacheLife("days");

    const pageResponse = await fetchWithRedirects(parseHttpUrl(targetUrl), {
        headers: {
            Accept: "text/html,application/xhtml+xml,image/*",
            "User-Agent": getUserAgent(targetUrl),
        },
    });
    if (!pageResponse.ok) {
        log.debug("Preview page request failed", {
            status: pageResponse.status,
            targetUrl,
        });
        return null;
    }

    const pageContentType = pageResponse.headers.get("content-type") ?? "";
    if (pageContentType.startsWith("image/")) {
        return { imageUrl: targetUrl, pageUrl: targetUrl };
    }

    const previewHeaders = headersToRecord(pageResponse.headers);
    const previewContentType = normalizePreviewContentType(pageContentType);
    if (previewContentType) {
        previewHeaders["content-type"] = previewContentType;
    }

    const previewBody = shouldReadPreviewResponseBody(previewContentType)
        ? await readTextBodyWithLimit(
              pageResponse,
              MAX_PREVIEW_METADATA_BODY_BYTES
          )
        : "";
    if (previewBody === null) {
        return null;
    }

    const page = await getPreviewFromContent({
        data: previewBody,
        headers: previewHeaders,
        url: pageResponse.url || targetUrl,
    });

    const imageUrl = getFirstHttpUrl("images" in page ? page.images : []);
    if (!imageUrl) {
        return null;
    }

    return {
        imageUrl,
        pageUrl: parseHttpUrl(page.url)?.href ?? targetUrl,
    };
}

async function resolveTikTokImagePreview(
    targetUrl: string,
    oembedUrl: string
): Promise<ResolvedImagePreview | null> {
    const response = await fetchWithRedirects(parseHttpUrl(oembedUrl), {
        headers: {
            Accept: MIME_TYPES.json,
            "User-Agent": USER_AGENT,
        },
    });
    if (!response.ok) {
        log.debug("TikTok oEmbed preview request failed", {
            status: response.status,
            targetUrl,
        });
        return null;
    }

    const thumbnailUrl = tiktokOembedThumbnailUrl(await response.json());
    if (!thumbnailUrl) {
        return null;
    }

    return {
        imageUrl: thumbnailUrl,
        pageUrl: targetUrl,
    };
}

async function resolveVideoPreview(
    targetUrl: URL,
    request: Request
): Promise<Response> {
    if (request.signal?.aborted) {
        return ABORTED_RESPONSE;
    }

    try {
        const videoResult = await resolveVideo(targetUrl, request.signal);
        if (!videoResult?.videoUrl) {
            const errorCategory = classifyCobaltError(videoResult?.errorCode);
            switch (errorCategory) {
                case "rate_limited":
                    return textResponse(
                        "Video preview temporarily unavailable due to rate limiting",
                        429
                    );
                case "fetch_failed":
                    return textResponse(
                        "Video preview temporarily unavailable",
                        503
                    );
                case "not_found":
                    return textResponse("Video preview not found", 404);
                default:
                    return textResponse("Video preview not available", 404);
            }
        }

        return proxyVideoResponse(videoResult.videoUrl, targetUrl, request);
    } catch (error) {
        return handlePreviewError(
            error,
            "resolve video preview",
            "Video preview not found",
            { targetUrl: targetUrl.href }
        );
    }
}

async function resolveVideo(targetUrl: URL, signal?: AbortSignal) {
    if (!isCobaltHost(targetUrl.href)) {
        log.debug("Host not supported for video preview", {
            targetUrl: targetUrl.href,
        });
        return { videoUrl: null };
    }

    const targetHref = targetUrl.href;
    const cachedVideoUrl = await readCachedCobaltVideoUrl(targetHref);
    if (cachedVideoUrl) {
        return { videoUrl: cachedVideoUrl };
    }

    const result = await resolveCobaltPreview(targetHref, signal);
    if (result.status === "SUCCESS" && result.videoPreviewUrl) {
        await writeCachedCobaltVideoUrl(targetHref, result.videoPreviewUrl);
        return { videoUrl: result.videoPreviewUrl };
    }

    const errorCode = result.status === "ERROR" ? result.errorCode : null;
    log.debug("Cobalt preview did not return video", {
        errorCode,
        status: result.status,
        targetUrl: targetHref,
    });

    return { errorCode, videoUrl: null };
}

async function readCachedCobaltVideoUrl(
    targetHref: string
): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }
    try {
        const cached = await redis.get(cobaltCacheKey(targetHref));
        return cached ?? null;
    } catch (error) {
        log.debug("Redis read failed for cobalt cache", {
            error: error instanceof Error ? error.message : String(error),
            targetHref,
        });
        return null;
    }
}

async function writeCachedCobaltVideoUrl(
    targetHref: string,
    videoUrl: string
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }
    try {
        await redis.set(
            cobaltCacheKey(targetHref),
            videoUrl,
            "EX",
            COBALT_CACHE_TTL_SECONDS
        );
    } catch (error) {
        log.debug("Redis write failed for cobalt cache", {
            error: error instanceof Error ? error.message : String(error),
            targetHref,
        });
    }
}

function cobaltCacheKey(targetHref: string): string {
    return `${COBALT_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

async function proxyVideoResponse(
    videoUrl: string,
    targetUrl: URL,
    request: Request
): Promise<Response> {
    try {
        const rangeRequest = parseRangeHeader(request.headers.get("range"));

        const tunnelResponse = await fetchWithRedirects(
            await parsePublicHttpUrl(videoUrl),
            {
                headers: {
                    Accept: "video/*",
                    ...(rangeRequest ? { Range: rangeRequest.header } : {}),
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

        const headers = new Headers();
        headers.set("content-type", contentType);
        const contentLength = tunnelResponse.headers.get("content-length");
        if (contentLength) {
            headers.set("content-length", contentLength);
        }
        const contentRange =
            tunnelResponse.headers.get("content-range") ??
            createContentRangeHeader(rangeRequest, contentLength);
        if (contentRange) {
            headers.set("content-range", contentRange);
        }
        headers.set("accept-ranges", "bytes");
        headers.set("cache-control", CACHE_CONTROL_HEADER);
        setPreviewCacheHeaders(headers, targetUrl.href, "video");

        return new Response(tunnelResponse.body, {
            headers,
            status: tunnelResponse.status,
        });
    } catch (error) {
        return handlePreviewError(
            error,
            "proxy video response",
            "Video preview not found",
            { videoUrl }
        );
    }
}

async function fetchWithRedirects(
    initialUrl: URL | null,
    init: RequestInit | undefined,
    signal?: AbortSignal
): Promise<Response> {
    if (!initialUrl) {
        return textResponse("Invalid URL", 400);
    }

    const redirectInit = init
        ? { ...init, redirect: "manual" as const }
        : { redirect: "manual" as const };

    let publicUrl = initialUrl;

    for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount++
    ) {
        if (redirectCount > 0) {
            const validated = await parsePublicHttpUrl(publicUrl.href);
            if (!validated) {
                return textResponse("Invalid URL", 400);
            }
            publicUrl = validated;
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
        publicUrl = redirectUrl;
    }

    return textResponse("Too many redirects", 508);
}

function resolveRedirectUrl(location: string, baseUrl: URL): URL | null {
    let resolved: URL;
    try {
        resolved = new URL(location, baseUrl);
    } catch {
        return null;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
        return null;
    }
    return resolved;
}

async function extractTargetUrl(rawValue: string | null): Promise<URL | null> {
    if (!rawValue || rawValue.length > MAX_TARGET_URL_LENGTH) {
        return null;
    }
    const standaloneUrl = parseStandaloneUrl(rawValue);
    if (!standaloneUrl) {
        return null;
    }
    return await parsePublicHttpUrl(standaloneUrl.href);
}

function isRedirectStatus(status: number): boolean {
    return status >= 300 && status < 400;
}

function parsePreviewType(type: string | null): PreviewType | null {
    if (type === null || type === "image") {
        return "image";
    }
    if (type === "video") {
        return "video";
    }
    return null;
}

function handlePreviewError(
    error: unknown,
    operation: string,
    fallbackMessage: string,
    context: Record<string, unknown>
): Response {
    if (isAbortError(error)) {
        return ABORTED_RESPONSE;
    }
    log.warn(`Failed to ${operation}`, {
        error: error instanceof Error ? error.message : String(error),
        ...context,
    });
    return textResponse(fallbackMessage, 404);
}

function textResponse(body: string, status: number): Response {
    return new Response(body, {
        headers: {
            "cache-control": NO_STORE_HEADER,
            "content-type": PLAIN_TEXT_CONTENT_TYPE,
        },
        status,
    });
}

function headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
        record[key] = value;
    });
    return record;
}

function readWithSignal(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal
) {
    if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
    }

    return new Promise<Awaited<ReturnType<typeof reader.read>>>(
        (resolve, reject) => {
            const onAbort = () => {
                reject(new DOMException("Aborted", "AbortError"));
            };
            signal.addEventListener("abort", onAbort, { once: true });
            reader
                .read()
                .then(resolve, reject)
                .finally(() => {
                    signal.removeEventListener("abort", onAbort);
                });
        }
    );
}

async function readTextBodyWithLimit(
    response: Response,
    maxBodyBytes: number
): Promise<string | null> {
    if (isContentLengthOverLimit(response.headers, maxBodyBytes)) {
        return null;
    }

    if (!response.body) {
        return "";
    }

    const { signal, clearTimeout } = abortAfterAny(FETCH_TIMEOUT_MS);

    if (signal.aborted) {
        clearTimeout();
        return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let bodyBytes = 0;

    try {
        while (true) {
            const { done, value } = await readWithSignal(reader, signal);
            if (signal.aborted) {
                await reader.cancel("Preview metadata read timed out.");
                return null;
            }
            if (done) {
                break;
            }
            if (!value) {
                continue;
            }

            bodyBytes += value.byteLength;
            if (bodyBytes > maxBodyBytes) {
                await reader.cancel("Preview metadata exceeded size limit.");
                body += decoder.decode();
                return body;
            }

            body += decoder.decode(value, { stream: true });
        }

        return body + decoder.decode();
    } catch (error) {
        if (isAbortError(error)) {
            await reader.cancel("Preview metadata read timed out.");
            return null;
        }
        throw error;
    } finally {
        clearTimeout();
        reader.releaseLock();
    }
}

function getFirstHttpUrl(urls: readonly string[]): string | null {
    for (const url of urls) {
        const httpUrl = parseHttpUrl(url)?.href;
        if (httpUrl) {
            return httpUrl;
        }
    }
    return null;
}

function normalizePreviewContentType(contentType: string): string {
    if (getMimeType(contentType) === "application/xhtml+xml") {
        return contentType.replace(XHTML_CONTENT_TYPE_PATTERN, MIME_TYPES.html);
    }
    return contentType;
}

function shouldReadPreviewResponseBody(contentType: string): boolean {
    const mimeType = getMimeType(contentType);
    return !mimeType || mimeType.startsWith("text/");
}

function getMimeType(contentType: string): string {
    return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function parseRangeHeader(
    rangeHeader: string | null
): VideoRangeRequest | null {
    if (!rangeHeader) {
        return null;
    }

    const match = HTTP_SINGLE_RANGE_HEADER_PATTERN.exec(rangeHeader);
    if (!match) {
        return null;
    }

    const startByte = parseRangeByte(match[1]);
    const endByte = parseRangeByte(match[2]);
    if (startByte === null && endByte === null) {
        return null;
    }
    if (startByte !== null && endByte !== null && endByte < startByte) {
        return null;
    }

    return {
        endByte,
        header: rangeHeader,
        startByte,
    };
}

function parseRangeByte(value: string | undefined): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number(value);
    if (!(Number.isInteger(parsed) && parsed >= 0)) {
        return null;
    }

    return parsed;
}

function createContentRangeHeader(
    rangeRequest: VideoRangeRequest | null,
    contentLength: string | null
): string | null {
    if (!(rangeRequest && contentLength && rangeRequest.startByte !== null)) {
        return null;
    }

    const responseBodyByteLength = Number(contentLength);
    if (
        !(
            Number.isInteger(responseBodyByteLength) &&
            responseBodyByteLength > 0
        )
    ) {
        return null;
    }

    const endByte =
        rangeRequest.endByte ??
        rangeRequest.startByte + responseBodyByteLength - 1;
    if (endByte < rangeRequest.startByte) {
        return null;
    }

    return `bytes ${rangeRequest.startByte}-${endByte}/*`;
}

function isSupportedVideoContentType(contentType: string): boolean {
    const mimeType = getMimeType(contentType);
    return mimeType.startsWith("video/") || mimeType === MIME_TYPES.binary;
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

function hashTargetUrl(targetHref: string): string {
    return createHash("sha256").update(targetHref).digest("hex").slice(0, 16);
}

function buildPreviewCacheTag(targetHref: string, type: PreviewType): string {
    return `preview:${type}:${hashTargetUrl(targetHref)}`;
}

function buildPreviewCacheHeaders(targetHref: string, type: PreviewType) {
    return {
        [VERCEL_CDN_CACHE_CONTROL_HEADER_NAME]: VERCEL_CDN_CACHE_CONTROL_HEADER,
        [VERCEL_CACHE_TAG_HEADER]: buildPreviewCacheTag(targetHref, type),
    };
}

function setPreviewCacheHeaders(
    headers: Headers,
    targetHref: string,
    type: PreviewType
): void {
    for (const [key, value] of Object.entries(
        buildPreviewCacheHeaders(targetHref, type)
    )) {
        headers.set(key, value);
    }
}
