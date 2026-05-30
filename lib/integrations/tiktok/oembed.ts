import { parseHttpUrl } from "@/lib/common/net";

const TIKTOK_OEMBED_ENDPOINT = "https://www.tiktok.com/oembed";

const TIKTOK_HOSTS = new Set([
    "m.tiktok.com",
    "tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com",
    "www.tiktok.com",
]);

export function isTikTokUrl(value: string): boolean {
    try {
        return TIKTOK_HOSTS.has(new URL(value).hostname.toLowerCase());
    } catch {
        return false;
    }
}

export function tiktokOembedUrl(targetUrl: string): string | null {
    if (!isTikTokUrl(targetUrl)) {
        return null;
    }

    const url = new URL(TIKTOK_OEMBED_ENDPOINT);
    url.searchParams.set("url", targetUrl);
    return url.href;
}

export function tiktokOembedThumbnailUrl(data: unknown): string | null {
    if (!(typeof data === "object" && data !== null)) {
        return null;
    }

    const thumbnailUrl =
        "thumbnail_url" in data ? data.thumbnail_url : undefined;
    if (typeof thumbnailUrl !== "string") {
        return null;
    }

    return parseHttpUrl(thumbnailUrl.trim())?.href ?? null;
}
