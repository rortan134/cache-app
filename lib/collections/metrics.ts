import { getHexColorFromName } from "@/lib/common/colors";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import type { LibraryItemSource } from "@/prisma/client/enums";

export interface LibraryMetricsSegment {
    color: string;
    key: string;
    label: string;
    value: number;
}

export interface LibraryMetricsSnapshot {
    collectionCount: number;
    favoriteCount: number;
    inCollectionCount: number;
    itemCount: number;
    libraryItemCount: number;
    noteCount: number;
    sourceSegments: LibraryMetricsSegment[];
    uncollectedCount: number;
}

export interface LibraryMetricsItem {
    collections: readonly { id: string }[];
    favoritedAt: Date | null;
    kind: string;
    source: LibraryItemSource;
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
    const collectionIds = new Set<string>();
    let favoriteCount = 0;
    let noteCount = 0;
    let uncollectedCount = 0;

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
        for (const collection of item.collections) {
            collectionIds.add(collection.id);
        }
    }

    const sourceSegments = Array.from(sourceCounts.entries())
        .map(([source, value]) => {
            const label = getSourceLabel(source);
            return {
                color: getHexColorFromName(label),
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
        collectionCount: collectionIds.size,
        favoriteCount,
        inCollectionCount: itemCount - uncollectedCount,
        itemCount,
        libraryItemCount,
        noteCount,
        sourceSegments,
        uncollectedCount,
    };
}
