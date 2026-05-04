"use client";

import {
    CollectionsList,
    CollectionsListEmpty,
    CollectionsListFilterClearButton,
    CollectionsListItem,
    CollectionsListItemMeta,
    CollectionsListItemPreview,
    CollectionsListItemPriorityCombobox,
    CollectionsListItemValue,
    CollectionsListNoticeCallout,
    CollectionsListPanel,
    CollectionsListSortingCombobox,
    CollectionsListStatus,
    CollectionsListToolbar,
    CollectionsListToolbarButton,
    CollectionsListToolbarGroup,
    CollectionsListTrigger,
    CreateDialog,
    DeleteDialog,
    RenameDialog,
    SORT_OPTION_BY_VALUE,
    TEMPLATES,
    type CollectionFeedback,
    type CollectionSortField,
    type SortingComboboxOption,
    type TemplateValue,
} from "@/components/library/collections";
import { Button } from "@/components/ui/button";
import { DisclosureList } from "@/components/ui/disclosure-list";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CtrlKbd, Kbd } from "@/components/ui/kbd";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
    createCollection,
    createCollectionFromItems,
    deleteCollection,
    disableSmartCollections,
    duplicateCollection,
    renameCollection,
    updateCollectionPriority,
    type CollectionCreateFromItemsResult,
    type CollectionCreateResult,
} from "@/lib/collections/actions";
import {
    updateLibraryItemCollections,
    updateLibraryItemsCollections,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemDeleteResult,
    type LibraryItemsCollectionsUpdateResult,
} from "@/lib/collections/items";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { getSystemControlKey } from "@/lib/common/environment";
import { saveFile } from "@/lib/common/file";
import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";
import { normalizeURL, openExternal } from "@/lib/common/url";
import type { CollectionPriority } from "@/prisma/client/enums";
import { useSmartCollectionsPreference } from "@/hooks/use-smart-collections-preference";
import { ListFilter, PlusIcon } from "lucide-react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

// #region Domain types

type SortableCollectionSummary = Pick<
    LibraryCollectionSummary,
    "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
>;

interface CollectionShareState
    extends Pick<
        LibraryCollectionTag,
        "id" | "shareId" | "sharedAt" | "updatedAt"
    > {}

interface SyncCreatedCollectionInput {
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}

// #endregion Domain types

// #region Constants

const CSV_CONTENT_TYPE = "text/csv;charset=utf-8";

const CSV_HEADERS = [
    "Collection",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const CREATE_ERROR_MESSAGE = "We couldn't create this collection right now.";
const DELETE_ERROR_MESSAGE = "We couldn't delete this collection right now.";
const DUPLICATE_ERROR_MESSAGE =
    "We couldn't make a copy of this collection right now.";
const EMPTY_LINKS_MESSAGE = "There are no links in this collection yet.";
const RENAME_ERROR_MESSAGE = "We couldn't rename this collection right now.";
const SHARE_ERROR_MESSAGE = "We couldn't create a public link right now.";
const STOP_SHARING_ERROR_MESSAGE =
    "We couldn't stop sharing this collection right now.";
const UPDATE_PRIORITY_ERROR_MESSAGE =
    "We couldn't update this collection priority right now.";

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

// #endregion Constants

// #region Stores

const { useStore: useCollectionsListStateStore } = createStore({
    isCollectionsListOpen: storage(false),
});

const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
    collectionTextMatchQuery: storage(""),
});

// #endregion Stores

// #region Pure helpers

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
export function sortCollectionSummaries<T extends SortableCollectionSummary>(
    collections: readonly T[],
    sortField: CollectionSortField,
    textMatchQuery = ""
): T[] {
    if (sortField === "text-match") {
        return sortList(collections, compareTextMatch(textMatchQuery));
    }
    return sortList(collections, SUMMARY_SORTERS[sortField]);
}

/**
 * Strip summary-specific fields so a collection can be stored as a tag on items.
 *
 * Items only need identity fields (id, name, priority, etc.); counts and
 * thumbnail arrays are derived from the item list itself.
 */
function toCollectionTag({
    createdAt,
    description,
    id,
    name,
    priority,
    sharedAt,
    shareId,
    updatedAt,
}: LibraryCollectionSummary): LibraryCollectionTag {
    return {
        createdAt,
        description,
        id,
        name,
        priority,
        sharedAt,
        shareId,
        updatedAt,
    };
}

function updateById<T extends LibraryCollectionTag>(
    collections: T[],
    id: string,
    updater: (collection: T) => T
): T[] {
    return collections.map((collection) =>
        collection.id === id ? updater(collection) : collection
    );
}

function updateItemTags(
    items: LibraryItemWithCollections[],
    updater: (tags: LibraryCollectionTag[]) => LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: updater(item.collections),
    }));
}

/**
 * Update a single collection's share state and re-sort so the new entry
 * lands in the correct priority order.
 */
function replaceShareState<T extends LibraryCollectionTag>(
    collections: T[],
    next: CollectionShareState
): T[] {
    return sortCollections(
        updateById(collections, next.id, (collection) => ({
            ...collection,
            sharedAt: next.sharedAt,
            shareId: next.shareId,
            updatedAt: next.updatedAt,
        }))
    );
}

/**
 * Update a single collection's priority and re-sort so it's positioned
 * correctly among peers of different priorities.
 */
function replacePriority<T extends LibraryCollectionTag>(
    collections: T[],
    id: string,
    priority: CollectionPriority
): T[] {
    return sortCollections(
        updateById(collections, id, (collection) => ({
            ...collection,
            priority,
        }))
    );
}

/**
 * Update a single collection's name and re-sort so alphabetical order
 * is preserved after the rename.
 */
function replaceName<T extends LibraryCollectionTag>(
    collections: T[],
    id: string,
    name: string
): T[] {
    return sortCollections(
        updateById(collections, id, (collection) => ({
            ...collection,
            name,
        }))
    );
}

/**
 * Sync a collection's new name across all items that reference it.
 */
function replaceItemCollectionNames(
    items: LibraryItemWithCollections[],
    id: string,
    name: string
): LibraryItemWithCollections[] {
    return updateItemTags(items, (tags) => replaceName(tags, id, name));
}

/**
 * Extract normalized URLs from items for export or bulk operations.
 */
function getItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

/**
 * Wrap a value in quotes and escape internal double-quotes per RFC 4180.
 */
function escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Build a CSV string from a collection and its items.
 */
function buildCsv(
    collection: LibraryCollectionSummary,
    items: LibraryItemWithCollections[]
): string {
    const rows = items.map((item) => [
        collection.name,
        item.caption ?? "",
        normalizeURL(item.url),
        item.source,
        item.kind,
        item.createdAt.toISOString(),
        item.postedAt?.toISOString() ?? "",
    ]);

    return [CSV_HEADERS, ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
}

/**
 * Derive a file-system-safe name from a collection name for CSV export.
 */
function getExportFileName(name: string): string {
    const slug = name
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");

    return slug.length > 0 ? `${slug}-links` : "collection-links";
}

/**
 * Collapse whitespace and trim a collection name for storage.
 *
 * Prevent accidental leading/trailing or double spaces from creating
 * misleading display names while preserving internal single spaces.
 */
function normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

/**
 * Extract assigned item IDs from a successful collection creation result.
 *
 * The server may return a single `assignedItemId` or none; normalizing
 * to an array keeps callers consistent.
 */
function getCreatedAssignedItemIds(
    result: Extract<CollectionCreateResult, { status: "CREATED" }>
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

// #endregion Pure helpers

// #region Safe action adapters

/**
 * Wrap a server action so network failures surface as typed errors instead
 * of uncaught exceptions.
 *
 * Callers expect a result object; throwing would break the controller's
 * optimistic-update rollback logic.
 */
async function createCollectionSafely(
    input: Parameters<typeof createCollection>[0]
) {
    try {
        return await createCollection(input);
    } catch {
        return { message: CREATE_ERROR_MESSAGE, status: "ERROR" as const };
    }
}

/**
 * Safe wrapper for `deleteCollection`. See `createCollectionSafely`.
 */
async function deleteCollectionSafely(
    input: Parameters<typeof deleteCollection>[0]
) {
    try {
        return await deleteCollection(input);
    } catch {
        return { message: DELETE_ERROR_MESSAGE, status: "ERROR" as const };
    }
}

/**
 * Safe wrapper for `duplicateCollection`. See `createCollectionSafely`.
 */
async function duplicateCollectionSafely(
    input: Parameters<typeof duplicateCollection>[0]
) {
    try {
        return await duplicateCollection(input);
    } catch {
        return { message: DUPLICATE_ERROR_MESSAGE, status: "ERROR" as const };
    }
}

/**
 * Safe wrapper for `renameCollection`. See `createCollectionSafely`.
 */
async function renameCollectionSafely(
    input: Parameters<typeof renameCollection>[0]
) {
    try {
        return await renameCollection(input);
    } catch {
        return { message: RENAME_ERROR_MESSAGE, status: "ERROR" as const };
    }
}

/**
 * Safe wrapper for `updateCollectionPriority`. See `createCollectionSafely`.
 */
async function updateCollectionPrioritySafely(
    input: Parameters<typeof updateCollectionPriority>[0]
) {
    try {
        return await updateCollectionPriority(input);
    } catch {
        return {
            message: UPDATE_PRIORITY_ERROR_MESSAGE,
            status: "ERROR" as const,
        };
    }
}

/**
 * Safe wrapper for `shareCollectionPublicly`. See `createCollectionSafely`.
 */
async function shareCollectionPubliclySafely(
    input: Parameters<typeof shareCollectionPublicly>[0]
) {
    try {
        return await shareCollectionPublicly(input);
    } catch {
        return { message: SHARE_ERROR_MESSAGE, status: "ERROR" as const };
    }
}

/**
 * Safe wrapper for `disableCollectionSharing`. See `createCollectionSafely`.
 */
async function disableCollectionSharingSafely(
    input: Parameters<typeof disableCollectionSharing>[0]
) {
    try {
        return await disableCollectionSharing(input);
    } catch {
        return {
            message: STOP_SHARING_ERROR_MESSAGE,
            status: "ERROR" as const,
        };
    }
}

// #endregion Safe action adapters

// #region Workspace context (existing)

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
    requestCreate: (itemId?: string) => void;
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

const RequestCreateRefContext = React.createContext<React.MutableRefObject<
    ((itemId?: string) => void) | null
> | null>(null);

/**
 * Access the library workspace context.
 *
 * Must be rendered inside `WorkspaceProvider` so components can read and
 * mutate collections, items, and selection state.
 */
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

/**
 * Provider that holds the mutable library state (items, collections,
 * selection) and exposes it through `useWorkspace`.
 *
 * Maintains local copies of server data so optimistic updates (e.g.
 * adding an item to a collection) render instantly while the server
 * round-trip happens in the background.
 */
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
            appendCollection(current, result.assignedItemIds, nextCollection)
        );

        return result;
    };

    const requestCreateRef = React.useRef<((itemId?: string) => void) | null>(
        null
    );
    const requestCreate = (itemId?: string) => {
        requestCreateRef.current?.(itemId);
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
                requestCreate,
                selectedCollectionIds,
                setCollections,
                setItems,
            }}
        >
            <RequestCreateRefContext value={requestCreateRef}>
                {children}
            </RequestCreateRefContext>
        </WorkspaceContext>
    );
}

// #endregion Workspace context

// #region Internal helpers (existing)

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
function appendCollection(
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

    return sortCollections([
        ...mergedCollections,
        ...nextCollections.filter(
            (collection) =>
                !mergedCollections.some((entry) => entry.id === collection.id)
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
 *
 * Memoized because both indexes are expensive to rebuild on every render
 * and only change when the item list changes.
 */
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

/**
 * Deterministically select up to five preview thumbnail URLs for a
 * collection.
 *
 * Uses seeded ordering so thumbnails don't shuffle on re-render.
 * Items without a usable preview image are skipped.
 */
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

// #endregion Internal helpers

// #region Controller hook

/**
 * Central controller for all collection-related UI state and side effects.
 *
 * Coordinates dialog open states, server actions, optimistic updates,
 * keyboard shortcuts, and feedback messages. Returned as a flat object
 * so `CollectionsListWorkspaceRoot` can destructure exactly what it needs.
 */
function useCollectionsController() {
    const {
        disabled: isSmartCollectionsDisabled,
        mutate: mutateSmartCollectionsPreference,
    } = useSmartCollectionsPreference();

    // Create dialog state
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [createName, setCreateName] = React.useState("");
    const [createDescription, setCreateDescription] = React.useState("");
    const [createItemId, setCreateItemId] = React.useState<string | null>(null);
    const [createError, setCreateError] = React.useState<string | null>(null);
    const [isCreatePending, startCreate] = React.useTransition();

    // Rename dialog state
    const [pendingRename, setPendingRename] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [renameDraft, setRenameDraft] = React.useState("");
    const [renameError, setRenameError] = React.useState<string | null>(null);
    const [isRenamePending, startRename] = React.useTransition();

    // Delete dialog state
    const [pendingDelete, setPendingDelete] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [isDeletePending, startDelete] = React.useTransition();

    // Share state
    const [pendingShareId, setPendingShareId] = React.useState<string | null>(
        null
    );
    const [isSharePending, startShare] = React.useTransition();

    // Duplicate transition
    const [, startDuplicate] = React.useTransition();

    // Feedback
    const [feedback, setFeedback] = React.useState<CollectionFeedback | null>(
        null
    );

    const {
        collectionPreviewThumbnailUrlsById,
        collectionSummaries,
        collections,
        hasAccess,
        itemsByCollectionId,
        onClearCollectionFilters,
        onSelectCollection,
        selectedCollectionIds,
        setCollections,
        setItems,
    } = useWorkspace();
    const { copyToClipboard } = useCopyToClipboard();

    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListStateStore();

    const {
        collectionSortField,
        collectionTextMatchQuery,
        setCollectionSortField,
        setCollectionTextMatchQuery,
    } = useCollectionsSortStore();

    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [sortInputValue, setSortInputValue] = React.useState("");

    const showError = (message: string) =>
        setFeedback({ message, tone: "error" });
    const showSuccess = (message: string) =>
        setFeedback({ message, tone: "success" });

    const hasHiddenItems = (collection: LibraryCollectionSummary) =>
        !hasAccess &&
        (itemsByCollectionId.get(collection.id)?.length ?? 0) <
            collection.itemCount;

    const ensureAccess = (
        collection: LibraryCollectionSummary,
        action: string
    ) => {
        if (!hasHiddenItems(collection)) {
            return true;
        }
        showError(`Upgrade to ${action} every item in ${collection.name}.`);
        return false;
    };

    const resetCreate = () => {
        setCreateName("");
        setCreateDescription("");
        setCreateError(null);
        setCreateItemId(null);
    };

    const resetRename = () => {
        setPendingRename(null);
        setRenameDraft("");
        setRenameError(null);
    };

    const syncShare = (next: CollectionShareState) => {
        setCollections((current) => replaceShareState(current, next));
        setItems((current) =>
            updateItemTags(current, (tags) => replaceShareState(tags, next))
        );
    };

    const syncPriority = (id: string, priority: CollectionPriority) => {
        setCollections((current) => replacePriority(current, id, priority));
        setItems((current) =>
            updateItemTags(current, (tags) =>
                replacePriority(tags, id, priority)
            )
        );
    };

    const syncCreated = (input: SyncCreatedCollectionInput) => {
        setCollections((current) =>
            mergeCollectionSummaries(current, [input.collection])
        );

        if (input.assignedItemIds.length === 0) {
            return;
        }

        const tag = toCollectionTag(input.collection);
        setItems((current) =>
            appendCollection(current, input.assignedItemIds, tag)
        );
    };

    const startCreateCollection = (
        input: Parameters<typeof createCollection>[0],
        onSuccess?: () => void
    ) => {
        startCreate(async () => {
            const result = await createCollectionSafely(input);

            if (result.status !== "CREATED") {
                setCreateError(result.message);
                return;
            }

            syncCreated({
                assignedItemIds: getCreatedAssignedItemIds(result),
                collection: result.collection,
            });
            onSuccess?.();
            resetCreate();
            setIsCreateOpen(false);
        });
    };

    const requestCreate = (itemId?: string) => {
        setCreateItemId(itemId ?? null);
        setCreateName("");
        setCreateDescription("");
        setCreateError(null);
        setIsCreateOpen(true);
    };

    useHotkeys(
        "mod+n, v",
        () => {
            if (isCreateOpen) {
                setIsCreateOpen(false);
            } else {
                requestCreate();
            }
        },
        { preventDefault: true },
        [isCreateOpen]
    );

    useHotkeys(
        "mod+c",
        () => {
            setIsCollectionsListOpen(!isCollectionsListOpen);
        },
        { preventDefault: true },
        [isCollectionsListOpen, setIsCollectionsListOpen]
    );

    useHotkeys(
        "mod+f",
        (event) => {
            event.preventDefault();
            if (!isCollectionsListOpen) {
                setIsCollectionsListOpen(true);
            }
            setIsSortOpen(true);
        },
        {
            enabled: !isSortOpen,
        },
        [isCollectionsListOpen, isSortOpen, setIsCollectionsListOpen]
    );

    const requestDelete = (collection: LibraryCollectionSummary) => {
        setFeedback(null);
        setPendingDelete(collection);
    };

    const requestRename = (collection: LibraryCollectionSummary) => {
        setFeedback(null);
        setRenameDraft(collection.name);
        setRenameError(null);
        setPendingRename(collection);
    };

    const copyWithFeedback = async (
        text: string,
        success: string,
        error: string
    ) => {
        if (await copyToClipboard(text)) {
            showSuccess(success);
        } else {
            showError(error);
        }
    };

    const handleCopyLinks = async (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "copy")) {
            return;
        }

        const items = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getItemUrls(items);

        if (urls.length === 0) {
            showError(EMPTY_LINKS_MESSAGE);
            return;
        }

        await copyWithFeedback(
            urls.join("\n"),
            `Links from ${collection.name} copied to the clipboard.`,
            "We couldn't copy these links right now."
        );
    };

    const handleCopyTitle = async (collection: LibraryCollectionSummary) => {
        await copyWithFeedback(
            collection.name,
            `${collection.name} title copied to the clipboard.`,
            "We couldn't copy this collection title right now."
        );
    };

    const handleCopyShareLink = async (
        collection: LibraryCollectionSummary
    ) => {
        if (!collection.shareId) {
            showError("Create a public link before trying to copy it.");
            return;
        }

        const url = buildPublicCollectionShareUrl(collection.shareId);
        await copyWithFeedback(
            url,
            `Public link for ${collection.name} copied to the clipboard.`,
            "We couldn't copy this public link right now."
        );
    };

    const handleEnableShare = (collection: LibraryCollectionSummary) => {
        setFeedback(null);
        setPendingShareId(collection.id);

        startShare(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status !== "SHARED") {
                showError(result.message);
                setPendingShareId(null);
                return;
            }

            syncShare(result.collection);
            setPendingShareId(null);
            const linkCopied = await copyToClipboard(result.shareUrl);
            showSuccess(
                linkCopied
                    ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                    : `${collection.name} is now publicly shared.`
            );
        });
    };

    const handleDisableShare = (collection: LibraryCollectionSummary) => {
        setFeedback(null);
        setPendingShareId(collection.id);

        startShare(async () => {
            const result = await disableCollectionSharingSafely({
                collectionId: collection.id,
            });

            if (result.status !== "DISABLED") {
                showError(result.message);
                setPendingShareId(null);
                return;
            }

            syncShare(result.collection);
            setPendingShareId(null);
            showSuccess(`${collection.name} is no longer publicly shared.`);
        });
    };

    const handleOpenLinks = (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "open")) {
            return;
        }

        const items = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getItemUrls(items);

        if (urls.length === 0) {
            showError(EMPTY_LINKS_MESSAGE);
            return;
        }

        showSuccess(
            `Opening ${urls.length} link${urls.length === 1 ? "" : "s"} from ${collection.name}.`
        );

        for (const url of urls) {
            openExternal(url);
        }
    };

    const handleExportCsv = (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "export")) {
            return;
        }

        const items = itemsByCollectionId.get(collection.id) ?? [];

        if (items.length === 0) {
            showError(EMPTY_LINKS_MESSAGE);
            return;
        }

        React.startTransition(async () => {
            try {
                await saveFile(
                    new Blob([buildCsv(collection, items)], {
                        type: CSV_CONTENT_TYPE,
                    }),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: getExportFileName(collection.name),
                    }
                );

                showSuccess(`${collection.name} exported as CSV.`);
            } catch {
                showError("We couldn't export this collection right now.");
            }
        });
    };

    const handleConfirmDelete = () => {
        const target = pendingDelete;
        if (!target) {
            return;
        }

        startDelete(async () => {
            const result = await deleteCollectionSafely({
                collectionId: target.id,
            });

            if (result.status !== "DELETED") {
                showError(result.message);
                return;
            }

            setCollections((current) =>
                current.filter((c) => c.id !== result.collection.id)
            );
            setItems((current) =>
                updateItemTags(current, (tags) =>
                    tags.filter((c) => c.id !== result.collection.id)
                )
            );
            setPendingDelete(null);
            showSuccess(`${result.collection.name} deleted.`);
        });
    };

    const handleUpdatePriority = async (
        collectionId: string,
        priority: CollectionPriority
    ) => {
        const previous = collections.find(
            (c) => c.id === collectionId
        )?.priority;

        if (!previous || previous === priority) {
            return;
        }

        syncPriority(collectionId, priority);

        const result = await updateCollectionPrioritySafely({
            collectionId,
            priority,
        });

        if (result.status === "UPDATED") {
            syncPriority(result.collection.id, result.collection.priority);
        } else {
            syncPriority(collectionId, previous);
            showError(result.message);
        }
    };

    const handleRenameSubmit = () => {
        const target = pendingRename;
        if (!target) {
            return;
        }

        const previousName = target.name;
        const nextName = normalizeName(renameDraft);

        if (nextName.length === 0) {
            setRenameError("Enter a collection name.");
            return;
        }

        if (nextName === previousName) {
            resetRename();
            return;
        }

        setCollections((current) => replaceName(current, target.id, nextName));
        setItems((current) =>
            replaceItemCollectionNames(current, target.id, nextName)
        );

        startRename(async () => {
            const result = await renameCollectionSafely({
                collectionId: target.id,
                name: nextName,
            });

            if (result.status === "UPDATED") {
                setCollections((current) =>
                    replaceName(
                        current,
                        result.collection.id,
                        result.collection.name
                    )
                );
                setItems((current) =>
                    replaceItemCollectionNames(
                        current,
                        result.collection.id,
                        result.collection.name
                    )
                );
                resetRename();
                showSuccess(`${result.collection.name} renamed.`);
                return;
            }

            setCollections((current) =>
                replaceName(current, target.id, previousName)
            );
            setItems((current) =>
                replaceItemCollectionNames(current, target.id, previousName)
            );
            setRenameError(result.message);
        });
    };

    const handleDuplicate = (collection: LibraryCollectionSummary) => {
        setFeedback(null);

        startDuplicate(async () => {
            const result = await duplicateCollectionSafely({
                collectionId: collection.id,
            });

            if (result.status !== "CREATED") {
                showError(result.message);
                return;
            }

            syncCreated({
                assignedItemIds: result.assignedItemIds,
                collection: result.collection,
            });
            showSuccess(
                `${collection.name} copied as ${result.collection.name}.`
            );
        });
    };

    const handleCreateSubmit = () => {
        startCreateCollection({
            assignToItemId: createItemId ?? undefined,
            description: createDescription || undefined,
            name: createName,
        });
    };

    const handleCreateFromTemplate = (value: TemplateValue | null) => {
        if (!value) {
            return;
        }
        const template = TEMPLATES.find((t) => t.value === value);
        if (!template) {
            return;
        }
        setCreateError(null);
        startCreateCollection(
            {
                assignToItemId: createItemId ?? undefined,
                description: template.description,
                name: template.name,
            },
            () => showSuccess(`${template.name} created from template.`)
        );
    };

    const handleCreateNameChange = (draft: string) => {
        setCreateName(draft);
        if (createError) {
            setCreateError(null);
        }
    };

    const handleRenameDraftChange = (draft: string) => {
        setRenameDraft(draft);
        if (renameError) {
            setRenameError(null);
        }
    };

    const handleCreateOpenChange = (open: boolean) => {
        if (!(open || isCreatePending)) {
            resetCreate();
        }
        setIsCreateOpen(open);
    };

    const sortValue: SortingComboboxOption | null =
        collectionSortField === "text-match"
            ? {
                  icon: ListFilter,
                  label: `Search by "${collectionTextMatchQuery}"`,
                  query: collectionTextMatchQuery,
                  value: "text-match",
              }
            : (SORT_OPTION_BY_VALUE.get(collectionSortField) ?? null);

    const handleSortValueChange = (option: SortingComboboxOption | null) => {
        if (!option) {
            return;
        }

        if (option.value === "text-match") {
            if (option.query !== collectionTextMatchQuery) {
                setCollectionTextMatchQuery(option.query);
                setCollectionSortField(option.value);
                setSortInputValue("");
            }
            setIsSortOpen(false);
            return;
        }

        if (option.value !== collectionSortField) {
            setCollectionSortField(option.value);
            setSortInputValue("");
        }
        setIsSortOpen(false);
    };

    const hasAnySelected = selectedCollectionIds.length > 0;
    const collectionLabels = collectionSummaries.map((c) => c.name);

    return {
        collectionLabels,
        collectionPreviewThumbnailUrlsById,
        collectionSummaries,
        createDialog: {
            descriptionDraft: createDescription,
            errorMessage: createError,
            isOpen: isCreateOpen,
            isPending: isCreatePending,
            nameDraft: createName,
            onCreateFromTemplate: handleCreateFromTemplate,
            onDescriptionDraftChange: setCreateDescription,
            onNameDraftChange: handleCreateNameChange,
            onOpenChange: handleCreateOpenChange,
            onSubmit: handleCreateSubmit,
        },
        deleteDialog: {
            collection: pendingDelete,
            isPending: isDeletePending,
            onConfirm: handleConfirmDelete,
            onOpenChange: (open: boolean) => {
                if (!(open || isDeletePending)) {
                    setPendingDelete(null);
                }
            },
        },
        feedback,
        hasAnySelected,
        isCollectionsListOpen,
        isSharePending,
        isSmartCollectionsDisabled,
        onClearCollectionFilters,
        onCopyLinks: handleCopyLinks,
        onCopyShareLink: handleCopyShareLink,
        onCopyTitle: handleCopyTitle,
        onDelete: requestDelete,
        onDisableShare: handleDisableShare,
        onDisableSmartCollections: async () => {
            await mutateSmartCollectionsPreference(
                async () => {
                    const result = await disableSmartCollections();
                    if (result.status !== "DISABLED") {
                        showError(result.message);
                        throw new Error(result.message);
                    }
                    return { disabled: true };
                },
                { optimisticData: { disabled: true }, rollbackOnError: true }
            );
        },
        onDismissFeedback: () => setFeedback(null),
        onDuplicate: handleDuplicate,
        onEnableShare: handleEnableShare,
        onExportCsv: handleExportCsv,
        onOpenLinks: handleOpenLinks,
        onRename: requestRename,
        onSelectCollection,
        onUpdatePriority: handleUpdatePriority,
        pendingShareId,
        renameDialog: {
            errorMessage: renameError,
            isOpen: pendingRename !== null,
            isPending: isRenamePending,
            nameDraft: renameDraft,
            onNameDraftChange: handleRenameDraftChange,
            onOpenChange: (open: boolean) => {
                if (!(open || isRenamePending)) {
                    resetRename();
                }
            },
            onSubmit: handleRenameSubmit,
        },
        requestCreate,
        selectedCollectionIds,
        setIsCollectionsListOpen,
        sort: {
            inputValue: sortInputValue,
            isOpen: isSortOpen,
            onInputValueChange: setSortInputValue,
            onOpenChange: setIsSortOpen,
            onValueChange: handleSortValueChange,
            value: sortValue,
        },
    };
}

// #endregion Controller hook

// #region Workspace root component

/**
 * Composed workspace root that wires the controller into the
 * `CollectionsList` compound components and dialogs.
 *
 * Also registers itself with the `RequestCreateRefContext` so any parent
 * can open the create dialog imperatively via `requestCreate()`.
 */
export function CollectionsListWorkspaceRoot() {
    const controller = useCollectionsController();
    const requestCreateRef = React.useContext(RequestCreateRefContext);

    React.useEffect(() => {
        if (requestCreateRef) {
            requestCreateRef.current = (itemId?: string) =>
                controller.requestCreate(itemId);
        }
        return () => {
            if (requestCreateRef) {
                requestCreateRef.current = null;
            }
        };
    }, [controller.requestCreate, requestCreateRef]);

    return (
        <>
            <CollectionsList
                onOpenChange={controller.setIsCollectionsListOpen}
                open={controller.isCollectionsListOpen}
            >
                <CollectionsListToolbar className="group">
                    <CollectionsListTrigger
                        collectionLabels={controller.collectionLabels}
                        isOpen={controller.isCollectionsListOpen}
                    >
                        <span className="min-w-0 text-xs">
                            My collections (
                            {controller.collectionSummaries.length})
                        </span>
                        <ChevronDownFilledIcon className="-ml-0.5" />
                    </CollectionsListTrigger>
                    <CollectionsListToolbarGroup className="absolute right-1">
                        {controller.isCollectionsListOpen ? null : (
                            <Kbd className="bg-transparent opacity-0 group-hover:opacity-50">
                                <CtrlKbd />C
                            </Kbd>
                        )}
                        <CollectionsListToolbarButton
                            render={
                                <CollectionsListFilterClearButton
                                    isVisible={controller.hasAnySelected}
                                    onClick={
                                        controller.onClearCollectionFilters
                                    }
                                />
                            }
                        />
                        <CollectionsListToolbarButton
                            className={
                                controller.isCollectionsListOpen
                                    ? undefined
                                    : "hidden"
                            }
                            render={
                                <CollectionsListSortingCombobox
                                    inputValue={controller.sort.inputValue}
                                    isOpen={controller.sort.isOpen}
                                    onInputValueChange={
                                        controller.sort.onInputValueChange
                                    }
                                    onOpenChange={controller.sort.onOpenChange}
                                    onValueChange={
                                        controller.sort.onValueChange
                                    }
                                    value={controller.sort.value}
                                />
                            }
                        />
                        <CollectionsListToolbarButton
                            render={
                                <Button
                                    onClick={() => controller.requestCreate()}
                                    size="icon-xs"
                                    title={`Create a new collection (${getSystemControlKey()}N)`}
                                    variant="ghost"
                                >
                                    <PlusIcon
                                        aria-hidden
                                        className="inline-block size-3.5 shrink-0"
                                        focusable="false"
                                    />
                                </Button>
                            }
                        />
                    </CollectionsListToolbarGroup>
                </CollectionsListToolbar>
                <CollectionsListPanel>
                    <div className="p-1.5 pt-1">
                        <CollectionsListNoticeCallout
                            isDisabled={controller.isSmartCollectionsDisabled}
                            onDisable={controller.onDisableSmartCollections}
                        />
                    </div>
                    {controller.collectionSummaries.length === 0 ? (
                        <CollectionsListEmpty>
                            No collections found. Create your first collection
                            to start grouping saved items.
                        </CollectionsListEmpty>
                    ) : (
                        <>
                            <DisclosureList maxVisible={15}>
                                {controller.collectionSummaries.map(
                                    (collection) => {
                                        const isSelected =
                                            controller.selectedCollectionIds.includes(
                                                collection.id
                                            );

                                        return (
                                            <CollectionsListItem
                                                collection={collection}
                                                isSelected={isSelected}
                                                key={collection.id}
                                            >
                                                <CollectionsListItemPriorityCombobox
                                                    onValueChange={(priority) =>
                                                        controller.onUpdatePriority(
                                                            collection.id,
                                                            priority
                                                        )
                                                    }
                                                />
                                                <CollectionsListItemPreview
                                                    {...(isSelected
                                                        ? {
                                                              "data-active": true,
                                                          }
                                                        : {})}
                                                    onClick={() =>
                                                        controller.onSelectCollection(
                                                            collection.id
                                                        )
                                                    }
                                                    thumbnails={
                                                        controller.collectionPreviewThumbnailUrlsById.get(
                                                            collection.id
                                                        ) ?? []
                                                    }
                                                >
                                                    <CollectionsListItemValue />
                                                </CollectionsListItemPreview>
                                                <CollectionsListItemMeta
                                                    isSharePending={
                                                        controller.pendingShareId ===
                                                            collection.id &&
                                                        controller.isSharePending
                                                    }
                                                    onCopyLinks={() =>
                                                        controller.onCopyLinks(
                                                            collection
                                                        )
                                                    }
                                                    onCopyShareLink={() =>
                                                        controller.onCopyShareLink(
                                                            collection
                                                        )
                                                    }
                                                    onCopyTitle={() =>
                                                        controller.onCopyTitle(
                                                            collection
                                                        )
                                                    }
                                                    onDelete={() =>
                                                        controller.onDelete(
                                                            collection
                                                        )
                                                    }
                                                    onDisableShare={() =>
                                                        controller.onDisableShare(
                                                            collection
                                                        )
                                                    }
                                                    onEnableShare={() =>
                                                        controller.onEnableShare(
                                                            collection
                                                        )
                                                    }
                                                    onExportCsv={() =>
                                                        controller.onExportCsv(
                                                            collection
                                                        )
                                                    }
                                                    onMakeCopy={() =>
                                                        controller.onDuplicate(
                                                            collection
                                                        )
                                                    }
                                                    onOpenLinks={() =>
                                                        controller.onOpenLinks(
                                                            collection
                                                        )
                                                    }
                                                    onRename={() =>
                                                        controller.onRename(
                                                            collection
                                                        )
                                                    }
                                                    shareUrl={
                                                        collection.shareId
                                                            ? buildPublicCollectionShareUrl(
                                                                  collection.shareId
                                                              )
                                                            : null
                                                    }
                                                />
                                            </CollectionsListItem>
                                        );
                                    }
                                )}
                            </DisclosureList>
                            <CollectionsListStatus
                                onDismiss={controller.onDismissFeedback}
                                tone={controller.feedback?.tone}
                            >
                                {controller.feedback?.message}
                            </CollectionsListStatus>
                        </>
                    )}
                </CollectionsListPanel>
            </CollectionsList>
            <RenameDialog {...controller.renameDialog} />
            <CreateDialog {...controller.createDialog} />
            <DeleteDialog {...controller.deleteDialog} />
        </>
    );
}

// #endregion Workspace root component
