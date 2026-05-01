"use client";

import {
    sortCollections,
    sortCollectionSummaries,
    useCollectionsSortStore,
} from "@/components/library/collections";
import {
    createCollectionFromItems,
    type CollectionCreateFromItemsResult,
} from "@/lib/collections/actions";
import {
    updateLibraryItemCollections,
    updateLibraryItemsCollections,
    type LibraryItemDeleteResult,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemsCollectionsUpdateResult,
} from "@/lib/collections/items";
import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import * as React from "react";

interface LibraryWorkspaceContextValue {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collectionSummaries: LibraryCollectionSummary[];
    collections: LibraryCollectionSummary[];
    hasAccess: boolean;
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
    selectedCollectionIds: string[];
    setCollections: React.Dispatch<
        React.SetStateAction<LibraryCollectionSummary[]>
    >;
    setItems: React.Dispatch<
        React.SetStateAction<LibraryItemWithCollections[]>
    >;
}

const WorkspaceContext =
    React.createContext<LibraryWorkspaceContextValue | null>(null);

export function useWorkspace(): LibraryWorkspaceContextValue {
    const context = React.use(WorkspaceContext);
    if (!context) {
        throw new Error(
            "Library workspace context is required for library workspace controls."
        );
    }
    return context;
}

interface LibraryWorkspaceProviderProps {
    hasAccess: boolean;
    initialCollections: LibraryCollectionSummary[];
    initialItems: LibraryItemWithCollections[];
}

export function WorkspaceProvider({
    hasAccess,
    initialCollections,
    initialItems,
    children,
}: React.PropsWithChildren<LibraryWorkspaceProviderProps>) {
    const [items, setItems] = React.useState<LibraryItemWithCollections[]>(
        () => [...initialItems]
    );
    const [collections, setCollections] = React.useState<
        LibraryCollectionSummary[]
    >([...initialCollections]);
    const [selectedCollectionIds, setSelectedCollectionIds] = React.useState<
        string[]
    >([]);
    const collectionUpdateVersionByItemIdRef = React.useRef(
        new Map<string, number>()
    );
    const { collectionSortField, collectionTextMatchQuery } =
        useCollectionsSortStore();
    const collectionSummaries = sortCollectionSummaries(
        collections,
        collectionSortField,
        collectionTextMatchQuery
    );

    // Initial items are copied into local state so optimistic collection edits
    // can render immediately, then resync when the server payload changes.
    React.useEffect(
        function syncItemsFromInitialItems() {
            setItems([...initialItems]);
        },
        [initialItems]
    );

    // Collections follow the same local mirror as items because collection
    // summaries are updated optimistically by item membership changes.
    React.useEffect(
        function syncCollectionsFromInitialCollections() {
            setCollections([...initialCollections]);
        },
        [initialCollections]
    );

    // Collection filters must only reference live collections after creation,
    // deletion, or server refreshes, otherwise hidden stale filters can mask results.
    React.useEffect(
        function pruneSelectedCollections() {
            const collectionIds = new Set(
                collections.map((collection) => collection.id)
            );
            setSelectedCollectionIds((current) => {
                const next = current.filter((collectionId) =>
                    collectionIds.has(collectionId)
                );
                return next.length === current.length ? current : next;
            });
        },
        [collections]
    );

    const { collectionPreviewThumbnailUrlsById, itemsByCollectionId } =
        useCollectionItemIndexes(items);

    const clearCollectionFilters = () => {
        setSelectedCollectionIds([]);
    };

    const handleToggleCollectionSelection = (id: string) => {
        setSelectedCollectionIds((current) =>
            current.includes(id)
                ? current.filter((entryId) => entryId !== id)
                : [...current, id]
        );
    };

    const handleUpdateItemCollections = (
        itemId: string,
        collectionIds: string[]
    ): Promise<LibraryItemCollectionsUpdateResult> => {
        const requestVersion =
            (collectionUpdateVersionByItemIdRef.current.get(itemId) ?? 0) + 1;
        collectionUpdateVersionByItemIdRef.current.set(itemId, requestVersion);
        const previousCollections =
            items.find((item) => item.id === itemId)?.collections ?? [];
        const optimisticCollections = sortCollections(
            collections.filter((collection) =>
                collectionIds.includes(collection.id)
            )
        );

        setItems((current) =>
            replaceItemCollections(current, itemId, optimisticCollections)
        );

        const runUpdate = async () => {
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
        };

        return runUpdate();
    };

    const handleUpdateItemsCollections = async (input: {
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
    };

    const handleDeleteItemSuccess = (
        result: Extract<LibraryItemDeleteResult, { status: "DELETED" }>
    ) => {
        setCollections((current) =>
            mergeCollectionSummaries(current, result.collectionSummaries)
        );
    };

    const handleCreateCollectionFromResults = async (input: {
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

        const nextCollection = {
            createdAt: result.collection.createdAt,
            description: result.collection.description,
            id: result.collection.id,
            name: result.collection.name,
            priority: result.collection.priority,
            sharedAt: result.collection.sharedAt,
            shareId: result.collection.shareId,
            updatedAt: result.collection.updatedAt,
        } satisfies LibraryCollectionTag;

        setCollections((current) =>
            mergeCollectionSummaries(current, [result.collection])
        );
        setItems((current) =>
            appendCollectionToItems(
                current,
                result.assignedItemIds,
                nextCollection
            )
        );

        return result;
    };

    return (
        <WorkspaceContext
            value={{
                collectionPreviewThumbnailUrlsById,
                collectionSummaries,
                collections,
                hasAccess,
                items,
                itemsByCollectionId,
                onClearCollectionFilters: clearCollectionFilters,
                onCreateCollectionFromResults:
                    handleCreateCollectionFromResults,
                onDeleteItemSuccess: handleDeleteItemSuccess,
                onSelectCollection: handleToggleCollectionSelection,
                onUpdateItemCollections: handleUpdateItemCollections,
                onUpdateItemsCollections: handleUpdateItemsCollections,
                selectedCollectionIds,
                setCollections,
                setItems,
            }}
        >
            {children}
        </WorkspaceContext>
    );
}

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

function appendCollectionToItems(
    items: LibraryItemWithCollections[],
    itemIds: string[],
    collection: LibraryCollectionTag
): LibraryItemWithCollections[] {
    const itemIdSet = new Set(itemIds);
    if (itemIdSet.size === 0) {
        return [...items];
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
            ? {
                  ...item,
                  collections: [...nextCollections],
              }
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

    return sortCollections([
        ...mergedCollections,
        ...nextCollections.filter(
            (collection) =>
                !mergedCollections.some((entry) => entry.id === collection.id)
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

function useCollectionItemIndexes(items: LibraryItemWithCollections[]): {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    itemsByCollectionId: Map<string, LibraryItemWithCollections[]>;
} {
    return React.useMemo(() => {
        const itemsByCollectionId = new Map<
            string,
            LibraryItemWithCollections[]
        >();
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
                getCollectionPreviewThumbnailUrls(collectionId, collectionItems)
            );
        }

        return {
            collectionPreviewThumbnailUrlsById,
            itemsByCollectionId,
        };
    }, [items]);
}

function getCollectionPreviewThumbnailUrls(
    collectionId: string,
    items: LibraryItemWithCollections[]
): string[] {
    return [...items]
        .sort(
            (left, right) =>
                getPreviewOrderSeed(`${collectionId}:${left.id}`) -
                getPreviewOrderSeed(`${collectionId}:${right.id}`)
        )
        .flatMap((item) => {
            const staticImageUrl = toUsableStaticPreviewUrl(
                item.preview?.staticImageUrl
            );
            return staticImageUrl ? [staticImageUrl] : [];
        })
        .slice(0, 5);
}
