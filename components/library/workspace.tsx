"use client";

import {
    createCollectionFromItems,
    type CollectionCreateFromItemsResult,
} from "@/lib/collections/actions";
import {
    toggleLibraryItemFavorite,
    updateLibraryItemCollections,
    updateLibraryItemsCollections,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemDeleteResult,
    type LibraryItemFavoriteToggleResult,
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
    | "name"
    | "priority"
    | "text-match"
    | "updated";

export type CollectionView =
    | "show-all"
    | "exclude-archives"
    | "show-shared-only";

type SortableCollectionSummary = Pick<
    LibraryCollectionSummary,
    "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
>;

export const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
    collectionTextMatchQuery: storage(""),
    collectionView: storage<CollectionView>("show-all"),
});

function compareNames<T extends Pick<SortableCollectionSummary, "name">>(
    a: T,
    b: T
) {
    return NAME_COLLATOR.compare(a.name, b.name);
}

function comparePriorities<
    T extends Pick<SortableCollectionSummary, "name" | "priority">,
>(a: T, b: T) {
    const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return diff === 0 ? compareNames(a, b) : diff;
}

function compareCreatedAt<
    T extends Pick<SortableCollectionSummary, "createdAt">,
>(a: T, b: T) {
    return b.createdAt.getTime() - a.createdAt.getTime();
}

function compareUpdatedAt<
    T extends Pick<SortableCollectionSummary, "updatedAt">,
>(a: T, b: T) {
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function compareItemCount<
    T extends Pick<SortableCollectionSummary, "itemCount">,
>(a: T, b: T) {
    return b.itemCount - a.itemCount;
}

function textMatchScore(
    collection: Pick<SortableCollectionSummary, "name">,
    normalizedQuery: string
) {
    if (normalizedQuery.length === 0) {
        return 0;
    }

    const name = collection.name.trim().toLowerCase();
    if (name === normalizedQuery) {
        return 3;
    }
    if (name.startsWith(normalizedQuery)) {
        return 2;
    }
    if (name.includes(normalizedQuery)) {
        return 1;
    }
    return 0;
}

function compareTextMatch(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    return (a: SortableCollectionSummary, b: SortableCollectionSummary) =>
        textMatchScore(b, normalizedQuery) -
            textMatchScore(a, normalizedQuery) || compareNames(a, b);
}

type SummarySorter = Record<
    Exclude<CollectionSortField, "text-match">,
    (a: SortableCollectionSummary, b: SortableCollectionSummary) => number
>;

const SUMMARY_SORTERS = {
    count: compareItemCount,
    created: compareCreatedAt,
    name: compareNames,
    priority: comparePriorities,
    updated: compareUpdatedAt,
} satisfies SummarySorter;

function sortList<T>(list: readonly T[], compare: (a: T, b: T) => number): T[] {
    return [...list].sort(compare);
}

export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: readonly T[]): T[] {
    return sortList(collections, comparePriorities);
}

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
    favoriteItemIdSet: ReadonlySet<string>;
    favoriteItems: LibraryItemWithCollections[];
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
    onOpenFavoriteItem: (item: LibraryItemWithCollections) => void;
    onSelectCollection: (collectionId: string) => void;
    onToggleItemFavorite: (
        item: LibraryItemWithCollections
    ) => Promise<LibraryItemFavoriteToggleResult>;
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

export const OpenFavoriteItemRefContext = React.createContext<React.RefObject<
    ((item: LibraryItemWithCollections) => void) | null
> | null>(null);

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
    const { collectionSortField, collectionTextMatchQuery, collectionView } =
        useCollectionsSortStore();

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
    const itemFavoriteToggleVersionByItemIdRef = React.useRef(
        new Map<string, number>()
    );
    const openFavoriteItemRef = React.useRef<
        ((item: LibraryItemWithCollections) => void) | null
    >(null);
    const requestCreateRef = React.useRef<((itemId?: string) => void) | null>(
        null
    );

    const visibleCollections = collections.filter((collection) => {
        switch (collectionView) {
            case "exclude-archives":
                return collection.priority !== "archive";
            case "show-shared-only":
                return collection.shareId !== null;
            default:
                return true;
        }
    });

    const collectionSummaries = sortCollectionSummaries(
        visibleCollections,
        collectionSortField,
        collectionTextMatchQuery
    );

    const validCollectionIds = new Set(
        collections.map((collection) => collection.id)
    );
    const validSelectedCollectionIds = selectedCollectionIds.filter((id) =>
        validCollectionIds.has(id)
    );

    const { collectionPreviewThumbnailUrlsById, itemsByCollectionId } =
        buildCollectionItemIndexes(items);

    const favoriteItems = items
        .filter(
            (
                item
            ): item is LibraryItemWithCollections & { favoritedAt: Date } =>
                item.favoritedAt !== null
        )
        .toSorted(
            (left, right) =>
                right.favoritedAt.getTime() - left.favoritedAt.getTime()
        );

    const favoriteItemIdSet = new Set(favoriteItems.map((item) => item.id));

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

    const handleToggleItemFavorite = useStableCallback(
        async (
            item: LibraryItemWithCollections
        ): Promise<LibraryItemFavoriteToggleResult> => {
            const requestVersion =
                (itemFavoriteToggleVersionByItemIdRef.current.get(item.id) ??
                    0) + 1;
            itemFavoriteToggleVersionByItemIdRef.current.set(
                item.id,
                requestVersion
            );

            const previousFavoritedAt = item.favoritedAt;
            const optimisticFavoritedAt = previousFavoritedAt
                ? null
                : new Date();

            setItems((current) =>
                replaceItemFavoritedAt(current, item.id, optimisticFavoritedAt)
            );

            let result: LibraryItemFavoriteToggleResult;
            try {
                result = await toggleLibraryItemFavorite(item.id);
            } catch {
                result = {
                    message: "We couldn't update this favorite right now.",
                    status: "ERROR",
                };
            }

            if (
                itemFavoriteToggleVersionByItemIdRef.current.get(item.id) !==
                requestVersion
            ) {
                return result;
            }
            itemFavoriteToggleVersionByItemIdRef.current.delete(item.id);

            if (result.status === "UPDATED") {
                setItems((current) =>
                    replaceItemWithFavoriteState(current, result.item)
                );
            } else {
                setItems((current) =>
                    replaceItemFavoritedAt(
                        current,
                        item.id,
                        previousFavoritedAt
                    )
                );
            }

            return result;
        }
    );

    const handleOpenFavoriteItem = useStableCallback(
        (item: LibraryItemWithCollections) => {
            openFavoriteItemRef.current?.(item);
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

    const requestCreate = useStableCallback((itemId?: string) => {
        requestCreateRef.current?.(itemId);
    });

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

    const value: WorkspaceContextValue = React.useMemo(
        () => ({
            collectionPreviewThumbnailUrlsById,
            collectionSummaries,
            collections,
            favoriteItemIdSet,
            favoriteItems,
            items,
            itemsByCollectionId,
            onClearCollectionFilters: clearCollectionFilters,
            onCreateCollectionFromResults: handleCreateCollectionFromResults,
            onDeleteItemSuccess: handleDeleteItemSuccess,
            onOpenFavoriteItem: handleOpenFavoriteItem,
            onSelectCollection: toggleCollectionSelection,
            onToggleItemFavorite: handleToggleItemFavorite,
            onUpdateItemCollections: handleUpdateItemCollections,
            onUpdateItemsCollections: handleUpdateItemsCollections,
            requestCreate,
            selectedCollectionIds: validSelectedCollectionIds,
            setCollections,
            setItems,
        }),
        [
            collectionPreviewThumbnailUrlsById,
            collectionSummaries,
            collections,
            clearCollectionFilters,
            favoriteItemIdSet,
            favoriteItems,
            handleCreateCollectionFromResults,
            handleDeleteItemSuccess,
            handleOpenFavoriteItem,
            handleToggleItemFavorite,
            handleUpdateItemCollections,
            handleUpdateItemsCollections,
            items,
            itemsByCollectionId,
            requestCreate,
            toggleCollectionSelection,
            validSelectedCollectionIds,
        ]
    );

    return (
        <WorkspaceContext value={value}>
            <RequestCreateRefContext value={requestCreateRef}>
                <OpenFavoriteItemRefContext value={openFavoriteItemRef}>
                    {children}
                </OpenFavoriteItemRefContext>
            </RequestCreateRefContext>
        </WorkspaceContext>
    );
}

interface WorkspaceProviderProps {
    initialCollections: LibraryCollectionSummary[];
    initialItems: LibraryItemWithCollections[];
}

function replaceItemFavoritedAt(
    items: LibraryItemWithCollections[],
    itemId: string,
    favoritedAt: Date | null
): LibraryItemWithCollections[] {
    return items.map((item) =>
        item.id === itemId ? { ...item, favoritedAt } : item
    );
}

function replaceItemWithFavoriteState(
    items: LibraryItemWithCollections[],
    item: LibraryItemWithCollections
): LibraryItemWithCollections[] {
    return items.map((entry) => (entry.id === item.id ? item : entry));
}

function replaceItemCollections(
    items: LibraryItemWithCollections[],
    itemId: string,
    collections: LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) =>
        item.id === itemId ? { ...item, collections } : item
    );
}

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
            ? { ...item, collections: nextCollections }
            : item;
    });
}

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

function getPreviewOrderSeed(value: string): number {
    let hash = 0;
    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash;
}

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
