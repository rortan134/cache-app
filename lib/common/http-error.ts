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
