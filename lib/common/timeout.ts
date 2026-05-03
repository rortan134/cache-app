import { abortAfterAny } from "@/lib/common/abort";

/**
 * Fetch with a timeout that composes with any existing or external signals.
 *
 * Preserves signals already present in `options` (e.g. upstream timeouts)
 * and merges them with an optional external signal (e.g. client disconnect).
 */
export async function fetchWithTimeout(
    input: string,
    options: RequestInit,
    timeoutMs: number,
    externalSignal?: AbortSignal
): Promise<Response> {
    const signals: AbortSignal[] = [];
    if (options.signal) {
        signals.push(options.signal);
    }
    if (externalSignal) {
        signals.push(externalSignal);
    }

    const { signal, clearTimeout } = abortAfterAny(timeoutMs, ...signals);
    try {
        return await fetch(input, { ...options, signal });
    } finally {
        clearTimeout();
    }
}
