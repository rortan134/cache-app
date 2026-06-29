import { createHash } from "node:crypto";

import { getPreviewFromContent } from "link-preview-js";
import * as z from "zod";

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

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER =
    "public, max-age=60, s-maxage=300, stale-while-revalidate=60";
const VERCEL_CDN_CACHE_CONTROL_HEADER =
    "public, max-age=300, stale-while-revalidate=60";
const VERCEL_CACHE_TAG_HEADER = "Vercel-Cache-Tag";
const VERCEL_CDN_CACHE_CONTROL_HEADER_NAME = "Vercel-CDN-Cache-Control";
const NO_STORE_HEADER = "private, no-store";
const PLAIN_TEXT_CONTENT_TYPE = `${MIME_TYPES.text}; charset=utf-8`;
const SIGNED_URL_EXPIRY_PARAM = "x-expires";
const SIGNED_URL_GRACE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_TARGET_URL_LENGTH = 4096;
const MAX_PREVIEW_METADATA_BODY_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_CONTENT_LENGTH_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_CONTENT_LENGTH_BYTES = 200 * 1024 * 1024;
const COBALT_CACHE_TTL_SECONDS = 5 * 60;
const COBALT_CACHE_KEY_PREFIX = "cobalt-preview:";
const PREVIEW_IMAGE_CACHE_TTL_SECONDS = 5 * 60;
const PREVIEW_IMAGE_CACHE_KEY_PREFIX = "preview-image:";

// Upstream-controlled content-types we will proxy. Anything outside these lists
// (notably image/svg+xml and application/octet-stream) is rejected: SVGs execute
// in the browser and would let a hostile upstream use our Referer to hit abuse
// endpoints or run script in our origin's context; octet-stream would let a
// hostile upstream bypass content-type sniffing and ship executable payloads
// under our cache tag.
const SUPPORTED_PREVIEW_IMAGE_MIME_TYPES = new Set<string>([
    MIME_TYPES.avif,
    MIME_TYPES.bmp,
    MIME_TYPES.gif,
    MIME_TYPES.jpg,
    MIME_TYPES.png,
    MIME_TYPES.webp,
]);
const SUPPORTED_PREVIEW_VIDEO_MIME_TYPES = new Set<string>([
    "video/mp4",
    "video/quicktime",
    "video/webm",
]);
const USER_AGENT =
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const GOOGLEBOT_USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HTTP_SINGLE_RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;
const XHTML_CONTENT_TYPE_PATTERN = /^application\/xhtml\+xml/i;
const ABORTED_RESPONSE = new Response(null, { status: 499 });
const INSTAGRAM_HOSTS = new Set(["instagram.com", ".instagram.com"]);

type PreviewType = "image" | "video";

type PreviewDelivery = "proxy" | "redirect";

interface VideoRangeRequest {
    endByte: number | null;
    header: string;
    startByte: number | null;
}

interface ResolvedImage {
    imageUrl: string;
    pageUrl: string;
}

const ResolvedImageSchema = z.object({
    imageUrl: z.string(),
    pageUrl: z.string(),
});

export async function GET(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    const targetUrl = parseTargetUrlSync(requestUrl.searchParams.get("url"));
    if (!targetUrl) {
        return textResponse("Invalid URL", 400);
    }

    const delivery = parsePreviewDelivery(
        requestUrl.searchParams.get("delivery")
    );
    if (!delivery) {
        return textResponse("Unsupported preview delivery", 400);
    }

    const contentType = parsePreviewType(requestUrl.searchParams.get("type"));
    if (!contentType) {
        return textResponse("Unsupported preview type", 400);
    }

    if (contentType === "video") {
        const cachedVideoUrl = await readFromRedis(
            cobaltCacheKey(targetUrl.href)
        );
        if (cachedVideoUrl) {
            if (delivery === "redirect") {
                return redirectToPreview(
                    cachedVideoUrl,
                    targetUrl.href,
                    "video"
                );
            }
            return proxyVideoResponse(cachedVideoUrl, targetUrl, request);
        }

        const publicTargetUrl = await parsePublicHttpUrl(targetUrl.href);
        if (!publicTargetUrl) {
            return textResponse("Invalid URL", 400);
        }

        return resolveVideoPreview(publicTargetUrl, request);
    }

    try {
        const cached = await readCachedImagePreview(targetUrl.href);
        if (cached) {
            if (delivery === "redirect") {
                return redirectToPreview(
                    cached.imageUrl,
                    targetUrl.href,
                    "image"
                );
            }
            return proxyImageResponse(cached, targetUrl, request);
        }

        const publicTargetUrl = await parsePublicHttpUrl(targetUrl.href);
        if (!publicTargetUrl) {
            return textResponse("Invalid URL", 400);
        }

        const preview = await resolveImagePreview(publicTargetUrl.href);
        if (!preview?.imageUrl) {
            return textResponse("Preview not found", 404);
        }
        if (delivery === "redirect") {
            return redirectToPreview(
                preview.imageUrl,
                publicTargetUrl.href,
                "image"
            );
        }
        return proxyImageResponse(preview, publicTargetUrl, request);
    } catch (error) {
        return handlePreviewError(
            error,
            "resolve preview",
            "Preview not found",
            {
                targetUrl: targetUrl.href,
            }
        );
    }
}

function parseTargetUrlSync(rawValue: string | null): URL | null {
    if (!rawValue || rawValue.length > MAX_TARGET_URL_LENGTH) {
        return null;
    }
    const standaloneUrl = parseStandaloneUrl(rawValue);
    if (!standaloneUrl) {
        return null;
    }
    return parseHttpUrl(standaloneUrl.href);
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

function parsePreviewDelivery(delivery: string | null): PreviewDelivery | null {
    if (delivery === null || delivery === "proxy") {
        return "proxy";
    }
    if (delivery === "redirect") {
        return "redirect";
    }
    return null;
}

async function resolveImagePreview(
    targetUrl: string
): Promise<ResolvedImage | null> {
    const cached = await readCachedImagePreview(targetUrl);
    if (cached) {
        return cached;
    }

    const oembedUrl = tiktokOembedUrl(targetUrl);
    if (oembedUrl) {
        const result = await resolveTikTokImagePreview(targetUrl, oembedUrl);
        if (result) {
            await writeCachedImagePreview(targetUrl, result);
        }
        return result;
    }

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
    if (isSupportedPreviewImageContentType(pageContentType)) {
        const result = { imageUrl: targetUrl, pageUrl: targetUrl };
        await writeCachedImagePreview(targetUrl, result);
        return result;
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

    const result = {
        imageUrl,
        pageUrl: parseHttpUrl(page.url)?.href ?? targetUrl,
    };
    await writeCachedImagePreview(targetUrl, result);
    return result;
}

async function resolveTikTokImagePreview(
    targetUrl: string,
    oembedUrl: string
): Promise<ResolvedImage | null> {
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

async function proxyImageResponse(
    preview: ResolvedImage,
    targetUrl: URL,
    request: Request
): Promise<Response> {
    const imageResponse = await fetchWithRedirects(
        await parsePublicHttpUrl(preview.imageUrl),
        {
            headers: {
                Accept: "image/*",
                Referer: preview.pageUrl,
                "User-Agent": getUserAgent(targetUrl.href),
            },
        },
        request.signal
    );

    if (!imageResponse.ok) {
        return textResponse("Preview not found", 404);
    }

    const imageContentType = imageResponse.headers.get("content-type") ?? "";
    if (!isSupportedPreviewImageContentType(imageContentType)) {
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

    return new Response(imageResponse.body, {
        headers: {
            "cache-control": CACHE_CONTROL_HEADER,
            "content-type": imageContentType,
            ...buildPreviewCacheHeaders(targetUrl.href, "image"),
        },
        status: 200,
    });
}

function redirectToPreview(
    previewUrl: string,
    targetHref: string,
    type: PreviewType
): Response {
    const publicPreviewUrl = parseHttpUrl(previewUrl);
    if (!publicPreviewUrl) {
        return textResponse("Preview not found", 404);
    }

    const headers = new Headers();
    headers.set("cache-control", CACHE_CONTROL_HEADER);
    headers.set("location", publicPreviewUrl.href);
    setPreviewCacheHeaders(headers, targetHref, type);

    return new Response(null, {
        headers,
        status: 307,
    });
}

async function resolveVideoPreview(
    targetUrl: URL,
    request: Request
): Promise<Response> {
    const { signal } = request;
    if (signal.aborted) {
        return ABORTED_RESPONSE;
    }

    try {
        const videoResult = await resolveVideo(targetUrl, signal);
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

        const delivery = parsePreviewDelivery(
            new URL(request.url).searchParams.get("delivery")
        );
        if (delivery === "redirect") {
            return redirectToPreview(
                videoResult.videoUrl,
                targetUrl.href,
                "video"
            );
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
    const cachedVideoUrl = await readFromRedis(cobaltCacheKey(targetHref));
    if (cachedVideoUrl) {
        return { videoUrl: cachedVideoUrl };
    }

    const result = await resolveCobaltPreview(targetHref, signal);
    if (result.status === "SUCCESS" && result.videoPreviewUrl) {
        await writeToRedis(
            cobaltCacheKey(targetHref),
            result.videoPreviewUrl,
            COBALT_CACHE_TTL_SECONDS
        );
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

        const contentType = tunnelResponse.headers.get("content-type") ?? "";
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

function getUserAgent(url: string): string {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (INSTAGRAM_HOSTS.has(hostname)) {
            return GOOGLEBOT_USER_AGENT;
        }
    } catch {
        // fall through
    }
    return USER_AGENT;
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let bodyBytes = 0;

    try {
        while (true) {
            const { done, value } = await readWithSignal(reader, signal);
            if (done) {
                break;
            }

            bodyBytes += value.byteLength;
            if (bodyBytes > maxBodyBytes) {
                await reader.cancel("Preview metadata exceeded size limit.");
                body += decoder.decode(value);
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

function isRedirectStatus(status: number): boolean {
    return status >= 300 && status < 400;
}

async function readFromRedis(key: string): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) {
        return null;
    }
    try {
        return await redis.get(key);
    } catch (error) {
        log.debug("Redis read failed", {
            error: error instanceof Error ? error.message : String(error),
            key,
        });
        return null;
    }
}

async function writeToRedis(
    key: string,
    value: string,
    ttlSeconds: number
): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        return;
    }
    try {
        await redis.set(key, value, "EX", ttlSeconds);
    } catch (error) {
        log.debug("Redis write failed", {
            error: error instanceof Error ? error.message : String(error),
            key,
        });
    }
}

function hashTargetUrl(targetHref: string): string {
    return createHash("sha256").update(targetHref).digest("hex").slice(0, 16);
}

function cobaltCacheKey(targetHref: string): string {
    return `${COBALT_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

function previewImageCacheKey(targetHref: string): string {
    return `${PREVIEW_IMAGE_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

async function readCachedImagePreview(
    targetHref: string
): Promise<ResolvedImage | null> {
    const cached = await readFromRedis(previewImageCacheKey(targetHref));
    if (!cached) {
        return null;
    }
    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(cached);
    } catch {
        return null;
    }
    const parsed = ResolvedImageSchema.safeParse(parsedJson);
    if (!parsed.success) {
        return null;
    }
    if (isSignedUrlExpired(parsed.data.imageUrl)) {
        return null;
    }
    return parsed.data;
}

async function writeCachedImagePreview(
    targetHref: string,
    preview: ResolvedImage
): Promise<void> {
    await writeToRedis(
        previewImageCacheKey(targetHref),
        JSON.stringify(preview),
        PREVIEW_IMAGE_CACHE_TTL_SECONDS
    );
}

function isSignedUrlExpired(imageUrl: string): boolean {
    try {
        const expirySeconds = new URL(imageUrl).searchParams.get(
            SIGNED_URL_EXPIRY_PARAM
        );
        if (!expirySeconds) {
            return false;
        }
        const expiryMs = Number.parseInt(expirySeconds, 10) * 1000;
        if (!Number.isFinite(expiryMs)) {
            return false;
        }
        return Date.now() >= expiryMs - SIGNED_URL_GRACE_SECONDS * 1000;
    } catch {
        return false;
    }
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

function getFirstHttpUrl(urls: readonly string[]): string | null {
    for (const url of urls) {
        const httpUrl = parseHttpUrl(url)?.href;
        if (httpUrl) {
            return httpUrl;
        }
    }
    return null;
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
    return SUPPORTED_PREVIEW_VIDEO_MIME_TYPES.has(mimeType);
}

function isSupportedPreviewImageContentType(contentType: string): boolean {
    const mimeType = getMimeType(contentType);
    return SUPPORTED_PREVIEW_IMAGE_MIME_TYPES.has(mimeType);
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
