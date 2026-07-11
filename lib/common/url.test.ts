import { describe, expect, test } from "bun:test";
import { canonicalBookmarkUrl } from "@/lib/common/url";

describe("canonicalBookmarkUrl", () => {
    test("normalizes scheme, www, and trailing slash", () => {
        expect(canonicalBookmarkUrl("HTTPS://www.Example.com/path/")).toBe(
            "example.com/path"
        );
        expect(canonicalBookmarkUrl("http://example.com/path")).toBe(
            "example.com/path"
        );
    });

    test("strips tracking params and fragments", () => {
        expect(
            canonicalBookmarkUrl(
                "https://example.com/a?utm_source=x&id=1&fbclid=y#section"
            )
        ).toBe("example.com/a?id=1");
    });

    test("keeps non-default ports and returns null for non-http", () => {
        expect(canonicalBookmarkUrl("https://example.com:8443/x")).toBe(
            "example.com:8443/x"
        );
        expect(canonicalBookmarkUrl("mailto:a@b.com")).toBeNull();
        expect(canonicalBookmarkUrl("not a url")).toBeNull();
        expect(canonicalBookmarkUrl("")).toBeNull();
    });
});
