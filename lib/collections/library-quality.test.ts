import { describe, expect, test } from "bun:test";
import {
    collectDuplicateBookmarkItemIds,
    isLinkProbeCandidate,
    needsLinkReachabilityProbe,
} from "@/lib/collections/library-quality";
import { LibraryItemSource } from "@/prisma/client/enums";

describe("collectDuplicateBookmarkItemIds", () => {
    test("groups by canonical URL across sources", () => {
        const ids = collectDuplicateBookmarkItemIds([
            {
                id: "a",
                kind: "bookmark",
                source: LibraryItemSource.chrome_bookmarks,
                url: "https://www.example.com/post?utm_source=x",
            },
            {
                id: "b",
                kind: "bookmark",
                source: LibraryItemSource.other,
                url: "http://example.com/post/",
            },
            {
                id: "c",
                kind: "bookmark",
                source: LibraryItemSource.rss_feed,
                url: "https://unique.example/only",
            },
            {
                id: "note",
                kind: "note",
                source: LibraryItemSource.cache_note,
                url: "https://example.com/post",
            },
        ]);

        expect(ids.has("a")).toBe(true);
        expect(ids.has("b")).toBe(true);
        expect(ids.has("c")).toBe(false);
        expect(ids.has("note")).toBe(false);
    });
});

describe("isLinkProbeCandidate", () => {
    test("skips notes and bot-hostile sources", () => {
        expect(
            isLinkProbeCandidate({
                id: "1",
                kind: "bookmark",
                source: LibraryItemSource.chrome_bookmarks,
                url: "https://example.com",
            })
        ).toBe(true);
        expect(
            isLinkProbeCandidate({
                id: "2",
                kind: "note",
                source: LibraryItemSource.cache_note,
                url: "https://example.com",
            })
        ).toBe(false);
        expect(
            isLinkProbeCandidate({
                id: "3",
                kind: "bookmark",
                source: LibraryItemSource.instagram,
                url: "https://instagram.com/p/x",
            })
        ).toBe(false);
    });
});

describe("needsLinkReachabilityProbe", () => {
    test("only unchecked probeable bookmarks need a probe", () => {
        expect(
            needsLinkReachabilityProbe({
                id: "1",
                kind: "bookmark",
                linkCheckedAt: null,
                source: LibraryItemSource.chrome_bookmarks,
                url: "https://example.com",
            })
        ).toBe(true);
        expect(
            needsLinkReachabilityProbe({
                id: "2",
                kind: "bookmark",
                linkCheckedAt: new Date(),
                source: LibraryItemSource.chrome_bookmarks,
                url: "https://example.com",
            })
        ).toBe(false);
    });
});
