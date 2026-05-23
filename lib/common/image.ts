import { parseHttpUrl } from "@/lib/common/net";

/**
 * Browser-safe image URL pre-filter.
 *
 * Client components cannot import server-side DNS validation because that pulls
 * `server-only` into the browser bundle. Cross-origin image fetch probes also
 * fail under CORS even when an `<img>` would load, so the browser path only
 * rejects malformed or non-HTTP URLs and lets native image loading report
 * broken assets.
 */
export function filterValidImageUrls(urls: string[]): Promise<string[]> {
    return Promise.resolve(urls.filter((url) => parseHttpUrl(url) !== null));
}
