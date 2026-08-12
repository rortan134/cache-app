import { abortAfterAny } from "@/lib/common/abort";

/**
 * Fetch with a timeout that composes with any signal already present in `options`
 * (e.g. upstream timeouts or a client disconnect signal).
 *
 * Unlike `AbortSignal.timeout`, the timer is disarmed as soon as the fetch
 * settles, so it does not stay armed until the deadline.
 */
export async function fetchWithTimeout(
    input: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const signals = options.signal ? [options.signal] : [];

    const { signal, clearTimeout } = abortAfterAny(timeoutMs, ...signals);
    try {
        return await fetch(input, { ...options, signal });
    } finally {
        clearTimeout();
    }
}
