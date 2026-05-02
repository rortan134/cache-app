import { abortAfter } from "@/lib/common/abort";

export async function fetchWithTimeout(
    input: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const { signal, clearTimeout } = abortAfter(timeoutMs);
    try {
        return await fetch(input, { ...options, signal });
    } finally {
        clearTimeout();
    }
}
