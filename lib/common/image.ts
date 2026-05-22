import { canUseDOM } from "@/lib/common/dom";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseHttpUrl } from "@/lib/common/net";
import { withRetry } from "@/lib/common/retry";
import { fetchWithTimeout } from "@/lib/common/timeout";

const log = createLogger("ImageValidation");

const CONCURRENCY_LIMIT = 10;
const IMAGE_CONTENT_TYPE_PREFIX = "image/";
const REQUEST_TIMEOUT_MS = 5000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

const SERVER_HEADERS = {
    "User-Agent": "Cache/1.0",
};

function isImageContentType(value: string | null): boolean {
    return value?.startsWith(IMAGE_CONTENT_TYPE_PREFIX) ?? false;
}

function isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
}

/**
 * Fetch only the headers for a remote image.
 *
 * HEAD is tried first because it avoids downloading the body.
 * When falling back to GET we immediately cancel the body stream so the
 * connection closes without transferring the full binary.
 */
async function fetchImageHeaders(
    url: string,
    method: "HEAD" | "GET"
): Promise<Response> {
    const options: RequestInit = { method };

    // In the browser, custom headers trigger a CORS preflight for
    // cross-origin requests. Many image CDNs do not handle OPTIONS,
    // so we only attach a custom User-Agent server-side where SSRF
    // protection and bot-detection mitigation matter.
    if (!canUseDOM) {
        options.headers = SERVER_HEADERS;
    }

    const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);

    if (method === "GET") {
        await response.body?.cancel().catch(() => undefined);
    }

    return response;
}

/**
 * Tests whether a URL responds with a valid image.
 *
 * Guards:
 * - URL parsing
 * - SSRF hostname blocking (server-side only)
 * - Request timeouts
 * - Transient-error retries
 * - Content-Type validation
 */
async function testValidImageResponse(url: string): Promise<boolean> {
    const parsed = parseHttpUrl(url);
    if (!parsed) {
        log.debug("Skipping invalid URL", { url });
        return false;
    }

    /*
     * In the browser, fetch() to cross-origin URLs is subject to CORS.
     * Most image CDNs and external hosts do not serve Access-Control-Allow-Origin
     * headers, so all cross-origin fetches would fail and every URL would be
     * marked invalid.  <img> elements load cross-origin without CORS, so on
     * the client we skip HTTP validation and trust the element's native error
     * handling instead.
     */
    if (canUseDOM) {
        return true;
    }

    const publicUrl = await import("@/lib/common/server-net").then((module) =>
        module.parsePublicHttpUrl(parsed.href)
    );
    if (!publicUrl) {
        log.debug("Skipping blocked hostname", {
            hostname: parsed.hostname,
            url,
        });
        return false;
    }

    try {
        return await withRetry(
            async () => {
                let response = await fetchImageHeaders(publicUrl.href, "HEAD");

                if (response.status === 405) {
                    response = await fetchImageHeaders(publicUrl.href, "GET");
                }

                if (!response.ok) {
                    if (isRetryableStatus(response.status)) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return false;
                }

                return isImageContentType(response.headers.get("content-type"));
            },
            {
                attempts: RETRY_ATTEMPTS,
                delayMs: RETRY_DELAY_MS,
                shouldRetry: (err) => {
                    if (err instanceof Error) {
                        const status = Number(err.message.slice(5)) || 0;
                        return (
                            isRetryableStatus(status) ||
                            err.message.includes("aborted")
                        );
                    }
                    return true;
                },
            }
        );
    } catch (err) {
        log.debug("Image validation failed after retries", {
            error: err,
            url,
        });
        return false;
    }
}

/**
 * Run tasks with bounded concurrency.
 *
 * Unbounded Promise.all() exhausts the connection pool, increases
 * tail-latency, and invites rate-limiting. Limiting concurrency keeps
 * total throughput higher and failures lower.
 */
async function withConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results = new Array<T>(tasks.length);
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const currentIndex = index++;
            const task = tasks[currentIndex];
            if (!task) {
                break;
            }
            results[currentIndex] = await task();
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
        worker()
    );
    await Promise.all(workers);
    return results;
}

/**
 * Filters an array of image URLs, returning only those that respond
 * successfully with an image content type.
 */
export async function filterValidImageUrls(urls: string[]): Promise<string[]> {
    const tasks = urls.map((url) => async () => {
        const isValid = await testValidImageResponse(url);
        return isValid ? url : null;
    });

    const results = await withConcurrencyLimit(tasks, CONCURRENCY_LIMIT);
    return results.filter((url): url is string => url !== null);
}
