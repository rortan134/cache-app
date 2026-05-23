import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const mockFetch =
    mock<(url: string, init?: RequestInit) => Promise<Response>>();
const mockLookup =
    mock<
        (
            hostname: string,
            options: { all: true; verbatim: true }
        ) => Promise<Array<{ address: string; family: 4 | 6 }>>
    >();

mock.module("@/lib/common/timeout", () => ({
    fetchWithTimeout: (url: string, options: RequestInit, _timeoutMs: number) =>
        mockFetch(url, options),
}));

mock.module("node:dns/promises", () => ({
    lookup: mockLookup,
}));

mock.module("server-only", () => ({}));

let filterValidServerImageUrls: typeof import("@/lib/common/server-image").filterValidServerImageUrls;

beforeAll(async () => {
    ({ filterValidServerImageUrls } = await import(
        "@/lib/common/server-image"
    ));
});

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
    mockLookup.mockReset();
    mockLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
});

describe("filterValidServerImageUrls", () => {
    test("returns empty array for empty input", async () => {
        const result = await filterValidServerImageUrls([]);
        expect(result).toEqual([]);
    });

    test("filters out unparseable URLs without calling fetch", async () => {
        const result = await filterValidServerImageUrls(["not-a-url"]);
        expect(result).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test("blocks private hostnames server-side without calling fetch", async () => {
        const result = await filterValidServerImageUrls([
            "http://localhost/image.jpg",
            "http://192.168.1.1/image.png",
            "http://10.0.0.1/photo.jpg",
        ]);

        expect(result).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test("accepts URL with image/jpeg content-type via HEAD", async () => {
        mockFetch.mockResolvedValue(mockImageResponse("image/jpeg", 200));

        const result = await filterValidServerImageUrls([
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

        const result = await filterValidServerImageUrls([
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

        const result = await filterValidServerImageUrls([
            "https://example.com/page.html",
        ]);

        expect(result).toEqual([]);
    });

    test("rejects URL returning 404", async () => {
        mockFetch.mockResolvedValue(mockErrorResponse(404));

        const result = await filterValidServerImageUrls([
            "https://example.com/missing.jpg",
        ]);

        expect(result).toEqual([]);
    });

    test("rejects URL returning 204 with no content-type header", async () => {
        mockFetch.mockResolvedValue(mockEmptyBody());

        const result = await filterValidServerImageUrls([
            "https://example.com/empty",
        ]);

        expect(result).toEqual([]);
    });
});
