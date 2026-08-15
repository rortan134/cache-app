import { isRecord } from "@/lib/common/object";

export class HttpError extends Error {
    readonly retryAfter: number | null;
    readonly status: number;

    static isInstance(error: unknown): error is HttpError {
        return (
            isRecord(error) &&
            error.name === "HttpError" &&
            typeof error.status === "number" &&
            (error.retryAfter === null ||
                typeof error.retryAfter === "number") &&
            typeof error.isRetryable === "function"
        );
    }

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
