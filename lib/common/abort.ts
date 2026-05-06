/**
 * Creates an AbortController that automatically aborts after a timeout.
 *
 * Uses bind() instead of arrow functions to avoid capturing the surrounding
 * scope in closures. Arrow functions like `() => controller.abort()` capture
 * request bodies and other large objects, preventing GC for the timer lifetime.
 *
 * @param ms Timeout in milliseconds
 * @returns Object with controller, signal, and clearTimeout function
 */
export function abortAfter(ms: number) {
    const controller = new AbortController();
    const id = setTimeout(controller.abort.bind(controller), ms);
    return {
        clearTimeout: () => globalThis.clearTimeout(id),
        controller,
        signal: controller.signal,
    };
}

/**
 * Combines multiple AbortSignals with a timeout.
 *
 * @param ms Timeout in milliseconds
 * @param signals Additional signals to combine
 * @returns Combined signal that aborts on timeout or when any input signal aborts
 */
export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException
        ? error.name === "AbortError"
        : error instanceof Error && error.name === "AbortError";
}

export function abortAfterAny(ms: number, ...signals: AbortSignal[]) {
    const timeout = abortAfter(ms);
    const signal = AbortSignal.any([timeout.signal, ...signals]);
    return {
        clearTimeout: timeout.clearTimeout,
        signal,
    };
}
