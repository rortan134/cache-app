import "server-only";

import { createLogger } from "@/lib/common/logs/console/logger";
import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { withRetry } from "@/lib/common/retry";
import { fetchWithTimeout } from "@/lib/common/timeout";

const log = createLogger("ServerImageValidation");

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
 * HEAD is tried first because it avoids downloading the body. When falling
 * back to GET we immediately cancel the body stream so the connection closes
 * without transferring the full binary.
 */
async function fetchImageHeaders(
    url: string,
    method: "HEAD" | "GET"
): Promise<Response> {
    const response = await fetchWithTimeout(
        url,
        {
            headers: SERVER_HEADERS,
            method,
        },
        REQUEST_TIMEOUT_MS
    );

    if (method === "GET") {
        await response.body?.cancel().catch(() => undefined);
    }

    return response;
}

/**
 * Tests whether a server-reachable URL responds with an image content type.
 *
 * Server callers need DNS-aware SSRF protection before opening sockets. Client
 * components should use `@/lib/common/image` instead and let native image load
 * errors handle cross-origin failures.
 */
async function testValidImageResponse(url: string): Promise<boolean> {
    const publicUrl = await parsePublicHttpUrl(url);
    if (!publicUrl) {
        log.debug("Skipping invalid or blocked URL", { url });
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
 * Unbounded Promise.all() exhausts the connection pool, increases tail latency,
 * and invites rate-limiting. Limiting concurrency keeps total throughput higher
 * and failures lower.
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
 * Filters image URLs by server-side reachability, SSRF policy, and content type.
 */
export async function filterValidServerImageUrls(
    urls: string[]
): Promise<string[]> {
    const tasks = urls.map((url) => async () => {
        const isValid = await testValidImageResponse(url);
        return isValid ? url : null;
    });

    const results = await withConcurrencyLimit(tasks, CONCURRENCY_LIMIT);
    return results.filter((url): url is string => url !== null);
}
