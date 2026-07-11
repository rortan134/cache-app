import { parseHttpUrl } from "@/lib/common/net";

const SAME_ORIGIN_IMAGE_URL_BASE = "https://cache.local";

export function filterValidImageUrls(urls: string[]): string[] {
    return urls.filter(isLoadableHttpImageUrl);
}

function isLoadableHttpImageUrl(url: string): boolean {
    if (parseHttpUrl(url) !== null) {
        return true;
    }

    if (!(url.startsWith("/") && !url.startsWith("//"))) {
        return false;
    }

    try {
        const parsed = new URL(url, SAME_ORIGIN_IMAGE_URL_BASE);
        return parsed.origin === SAME_ORIGIN_IMAGE_URL_BASE;
    } catch {
        return false;
    }
}
