import { describe, expect, test } from "bun:test";
import { resolveCobaltPreviewFromResponse } from "./cobalt.ts";

describe("resolveCobaltPreviewFromResponse", () => {
    test("maps redirect responses to video previews", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                status: "redirect",
                url: "/tunnel?id=abc",
            })
        ).toEqual({
            mediaType: "video",
            sourceUrl: "https://cache-cobalt-cache.unkey.app/tunnel?id=abc",
            staticImageUrl: null,
            status: "SUCCESS",
            videoPreviewUrl:
                "https://cache-cobalt-cache.unkey.app/tunnel?id=abc",
        });
    });

    test("maps tunnel responses to video previews", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                status: "tunnel",
                url: "https://cobalt.example/tunnel",
            })
        ).toEqual({
            mediaType: "video",
            sourceUrl: "https://cobalt.example/tunnel",
            staticImageUrl: null,
            status: "SUCCESS",
            videoPreviewUrl: "https://cobalt.example/tunnel",
        });
    });

    test("prefers picker video candidates and preserves thumbnails", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                picker: [
                    {
                        thumb: "https://cdn.example/poster.jpg",
                        type: "video",
                        url: "https://cdn.example/video.mp4",
                    },
                ],
                status: "picker",
            })
        ).toEqual({
            mediaType: "video",
            sourceUrl: "https://cdn.example/video.mp4",
            staticImageUrl: "https://cdn.example/poster.jpg",
            status: "SUCCESS",
            videoPreviewUrl: "https://cdn.example/video.mp4",
        });
    });

    test("uses picker photo candidates as static previews", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                picker: [
                    {
                        type: "photo",
                        url: "https://cdn.example/image.jpg",
                    },
                ],
                status: "picker",
            })
        ).toEqual({
            mediaType: "image",
            sourceUrl: "https://cdn.example/image.jpg",
            staticImageUrl: "https://cdn.example/image.jpg",
            status: "SUCCESS",
            videoPreviewUrl: null,
        });
    });

    test("marks picker responses without usable media unavailable", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                picker: [{ type: "photo" }],
                status: "picker",
            })
        ).toEqual({
            errorCode: null,
            message: "Could not find preview media for this item.",
            status: "UNAVAILABLE",
        });
    });

    test("marks local processing unavailable", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                status: "local-processing",
            })
        ).toEqual({
            errorCode: "local_processing",
            message: "This media requires local processing before previewing.",
            status: "UNAVAILABLE",
        });
    });

    test("maps Cobalt errors to typed failures", () => {
        expect(
            resolveCobaltPreviewFromResponse({
                error: { code: "api.fetch.fail" },
                status: "error",
                text: "Fetch failed",
            })
        ).toEqual({
            errorCode: "api.fetch.fail",
            message: "Fetch failed",
            status: "ERROR",
        });
    });

    test("marks malformed responses unavailable", () => {
        expect(
            resolveCobaltPreviewFromResponse({ status: "redirect" })
        ).toEqual({
            errorCode: null,
            message: "Could not find preview media for this item.",
            status: "UNAVAILABLE",
        });
    });
});
