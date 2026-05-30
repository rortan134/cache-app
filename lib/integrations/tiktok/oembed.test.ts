import {
    isTikTokUrl,
    tiktokOembedThumbnailUrl,
    tiktokOembedUrl,
} from "@/lib/integrations/tiktok/oembed";
import { describe, expect, test } from "bun:test";

describe("isTikTokUrl", () => {
    test("accepts TikTok video hosts", () => {
        expect(
            isTikTokUrl(
                "https://www.tiktok.com/@scout2015/video/6718335390845095173"
            )
        ).toBe(true);
        expect(isTikTokUrl("https://vm.tiktok.com/ZMhExample/")).toBe(true);
    });

    test("rejects non-TikTok URLs", () => {
        expect(isTikTokUrl("https://example.com/@user/video/1")).toBe(false);
        expect(isTikTokUrl("not a url")).toBe(false);
    });
});

describe("tiktokOembedUrl", () => {
    test("builds the oEmbed URL for TikTok targets", () => {
        const targetUrl =
            "https://www.tiktok.com/@scout2015/video/6718335390845095173";
        const url = tiktokOembedUrl(targetUrl);

        expect(url).toBe(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`
        );
    });

    test("returns null for unsupported targets", () => {
        expect(tiktokOembedUrl("https://example.com/video/1")).toBeNull();
    });
});

describe("tiktokOembedThumbnailUrl", () => {
    test("returns an absolute thumbnail URL", () => {
        expect(
            tiktokOembedThumbnailUrl({
                thumbnail_url:
                    "https://p16-common-sign.tiktokcdn-eu.com/video.image",
            })
        ).toBe("https://p16-common-sign.tiktokcdn-eu.com/video.image");
    });

    test("rejects missing or unsafe thumbnail URLs", () => {
        expect(tiktokOembedThumbnailUrl({})).toBeNull();
        expect(
            tiktokOembedThumbnailUrl({ thumbnail_url: "javascript:alert(1)" })
        ).toBeNull();
    });
});
