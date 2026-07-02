import pRetry from "p-retry";

interface RetryOptions {
    attempts?: number;
    delayMs?: number | ((attempt: number, error: unknown) => number);
    onRetry?(error: unknown, attempt: number, delayMs: number): void;
    shouldRetry?(error: unknown, attempt: number): boolean | Promise<boolean>;
    signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (ms <= 0) {
            resolve();
            return;
        }
        if (signal?.aborted) {
            reject(new DOMException("The operation was aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

export function withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    {
        attempts = 3,
        delayMs = 0,
        signal,
        shouldRetry = () => true,
        onRetry,
    }: RetryOptions = {}
): Promise<T> {
    const retries = Math.max(0, attempts - 1);

    return pRetry(
        async (attemptNum) => {
            const attemptIndex = attemptNum - 1;
            try {
                return await operation(attemptIndex);
            } catch (err) {
                const willRetry =
                    attemptIndex + 1 <= retries &&
                    (await shouldRetry(err, attemptIndex));
                if (!willRetry) {
                    throw err;
                }
                const wait =
                    typeof delayMs === "function"
                        ? Math.max(0, delayMs(attemptIndex, err))
                        : Math.max(0, delayMs);
                onRetry?.(err, attemptIndex, wait);
                if (wait > 0) {
                    await sleep(wait, signal);
                }
                throw err instanceof TypeError
                    ? new Error((err as Error).message, { cause: err })
                    : (err as Error);
            }
        },
        {
            factor: 1,
            maxTimeout: 0,
            minTimeout: 0,
            onFailedAttempt: () => undefined,
            randomize: false,
            retries,
            signal,
        }
    );
}
