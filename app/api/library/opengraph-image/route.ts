import { createLogger } from "@/lib/common/logs/console/logger";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";

const log = createLogger("api:library:opengraph-image");

const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800";
const FETCH_TIMEOUT_MS = 5000;
const OG_META_KEYS = [
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src",
] as const;
const META_TAG_PATTERN = /<meta\s+[^>]*>/giu;
const META_PROPERTY_PATTERN = /\b(?:property|name)\s*=\s*["']([^"']+)["']/iu;
const META_CONTENT_PATTERN = /\bcontent\s*=\s*["']([^"']+)["']/iu;

export async function GET(request: Request): Promise<Response> {
    const targetUrl = readTargetUrl(request.url);

    if (!targetUrl) {
        return new Response("Invalid URL", {
            status: 400,
        });
    }

    try {
        const pageResponse = await fetchWithTimeout(
            targetUrl,
            {
                headers: {
                    Accept: "text/html,application/xhtml+xml",
                    "User-Agent": "CacheBot/1.0 (+https://cachd.app)",
                },
                redirect: "follow",
            },
            FETCH_TIMEOUT_MS
        );

        if (!pageResponse.ok) {
            return new Response("Preview not found", {
                status: 404,
            });
        }

        const contentType = pageResponse.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
            return new Response("Unsupported content", {
                status: 415,
            });
        }

        const pageHtml = await pageResponse.text();
        const pageUrl = pageResponse.url || targetUrl;
        const imageUrl = resolvePreviewImageUrl(pageHtml, pageUrl);

        if (!imageUrl) {
            return new Response("Preview not found", {
                status: 404,
            });
        }

        const imageResponse = await fetchWithTimeout(
            imageUrl,
            {
                headers: {
                    Accept: "image/*",
                    Referer: pageUrl,
                    "User-Agent": "CacheBot/1.0 (+https://cachd.app)",
                },
                redirect: "follow",
            },
            FETCH_TIMEOUT_MS
        );

        if (!imageResponse.ok) {
            return new Response("Preview not found", {
                status: 404,
            });
        }

        const imageContentType =
            imageResponse.headers.get("content-type") ?? "";

        if (!imageContentType.startsWith("image/")) {
            return new Response("Unsupported preview", {
                status: 415,
            });
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

        return new Response("Preview not found", {
            status: 404,
        });
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

    const parsedUrl = new URL(normalizedUrl);
    if (!isSupportedProtocol(parsedUrl.protocol)) {
        return null;
    }

    if (isBlockedHostname(parsedUrl.hostname)) {
        return null;
    }

    return parsedUrl.href;
}

function isSupportedProtocol(protocol: string): boolean {
    return protocol === "http:" || protocol === "https:";
}

function isBlockedHostname(hostname: string): boolean {
    const normalizedHost = hostname.trim().toLowerCase();
    if (!normalizedHost) {
        return true;
    }

    if (
        normalizedHost === "localhost" ||
        normalizedHost.endsWith(".localhost") ||
        normalizedHost === "0.0.0.0" ||
        normalizedHost === "::1" ||
        normalizedHost === "[::1]"
    ) {
        return true;
    }

    const ipv4Segments = normalizedHost.split(".");
    if (ipv4Segments.length !== 4) {
        return false;
    }

    const octets = ipv4Segments.map((segment) => Number(segment));
    if (
        octets.some(
            (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255
        )
    ) {
        return false;
    }

    const first = octets[0];
    const second = octets[1];
    if (first === undefined || second === undefined) {
        return false;
    }

    return (
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
    );
}

function decodeHtmlAttribute(value: string): string {
    return value
        .replaceAll("&amp;", "&")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">");
}

function findMetaContent(html: string, key: string): string | null {
    for (const match of html.matchAll(META_TAG_PATTERN)) {
        const tag = match[0];
        const propertyMatch = META_PROPERTY_PATTERN.exec(tag);
        const contentMatch = META_CONTENT_PATTERN.exec(tag);

        if (!(propertyMatch && contentMatch)) {
            continue;
        }

        const propertyValue = propertyMatch[1];
        if (propertyValue === undefined) {
            continue;
        }

        if (propertyValue.trim().toLowerCase() !== key) {
            continue;
        }

        const contentValue = contentMatch[1];
        if (contentValue === undefined) {
            continue;
        }

        const content = decodeHtmlAttribute(contentValue.trim());
        return content.length > 0 ? content : null;
    }

    return null;
}

function resolvePreviewImageUrl(html: string, pageUrl: string): string | null {
    for (const metaKey of OG_META_KEYS) {
        const candidate = findMetaContent(html, metaKey);
        if (!candidate) {
            continue;
        }

        try {
            const resolvedUrl = new URL(candidate, pageUrl);
            if (
                isSupportedProtocol(resolvedUrl.protocol) &&
                !isBlockedHostname(resolvedUrl.hostname)
            ) {
                return resolvedUrl.href;
            }
        } catch {
            // Ignore malformed image candidates and keep scanning.
        }
    }

    return null;
}
