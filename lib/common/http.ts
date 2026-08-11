export class HttpError extends Error {
    readonly retryAfter: number | null;
    readonly status: number;

    constructor(status: number, retryAfter?: number) {
        super(`HTTP ${status}`);
        this.name = "HttpError";
        this.status = status;
        this.retryAfter = retryAfter ?? null;
    }

    isRetryable(): boolean {
        return this.status >= 500 || this.status === 429 || this.status === 408;
    }
}

const isError = (value: unknown): value is Error =>
    Object.prototype.toString.call(value) === "[object Error]";

const ERROR_MESSAGES = new Set<string>([
    "network error", // Chrome
    "Failed to fetch", // Chrome
    "NetworkError when attempting to fetch resource.", // Firefox
    "The Internet connection appears to be offline.", // Safari 16
    "Network request failed", // `cross-fetch`
    "fetch failed", // Undici (Node.js)
    "terminated", // Undici (Node.js)
    "Network connection lost", // Cloudflare Workers (fetch)
]);

const BUN_NETWORK_ERROR_MESSAGES = new Set<string>([
    "Unable to connect. Is the computer able to access the url?",
    "The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()",
]);

export function isNetworkError(error: unknown): error is Error {
    if (!(error && isError(error)) || typeof error.message !== "string") {
        return false;
    }

    const { message, stack } = error;

    if (
        error.name === "Error" &&
        (BUN_NETWORK_ERROR_MESSAGES.has(message) ||
            message.startsWith("Malformed_HTTP_Response fetching "))
    ) {
        return true;
    }

    if (error.name !== "TypeError") {
        return false;
    }

    // Safari 17+ has generic message but no stack for network errors
    if (message === "Load failed") {
        return stack === undefined;
    }

    // Deno network errors start with specific text
    if (message.startsWith("error sending request for url")) {
        return true;
    }

    // Standard network error messages
    return ERROR_MESSAGES.has(message);
}
