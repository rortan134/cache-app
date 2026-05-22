import { describe, expect, test, mock, beforeEach } from "bun:test";
import { parsePublicHttpUrl as parsePublicHttpUrlWithResolver } from "@/lib/common/net";

const mockFetch =
    mock<(url: string, init?: RequestInit) => Promise<Response>>();

mock.module("@/lib/common/timeout", () => ({
    fetchWithTimeout: (url: string, options: RequestInit, _timeoutMs: number) =>
        mockFetch(url, options),
}));

mock.module("@/lib/common/server-net", () => ({
    parsePublicHttpUrl: (value: string) =>
        parsePublicHttpUrlWithResolver(value, async () => [
            { address: "8.8.8.8" },
        ]),
}));

import { filterValidImageUrls } from "@/lib/common/image";

function mockImageResponse(contentType = "image/jpeg", status = 200): Response {
    return new Response(null, {
        headers: { "content-type": contentType },
        status,
    });
}

function mockHtmlResponse(status = 200): Response {
    return new Response(null, {
        headers: { "content-type": "text/html" },
        status,
    });
}

function mockErrorResponse(status: number): Response {
    return new Response(null, {
        headers: { "content-type": "text/plain" },
        status,
    });
}

function mockEmptyBody(): Response {
    return new Response(null, { status: 204 });
}

beforeEach(() => {
    mockFetch.mockReset();
});

describe("filterValidImageUrls (server side, canUseDOM=false)", () => {
    test("returns empty array for empty input", async () => {
        const result = await filterValidImageUrls([]);
        expect(result).toEqual([]);
    });

    test("filters out unparseable URLs without calling fetch", async () => {
        const result = await filterValidImageUrls(["not-a-url"]);
        expect(result).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test("blocks private hostnames server-side without calling fetch", async () => {
        const result = await filterValidImageUrls([
            "http://localhost/image.jpg",
            "http://192.168.1.1/image.png",
            "http://10.0.0.1/photo.jpg",
        ]);

        expect(result).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test("accepts URL with image/jpeg content-type via HEAD", async () => {
        mockFetch.mockResolvedValue(mockImageResponse("image/jpeg", 200));

        const result = await filterValidImageUrls([
            "https://example.com/photo.jpg",
        ]);

        expect(result).toEqual(["https://example.com/photo.jpg"]);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const firstCall = mockFetch.mock.calls[0];
        expect(firstCall).toBeDefined();
        expect(firstCall?.[0]).toBe("https://example.com/photo.jpg");
        expect(firstCall?.[1]?.method).toBe("HEAD");
    });

    test("falls back to GET when HEAD returns 405", async () => {
        mockFetch
            .mockResolvedValueOnce(mockErrorResponse(405))
            .mockResolvedValueOnce(mockImageResponse("image/png", 200));

        const result = await filterValidImageUrls([
            "https://example.com/photo.png",
        ]);

        expect(result).toEqual(["https://example.com/photo.png"]);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        const firstMethod = mockFetch.mock.calls[0]?.[1]?.method;
        const secondMethod = mockFetch.mock.calls[1]?.[1]?.method;
        expect(firstMethod).toBe("HEAD");
        expect(secondMethod).toBe("GET");
    });

    test("rejects URL with non-image content-type", async () => {
        mockFetch.mockResolvedValue(mockHtmlResponse(200));

        const result = await filterValidImageUrls([
            "https://example.com/page.html",
        ]);

        expect(result).toEqual([]);
    });

    test("rejects URL returning 404", async () => {
        mockFetch.mockResolvedValue(mockErrorResponse(404));

        const result = await filterValidImageUrls([
            "https://example.com/missing.jpg",
        ]);

        expect(result).toEqual([]);
    });

    test("rejects URL returning 204 with no content-type header", async () => {
        mockFetch.mockResolvedValue(mockEmptyBody());

        const result = await filterValidImageUrls([
            "https://example.com/empty",
        ]);

        expect(result).toEqual([]);
    });
});

describe("filterValidImageUrls (client side, canUseDOM=true)", () => {
    test("accepts all valid URLs without calling fetch", async () => {
        mock.module("@/lib/common/dom", () => ({ canUseDOM: true }));

        const { filterValidImageUrls: clientFilter } = await import(
            "@/lib/common/image"
        );

        const urls = [
            "https://example.com/photo.jpg",
            "https://cdn.example.com/image.png",
            "http://192.168.1.1/local.jpg",
        ];

        const result = await clientFilter(urls);
        expect(result).toEqual(urls);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
