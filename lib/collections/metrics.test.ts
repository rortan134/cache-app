import { buildLibraryMetrics } from "@/lib/collections/metrics";
import {
    LibraryItemLinkReachability,
    LibraryItemSource,
} from "@/prisma/client/enums";
import { describe, expect, test } from "bun:test";

describe("buildLibraryMetrics", () => {
    test("summarizes sources, importance, and gaps", () => {
        const metrics = buildLibraryMetrics({
            getSourceLabel: (source) => source,
            items: [
                {
                    collections: [{ id: "c1" }],
                    favoritedAt: new Date("2026-01-01"),
                    id: "a",
                    kind: "bookmark",
                    linkReachability: LibraryItemLinkReachability.reachable,
                    source: LibraryItemSource.chrome_bookmarks,
                    url: "https://www.example.com/post?utm_source=x",
                },
                {
                    collections: [],
                    favoritedAt: null,
                    id: "b",
                    kind: "bookmark",
                    linkReachability: LibraryItemLinkReachability.unreachable,
                    source: LibraryItemSource.other,
                    url: "http://example.com/post/",
                },
                {
                    collections: [{ id: "c1" }, { id: "c2" }],
                    favoritedAt: null,
                    id: "c",
                    kind: "bookmark",
                    linkReachability: null,
                    source: LibraryItemSource.rss_feed,
                    url: "https://news.ycombinator.com/item?id=1",
                },
                {
                    collections: [],
                    favoritedAt: new Date("2026-02-01"),
                    id: "d",
                    kind: "note",
                    linkReachability: null,
                    source: LibraryItemSource.cache_note,
                    url: "about:blank",
                },
                {
                    collections: [{ id: "c2" }],
                    favoritedAt: null,
                    id: "e",
                    kind: "bookmark",
                    source: LibraryItemSource.chrome_bookmarks,
                    url: "https://github.com/anomalyco/opencode",
                },
            ],
            libraryItemCount: 6,
        });

        expect(metrics.itemCount).toBe(5);
        expect(metrics.libraryItemCount).toBe(6);
        expect(metrics.favoriteCount).toBe(2);
        expect(metrics.noteCount).toBe(1);
        expect(metrics.inCollectionCount).toBe(3);
        expect(metrics.uncollectedCount).toBe(2);
        expect(metrics.duplicateCount).toBe(2);
        expect(metrics.unreachableCount).toBe(1);
        expect(metrics.sourceSegments[0]?.value).toBe(2);
    });
});
