import { describe, expect, test } from "bun:test";

import { appendVaryAccept, negotiateContentType } from "@/lib/common/accept";

const SUPPORTED_TYPES = ["text/html", "text/markdown"] as const;

describe("negotiateContentType", () => {
    test("prefers markdown when it is listed first", () => {
        expect(
            negotiateContentType(
                "text/markdown, text/html;q=0.8, */*;q=0.1",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBe("text/markdown");
    });

    test("uses the highest quality value", () => {
        expect(
            negotiateContentType(
                "text/html;q=0.9, text/markdown;q=0.5",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBe("text/html");
    });

    test("matches media types case-insensitively", () => {
        expect(
            negotiateContentType("TEXT/MARKDOWN", SUPPORTED_TYPES, "text/html")
        ).toBe("text/markdown");
    });

    test("uses the highest quality for duplicate media ranges", () => {
        expect(
            negotiateContentType(
                "text/html;q=0.2, text/html;q=0.9, text/markdown;q=0.5",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBe("text/html");
    });

    test("respects a specific zero-quality rejection over a wildcard", () => {
        expect(
            negotiateContentType(
                "text/markdown;q=0, */*;q=1",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBe("text/html");
    });

    test("returns null when every supported type is rejected", () => {
        expect(
            negotiateContentType(
                "text/markdown;q=0, text/html;q=0",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBeNull();
    });

    test("defaults to HTML when Accept is missing or unrestricted", () => {
        expect(negotiateContentType(null, SUPPORTED_TYPES, "text/html")).toBe(
            "text/html"
        );
        expect(negotiateContentType("*/*", SUPPORTED_TYPES, "text/html")).toBe(
            "text/html"
        );
    });

    test("returns null for an unsupported media type", () => {
        expect(
            negotiateContentType(
                "application/json",
                SUPPORTED_TYPES,
                "text/html"
            )
        ).toBeNull();
    });

    test("negotiates XML as the sitemap default representation", () => {
        expect(
            negotiateContentType(
                "application/xml",
                ["application/xml", "text/markdown"],
                "application/xml"
            )
        ).toBe("application/xml");
        expect(
            negotiateContentType(
                "text/xml",
                ["application/xml", "text/xml", "text/markdown"],
                "application/xml"
            )
        ).toBe("text/xml");
        expect(
            negotiateContentType(
                "*/*",
                ["application/xml", "text/markdown"],
                "application/xml"
            )
        ).toBe("application/xml");
    });
});

describe("appendVaryAccept", () => {
    test("preserves existing values and avoids duplicates", () => {
        const headers = new Headers({ Vary: "RSC, Accept" });

        appendVaryAccept(headers);

        expect(headers.get("Vary")).toBe("RSC, Accept");
    });

    test("adds Accept when it is missing", () => {
        const headers = new Headers({ Vary: "RSC" });

        appendVaryAccept(headers);

        expect(headers.get("Vary")).toBe("RSC, Accept");
    });
});
