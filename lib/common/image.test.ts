import { describe, expect, test } from "bun:test";
import { filterValidImageUrls } from "@/lib/common/image";

describe("filterValidImageUrls", () => {
    test("returns empty array for empty input", async () => {
        const result = await filterValidImageUrls([]);
        expect(result).toEqual([]);
    });

    test("filters out unparseable and non-http URLs", async () => {
        const result = await filterValidImageUrls([
            "not-a-url",
            "ftp://example.com/image.jpg",
            "https://example.com/photo.jpg",
            "http://cdn.example.com/image.png",
            "/api/preview?url=https%3A%2F%2Fexample.com%2Fpage",
            "//cdn.example.com/protocol-relative.png",
        ]);

        expect(result).toEqual([
            "https://example.com/photo.jpg",
            "http://cdn.example.com/image.png",
            "/api/preview?url=https%3A%2F%2Fexample.com%2Fpage",
        ]);
    });

    test("does not perform network probes", async () => {
        const originalFetch = globalThis.fetch;
        const calls: string[] = [];
        globalThis.fetch = ((url: string | URL | Request) => {
            calls.push(String(url));
            return Promise.resolve(new Response(null));
        }) as typeof fetch;

        try {
            const result = await filterValidImageUrls([
                "https://example.com/photo.jpg",
            ]);

            expect(result).toEqual(["https://example.com/photo.jpg"]);
            expect(calls).toEqual([]);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
