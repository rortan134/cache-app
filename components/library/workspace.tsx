"use client";

import {
    createCollectionFromItems,
    type CollectionCreateFromItemsResult,
} from "@/lib/collections/actions";
import {
    updateLibraryItemCollections,
    updateLibraryItemsCollections,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemDeleteResult,
    type LibraryItemsCollectionsUpdateResult,
} from "@/lib/collections/items";
import {
    itemPreviewImageUrl,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import type { CollectionPriority } from "@/prisma/client/enums";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

export const NAME_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

const PRIORITY_RANK: Record<CollectionPriority, number> = {
    archive: 3,
    none: 4,
    peripheral: 2,
    relevant: 1,
    very_relevant: 0,
};

const COLLECTION_PREVIEW_THUMBNAIL_LIMIT = 5;

export type CollectionSortField =
    | "count"
    | "created"
    | "priority"
    | "text-match"
    | "updated";

type SortableCollectionSummary = Pick<
    LibraryCollectionSummary,
    "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
>;

export const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
    collectionTextMatchQuery: storage(""),
    shouldExcludeArchives: storage(false),
});

/**
 * Alphabetical sort used as tiebreaker when primary sort keys are equal.
 */
function compareNames<T extends Pick<SortableCollectionSummary, "name">>(
    a: T,
    b: T
) {
    return NAME_COLLATOR.compare(a.name, b.name);
}

/**
 * Sort by priority rank, then alphabetically by name within the same tier.
 */
function comparePriorities<
    T extends Pick<SortableCollectionSummary, "name" | "priority">,
>(a: T, b: T) {
    const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return diff === 0 ? compareNames(a, b) : diff;
}

/**
 * Reverse-chronological sort so newer collections appear first.
 */
function compareCreatedAt<
    T extends Pick<SortableCollectionSummary, "createdAt">,
>(a: T, b: T) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Reverse-chronological sort by last-updated timestamp.
 */
function compareUpdatedAt<
    T extends Pick<SortableCollectionSummary, "updatedAt">,
>(a: T, b: T) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/**
 * Descending sort by item count so largest collections surface first.
 */
function compareItemCount<
    T extends Pick<SortableCollectionSummary, "itemCount">,
>(a: T, b: T) {
    return b.itemCount - a.itemCount;
}

/**
 * Relevance score for text-match sorting.
 *
 * Exact matches rank highest (3), then prefix matches (2),
 * then substring matches (1). Zero means no match.
 */
function textMatchScore(
    collection: Pick<SortableCollectionSummary, "name">,
    query: string
) {
    const name = collection.name.trim().toLowerCase();
    const q = query.trim().toLowerCase();

    if (q.length === 0) {
        return 0;
    }
    if (name === q) {
        return 3;
    }
    if (name.startsWith(q)) {
        return 2;
    }
    if (name.includes(q)) {
        return 1;
    }
    return 0;
}

/**
 * Sort by text-match relevance descending, with alphabetical name
 * order as a stable tiebreaker.
 */
function compareTextMatch(query: string) {
    return (a: SortableCollectionSummary, b: SortableCollectionSummary) =>
        textMatchScore(b, query) - textMatchScore(a, query) ||
        compareNames(a, b);
}

/**
 * Map of sort field to comparator function.
 *
 * Dispatches the active sort without branching on every comparison.
 */
const SUMMARY_SORTERS = {
    count: compareItemCount,
    created: compareCreatedAt,
    priority: comparePriorities,
    updated: compareUpdatedAt,
} satisfies Record<
    Exclude<CollectionSortField, "text-match">,
    (a: SortableCollectionSummary, b: SortableCollectionSummary) => number
>;

/**
 * Immutable sort that avoids mutating the original array.
 */
function sortList<T>(list: readonly T[], compare: (a: T, b: T) => number): T[] {
    return [...list].sort(compare);
}

/**
 * Sort collections by priority rank first, then alphabetically by name.
 *
 * This is the canonical order used anywhere collections appear together
 * (sidebar, tags, dropdowns) so users see high-priority groups first.
 */
export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: readonly T[]): T[] {
    return sortList(collections, comparePriorities);
}

/**
 * Sort collection summaries by the active sort field.
 *
 * "text-match" uses a relevance score (exact > prefix > contains) so the
 * most likely target surfaces first as the user types.
 */
function sortCollectionSummaries<T extends SortableCollectionSummary>(
    collections: readonly T[],
    sortField: CollectionSortField,
    textMatchQuery = ""
): T[] {
    if (sortField === "text-match") {
        return sortList(collections, compareTextMatch(textMatchQuery));
    }
    return sortList(collections, SUMMARY_SORTERS[sortField]);
}

interface WorkspaceContextValue {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collectionSummaries: LibraryCollectionSummary[];
    collections: LibraryCollectionSummary[];
    items: LibraryItemWithCollections[];
    itemsByCollectionId: Map<string, LibraryItemWithCollections[]>;
    onClearCollectionFilters: () => void;
    onCreateCollectionFromResults: (input: {
        description?: string;
        itemIds: string[];
        name: string;
    }) => Promise<CollectionCreateFromItemsResult>;
    onDeleteItemSuccess: (
        result: Extract<LibraryItemDeleteResult, { status: "DELETED" }>
    ) => void;
    onSelectCollection: (collectionId: string) => void;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    onUpdateItemsCollections: (input: {
        itemIds: string[];
        nextSharedCollectionIds: string[];
        previousSharedCollectionIds: string[];
    }) => Promise<LibraryItemsCollectionsUpdateResult>;
    requestCreate: (itemId?: string) => void;
    selectedCollectionIds: string[];
    setCollections: React.Dispatch<
        React.SetStateAction<LibraryCollectionSummary[]>
    >;
    setItems: React.Dispatch<
        React.SetStateAction<LibraryItemWithCollections[]>
    >;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(
    null
);

export const RequestCreateRefContext = React.createContext<React.RefObject<
    ((itemId?: string) => void) | null
> | null>(null);

/**
 * Access the library workspace context.
 *
 * Must be rendered inside `WorkspaceProvider` so components can read and
 * mutate collections, items, and selection state.
 */
export function useWorkspaceContext(): WorkspaceContextValue {
    const context = React.use(WorkspaceContext);
    if (!context) {
        throw new Error(
            "Library workspace context is required for library workspace controls."
        );
    }
    return context;
}

export function WorkspaceProvider({
    initialCollections,
    initialItems,
    children,
}: React.PropsWithChildren<WorkspaceProviderProps>) {
    const [items, setItems] =
        React.useState<LibraryItemWithCollections[]>(initialItems);
    const [collections, setCollections] =
        React.useState<LibraryCollectionSummary[]>(initialCollections);
    const [selectedCollectionIds, setSelectedCollectionIds] = React.useState<
        string[]
    >([]);

    const collectionUpdateVersionByItemIdRef = React.useRef(
        new Map<string, number>()
    );

    const {
        collectionSortField,
        collectionTextMatchQuery,
        shouldExcludeArchives,
    } = useCollectionsSortStore();

    const visibleCollections = shouldExcludeArchives
        ? collections.filter((collection) => collection.priority !== "archive")
        : collections;

    const collectionSummaries = sortCollectionSummaries(
        visibleCollections,
        collectionSortField,
        collectionTextMatchQuery
    );

    React.useEffect(
        function syncItemsFromInitialItems() {
            setItems(initialItems);
        },
        [initialItems]
    );

    React.useEffect(
        function syncCollectionsFromInitialCollections() {
            setCollections(initialCollections);
        },
        [initialCollections]
    );

    React.useEffect(
        function pruneSelectedCollections() {
            const collectionIds = new Set(
                collections.map((collection) => collection.id)
            );
            setSelectedCollectionIds((current) => {
                const next = current.filter((id) => collectionIds.has(id));
                return next.length === current.length ? current : next;
            });
        },
        [collections]
    );

    const { collectionPreviewThumbnailUrlsById, itemsByCollectionId } =
        buildCollectionItemIndexes(items);

    const clearCollectionFilters = useStableCallback(() => {
        setSelectedCollectionIds([]);
    });

    const toggleCollectionSelection = useStableCallback((id: string) => {
        setSelectedCollectionIds((current) =>
            current.includes(id)
                ? current.filter((entryId) => entryId !== id)
                : [...current, id]
        );
    });

    const handleUpdateItemCollections = useStableCallback(
        async (
            itemId: string,
            collectionIds: string[]
        ): Promise<LibraryItemCollectionsUpdateResult> => {
            const requestVersion =
                (collectionUpdateVersionByItemIdRef.current.get(itemId) ?? 0) +
                1;
            collectionUpdateVersionByItemIdRef.current.set(
                itemId,
                requestVersion
            );

            const previousCollections =
                items.find((item) => item.id === itemId)?.collections ?? [];

            const collectionIdSet = new Set(collectionIds);
            const optimisticCollections = sortCollections(
                collections.filter((collection) =>
                    collectionIdSet.has(collection.id)
                )
            );
            setItems((current) =>
                replaceItemCollections(current, itemId, optimisticCollections)
            );

            let result: LibraryItemCollectionsUpdateResult;
            try {
                result = await updateLibraryItemCollections({
                    collectionIds,
                    itemId,
                });
            } catch {
                result = {
                    message: "We couldn't update collections for this item.",
                    status: "ERROR",
                };
            }

            // Ignore out-of-order responses so older requests can't clobber a
            // newer selection for the same item.
            if (
                collectionUpdateVersionByItemIdRef.current.get(itemId) !==
                requestVersion
            ) {
                return result;
            }
            collectionUpdateVersionByItemIdRef.current.delete(itemId);

            if (result.status === "UPDATED") {
                setCollections((current) =>
                    mergeCollectionSummaries(
                        current,
                        result.collectionSummaries
                    )
                );
                setItems((current) =>
                    replaceItemCollections(current, itemId, result.collections)
                );
            } else {
                setItems((current) =>
                    replaceItemCollections(current, itemId, previousCollections)
                );
            }

            return result;
        }
    );

    const handleUpdateItemsCollections = useStableCallback(
        async (input: {
            itemIds: string[];
            nextSharedCollectionIds: string[];
            previousSharedCollectionIds: string[];
        }): Promise<LibraryItemsCollectionsUpdateResult> => {
            let result: LibraryItemsCollectionsUpdateResult;

            try {
                result = await updateLibraryItemsCollections(input);
            } catch {
                result = {
                    message: "We couldn't update collections for those items.",
                    status: "ERROR",
                };
            }

            if (result.status !== "UPDATED") {
                return result;
            }

            setCollections((current) =>
                mergeCollectionSummaries(current, result.collectionSummaries)
            );
            setItems((current) =>
                replaceMultipleItemCollections(current, result.itemCollections)
            );

            return result;
        }
    );

    const handleDeleteItemSuccess = useStableCallback(
        (result: Extract<LibraryItemDeleteResult, { status: "DELETED" }>) => {
            setCollections((current) =>
                mergeCollectionSummaries(current, result.collectionSummaries)
            );
        }
    );

    const handleCreateCollectionFromResults = useStableCallback(
        async (input: {
            description?: string;
            itemIds: string[];
            name: string;
        }): Promise<CollectionCreateFromItemsResult> => {
            let result: CollectionCreateFromItemsResult;

            try {
                result = await createCollectionFromItems(input);
            } catch {
                result = {
                    message: "We couldn't create this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "CREATED") {
                return result;
            }

            setCollections((current) =>
                mergeCollectionSummaries(current, [result.collection])
            );
            setItems((current) =>
                appendCollection(
                    current,
                    result.assignedItemIds,
                    result.collection
                )
            );

            return result;
        }
    );

    const requestCreateRef = React.useRef<((itemId?: string) => void) | null>(
        null
    );
    const requestCreate = useStableCallback((itemId?: string) => {
        requestCreateRef.current?.(itemId);
    });

    const value = React.useMemo(
        () => ({
            collectionPreviewThumbnailUrlsById,
            collectionSummaries,
            collections,
            items,
            itemsByCollectionId,
            onClearCollectionFilters: clearCollectionFilters,
            onCreateCollectionFromResults: handleCreateCollectionFromResults,
            onDeleteItemSuccess: handleDeleteItemSuccess,
            onSelectCollection: toggleCollectionSelection,
            onUpdateItemCollections: handleUpdateItemCollections,
            onUpdateItemsCollections: handleUpdateItemsCollections,
            requestCreate,
            selectedCollectionIds,
            setCollections,
            setItems,
        }),
        [
            collectionPreviewThumbnailUrlsById,
            collectionSummaries,
            collections,
            clearCollectionFilters,
            handleCreateCollectionFromResults,
            handleDeleteItemSuccess,
            handleUpdateItemCollections,
            handleUpdateItemsCollections,
            items,
            itemsByCollectionId,
            requestCreate,
            selectedCollectionIds,
            toggleCollectionSelection,
        ]
    );

    return (
        <WorkspaceContext value={value}>
            <RequestCreateRefContext value={requestCreateRef}>
                {children}
            </RequestCreateRefContext>
        </WorkspaceContext>
    );
}

interface WorkspaceProviderProps {
    initialCollections: LibraryCollectionSummary[];
    initialItems: LibraryItemWithCollections[];
}

/**
 * Replace all collections on a single item by ID.
 *
 * Used for optimistic updates when adding or removing an item from
 * a collection. Creates a new array so React detects the change.
 */
function replaceItemCollections(
    items: LibraryItemWithCollections[],
    itemId: string,
    collections: LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) =>
        item.id === itemId
            ? {
                  ...item,
                  collections: [...collections],
              }
            : item
    );
}

/**
 * Add a collection tag to multiple items without duplicates.
 *
 * Skips items that already belong to the collection to avoid
 * double-counting after optimistic re-adds.
 */
export function appendCollection(
    items: LibraryItemWithCollections[],
    itemIds: string[],
    collection: LibraryCollectionTag
): LibraryItemWithCollections[] {
    const itemIdSet = new Set(itemIds);
    if (itemIdSet.size === 0) {
        return items;
    }

    return items.map((item) => {
        if (!itemIdSet.has(item.id)) {
            return item;
        }
        if (item.collections.some((entry) => entry.id === collection.id)) {
            return item;
        }
        return {
            ...item,
            collections: sortCollections([...item.collections, collection]),
        };
    });
}

/**
 * Batch-replace collections across multiple items from a server payload.
 *
 * Builds a lookup map so the operation is O(n + m) instead of O(n*m).
 */
function replaceMultipleItemCollections(
    items: LibraryItemWithCollections[],
    itemCollections: Array<{
        collections: LibraryCollectionTag[];
        itemId: string;
    }>
): LibraryItemWithCollections[] {
    if (itemCollections.length === 0) {
        return items;
    }

    const collectionsByItemId = new Map(
        itemCollections.map((entry) => [entry.itemId, entry.collections])
    );

    return items.map((item) => {
        const nextCollections = collectionsByItemId.get(item.id);
        return nextCollections
            ? {
                  ...item,
                  collections: [...nextCollections],
              }
            : item;
    });
}

/**
 * Merge fresh server summaries into the local collection list without
 * dropping existing entries.
 *
 * New collections are appended; existing ones are patched in place so
 * React keys remain stable. The result is re-sorted so priority order
 * is preserved after updates.
 */
export function mergeCollectionSummaries(
    collections: LibraryCollectionSummary[],
    nextCollections: LibraryCollectionSummary[]
): LibraryCollectionSummary[] {
    if (nextCollections.length === 0) {
        return collections;
    }

    const nextCollectionById = new Map(
        nextCollections.map((collection) => [collection.id, collection])
    );
    const mergedCollections = collections.map(
        (collection) => nextCollectionById.get(collection.id) ?? collection
    );

    const existingIds = new Set(collections.map((collection) => collection.id));
    return sortCollections([
        ...mergedCollections,
        ...nextCollections.filter(
            (collection) => !existingIds.has(collection.id)
        ),
    ]);
}

/**
 * Deterministic hash for a string used to shuffle preview thumbnails.
 *
 * Keeps the order stable for the same collection + item pair so thumbnails
 * don't jump around on re-renders.
 */
function getPreviewOrderSeed(value: string): number {
    let hash = 0;
    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash;
}

/**
 * Build two indexes from the item list:
 * 1. Items grouped by collection id.
 * 2. Up to 5 deterministic preview thumbnail URLs per collection.
 */
function buildCollectionItemIndexes(items: LibraryItemWithCollections[]): {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    itemsByCollectionId: Map<string, LibraryItemWithCollections[]>;
} {
    const itemsByCollectionId = new Map<string, LibraryItemWithCollections[]>();
    for (const item of items) {
        for (const collection of item.collections) {
            const entries = itemsByCollectionId.get(collection.id);
            if (entries) {
                entries.push(item);
            } else {
                itemsByCollectionId.set(collection.id, [item]);
            }
        }
    }

    const collectionPreviewThumbnailUrlsById = new Map<string, string[]>();
    for (const [collectionId, collectionItems] of itemsByCollectionId) {
        collectionPreviewThumbnailUrlsById.set(
            collectionId,
            buildCollectionPreviewThumbnailUrls(collectionId, collectionItems)
        );
    }

    return {
        collectionPreviewThumbnailUrlsById,
        itemsByCollectionId,
    };
}

/**
 * Deterministically select up to five preview thumbnail URLs for a
 * collection.
 *
 * Uses seeded ordering so thumbnails don't shuffle on re-render.
 * Items without a usable preview image are skipped.
 */
function buildCollectionPreviewThumbnailUrls(
    collectionId: string,
    items: LibraryItemWithCollections[]
): string[] {
    const previewEntries: Array<{ orderSeed: number; url: string }> = [];

    for (const item of items) {
        const url = itemPreviewImageUrl(item);
        if (url === null) {
            continue;
        }
        previewEntries.push({
            orderSeed: getPreviewOrderSeed(`${collectionId}:${item.id}`),
            url,
        });
    }

    return previewEntries
        .sort((left, right) => left.orderSeed - right.orderSeed)
        .slice(0, COLLECTION_PREVIEW_THUMBNAIL_LIMIT)
        .map((entry) => entry.url);
}
