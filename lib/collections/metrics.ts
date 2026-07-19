import { collectDuplicateBookmarkItemIds } from "@/lib/collections/library-quality";
import { getChartColorsForKeys } from "@/lib/common/colors";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import {
    LibraryItemLinkReachability,
    type LibraryItemSource,
} from "@/prisma/client/enums";

export interface LibraryMetricsSegment {
    color: string;
    key: string;
    label: string;
    value: number;
}

export interface LibraryMetricsSnapshot {
    duplicateCount: number;
    favoriteCount: number;
    inCollectionCount: number;
    itemCount: number;
    libraryItemCount: number;
    noteCount: number;
    sourceSegments: LibraryMetricsSegment[];
    uncollectedCount: number;
    unreachableCount: number;
}

export interface LibraryMetricsItem {
    collections: readonly { id: string }[];
    favoritedAt: Date | null;
    id: string;
    kind: string;
    linkReachability?: LibraryItemLinkReachability | null;
    source: LibraryItemSource;
    url: string;
}

/**
 * Build a compact metrics snapshot for the currently visible library set.
 * Source breakdown is the primary signal (Cache unifies multi-platform libraries).
 */
export function buildLibraryMetrics({
    getSourceLabel,
    items,
    libraryItemCount,
}: {
    getSourceLabel: (source: LibraryItemSource) => string;
    items: readonly LibraryMetricsItem[];
    libraryItemCount: number;
}): LibraryMetricsSnapshot {
    const sourceCounts = new Map<LibraryItemSource, number>();
    let favoriteCount = 0;
    let noteCount = 0;
    let uncollectedCount = 0;
    let unreachableCount = 0;

    for (const item of items) {
        sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);

        if (item.favoritedAt !== null) {
            favoriteCount += 1;
        }
        if (item.kind === ITEM_KIND_NOTE) {
            noteCount += 1;
        }
        if (item.collections.length === 0) {
            uncollectedCount += 1;
        }
        if (item.linkReachability === LibraryItemLinkReachability.unreachable) {
            unreachableCount += 1;
        }
    }

    const sourceEntries = Array.from(sourceCounts.entries());
    const colorsBySource = getChartColorsForKeys(
        sourceEntries.map(([source]) => source)
    );

    const sourceSegments = sourceEntries
        .map(([source, value]) => {
            const label = getSourceLabel(source);
            const color = colorsBySource.get(source);
            if (!color) {
                throw new Error(
                    `Invariant violated: missing chart color for source ${source}`
                );
            }
            return {
                color,
                key: source,
                label,
                value,
            } satisfies LibraryMetricsSegment;
        })
        .sort(
            (first, second) =>
                second.value - first.value ||
                first.label.localeCompare(second.label)
        );

    const itemCount = items.length;

    return {
        duplicateCount: collectDuplicateBookmarkItemIds(items).size,
        favoriteCount,
        inCollectionCount: itemCount - uncollectedCount,
        itemCount,
        libraryItemCount,
        noteCount,
        sourceSegments,
        uncollectedCount,
        unreachableCount,
    };
}
