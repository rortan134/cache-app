import { parseHttpUrl } from "@/lib/common/net";

const SAME_ORIGIN_IMAGE_URL_BASE = "https://cache.local";

/**
 * Browser-safe image URL pre-filter.
 *
 * Client components cannot import server-side DNS validation because that pulls
 * `server-only` into the browser bundle. Cross-origin image fetch probes also
 * fail under CORS even when an `<img>` would load, so the browser path accepts
 * absolute HTTP(S) URLs and root-relative same-origin paths, then lets native
 * image loading report broken assets.
 */
export function filterValidImageUrls(urls: string[]): Promise<string[]> {
    return Promise.resolve(urls.filter(isLoadableHttpImageUrl));
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
