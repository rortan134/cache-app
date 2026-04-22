import pRetry from "p-retry";

interface RetryOptions {
    attempts?: number;
    delayMs?: number | ((attempt: number, error: unknown) => number);
    onRetry?(error: unknown, attempt: number, delayMs: number): void;
    shouldRetry?(error: unknown, attempt: number): boolean | Promise<boolean>;
    signal?: AbortSignal;
}

/** @internal */
const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (ms <= 0) {
            return resolve();
        }
        if (signal?.aborted) {
            return reject(new Error("aborted"));
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) {
            onAbort();
        }
    });

export function withRetry<T>(
    fn: (attempt: number) => Promise<T>,
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
                return await fn(attemptIndex);
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
                // Re-throw as non-TypeError to bypass p-retry's TypeError filter when we intend to retry
                throw err instanceof TypeError
                    ? new Error((err as Error).message, { cause: err as Error })
                    : (err as Error);
            }
        },
        {
            factor: 1,
            maxTimeout: 0,
            minTimeout: 0,
            onFailedAttempt: () => {
                // noop
            },
            randomize: false,
            retries,
            signal,
        }
    );
}
