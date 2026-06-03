import { abortAfterAny, isAbortError } from "@/lib/common/abort";
import { FALLBACK_URL } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseHttpUrl } from "@/lib/common/net";
import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { resolveCobaltPreview } from "@/lib/integrations/cobalt/service";
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

const CACHE_CONTROL_HEADER =
    "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";
const VERCEL_CDN_CACHE_CONTROL_HEADER =
    "public, max-age=604800, stale-while-revalidate=604800";
const VERCEL_CACHE_TAG_HEADER = "Vercel-Cache-Tag";
const VERCEL_CDN_CACHE_CONTROL_HEADER_NAME = "Vercel-CDN-Cache-Control";
const NO_STORE_HEADER = "private, no-store";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 1;
const MAX_TARGET_URL_LENGTH = 4096;
const MAX_PREVIEW_METADATA_BODY_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_CONTENT_LENGTH_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_CONTENT_LENGTH_BYTES = 200 * 1024 * 1024;
const COBALT_RETRY_ATTEMPTS = 1;
const COBALT_RETRY_DELAY_MS = 500;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HTTP_SINGLE_RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;
const XHTML_CONTENT_TYPE_PATTERN = /^application\/xhtml\+xml/i;

interface VideoRangeRequest {
    endByte: number | null;
    header: string;
    startByte: number | null;
}

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
    const targetUrl = await extractTargetUrl(request.url);
    if (!targetUrl) {
        return textResponse("Invalid URL", 400);
    }

    const contentType = parsePreviewType(
        new URL(request.url).searchParams.get("type")
    );
    if (!contentType) {
        return textResponse("Unsupported preview type", 400);
    }

    const shouldUseZstd = acceptsZstd(request);

    if (contentType === "video") {
        return resolveVideoPreview(targetUrl, request);
    }

    try {
        const preview = await resolveImagePreview(targetUrl);
        if (!preview?.imageUrl) {
            return textResponse("Preview not found", 404);
        }

        const { imageUrl, pageUrl } = preview;

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
            shouldUseZstd && imageResponse.body
                ? imageResponse.body.pipeThrough(createZstdTransform())
                : imageResponse.body;

        return new Response(body, {
            headers: {
                "cache-control": CACHE_CONTROL_HEADER,
                "content-type": imageContentType,
                ...createPreviewCacheHeaders(targetUrl, "image"),
                ...(shouldUseZstd ? { "content-encoding": "zstd" } : {}),
            },
            status: 200,
        });
    } catch (error) {
        if (isAbortError(error)) {
            return new Response(null, { status: 499 });
        }

        log.warn("Failed to resolve preview", {
            error: error instanceof Error ? error.message : String(error),
            targetUrl,
        });

        return textResponse("Preview not found", 404);
    }
}

async function resolveImagePreview(targetUrl: string) {
    "use cache";
    cacheTag(`preview:${hashTargetUrl(targetUrl)}`);

    const oembedUrl = tiktokOembedUrl(targetUrl);
    if (oembedUrl) {
        cacheLife("hours");
        return resolveTikTokImagePreview(targetUrl, oembedUrl);
    }

    cacheLife("days");

    const pageResponse = await fetchWithRedirects(targetUrl, {
        headers: {
            Accept: "text/html,application/xhtml+xml,image/*",
            "User-Agent": USER_AGENT,
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
    if (previewBody == null) {
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
        pageUrl: parseHttpUrl(page.url)?.href,
    };
}

async function resolveTikTokImagePreview(targetUrl: string, oembedUrl: string) {
    const response = await fetchWithRedirects(oembedUrl, {
        headers: {
            Accept: "application/json",
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
    targetUrl: string,
    request: Request
): Promise<Response> {
    try {
        const { signal } = request;
        if (signal?.aborted) {
            return new Response(null, { status: 499 });
        }

        const videoResult = await resolveVideo(targetUrl, signal);
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

async function resolveVideo(targetUrl: string, signal?: AbortSignal) {
    const isSupported = isCobaltHost(targetUrl);
    if (!isSupported) {
        log.debug("Host not supported for video preview", { targetUrl });
        return { videoUrl: null };
    }

    let lastErrorCode: string | null = null;
    for (let attempt = 1; attempt <= COBALT_RETRY_ATTEMPTS; attempt++) {
        const result = await resolveCobaltPreview(targetUrl, signal);
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

async function proxyVideoResponse(
    videoUrl: string,
    targetUrl: string,
    request: Request
): Promise<Response> {
    try {
        const rangeRequest = parseRangeHeader(request.headers.get("range"));

        const tunnelResponse = await fetchWithRedirects(
            videoUrl,
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
        const contentRange =
            tunnelResponse.headers.get("content-range") ??
            createContentRangeHeader(rangeRequest, contentLength);
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

        return textResponse("Video preview not found", 404);
    }
}

async function fetchWithRedirects(
    initialUrl: string,
    init: RequestInit | undefined,
    signal?: AbortSignal
): Promise<Response> {
    let requestUrl = initialUrl;
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

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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

function headersToRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
        record[key] = value;
    });
    return record;
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
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let bodyBytes = 0;

    try {
        while (true) {
            const { done, value } = await readStreamChunk(reader, signal);
            if (done) {
                break;
            }
            if (!value) {
                continue;
            }

            bodyBytes += value.byteLength;
            if (bodyBytes > maxBodyBytes) {
                await reader.cancel("Preview metadata exceeded size limit.");
                return null;
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

function readStreamChunk(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal
): Promise<
    Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]>>
> {
    if (signal.aborted) {
        return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    return new Promise((resolve, reject) => {
        const handleAbort = () => {
            reject(new DOMException("Aborted", "AbortError"));
        };
        signal.addEventListener("abort", handleAbort, { once: true });
        reader
            .read()
            .then(resolve, reject)
            .finally(() => {
                signal.removeEventListener("abort", handleAbort);
            });
    });
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
        return contentType.replace(XHTML_CONTENT_TYPE_PATTERN, "text/html");
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
