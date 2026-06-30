import {
    McpAddLibraryItemInputSchema,
    McpLibraryItemListInputSchema,
} from "@/lib/integrations/mcp/protocol";
import { describe, expect, test } from "bun:test";

describe("McpLibraryItemListInputSchema", () => {
    test("rejects a collectionId that is just whitespace", () => {
        const result = McpLibraryItemListInputSchema.safeParse({
            collectionId: "   ",
        });
        expect(result.success).toBe(false);
    });

    test("accepts a trimmed non-empty collectionId", () => {
        const result = McpLibraryItemListInputSchema.safeParse({
            collectionId: "col_123",
        });
        expect(result.success).toBe(true);
    });

    test("accepts no collectionId as 'no filter'", () => {
        const result = McpLibraryItemListInputSchema.safeParse({});
        expect(result.success).toBe(true);
    });
});

describe("McpAddLibraryItemInputSchema", () => {
    test("rejects empty input — must provide exactly one of note or url", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    test("rejects providing both noteContentText and url together", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            noteContentText: "a note",
            url: "https://example.com",
        });
        expect(result.success).toBe(false);
    });

    test("accepts noteContentText alone", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            noteContentText: "remind me to ship",
        });
        expect(result.success).toBe(true);
    });

    test("accepts url alone (https)", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            url: "https://example.com/article",
        });
        expect(result.success).toBe(true);
    });

    test("accepts url alone (http)", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            url: "http://example.com/article",
        });
        expect(result.success).toBe(true);
    });

    test("rejects a non-http url scheme", () => {
        const ftp = McpAddLibraryItemInputSchema.safeParse({
            url: "ftp://example.com/file",
        });
        expect(ftp.success).toBe(false);

        const js = McpAddLibraryItemInputSchema.safeParse({
            url: "javascript:alert(1)",
        });
        expect(js.success).toBe(false);
    });

    test("rejects url that is only whitespace", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            url: "   ",
        });
        expect(result.success).toBe(false);
    });

    test("strips whitespace and accepts a padded url", () => {
        const result = McpAddLibraryItemInputSchema.safeParse({
            url: "  https://example.com  ",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.url).toBe("https://example.com");
        }
    });
});
