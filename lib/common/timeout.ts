import { abortAfterAny } from "@/lib/common/abort";

export async function fetchWithTimeout(
    input: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const { signal, clearTimeout } = abortAfterAny(
        timeoutMs,
        new AbortController().signal
    );
    try {
        return await fetch(input, { ...options, signal });
    } finally {
        clearTimeout();
    }
}
