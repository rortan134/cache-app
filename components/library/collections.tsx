"use client";

import { useSubscriptionAccess } from "@/components/billing/subscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselPanel } from "@/components/ui/carousel";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Combobox,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxGroupLabel,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxSeparator,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { DisclosureListVertical } from "@/components/ui/disclosure-list";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import {
    ChevronDownFilledIcon,
    NotionIcon,
    PriorityNoneIcon,
    ShareArrowSolidIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { AltKbd, CmdKbd, Kbd, ShiftKbd } from "@/components/ui/kbd";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuShortcut,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    Popover,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { SidebarItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCollectionRecommendations } from "@/hooks/queries/use-collection-recommendations";
import { useSmartCollectionsPreference } from "@/hooks/queries/use-smart-collections-preference";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
    createCollection,
    deleteCollection,
    duplicateCollection,
    renameCollection,
    setSmartCollectionsPreference,
    updateCollectionPriority,
    type CollectionCreateResult,
} from "@/lib/collections/actions";
import type {
    LibraryItemCollectionsUpdateResult,
    LibraryItemFavoriteToggleResult,
} from "@/lib/collections/items";
import type { CollectionPreview } from "@/lib/collections/service";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import {
    TEMPLATE_BY_VALUE,
    TEMPLATES,
    type CollectionTemplateOption,
    type TemplateValue,
} from "@/lib/collections/templates";
import {
    itemPreviewImageUrl,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { tryAction } from "@/lib/common/action";
import {
    countBy,
    removeValue,
    toggleValue,
    updateById,
} from "@/lib/common/arrays";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import {
    ACTION_STATUS,
    ITEM_KIND_NOTE,
    MIME_TYPES,
} from "@/lib/common/constants";
import { saveFile } from "@/lib/common/file";
import {
    claimCollectionHoverHotkeySurface,
    clearCollectionHoverHotkeySurface,
    isCollectionHoverHotkeySurface,
    releaseCollectionHoverHotkeySurface,
} from "@/lib/common/hover-hotkey-surface";
import { getSystemControlKey } from "@/lib/common/keyboard";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    escapeCsv,
    getNoteExcerpt,
    normalizeWhitespace,
    slugify,
} from "@/lib/common/strings";
import { normalizeURL, openExternal } from "@/lib/common/url";
import { dayjs } from "@/lib/dayjs";
import { sendCollectionToNotion } from "@/lib/integrations/notion/actions";
import { getSourceLabel } from "@/lib/integrations/support";
import { getCollectionDescription } from "@/lib/intelligence/actions";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import EmptyCollectionStateImage from "@/public/empty-collection-state.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import type { BaseUIEvent } from "@base-ui/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { T, useLocale } from "gt-next";
import {
    ArchiveIcon,
    ArchiveX,
    ArrowUpDown,
    ChevronRight,
    Clock,
    ClockFading,
    Component,
    CopyIcon,
    CopyPlus,
    Download,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Globe,
    GlobeCheck,
    Info,
    LayoutList,
    LibraryBig,
    Lightbulb,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    PencilSparkles,
    PlusIcon,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Star,
    Trash2Icon,
    UserRoundPlus,
    X,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const log = createLogger("library:collections");

const CSV_RECORD_SEPARATOR = "\r\n";
const CSV_HEADERS = [
    "Collection",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const NAME_REQUIRED_MESSAGE = "Enter a collection name.";
const CREATE_ERROR_MESSAGE = "We couldn't create this collection right now.";
const DESCRIPTION_GENERATION_ERROR_MESSAGE =
    "We couldn't generate a collection description right now.";
const DELETE_ERROR_MESSAGE = "We couldn't delete this collection right now.";
const DUPLICATE_ERROR_MESSAGE =
    "We couldn't make a copy of this collection right now.";
const EMPTY_LINKS_ERROR_MESSAGE = "There are no links in this collection yet.";
const EMPTY_ITEMS_ERROR_MESSAGE = "There are no items in this collection yet.";
const RENAME_ERROR_MESSAGE = "We couldn't rename this collection right now.";
const DISABLE_SHARING_ERROR_MESSAGE =
    "We couldn't stop sharing this collection right now.";
const UPDATE_PRIORITY_ERROR_MESSAGE =
    "We couldn't update this collection's priority right now.";
const COPY_LINKS_ERROR_MESSAGE = "We couldn't copy these links right now.";
const COPY_TITLE_ERROR_MESSAGE =
    "We couldn't copy this collection's title right now.";
const COPY_SHARE_LINK_ERROR_MESSAGE =
    "We couldn't copy this public link right now.";
const COPY_SHARE_LINK_MISSING_MESSAGE =
    "Create a public link before trying to copy it.";
const EXPORT_CSV_ERROR_MESSAGE =
    "We couldn't export this collection right now.";
const SEND_TO_NOTION_ERROR_MESSAGE =
    "We couldn't send this collection to Notion right now.";
const DISABLE_SMART_COLLECTIONS_ERROR_MESSAGE =
    "We couldn't turn off smart collections right now.";
const ENABLE_SMART_COLLECTIONS_ERROR_MESSAGE =
    "We couldn't turn on smart collections right now.";

const COLLECTION_PREVIEW_THUMBNAIL_LIMIT = 5;

const DESCRIPTION_MAX_LENGTH = 1024;

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

function getToggledArchivePriority(
    priority: CollectionPriority
): CollectionPriority {
    return priority === "archive" ? "none" : "archive";
}

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

export type CollectionShareState = Pick<
    LibraryCollectionTag,
    "id" | "shareId" | "sharedAt" | "updatedAt"
>;

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

export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: readonly T[]): T[] {
    return collections.toSorted(comparePriorities);
}

function sortCollectionSummaries<T extends SortableCollectionSummary>(
    collections: readonly T[],
    sortField: CollectionSortField,
    textMatchQuery = ""
): T[] {
    if (sortField === "text-match") {
        return collections.toSorted(compareTextMatch(textMatchQuery));
    }
    return collections.toSorted(SUMMARY_SORTERS[sortField]);
}

function getVisibleCollections(
    collections: LibraryCollectionSummary[],
    view: CollectionView
): LibraryCollectionSummary[] {
    if (view === "exclude-archives") {
        return collections.filter(
            (collection) => collection.priority !== "archive"
        );
    }
    if (view === "show-shared-only") {
        return collections.filter((collection) => collection.shareId !== null);
    }
    return collections;
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

export function replaceCollectionShareState<T extends LibraryCollectionTag>(
    collections: T[],
    next: CollectionShareState
): T[] {
    return updateById(collections, next.id, (collection) => ({
        ...collection,
        sharedAt: next.sharedAt,
        shareId: next.shareId,
        updatedAt: next.updatedAt,
    }));
}

export function replaceCollectionName<T extends LibraryCollectionTag>(
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

export function replaceCollectionPriority<T extends LibraryCollectionTag>(
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

export function reconcileCollectionTags(
    collections: readonly LibraryCollectionSummary[],
    tags: readonly LibraryCollectionTag[]
): LibraryCollectionTag[] {
    const collectionById = new Map(
        collections.map((collection) => [collection.id, collection])
    );

    return tags.flatMap((tag) => {
        const collection = collectionById.get(tag.id);
        if (!collection) {
            return [];
        }
        return [
            {
                createdAt: collection.createdAt,
                description: collection.description,
                id: collection.id,
                name: collection.name,
                priority: collection.priority,
                sharedAt: collection.sharedAt,
                shareId: collection.shareId,
                updatedAt: collection.updatedAt,
            },
        ];
    });
}

export function replaceItemCollectionTags(
    items: LibraryItemWithCollections[],
    updater: (tags: LibraryCollectionTag[]) => LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: updater(item.collections),
    }));
}

export function replaceMultipleItemCollections(
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

export function mergeImportedItems(
    current: LibraryItemWithCollections[],
    imported: LibraryItemWithCollections[]
): LibraryItemWithCollections[] {
    if (imported.length === 0) {
        return current;
    }

    const importedById = new Map(imported.map((item) => [item.id, item]));
    const currentIdSet = new Set(current.map((item) => item.id));

    return [
        ...imported.filter((item) => !currentIdSet.has(item.id)),
        ...current.map((item) => importedById.get(item.id) ?? item),
    ];
}

export function buildCollectionItemIndexes(
    items: LibraryItemWithCollections[]
): {
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

function getPreviewOrderSeed(value: string): number {
    let hash = 0;
    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash;
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

const { useStore: useCollectionsListSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
    collectionTextMatchQuery: storage(""),
    collectionView: storage<CollectionView>("show-all"),
});

type CollectionAction = "notion" | "share";

function getCollectionActionKey(
    action: CollectionAction,
    collectionId: string
): string {
    return `${action}:${collectionId}`;
}

interface CollectionsContextValue {
    claimCollectionAction: (
        action: CollectionAction,
        collectionId: string
    ) => (() => void) | null;
    collectionSummaries: LibraryCollectionSummary[];
    collections: LibraryCollectionSummary[];
    createItemId: string | null;
    isCollectionActionPending: (
        action: CollectionAction,
        collectionId: string
    ) => boolean;
    isCreateOpen: boolean;
    mergeCollectionSummaries: (collections: LibraryCollectionSummary[]) => void;
    onClearCollectionFilters: () => void;
    onCloseCreate: () => void;
    onSelectCollection: (collectionId: string) => void;
    replaceCollections: (collections: LibraryCollectionSummary[]) => void;
    requestCreate: (itemId?: string) => void;
    selectedCollectionIdSet: ReadonlySet<string>;
    selectedCollectionIds: string[];
    syncCollectionCreated: (input: {
        assignedItemIds: string[];
        collection: LibraryCollectionSummary;
    }) => void;
    syncCollectionDeleted: (collectionId: string) => void;
    syncCollectionName: (id: string, name: string) => void;
    syncCollectionPriority: (id: string, priority: CollectionPriority) => void;
    syncCollectionShare: (next: CollectionShareState) => void;
}

export interface LibraryItemsContextValue {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    favoriteItemIdSet: ReadonlySet<string>;
    favoriteItems: LibraryItemWithCollections[];
    items: LibraryItemWithCollections[];
    itemsByCollectionId: Map<string, LibraryItemWithCollections[]>;
    mergeImportedItems: (items: LibraryItemWithCollections[]) => void;
    onCopyLink: (item: LibraryItemWithCollections) => void;
    onDelete: (item: LibraryItemWithCollections) => void;
    onFindSimilar: (item: LibraryItemWithCollections) => void;
    onOpenFavoriteItem: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab: (item: LibraryItemWithCollections) => void;
    onOpenNote: (item: LibraryItemWithCollections) => void;
    onToggleItemFavorite: (
        item: LibraryItemWithCollections
    ) => Promise<LibraryItemFavoriteToggleResult>;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    pendingDeleteItemId: string | null;
}

const CollectionsContext = React.createContext<CollectionsContextValue | null>(
    null
);

export const LibraryItemsContext =
    React.createContext<LibraryItemsContextValue | null>(null);

export function useCollectionsContext(): CollectionsContextValue {
    const context = React.use(CollectionsContext);
    if (!context) {
        throw new Error(
            "Collections context is required for collection controls."
        );
    }
    return context;
}

export function useLibraryItemsContext(): LibraryItemsContextValue {
    const context = React.use(LibraryItemsContext);
    if (!context) {
        throw new Error(
            "Library items context is required for library item controls."
        );
    }
    return context;
}

function useInternalCollectionsState({
    initialCollections,
}: {
    initialCollections: LibraryCollectionSummary[];
}) {
    const { collectionSortField, collectionTextMatchQuery, collectionView } =
        useCollectionsListSortStore();

    const [collections, setCollections] =
        React.useState<LibraryCollectionSummary[]>(initialCollections);
    const [selectedCollectionIds, setSelectedCollectionIds] = React.useState<
        string[]
    >([]);

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [createItemId, setCreateItemId] = React.useState<string | null>(null);

    const collectionSummaries = sortCollectionSummaries(
        getVisibleCollections(collections, collectionView),
        collectionSortField,
        collectionTextMatchQuery
    );

    const validCollectionIds = new Set(
        collections.map((collection) => collection.id)
    );
    const validSelectedCollectionIds = selectedCollectionIds.filter((id) =>
        validCollectionIds.has(id)
    );
    const selectedCollectionIdSet = new Set(validSelectedCollectionIds);

    const clearCollectionFilters = useStableCallback(() => {
        setSelectedCollectionIds([]);
    });

    const toggleCollectionSelection = useStableCallback((id: string) => {
        setSelectedCollectionIds((current) => toggleValue(current, id));
    });

    const requestCreate = useStableCallback((itemId?: string) => {
        setCreateItemId(itemId ?? null);
        setIsCreateOpen(true);
    });

    const onCloseCreate = useStableCallback(() => {
        setIsCreateOpen(false);
        setCreateItemId(null);
    });

    const mergeCollectionSummariesState = useStableCallback(
        (nextCollections: LibraryCollectionSummary[]) => {
            setCollections((current) =>
                mergeCollectionSummaries(current, nextCollections)
            );
        }
    );

    const replaceCollections = useStableCallback(
        (nextCollections: LibraryCollectionSummary[]) => {
            setCollections(sortCollections(nextCollections));
            const nextCollectionIdSet = new Set(
                nextCollections.map((collection) => collection.id)
            );
            setSelectedCollectionIds((current) =>
                current.filter((id) => nextCollectionIdSet.has(id))
            );
        }
    );

    const syncCollectionName = useStableCallback((id: string, name: string) => {
        setCollections((current) => replaceCollectionName(current, id, name));
    });

    const syncCollectionPriority = useStableCallback(
        (id: string, priority: CollectionPriority) => {
            setCollections((current) =>
                replaceCollectionPriority(current, id, priority)
            );
        }
    );

    const syncCollectionShare = useStableCallback(
        (next: CollectionShareState) => {
            setCollections((current) =>
                replaceCollectionShareState(current, next)
            );
        }
    );

    const syncCollectionDeleted = useStableCallback((collectionId: string) => {
        setCollections((current) =>
            current.filter((collection) => collection.id !== collectionId)
        );
        setSelectedCollectionIds((current) =>
            removeValue(current, collectionId)
        );
    });

    return {
        collectionSummaries,
        collections,
        createItemId,
        isCreateOpen,
        mergeCollectionSummaries: mergeCollectionSummariesState,
        onClearCollectionFilters: clearCollectionFilters,
        onCloseCreate,
        onSelectCollection: toggleCollectionSelection,
        replaceCollections,
        requestCreate,
        selectedCollectionIdSet,
        selectedCollectionIds: validSelectedCollectionIds,
        syncCollectionDeleted,
        syncCollectionName,
        syncCollectionPriority,
        syncCollectionShare,
    };
}

export function CollectionsProvider({
    children,
    initialCollections,
    setItems,
}: React.PropsWithChildren<{
    initialCollections: LibraryCollectionSummary[];
    setItems: React.Dispatch<
        React.SetStateAction<LibraryItemWithCollections[]>
    >;
}>) {
    const state = useInternalCollectionsState({ initialCollections });
    const [pendingCollectionActionKeys, setPendingCollectionActionKeys] =
        React.useState<Set<string>>(() => new Set());
    const collectionActionKeysRef = React.useRef(new Set<string>());

    const claimCollectionAction = useStableCallback(
        (action: CollectionAction, collectionId: string) => {
            const key = getCollectionActionKey(action, collectionId);
            if (collectionActionKeysRef.current.has(key)) {
                return null;
            }

            collectionActionKeysRef.current.add(key);
            setPendingCollectionActionKeys((current) => {
                const next = new Set(current);
                next.add(key);
                return next;
            });

            return () => {
                if (!collectionActionKeysRef.current.delete(key)) {
                    return;
                }
                setPendingCollectionActionKeys((current) => {
                    if (!current.has(key)) {
                        return current;
                    }
                    const next = new Set(current);
                    next.delete(key);
                    return next;
                });
            };
        }
    );

    const isCollectionActionPending = (
        action: CollectionAction,
        collectionId: string
    ) =>
        pendingCollectionActionKeys.has(
            getCollectionActionKey(action, collectionId)
        );

    const syncCollectionCreated = useStableCallback(
        (input: {
            assignedItemIds: string[];
            collection: LibraryCollectionSummary;
        }) => {
            state.mergeCollectionSummaries([input.collection]);
            setItems((current) =>
                appendCollection(
                    current,
                    input.assignedItemIds,
                    input.collection
                )
            );
        }
    );

    const syncCollectionDeleted = useStableCallback((collectionId: string) => {
        state.syncCollectionDeleted(collectionId);
        setItems((current) =>
            replaceItemCollectionTags(current, (tags) =>
                tags.filter((tag) => tag.id !== collectionId)
            )
        );
    });

    const syncCollectionName = useStableCallback((id: string, name: string) => {
        state.syncCollectionName(id, name);
        setItems((current) =>
            replaceItemCollectionTags(current, (tags) =>
                replaceCollectionName(tags, id, name)
            )
        );
    });

    const syncCollectionPriority = useStableCallback(
        (id: string, priority: CollectionPriority) => {
            state.syncCollectionPriority(id, priority);
            setItems((current) =>
                replaceItemCollectionTags(current, (tags) =>
                    replaceCollectionPriority(tags, id, priority)
                )
            );
        }
    );

    const syncCollectionShare = useStableCallback(
        (next: CollectionShareState) => {
            state.syncCollectionShare(next);
            setItems((current) =>
                replaceItemCollectionTags(current, (tags) =>
                    replaceCollectionShareState(tags, next)
                )
            );
        }
    );

    const value: CollectionsContextValue = {
        ...state,
        claimCollectionAction,
        isCollectionActionPending,
        syncCollectionCreated,
        syncCollectionDeleted,
        syncCollectionName,
        syncCollectionPriority,
        syncCollectionShare,
    };

    return <CollectionsContext value={value}>{children}</CollectionsContext>;
}

const SHARE_COLLECTION_ERROR_MESSAGE =
    "We couldn't create a public link right now.";

export const shareCollectionPubliclySafely = tryAction(
    shareCollectionPublicly,
    SHARE_COLLECTION_ERROR_MESSAGE,
    (input) => ({ collectionId: input.collectionId })
);

type CollectionsListStatusTone = "error" | "success";

interface CollectionFeedback {
    message: string;
    tone: CollectionsListStatusTone;
}

interface CollectionItemStyle extends React.CSSProperties {
    "--accent-color": string;
    "--collection-background": string;
    "--text-muted-color": string;
}

type CollectionListSource = "favorites" | "collections";

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isSelected: boolean;
    source: CollectionListSource;
}

function buildPriorityOpenToken(
    source: CollectionListSource,
    collectionId: string
): string {
    return `${source}:${collectionId}`;
}

interface SyncCreatedCollectionInput {
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}

interface PriorityOption {
    icon: React.ElementType;
    label: string;
    value: CollectionPriority;
}

interface SortingOption {
    icon: React.ElementType;
    label: string;
    value: Exclude<CollectionSortField, "text-match">;
}

interface ComboboxValue {
    icon: React.ElementType;
    label: string;
    sortField: CollectionSortField;
    sortQuery: string;
    view: CollectionView;
}

interface ComboboxGroupData {
    group: "sort" | "text-match" | "view";
    items: ComboboxValue[];
}

const GROUP_LABELS: Record<ComboboxGroupData["group"], string> = {
    sort: "Sort collections by",
    "text-match": "Match collection name",
    view: "View",
};

const PREVIEW_SLIDE_INTERVAL_MS = 1400;
const PREVIEW_CROSSFADE_MS = 400;
const PREVIEW_IMAGE_CACHE_MAX = 200;
const PREVIEW_IMAGE_LOAD_CONCURRENCY = 2;
const EMPTY_PREVIEW_THUMBNAILS: string[] = [];

interface ReadyPreviewSlide {
    aspectRatio: number;
    src: string;
}

const PREVIEW_IMAGE_CACHE = new Map<string, number>();
const PREVIEW_IMAGE_LOADS = new Map<
    string,
    Promise<ReadyPreviewSlide | null>
>();
const PREVIEW_IMAGE_LOAD_TIMEOUT_MS = 15_000;

function rememberPreviewImage(url: string, aspectRatio: number): void {
    if (
        !PREVIEW_IMAGE_CACHE.has(url) &&
        PREVIEW_IMAGE_CACHE.size >= PREVIEW_IMAGE_CACHE_MAX
    ) {
        const oldestKey = PREVIEW_IMAGE_CACHE.keys().next().value;
        if (oldestKey !== undefined) {
            PREVIEW_IMAGE_CACHE.delete(oldestKey);
        }
    }
    PREVIEW_IMAGE_CACHE.set(url, aspectRatio);
}

function loadPreviewImage(url: string): Promise<ReadyPreviewSlide | null> {
    const cachedAspectRatio = PREVIEW_IMAGE_CACHE.get(url);
    if (cachedAspectRatio !== undefined) {
        return Promise.resolve({ aspectRatio: cachedAspectRatio, src: url });
    }

    const inflight = PREVIEW_IMAGE_LOADS.get(url);
    if (inflight) {
        return inflight;
    }

    const promise = new Promise<ReadyPreviewSlide | null>((resolve) => {
        const image = document.createElement("img");
        image.decoding = "async";
        let settled = false;
        let timeoutId = 0;

        const settle = (slide: ReadyPreviewSlide | null) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            image.onload = null;
            image.onerror = null;
            PREVIEW_IMAGE_LOADS.delete(url);
            resolve(slide);
        };

        timeoutId = window.setTimeout(
            () => settle(null),
            PREVIEW_IMAGE_LOAD_TIMEOUT_MS
        );

        image.onload = () => {
            const { naturalHeight, naturalWidth } = image;
            if (naturalHeight <= 0 || naturalWidth <= 0) {
                settle(null);
                return;
            }
            const aspectRatio = naturalWidth / naturalHeight;
            rememberPreviewImage(url, aspectRatio);
            settle({ aspectRatio, src: url });
        };
        // Failures are not cached so transient CDN/network errors can retry.
        image.onerror = () => settle(null);
        image.src = url;
    });

    PREVIEW_IMAGE_LOADS.set(url, promise);
    return promise;
}

function getReadyPreviewSlides(urls: string[]): ReadyPreviewSlide[] {
    const slides: ReadyPreviewSlide[] = [];
    for (const url of urls) {
        const aspectRatio = PREVIEW_IMAGE_CACHE.get(url);
        if (aspectRatio !== undefined) {
            slides.push({ aspectRatio, src: url });
        }
    }
    return slides;
}

function mergeReadyPreviewSlide(
    urls: string[],
    previous: ReadyPreviewSlide[],
    slide: ReadyPreviewSlide
): ReadyPreviewSlide[] {
    if (previous.some((entry) => entry.src === slide.src)) {
        return previous;
    }
    const readyBySrc = new Map(previous.map((entry) => [entry.src, entry]));
    readyBySrc.set(slide.src, slide);
    return urls.flatMap((url) => {
        const entry = readyBySrc.get(url);
        return entry ? [entry] : [];
    });
}

function resolveActivePreviewSlide(
    readySlides: ReadyPreviewSlide[],
    activeSrc: string | null
): ReadyPreviewSlide | null {
    if (activeSrc !== null) {
        const match = readySlides.find((slide) => slide.src === activeSrc);
        if (match) {
            return match;
        }
    }
    return readySlides[0] ?? null;
}

function nextPreviewSlideSrc(
    readySlides: ReadyPreviewSlide[],
    activeSrc: string | null
): string | null {
    const first = readySlides[0];
    if (!first) {
        return null;
    }
    if (readySlides.length === 1) {
        return first.src;
    }
    const currentIndex = readySlides.findIndex(
        (slide) => slide.src === activeSrc
    );
    const nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % readySlides.length;
    return readySlides[nextIndex]?.src ?? first.src;
}

function startPreviewImageLoads(
    urls: string[],
    onReady: (slide: ReadyPreviewSlide) => void,
    isCancelled: () => boolean
): void {
    if (urls.length === 0) {
        return;
    }

    let nextIndex = 0;

    const runNext = (): Promise<void> => {
        if (isCancelled() || nextIndex >= urls.length) {
            return Promise.resolve();
        }
        const url = urls[nextIndex];
        nextIndex += 1;
        if (url === undefined) {
            return runNext();
        }
        return loadPreviewImage(url).then(
            (slide) => {
                if (!(isCancelled() || slide === null)) {
                    onReady(slide);
                }
                return runNext();
            },
            () => runNext()
        );
    };

    const workerCount = Math.min(PREVIEW_IMAGE_LOAD_CONCURRENCY, urls.length);
    for (let worker = 0; worker < workerCount; worker += 1) {
        runNext().catch(() => undefined);
    }
}

const NAME_MAX_LENGTH = 64;

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    notation: "compact",
});

const DEFAULT_PRIORITY: PriorityOption = {
    icon: PriorityNoneIcon,
    label: "No priority",
    value: "none",
};

const PRIORITIES = [
    DEFAULT_PRIORITY,
    {
        icon: Sparkle,
        label: "Very relevant",
        value: "very_relevant",
    },
    {
        icon: SignalHigh,
        label: "Relevant",
        value: "relevant",
    },
    {
        icon: SignalMedium,
        label: "Background",
        value: "peripheral",
    },
    {
        icon: ArchiveIcon,
        label: "Archive",
        value: "archive",
    },
] as const satisfies PriorityOption[];

const PRIORITY_BY_VALUE = new Map(
    PRIORITIES.map((option) => [option.value, option])
);

const SORT_OPTIONS = [
    {
        icon: SignalHigh,
        label: "Priority",
        value: "priority",
    },
    {
        icon: Component,
        label: "Count",
        value: "count",
    },
    {
        icon: ArrowUpDown,
        label: "Name",
        value: "name",
    },
    {
        icon: ClockFading,
        label: "Created",
        value: "created",
    },
    {
        icon: Clock,
        label: "Updated",
        value: "updated",
    },
] as const satisfies SortingOption[];

const SORT_OPTION_BY_VALUE = new Map(
    SORT_OPTIONS.map((option) => [option.value, option])
);

const VIEW_OPTIONS = [
    { icon: LayoutList, label: "Show all", value: "show-all" },
    { icon: ArchiveX, label: "Exclude archives", value: "exclude-archives" },
    { icon: GlobeCheck, label: "Show shared only", value: "show-shared-only" },
] as const;

const { useStore: useCollectionsListStateStore } = createStore({
    favoriteCollectionIds: storage<string[]>([]),
    feedback: null as CollectionFeedback | null,
    isCollectionsListOpen: storage(false),
    isFavoritesListOpen: storage(true),
    isRecommendationsOpen: storage(true),
});

function getFavoriteCollectionSummaries(
    collectionSummaries: LibraryCollectionSummary[],
    favoriteCollectionIds: readonly string[]
): LibraryCollectionSummary[] {
    if (favoriteCollectionIds.length === 0) {
        return [];
    }
    const favoriteCollectionIdSet = new Set(favoriteCollectionIds);
    return collectionSummaries.filter((collection) =>
        favoriteCollectionIdSet.has(collection.id)
    );
}

function useCollectionFeedbackWriter() {
    const { setFeedback } = useCollectionsListStateStore();

    const showError = useStableCallback((message: string) => {
        setFeedback({ message, tone: "error" });
    });

    const showSuccess = useStableCallback((message: string) => {
        setFeedback({ message, tone: "success" });
    });

    return { showError, showSuccess };
}

type CollectionAccessAction =
    | "copy"
    | "export"
    | "open"
    | "send to Notion"
    | "share";

function useCollectionAccessGate() {
    const { itemsByCollectionId } = useLibraryItemsContext();
    const { hasAccess } = useSubscriptionAccess();
    const { showError } = useCollectionFeedbackWriter();

    return useStableCallback(
        (
            collection: LibraryCollectionSummary,
            action: CollectionAccessAction
        ): boolean => {
            const visibleItemCount =
                itemsByCollectionId.get(collection.id)?.length ?? 0;
            const isHidden =
                !hasAccess && visibleItemCount < collection.itemCount;

            if (isHidden) {
                showError(
                    `Upgrade ${action} every item in ${collection.name}.`
                );
                return false;
            }
            return true;
        }
    );
}

function useCopyWithFeedback() {
    const { copyToClipboard } = useCopyToClipboard();
    const { showError, showSuccess } = useCollectionFeedbackWriter();

    return useStableCallback(
        async (text: string, successMessage: string, errorMessage: string) => {
            if (await copyToClipboard(text)) {
                showSuccess(successMessage);
            } else {
                showError(errorMessage);
            }
        }
    );
}

function useCollectionFeedback() {
    const { feedback, setFeedback } = useCollectionsListStateStore();
    const dismissFeedback = useStableCallback(() => {
        setFeedback(null);
    });

    return { dismissFeedback, feedback };
}

function useToggleCollectionFavorite() {
    const { favoriteCollectionIds, setFavoriteCollectionIds, setFeedback } =
        useCollectionsListStateStore();
    const favoriteCollectionIdSet = new Set(favoriteCollectionIds);

    const toggleFavorite = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            const isNowFavorite = !favoriteCollectionIdSet.has(collection.id);
            setFavoriteCollectionIds((current) =>
                toggleValue(current, collection.id)
            );
            setFeedback({
                message: isNowFavorite
                    ? `${collection.name} added to Favorites.`
                    : `${collection.name} removed from Favorites.`,
                tone: "success",
            });
        }
    );

    return { favoriteCollectionIdSet, toggleFavorite };
}

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
}

interface CollectionsListState {
    createItemId: string | null;
    hoveredCollectionIdRef: React.RefObject<string | null>;
    hoveredCollectionSourceRef: React.RefObject<CollectionListSource | null>;
    isCreateOpen: boolean;
    pendingDeleteId: string | null;
    pendingPriorityComboboxOpen: string | null;
    pendingRenameId: string | null;
}

interface CollectionsListActions {
    closeCreateDialog: () => void;
    closePendingDelete: () => void;
    closePendingRename: () => void;
    createSubmissionPendingRef: React.RefObject<boolean>;
    onCopyLinks: (collection: LibraryCollectionSummary) => Promise<void>;
    onCopyTitle: (collection: LibraryCollectionSummary) => Promise<void>;
    onDelete: (collection: LibraryCollectionSummary) => void;
    onDuplicate: (collection: LibraryCollectionSummary) => void;
    onExportCsv: (collection: LibraryCollectionSummary) => void;
    onOpenLinks: (collection: LibraryCollectionSummary) => void;
    onRename: (collection: LibraryCollectionSummary) => void;
    onUpdatePriority: (
        collectionId: string,
        priority: CollectionPriority
    ) => Promise<void>;
    openCreateDialog: (itemId?: string) => void;
    setHoveredCollectionSource: (source: CollectionListSource | null) => void;
    setPendingPriorityComboboxOpen: React.Dispatch<
        React.SetStateAction<string | null>
    >;
    syncCreated: (input: SyncCreatedCollectionInput) => void;
    syncDeleted: (collectionId: string) => void;
    syncName: (id: string, name: string) => void;
}

const CollectionsListStateContext =
    React.createContext<CollectionsListState | null>(null);

const CollectionsListActionsContext =
    React.createContext<CollectionsListActions | null>(null);

function getItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

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
        .join(CSV_RECORD_SEPARATOR);
}

function getCreatedAssignedItemIds(
    result: Extract<
        CollectionCreateResult,
        { status: typeof ACTION_STATUS.CREATED }
    >
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

const createCollectionSafely = tryAction(
    createCollection,
    CREATE_ERROR_MESSAGE
);
const getCollectionDescriptionSafely = tryAction(
    getCollectionDescription,
    DESCRIPTION_GENERATION_ERROR_MESSAGE
);
const deleteCollectionSafely = tryAction(
    deleteCollection,
    DELETE_ERROR_MESSAGE
);
const duplicateCollectionSafely = tryAction(
    duplicateCollection,
    DUPLICATE_ERROR_MESSAGE
);
const renameCollectionSafely = tryAction(
    renameCollection,
    RENAME_ERROR_MESSAGE
);
const updateCollectionPrioritySafely = tryAction(
    updateCollectionPriority,
    UPDATE_PRIORITY_ERROR_MESSAGE
);
const disableCollectionSharingSafely = tryAction(
    disableCollectionSharing,
    DISABLE_SHARING_ERROR_MESSAGE
);
const sendCollectionToNotionSafely = tryAction(
    sendCollectionToNotion,
    SEND_TO_NOTION_ERROR_MESSAGE
);

export function Collections() {
    return (
        <CollectionsListProvider>
            <CollectionsListFavorites
                className="group/collapsible"
                data-sidebar-collapsible=""
            >
                <CollectionsListToolbar className="group">
                    <CollectionsListFavoritesTrigger>
                        <T>Favorites</T>
                    </CollectionsListFavoritesTrigger>
                    <CollectionsListToolbarGroup>
                        <Kbd className="bg-transparent opacity-0 group-hover:opacity-50 group-has-data-open/collapsible:hidden">
                            <ShiftKbd />
                            <CmdKbd />F
                        </Kbd>
                    </CollectionsListToolbarGroup>
                </CollectionsListToolbar>
                <CollapsiblePanel>
                    <CollectionsListFavoritesCarouselContent>
                        {(item) => (
                            <CollectionsListFavoritesCarouselSlide
                                item={item}
                                key={item.id}
                            />
                        )}
                    </CollectionsListFavoritesCarouselContent>
                    <CollectionsListFavoritesContent>
                        {(collection) => (
                            <CollectionsListItem
                                collection={collection}
                                key={collection.id}
                                source="favorites"
                            >
                                <CollectionsListItemPriorityCombobox />
                                <CollectionsListItemTrigger>
                                    <CollectionsListItemValue />
                                </CollectionsListItemTrigger>
                                <CollectionsListItemMetadata>
                                    {dayjs(collection.updatedAt).fromNow(true)}
                                </CollectionsListItemMetadata>
                            </CollectionsListItem>
                        )}
                    </CollectionsListFavoritesContent>
                </CollapsiblePanel>
            </CollectionsListFavorites>
            <CollectionsList
                className="group/collapsible"
                data-sidebar-collapsible=""
            >
                <CollectionsListToolbar className="group">
                    <CollectionsListTrigger>
                        <T>Collections</T>
                    </CollectionsListTrigger>
                    <CollectionsListToolbarGroup>
                        <Kbd className="bg-transparent opacity-0 group-hover:opacity-50 group-has-data-open/collapsible:hidden">
                            <ShiftKbd />
                            <CmdKbd />C
                        </Kbd>
                        <CollectionsListToolbarButton
                            render={<CollectionsListClearFilterButton />}
                        />
                        <CollectionsListToolbarButton
                            render={<CollectionsListSortingCombobox />}
                        />
                        <CollectionsListToolbarButton
                            render={<CollectionsListCreateButton />}
                        />
                    </CollectionsListToolbarGroup>
                </CollectionsListToolbar>
                <CollapsiblePanel>
                    <div className="flex p-1.5 pt-0.5 pl-2.5">
                        <CollectionsListCalloutPopover />
                    </div>
                    <CollectionsListEmpty />
                    <CollectionsListContent>
                        {(collection) => (
                            <CollectionsListItem
                                collection={collection}
                                key={collection.id}
                                source="collections"
                            >
                                <CollectionsListItemPriorityCombobox />
                                <CollectionsListItemTrigger>
                                    <CollectionsListItemValue />
                                </CollectionsListItemTrigger>
                                <CollectionsListItemMetadata>
                                    {COMPACT_NUMBER_FORMATTER.format(
                                        collection.itemCount
                                    )}
                                </CollectionsListItemMetadata>
                            </CollectionsListItem>
                        )}
                    </CollectionsListContent>
                    <CollectionsListRecommendations>
                        {(template) => (
                            <CollectionRecommendationItem
                                key={template.value}
                                template={template}
                            />
                        )}
                    </CollectionsListRecommendations>
                </CollapsiblePanel>
            </CollectionsList>
            <CollectionsListStatus />
            <CollectionsRenameDialog />
            <CollectionsCreateDialog />
            <CollectionsDeleteDialog />
        </CollectionsListProvider>
    );
}

export function CollectionCard({
    collection,
}: {
    collection: CollectionPreview;
}) {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl bg-muted/60">
            <CollectionThumbnailGrid urls={collection.previewImageUrls}>
                {(url) => <CollectionThumbnailCell url={url} />}
            </CollectionThumbnailGrid>
            <div className="flex flex-col gap-1 p-3">
                <h3
                    className="truncate font-medium text-foreground text-sm"
                    title={collection.name}
                >
                    {collection.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                </p>
            </div>
        </div>
    );
}

interface CollectionThumbnailGridProps {
    children: (url: string | null, index: number) => React.ReactNode;
    urls: string[];
}

function CollectionThumbnailGrid({
    children,
    urls,
}: CollectionThumbnailGridProps) {
    return (
        <div className="grid h-40 w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted/40">
            {PREVIEW_CELL_KEYS.map((cellKey, index) => (
                <React.Fragment key={cellKey}>
                    {children(urls[index] ?? null, index)}
                </React.Fragment>
            ))}
        </div>
    );
}

const PREVIEW_CELL_KEYS = ["tl", "tr", "bl", "br"] as const;

function CollectionThumbnailCell({ url }: { url: string | null }) {
    const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

    const handleError = useStableCallback(() => {
        if (url) {
            setFailedUrl(url);
        }
    });

    if (!url || failedUrl === url) {
        return <MediaPlaceholder className="size-full rounded-none" />;
    }

    return (
        <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            height={160}
            loading="lazy"
            onError={handleError}
            src={url}
            width={160}
        />
    );
}

function useCollectionDialogRequests() {
    const { setFeedback } = useCollectionsListStateStore();
    const { createItemId, isCreateOpen, onCloseCreate, requestCreate } =
        useCollectionsContext();
    const createSubmissionPendingRef = React.useRef(false);

    const [pendingRenameId, setPendingRenameId] = React.useState<string | null>(
        null
    );
    const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
        null
    );

    const openCreateDialog = useStableCallback((itemId?: string) => {
        setFeedback(null);
        requestCreate(itemId);
    });

    const requestDelete = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setFeedback(null);
            setPendingDeleteId(collection.id);
        }
    );

    const requestRename = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setFeedback(null);
            setPendingRenameId(collection.id);
        }
    );

    const handleCreateShortcutPress = useStableCallback(() => {
        if (isCreateOpen) {
            if (createSubmissionPendingRef.current) {
                return;
            }
            onCloseCreate();
            return;
        }
        openCreateDialog();
    });

    useHotkeys("mod+n", handleCreateShortcutPress, {
        description: "Create a new collection",
        preventDefault: true,
    });

    return {
        closeCreateDialog: onCloseCreate,
        closePendingDelete: () => setPendingDeleteId(null),
        closePendingRename: () => setPendingRenameId(null),
        createItemId,
        createSubmissionPendingRef,
        isCreateOpen,
        openCreateDialog,
        pendingDeleteId,
        pendingRenameId,
        requestDelete,
        requestRename,
    };
}

function useCollectionRowActions() {
    const { collections, syncCollectionCreated, syncCollectionPriority } =
        useCollectionsContext();
    const { itemsByCollectionId } = useLibraryItemsContext();
    const { setFeedback } = useCollectionsListStateStore();
    const { showError, showSuccess } = useCollectionFeedbackWriter();
    const ensureAccess = useCollectionAccessGate();
    const copyWithFeedback = useCopyWithFeedback();
    const [, startTransition] = React.useTransition();

    const [pendingPriorityComboboxOpen, setPendingPriorityComboboxOpen] =
        React.useState<string | null>(null);

    const pendingPriorityIdsRef = React.useRef(new Set<string>());

    const getCollectionItems = (collectionId: string) =>
        itemsByCollectionId.get(collectionId) ?? [];

    const onCopyLinks = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
            if (!ensureAccess(collection, "copy")) {
                return;
            }

            const urls = getItemUrls(getCollectionItems(collection.id));
            if (urls.length === 0) {
                showError(EMPTY_LINKS_ERROR_MESSAGE);
                return;
            }

            await copyWithFeedback(
                urls.join("\n"),
                `Links from ${collection.name} copied to the clipboard.`,
                COPY_LINKS_ERROR_MESSAGE
            );
        }
    );

    const onCopyTitle = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
            await copyWithFeedback(
                collection.name,
                `${collection.name} title copied to the clipboard.`,
                COPY_TITLE_ERROR_MESSAGE
            );
        }
    );

    const onOpenLinks = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            if (!ensureAccess(collection, "open")) {
                return;
            }

            const urls = getItemUrls(getCollectionItems(collection.id));
            if (urls.length === 0) {
                showError(EMPTY_LINKS_ERROR_MESSAGE);
                return;
            }

            showSuccess(
                `Opening ${urls.length} link${urls.length === 1 ? "" : "s"} from ${collection.name}.`
            );

            for (const url of urls) {
                openExternal(url);
            }
        }
    );

    const onExportCsv = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            if (!ensureAccess(collection, "export")) {
                return;
            }

            const items = getCollectionItems(collection.id);
            if (items.length === 0) {
                showError(EMPTY_ITEMS_ERROR_MESSAGE);
                return;
            }

            startTransition(async () => {
                try {
                    await saveFile(
                        new Blob([buildCsv(collection, items)], {
                            type: MIME_TYPES.csv,
                        }),
                        {
                            description: "CSV file",
                            extension: "csv",
                            name: `${slugify(collection.name) || "collection"}-links`,
                        }
                    );
                    showSuccess(`${collection.name} exported as CSV.`);
                } catch {
                    showError(EXPORT_CSV_ERROR_MESSAGE);
                }
            });
        }
    );

    const onUpdatePriority = useStableCallback(
        async (collectionId: string, priority: CollectionPriority) => {
            if (pendingPriorityIdsRef.current.has(collectionId)) {
                return;
            }

            const previous = collections.find(
                (c) => c.id === collectionId
            )?.priority;

            if (!previous || previous === priority) {
                return;
            }

            pendingPriorityIdsRef.current.add(collectionId);
            syncCollectionPriority(collectionId, priority);

            try {
                const result = await updateCollectionPrioritySafely({
                    collectionId,
                    priority,
                });

                if (result.status === ACTION_STATUS.UPDATED) {
                    syncCollectionPriority(
                        result.collection.id,
                        result.collection.priority
                    );
                } else {
                    syncCollectionPriority(collectionId, previous);
                    showError(result.message);
                }
            } finally {
                pendingPriorityIdsRef.current.delete(collectionId);
            }
        }
    );

    const onDuplicate = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setFeedback(null);

            startTransition(async () => {
                const result = await duplicateCollectionSafely({
                    collectionId: collection.id,
                });

                if (result.status !== ACTION_STATUS.CREATED) {
                    showError(result.message);
                    return;
                }

                syncCollectionCreated({
                    assignedItemIds: result.assignedItemIds,
                    collection: result.collection,
                });
                showSuccess(
                    `${collection.name} copied as ${result.collection.name}.`
                );
            });
        }
    );

    return {
        onCopyLinks,
        onCopyTitle,
        onDuplicate,
        onExportCsv,
        onOpenLinks,
        onUpdatePriority,
        pendingPriorityComboboxOpen,
        setPendingPriorityComboboxOpen,
    };
}

function useCollectionPanelHotkeys() {
    const { setIsCollectionsListOpen, setIsFavoritesListOpen } =
        useCollectionsListStateStore();

    const handleCollectionsListShortcutPress = useStableCallback(() => {
        setIsCollectionsListOpen((current) => !current);
    });

    const handleFavoritesListShortcutPress = useStableCallback(() => {
        setIsFavoritesListOpen((current) => !current);
    });

    useHotkeys("shift+mod+c", handleCollectionsListShortcutPress, {
        description: "Toggle collections panel",
        preventDefault: true,
    });

    useHotkeys("shift+mod+f", handleFavoritesListShortcutPress, {
        description: "Toggle favorites panel",
        preventDefault: true,
    });
}

function useCollectionHoverHotkeys({
    hoveredCollectionIdRef,
    hoveredCollectionSourceRef,
    onCopyLinks,
    onUpdatePriority,
    requestDelete,
    requestRename,
    setPendingPriorityComboboxOpen,
}: {
    hoveredCollectionIdRef: React.RefObject<string | null>;
    hoveredCollectionSourceRef: React.RefObject<CollectionListSource | null>;
    onCopyLinks: (collection: LibraryCollectionSummary) => void;
    onUpdatePriority: (
        collectionId: string,
        priority: CollectionPriority
    ) => void;
    requestDelete: (collection: LibraryCollectionSummary) => void;
    requestRename: (collection: LibraryCollectionSummary) => void;
    setPendingPriorityComboboxOpen: (value: string | null) => void;
}) {
    const { favoriteCollectionIdSet, toggleFavorite } =
        useToggleCollectionFavorite();

    const favoriteCollectionIdSetRef = React.useRef(favoriteCollectionIdSet);
    favoriteCollectionIdSetRef.current = favoriteCollectionIdSet;

    const { collections } = useCollectionsContext();

    const resolveHoveredCollection = () => {
        if (!isCollectionHoverHotkeySurface()) {
            return null;
        }
        return (
            collections.find(
                (collection) => collection.id === hoveredCollectionIdRef.current
            ) ?? null
        );
    };

    useHotkeys(
        "alt+e",
        (event) => {
            const target = resolveHoveredCollection();
            if (target) {
                event.preventDefault();
                requestRename(target);
            }
        },
        { description: "Rename hovered collection" }
    );

    useHotkeys(
        ["delete", "backspace"],
        (event) => {
            const target = resolveHoveredCollection();
            if (target) {
                event.preventDefault();
                requestDelete(target);
            }
        },
        { description: "Delete hovered collection" }
    );

    useHotkeys(
        "c",
        (event) => {
            const target = resolveHoveredCollection();
            if (target && target.itemCount > 0) {
                event.preventDefault();
                onCopyLinks(target);
            }
        },
        { description: "Copy links from hovered collection" }
    );

    useHotkeys(
        "alt+f",
        (event) => {
            const target = resolveHoveredCollection();
            if (target && !favoriteCollectionIdSetRef.current.has(target.id)) {
                event.preventDefault();
                toggleFavorite(target);
            }
        },
        { description: "Favorite hovered collection" }
    );

    useHotkeys(
        "shift+mod+a",
        (event) => {
            const target = resolveHoveredCollection();
            if (target) {
                event.preventDefault();
                onUpdatePriority(
                    target.id,
                    getToggledArchivePriority(target.priority)
                );
            }
        },
        { description: "Archive or unarchive hovered collection" }
    );

    useHotkeys(
        "p",
        () => {
            const target = resolveHoveredCollection();
            if (!target) {
                return;
            }
            const source = hoveredCollectionSourceRef.current ?? "collections";
            setPendingPriorityComboboxOpen(
                buildPriorityOpenToken(source, target.id)
            );
        },
        {
            description: "Set priority for hovered collection",
            preventDefault: true,
        }
    );
}

function useCollectionsListState(): CollectionsListState {
    const context = React.use(CollectionsListStateContext);
    if (!context) {
        throw new Error(
            "Collections list state must be read within a CollectionsListProvider."
        );
    }
    return context;
}

function useCollectionsListActions(): CollectionsListActions {
    const context = React.use(CollectionsListActionsContext);
    if (!context) {
        throw new Error(
            "Collections list actions must be used within a CollectionsListProvider."
        );
    }
    return context;
}

function useSmartCollectionsToggle() {
    const { showError } = useCollectionFeedbackWriter();
    const { disabled, isLoading, mutate } = useSmartCollectionsPreference();

    const setEnabled = useStableCallback(async (enabled: boolean) => {
        try {
            await mutate(
                async () => {
                    const result = await setSmartCollectionsPreference({
                        enabled,
                    });
                    if (result.status !== ACTION_STATUS.UPDATED) {
                        throw new Error(result.message);
                    }
                    return { disabled: !enabled };
                },
                {
                    optimisticData: { disabled: !enabled },
                    rollbackOnError: true,
                }
            );
        } catch (error) {
            log.error(
                `Failed to ${enabled ? "enable" : "disable"} smart collections`,
                { error }
            );
            showError(
                enabled
                    ? ENABLE_SMART_COLLECTIONS_ERROR_MESSAGE
                    : DISABLE_SMART_COLLECTIONS_ERROR_MESSAGE
            );
        }
    });

    return { disabled, isLoading, setEnabled };
}

function CollectionsListProvider({ children }: React.PropsWithChildren) {
    const hoveredCollectionIdRef = React.useRef<string | null>(null);
    const hoveredCollectionSourceRef =
        React.useRef<CollectionListSource | null>(null);

    const { syncCollectionCreated, syncCollectionDeleted, syncCollectionName } =
        useCollectionsContext();
    const { setFavoriteCollectionIds } = useCollectionsListStateStore();
    const dialogs = useCollectionDialogRequests();
    const rowActions = useCollectionRowActions();

    const syncDeleted = useStableCallback((collectionId: string) => {
        syncCollectionDeleted(collectionId);
        if (hoveredCollectionIdRef.current === collectionId) {
            hoveredCollectionIdRef.current = null;
            clearCollectionHoverHotkeySurface();
        }
        setFavoriteCollectionIds((current) =>
            removeValue(current, collectionId)
        );
    });

    const setHoveredCollectionSource = useStableCallback(
        (source: CollectionListSource | null) => {
            hoveredCollectionSourceRef.current = source;
        }
    );

    React.useEffect(() => {
        const clearStaleCollectionHover = () => {
            hoveredCollectionIdRef.current = null;
            hoveredCollectionSourceRef.current = null;
            clearCollectionHoverHotkeySurface();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                clearStaleCollectionHover();
            }
        };
        window.addEventListener("blur", clearStaleCollectionHover);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("blur", clearStaleCollectionHover);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, []);

    useCollectionHoverHotkeys({
        hoveredCollectionIdRef,
        hoveredCollectionSourceRef,
        onCopyLinks: rowActions.onCopyLinks,
        onUpdatePriority: rowActions.onUpdatePriority,
        requestDelete: dialogs.requestDelete,
        requestRename: dialogs.requestRename,
        setPendingPriorityComboboxOpen:
            rowActions.setPendingPriorityComboboxOpen,
    });

    useCollectionPanelHotkeys();

    const state: CollectionsListState = {
        createItemId: dialogs.createItemId,
        hoveredCollectionIdRef,
        hoveredCollectionSourceRef,
        isCreateOpen: dialogs.isCreateOpen,
        pendingDeleteId: dialogs.pendingDeleteId,
        pendingPriorityComboboxOpen: rowActions.pendingPriorityComboboxOpen,
        pendingRenameId: dialogs.pendingRenameId,
    };

    const actions: CollectionsListActions = {
        closeCreateDialog: dialogs.closeCreateDialog,
        closePendingDelete: dialogs.closePendingDelete,
        closePendingRename: dialogs.closePendingRename,
        createSubmissionPendingRef: dialogs.createSubmissionPendingRef,
        onCopyLinks: rowActions.onCopyLinks,
        onCopyTitle: rowActions.onCopyTitle,
        onDelete: dialogs.requestDelete,
        onDuplicate: rowActions.onDuplicate,
        onExportCsv: rowActions.onExportCsv,
        onOpenLinks: rowActions.onOpenLinks,
        onRename: dialogs.requestRename,
        onUpdatePriority: rowActions.onUpdatePriority,
        openCreateDialog: dialogs.openCreateDialog,
        setHoveredCollectionSource,
        setPendingPriorityComboboxOpen:
            rowActions.setPendingPriorityComboboxOpen,
        syncCreated: syncCollectionCreated,
        syncDeleted,
        syncName: syncCollectionName,
    };

    return (
        <CollectionsListStateContext value={state}>
            <CollectionsListActionsContext value={actions}>
                {children}
            </CollectionsListActionsContext>
        </CollectionsListStateContext>
    );
}

function useCollectionPreviewPlayback({
    isCycling,
    shouldLoad,
    thumbnails,
}: {
    isCycling: boolean;
    shouldLoad: boolean;
    thumbnails: string[];
}) {
    const isReducedMotion = useReducedMotion();
    const thumbnailsKey = thumbnails.join("\0");
    const slideTimeout = useTimeout();
    const readySlidesRef = React.useRef<ReadyPreviewSlide[]>([]);

    const [readySlides, setReadySlides] = React.useState<ReadyPreviewSlide[]>(
        () => getReadyPreviewSlides(thumbnails)
    );
    const [activeSrc, setActiveSrc] = React.useState<string | null>(null);
    const [prevThumbnailsKey, setPrevThumbnailsKey] =
        React.useState(thumbnailsKey);
    const [prevShouldLoad, setPrevShouldLoad] = React.useState(shouldLoad);

    if (prevThumbnailsKey !== thumbnailsKey) {
        setPrevThumbnailsKey(thumbnailsKey);
        const initialReady = getReadyPreviewSlides(thumbnails);
        const firstReady = initialReady[0];
        setReadySlides(initialReady);
        setActiveSrc(firstReady === undefined ? null : firstReady.src);
    }

    if (prevShouldLoad !== shouldLoad) {
        setPrevShouldLoad(shouldLoad);
        if (!shouldLoad) {
            const firstReady = readySlides[0];
            setActiveSrc(firstReady === undefined ? null : firstReady.src);
        }
    }

    React.useEffect(() => {
        if (!shouldLoad) {
            return;
        }

        let cancelled = false;
        const urls =
            thumbnailsKey.length === 0 ? [] : thumbnailsKey.split("\0");

        startPreviewImageLoads(
            urls,
            (slide) => {
                setReadySlides((previous) =>
                    mergeReadyPreviewSlide(urls, previous, slide)
                );
            },
            () => cancelled
        );

        return () => {
            cancelled = true;
        };
    }, [shouldLoad, thumbnailsKey]);

    readySlidesRef.current = readySlides;

    const activeSlide = resolveActivePreviewSlide(readySlides, activeSrc);
    if (activeSlide !== null && activeSlide.src !== activeSrc) {
        setActiveSrc(activeSlide.src);
    }

    const shouldCycle =
        isCycling && readySlides.length > 1 && isReducedMotion !== true;

    React.useEffect(() => {
        if (!shouldCycle) {
            slideTimeout.clear();
            return;
        }

        const scheduleNext = () => {
            slideTimeout.start(PREVIEW_SLIDE_INTERVAL_MS, () => {
                setActiveSrc((currentSrc) =>
                    nextPreviewSlideSrc(readySlidesRef.current, currentSrc)
                );
                scheduleNext();
            });
        };
        scheduleNext();

        return () => {
            slideTimeout.clear();
        };
    }, [shouldCycle, slideTimeout]);

    const reportSlideError = useStableCallback((src: string) => {
        PREVIEW_IMAGE_CACHE.delete(src);
        setReadySlides((previous) =>
            previous.filter((slide) => slide.src !== src)
        );
        setActiveSrc((currentSrc) => (currentSrc === src ? null : currentSrc));
    });

    return {
        activeSlide,
        reportSlideError,
    };
}

function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY;
}

function getCollectionItemStyle(
    name: string,
    isSelected: boolean
): CollectionItemStyle {
    const color = getHexColorFromName(name);
    const base = `color-mix(in srgb, ${color} ${isSelected ? 20 : 10}%, transparent)`;

    return {
        "--accent-color": `color-mix(in srgb, ${color}, light-dark(black, white) 20%)`,
        "--collection-background": isSelected
            ? `color-mix(in srgb, ${base}, light-dark(white, black) 4%)`
            : `color-mix(in srgb, ${base}, light-dark(black, white) 4%)`,
        "--text-muted-color": `color-mix(in srgb, ${color} 28%, light-dark(black, white) 22%)`,
    };
}

function getComboboxCollectionsSortingGroups(
    inputValue: string,
    currentValue: ComboboxValue
): ComboboxGroupData[] {
    const query = inputValue.trim();
    const normalizedQuery = query.toLowerCase();

    const matchingSortOptions = SORT_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
    );

    const hasActiveTextMatch =
        currentValue.sortField === "text-match" &&
        currentValue.sortQuery.length > 0;

    const queryMatchesActiveTextMatch =
        hasActiveTextMatch &&
        currentValue.sortQuery.toLowerCase().includes(normalizedQuery);

    let textMatchItem: ComboboxValue | null = null;

    if (
        hasActiveTextMatch &&
        (normalizedQuery.length === 0 || queryMatchesActiveTextMatch)
    ) {
        textMatchItem = {
            icon: ListFilter,
            label: `\u201c${currentValue.sortQuery}\u201d`,
            sortField: "text-match",
            sortQuery: currentValue.sortQuery,
            view: currentValue.view,
        };
    } else if (normalizedQuery.length > 0) {
        textMatchItem = {
            icon: ListFilter,
            label: `\u201c${query}\u201d`,
            sortField: "text-match",
            sortQuery: query,
            view: currentValue.view,
        };
    }

    const groups: ComboboxGroupData[] = [];

    if (matchingSortOptions.length > 0) {
        groups.push({
            group: "sort",
            items: matchingSortOptions.map((option) => ({
                icon: option.icon,
                label: option.label,
                sortField: option.value,
                sortQuery: currentValue.sortQuery,
                view: currentValue.view,
            })),
        });
    }

    if (textMatchItem) {
        groups.push({ group: "text-match", items: [textMatchItem] });
    }

    const matchingViewOptions = VIEW_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
    );

    if (matchingViewOptions.length > 0) {
        groups.push({
            group: "view",
            items: matchingViewOptions.map((option) => ({
                icon: option.icon,
                label: option.label,
                sortField: currentValue.sortField,
                sortQuery: currentValue.sortQuery,
                view: option.value,
            })),
        });
    }

    return groups;
}

function getComboboxOptionValue(value: ComboboxValue): string {
    return `${value.sortField}:${value.view}:${value.sortQuery}`;
}

function isComboboxValueEqual(
    item: ComboboxValue,
    value: ComboboxValue
): boolean {
    return (
        item.sortField === value.sortField &&
        item.view === value.view &&
        (item.sortField !== "text-match" || item.sortQuery === value.sortQuery)
    );
}

function CollectionsComboboxOptionRow({
    icon: Icon,
    label,
}: {
    icon: React.ElementType;
    label: string;
}) {
    return (
        <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
            <Icon
                aria-hidden
                className="size-4 text-muted-foreground"
                focusable="false"
            />
            <span className="truncate">{label}</span>
        </span>
    );
}

function CollectionsListItemPreviewImage({
    alt,
    className,
    src,
    ...props
}: React.ComponentProps<"img">) {
    const [failedSrc, setFailedSrc] = React.useState<string | Blob | null>(
        null
    );
    const hasFailed = src !== undefined && failedSrc === src;

    const handleError = useStableCallback((): void => {
        setFailedSrc(src ?? null);
    });

    if (!src || hasFailed) {
        return (
            <MediaPlaceholder className={cn("min-h-32 w-full", className)} />
        );
    }

    return (
        // biome-ignore lint/correctness/useImageSize: dynamic aspect ratio parent handles layout
        <img
            {...props}
            alt={alt}
            className={className}
            decoding="async"
            loading="eager"
            onError={handleError}
            src={src}
        />
    );
}

function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListStateStore();

    return (
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={setIsCollectionsListOpen}
            open={isCollectionsListOpen}
        />
    );
}

function CollectionsListTrigger({
    children,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const { collectionSummaries } = useCollectionsContext();
    const { isCollectionsListOpen } = useCollectionsListStateStore();

    const collectionLabels = collectionSummaries.map(
        (collection) => collection.name
    );

    return (
        <CollectionsListGroupTrigger
            {...props}
            count={collectionSummaries.length}
            isOpen={isCollectionsListOpen}
            labels={collectionLabels}
            placeholder="No collections yet"
            priorityCounts={countBy(
                collectionSummaries,
                (collection) => collection.priority
            )}
        >
            {children}
        </CollectionsListGroupTrigger>
    );
}

function CollectionsListFavorites({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { collectionSummaries } = useCollectionsContext();
    const { favoriteItems } = useLibraryItemsContext();
    const {
        favoriteCollectionIds,
        isFavoritesListOpen,
        setIsFavoritesListOpen,
    } = useCollectionsListStateStore();

    const hasFavoriteCollections =
        getFavoriteCollectionSummaries(
            collectionSummaries,
            favoriteCollectionIds
        ).length > 0;

    if (!(hasFavoriteCollections || favoriteItems.length)) {
        return null;
    }

    return (
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={setIsFavoritesListOpen}
            open={isFavoritesListOpen}
        />
    );
}

function CollectionsListFavoritesTrigger({
    children,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const locale = useLocale();
    const { collectionSummaries } = useCollectionsContext();
    const { favoriteItems } = useLibraryItemsContext();
    const { favoriteCollectionIds, isFavoritesListOpen } =
        useCollectionsListStateStore();

    const favoriteCollectionSummaries = getFavoriteCollectionSummaries(
        collectionSummaries,
        favoriteCollectionIds
    );
    const collectionLabels = favoriteCollectionSummaries.map(
        (collection) => collection.name
    );

    return (
        <CollectionsListGroupTrigger
            {...props}
            count={favoriteCollectionSummaries.length + favoriteItems.length}
            description={formatFavoritesGroupSummary(
                locale,
                collectionLabels,
                favoriteItems.length
            )}
            isOpen={isFavoritesListOpen}
            labels={collectionLabels}
            placeholder="No favorites yet"
            priorityCounts={countBy(
                favoriteCollectionSummaries,
                (collection) => collection.priority
            )}
        >
            {children}
        </CollectionsListGroupTrigger>
    );
}

interface CollectionsListChildrenProps<T> {
    children: (item: T, index: number) => React.ReactNode;
}

interface CollectionsListGroupTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    count: number;
    description?: string;
    isOpen: boolean;
    labels: string[];
    placeholder: string;
    priorityCounts?: Partial<Record<CollectionPriority, number>>;
}

type PriorityBreakdownEntry = PriorityOption & { count: number };

const LIST_FORMATTERS = new Map<string, Intl.ListFormat>();

function getListFormatter(locale: string): Intl.ListFormat {
    let formatter = LIST_FORMATTERS.get(locale);
    if (!formatter) {
        formatter = new Intl.ListFormat(locale, {
            style: "long",
            type: "conjunction",
        });
        LIST_FORMATTERS.set(locale, formatter);
    }
    return formatter;
}

function formatFavoritesGroupSummary(
    locale: string,
    collectionLabels: string[],
    individualItemCount: number
): string {
    if (collectionLabels.length === 0 && individualItemCount === 0) {
        return "";
    }
    if (collectionLabels.length === 0) {
        return individualItemCount === 1
            ? "1 item"
            : `${individualItemCount} items`;
    }
    const formatter = getListFormatter(locale);
    if (individualItemCount === 0) {
        return formatter.format(collectionLabels);
    }
    const moreLabel =
        individualItemCount === 1 ? "1 more" : `${individualItemCount} more`;
    return formatter.format([...collectionLabels, moreLabel]);
}

function buildPriorityBreakdownEntries(
    priorityCounts: Partial<Record<CollectionPriority, number>> | undefined
): PriorityBreakdownEntry[] {
    return PRIORITIES.flatMap((option) => {
        const optionCount = priorityCounts?.[option.value] ?? 0;
        return optionCount > 0 ? [{ ...option, count: optionCount }] : [];
    }).sort(
        (left, right) => PRIORITY_RANK[left.value] - PRIORITY_RANK[right.value]
    );
}

function CollectionsListGroupTrigger({
    children,
    count,
    description,
    isOpen,
    labels,
    placeholder,
    priorityCounts,
    render,
    ...props
}: CollectionsListGroupTriggerProps) {
    const locale = useLocale();
    const summary =
        description ??
        (labels.length > 0
            ? getListFormatter(locale).format(labels)
            : placeholder);

    const priorityBreakdownEntries =
        buildPriorityBreakdownEntries(priorityCounts);

    return (
        <PreviewCard>
            <PreviewCardTrigger
                render={
                    <CollapsibleTrigger
                        {...props}
                        render={
                            render ?? (
                                <SidebarItem
                                    render={<button type="button" />}
                                />
                            )
                        }
                        title={isOpen ? "Collapse group" : "Expand group"}
                    />
                }
            >
                <span className="min-w-0 text-xs">
                    {children}&nbsp;
                    <span className="mx-0.5 opacity-80">{count}</span>
                </span>
                <ChevronDownFilledIcon
                    aria-hidden
                    className="-ml-0.5"
                    focusable="false"
                />
            </PreviewCardTrigger>
            <PreviewCardPopup
                align="start"
                className="p-3"
                positionMethod="fixed"
                side="right"
            >
                {isOpen && priorityBreakdownEntries.length > 0 ? (
                    <CollectionsPriorityBreakdown
                        entries={priorityBreakdownEntries}
                    />
                ) : (
                    <p className="whitespace-normal font-medium text-xs leading-tight">
                        {summary}
                    </p>
                )}
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListFavoritesCarouselContent({
    children,
}: CollectionsListChildrenProps<LibraryItemWithCollections>) {
    const { favoriteItems } = useLibraryItemsContext();

    if (!favoriteItems.length) {
        return null;
    }

    return (
        <Carousel>
            <CarouselPanel
                className="*:first:pl-2.5 [&>*:not(:last-child)]:me-1.5"
                shouldScrollFade
            >
                {favoriteItems.map(children)}
            </CarouselPanel>
        </Carousel>
    );
}

function CollectionsListFavoritesCarouselSlide({
    item,
}: {
    item: LibraryItemWithCollections;
}) {
    const { onOpenFavoriteItem, onToggleItemFavorite } =
        useLibraryItemsContext();
    const { showError } = useCollectionFeedbackWriter();

    const isNote = item.kind === ITEM_KIND_NOTE;
    const previewImageUrl = itemPreviewImageUrl(item);
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const previewLabel =
        (item.caption ?? "").trim() || (isNote ? "Note" : "Saved item");

    const handleClick = useStableCallback((event: React.SyntheticEvent) => {
        event.preventDefault();
        onOpenFavoriteItem(item);
    });

    const handleRemoveFavorite = useStableCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const result = await onToggleItemFavorite(item);
            if (result.status === ACTION_STATUS.UPDATED) {
                return;
            }
            log.error("Failed to remove item from favorites", {
                itemId: item.id,
                message: result.message,
            });
            showError(result.message);
        }
    );

    return (
        <PreviewCard>
            <div
                className="group relative inline-block aspect-3/4 h-14 overflow-hidden rounded-md bg-muted focus-within:ring-2 focus-within:ring-ring/60 active:scale-[0.97]"
                title={previewLabel}
            >
                <PreviewCardTrigger
                    aria-label={previewLabel}
                    className="size-full focus-visible:outline-none"
                    onClick={handleClick}
                >
                    {isNote ? (
                        <div className="flex size-full flex-col justify-between overflow-hidden bg-linear-to-br from-note-surface-from via-background to-note-surface-to p-1.5">
                            <p className="line-clamp-4 whitespace-pre-wrap text-left text-[9px] text-foreground leading-snug opacity-90">
                                {noteExcerpt || "Open note"}
                            </p>
                        </div>
                    ) : (
                        <CollectionsListItemPreviewImage
                            alt={previewLabel}
                            className="size-full object-cover"
                            src={previewImageUrl ?? undefined}
                        />
                    )}
                </PreviewCardTrigger>
                <button
                    aria-label="Remove from favorites"
                    className="absolute top-0 left-0 z-10 flex size-4 items-center justify-center rounded-br-md bg-black/40 opacity-100 pointer-fine:opacity-0 hover:bg-black/60 focus-visible:opacity-100 pointer-fine:group-hover:opacity-100"
                    onClick={handleRemoveFavorite}
                    type="button"
                >
                    <Trash2Icon
                        aria-hidden
                        className="size-2.5 text-white"
                        focusable="false"
                    />
                </button>
            </div>
            <PreviewCardPopup
                className="pointer-events-none p-0"
                positionMethod="fixed"
                side="top"
            >
                {isNote ? (
                    <div className="flex size-full flex-col justify-between overflow-hidden bg-linear-to-br from-note-surface-from via-background to-note-surface-to p-3">
                        <p className="line-clamp-6 whitespace-pre-wrap text-left text-foreground text-xs leading-snug">
                            {noteExcerpt || "Empty note"}
                        </p>
                    </div>
                ) : (
                    <CollectionsListItemPreviewImage
                        alt={previewLabel}
                        className="aspect-auto h-auto w-full"
                        src={previewImageUrl ?? undefined}
                    />
                )}
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListFavoritesContent({
    children,
}: CollectionsListChildrenProps<LibraryCollectionSummary>) {
    const { collectionSummaries } = useCollectionsContext();
    const { favoriteCollectionIds } = useCollectionsListStateStore();
    const favoriteCollectionSummaries = getFavoriteCollectionSummaries(
        collectionSummaries,
        favoriteCollectionIds
    );

    if (!favoriteCollectionSummaries.length) {
        return null;
    }

    return favoriteCollectionSummaries.map(children);
}

function CollectionsListContent({
    children,
}: CollectionsListChildrenProps<LibraryCollectionSummary>) {
    const { collectionSummaries } = useCollectionsContext();

    return (
        <DisclosureListVertical className="ml-1.25" maxVisible={10}>
            {collectionSummaries.map(children)}
        </DisclosureListVertical>
    );
}

function CollectionsListToolbar({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            {...props}
            className={cn(
                "relative flex w-full items-center justify-between",
                className
            )}
        />
    );
}

function CollectionsListToolbarGroup({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Group>) {
    return (
        <Toolbar.Group
            {...props}
            className={cn(
                "absolute right-1 flex items-center justify-end gap-1",
                className
            )}
        />
    );
}

function CollectionsListToolbarButton({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Button>) {
    return (
        <Toolbar.Button
            {...props}
            className={cn("opacity-80 hover:opacity-100", className)}
        />
    );
}

function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { collections, collectionSummaries } = useCollectionsContext();
    const { openCreateDialog } = useCollectionsListActions();
    const {
        collectionTextMatchQuery,
        collectionView,
        setCollectionTextMatchQuery,
        setCollectionView,
    } = useCollectionsListSortStore();

    const collectionCount = collections.length;
    const hasActiveFilters =
        collectionView !== "show-all" || collectionTextMatchQuery.length > 0;

    const handleRequestCreate = useStableCallback(() => openCreateDialog());
    const handleClearFilters = useStableCallback(() => {
        setCollectionView("show-all");
        setCollectionTextMatchQuery("");
    });

    if (collectionSummaries.length > 0) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <div
                {...props}
                className={cn(
                    "font-medium text-muted-foreground text-xs italic leading-tight",
                    className
                )}
            >
                {collectionCount > 0 ? (
                    <div className="flex flex-col items-center gap-3">
                        <span>
                            <T>No collections match this view.</T>
                        </span>
                        {hasActiveFilters ? (
                            <Button
                                onClick={handleClearFilters}
                                size="sm"
                                variant="secondary"
                            >
                                <T>Clear filters</T>
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Image
                            alt="empty cluster"
                            className="squircle mx-auto size-10 rounded-lg"
                            height={40}
                            src={EmptyCollectionStateImage}
                            width={40}
                        />
                        <span className="inline-flex items-center">
                            <T>
                                No collections found.&nbsp;{" "}
                                <button
                                    className="inline cursor-pointer underline hover:no-underline"
                                    onClick={handleRequestCreate}
                                    type="button"
                                >
                                    Create your first collection
                                </button>
                            </T>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function CollectionRecommendationItem({
    template,
}: {
    template: CollectionTemplateOption;
}) {
    const { showError, showSuccess } = useCollectionFeedbackWriter();
    const { syncCreated } = useCollectionsListActions();
    const { mutate: mutateRecommendations } = useCollectionRecommendations();
    const [isCreating, setIsCreating] = React.useState(false);

    const handleClick = useStableCallback(
        async (event: React.SyntheticEvent) => {
            if (isCreating) {
                event.preventDefault();
                return;
            }
            setIsCreating(true);
            try {
                const result = await createCollectionSafely({
                    description: template.description,
                    name: template.name,
                });
                if (result.status !== ACTION_STATUS.CREATED) {
                    showError(result.message);
                    return;
                }
                syncCreated({
                    assignedItemIds: getCreatedAssignedItemIds(result),
                    collection: result.collection,
                });
                await mutateRecommendations();
                showSuccess(`${template.name} created from template.`);
            } finally {
                setIsCreating(false);
            }
        }
    );

    return (
        <div className="group relative flex select-none items-center">
            <PreviewCard>
                <PreviewCardTrigger
                    render={
                        <SidebarItem
                            className="w-full min-w-0 flex-1 justify-start rounded-lg pr-8 pl-9.5 text-left hover:bg-transparent"
                            render={
                                <button
                                    disabled={isCreating}
                                    onClick={handleClick}
                                    type="button"
                                />
                            }
                        />
                    }
                >
                    <span className="absolute top-1/2 left-1.25 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border-none bg-muted text-muted-foreground sm:size-6">
                        <PlusIcon
                            aria-hidden
                            className="size-4 sm:size-3.5"
                            focusable="false"
                        />
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
                        <span className="max-w-full shrink-0 truncate font-medium text-sm">
                            {template.name}
                        </span>
                    </div>
                    {isCreating ? (
                        <Spinner className="absolute right-3 size-3.5" />
                    ) : (
                        <span className="absolute right-3 text-muted-foreground text-xs opacity-0 group-hover:opacity-100">
                            <T>Add</T>
                        </span>
                    )}
                </PreviewCardTrigger>
                <PreviewCardPopup
                    align="start"
                    className="p-3"
                    positionMethod="fixed"
                    side="right"
                >
                    <div className="flex max-w-64 flex-col gap-1">
                        <p className="font-medium text-xs leading-tight">
                            {template.name}
                        </p>
                        <p className="text-muted-foreground text-xs leading-snug">
                            {template.description}
                        </p>
                    </div>
                </PreviewCardPopup>
            </PreviewCard>
        </div>
    );
}

function CollectionsListRecommendations({
    children,
}: CollectionsListChildrenProps<CollectionTemplateOption>) {
    const { collectionSummaries } = useCollectionsContext();
    const { isRecommendationsOpen, setIsRecommendationsOpen } =
        useCollectionsListStateStore();
    const { items, isLoading } = useCollectionRecommendations();

    if (!(collectionSummaries.length && items.length) || isLoading) {
        return null;
    }

    return (
        <Collapsible
            className="ml-1.25 flex flex-col gap-1 pt-0.5"
            onOpenChange={setIsRecommendationsOpen}
            open={isRecommendationsOpen}
        >
            <CollapsibleTrigger
                className="flex w-full items-center p-1.5 text-muted-foreground text-xs hover:text-foreground"
                title={
                    isRecommendationsOpen
                        ? "Hide suggested collections"
                        : "Show suggested collections"
                }
            >
                {isRecommendationsOpen ? (
                    <T>Hide suggestions</T>
                ) : (
                    <T>Show suggestions</T>
                )}
            </CollapsibleTrigger>
            <CollapsiblePanel>
                <div className="flex flex-col gap-1">{items.map(children)}</div>
            </CollapsiblePanel>
        </Collapsible>
    );
}

function CollectionsListStatus({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { dismissFeedback, feedback } = useCollectionFeedback();
    const tone = feedback?.tone;

    if (!feedback?.message) {
        return null;
    }

    return (
        <div
            className="flex items-center justify-between gap-2 px-2.5 pr-1"
            data-sidebar-collapsible=""
        >
            <p
                {...props}
                aria-atomic="true"
                aria-live={tone === "error" ? "assertive" : "polite"}
                className={cn(
                    "truncate text-xs italic leading-tight",
                    tone === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    className
                )}
                role={tone === "error" ? "alert" : "status"}
            >
                {feedback.message}
            </p>
            <Button onClick={dismissFeedback} size="xs" variant="ghost">
                Dismiss
            </Button>
        </div>
    );
}

function CollectionsListClearFilterButton({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { onClearCollectionFilters, selectedCollectionIds } =
        useCollectionsContext();
    const hasAnySelected = selectedCollectionIds.length > 0;

    const onClick = useStableCallback(onClickProp);
    const handleClick = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            onClick?.(event);
            onClearCollectionFilters();
        }
    );

    if (!hasAnySelected) {
        return null;
    }

    return (
        <Button
            {...props}
            aria-label="Clear selected collections"
            onClick={handleClick}
            size="icon-xs"
            title="Clear selected collections"
            variant="ghost"
        >
            <X
                aria-hidden
                className="inline-block size-3.5 shrink-0"
                focusable="false"
            />
        </Button>
    );
}

function CollectionsListSortingCombobox({
    render,
    ...props
}: React.ComponentProps<typeof ComboboxTrigger>) {
    const { setIsCollectionsListOpen } = useCollectionsListStateStore();
    const {
        collectionSortField,
        collectionTextMatchQuery,
        collectionView,
        setCollectionSortField,
        setCollectionTextMatchQuery,
        setCollectionView,
    } = useCollectionsListSortStore();

    const [inputValue, setInputValue] = React.useState("");
    const [isSortOpen, setIsSortOpen] = React.useState(false);

    const currentSortOption =
        collectionSortField === "text-match"
            ? {
                  icon: ListFilter,
                  label: `\u201c${collectionTextMatchQuery}\u201d`,
              }
            : (SORT_OPTION_BY_VALUE.get(collectionSortField) ?? null);

    const value: ComboboxValue = {
        icon: currentSortOption?.icon ?? ListFilter,
        label: currentSortOption?.label ?? "Priority",
        sortField: collectionSortField,
        sortQuery: collectionTextMatchQuery,
        view: collectionView,
    };

    const handleValueChange = useStableCallback(
        (nextValue: ComboboxValue | null) => {
            if (!nextValue) {
                return;
            }

            if (
                nextValue.sortField !== collectionSortField ||
                nextValue.sortQuery !== collectionTextMatchQuery
            ) {
                setCollectionSortField(nextValue.sortField);
                if (nextValue.sortField === "text-match") {
                    setCollectionTextMatchQuery(nextValue.sortQuery);
                } else {
                    setCollectionTextMatchQuery("");
                }
                setInputValue("");
            }

            if (nextValue.view !== collectionView) {
                setCollectionView(nextValue.view);
            }

            setIsSortOpen(false);
        }
    );

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        setIsSortOpen(nextOpen);
        if (nextOpen) {
            setIsCollectionsListOpen(true);
        }
    });

    useHotkeys(
        "mod+f",
        (event) => {
            event.preventDefault();
            setIsCollectionsListOpen(true);
            setIsSortOpen(true);
        },
        {
            description: "Sort and organize collections",
            enabled: !isSortOpen,
            preventDefault: true,
        }
    );

    return (
        <Combobox
            autoHighlight
            filter={null}
            inputValue={inputValue}
            isItemEqualToValue={isComboboxValueEqual}
            items={getComboboxCollectionsSortingGroups(inputValue, value)}
            itemToStringValue={getComboboxOptionValue}
            onInputValueChange={setInputValue}
            onOpenChange={handleOpenChange}
            onValueChange={handleValueChange}
            open={isSortOpen}
            value={value}
        >
            <ComboboxTrigger
                {...props}
                render={
                    render ?? (
                        <Button
                            aria-label="Sort and organize collections"
                            size="icon-xs"
                            title={`Sort and organize collections (${getSystemControlKey()}F)`}
                            variant="ghost"
                        />
                    )
                }
            >
                <ListFilter
                    aria-hidden
                    className="inline-block size-3.5 shrink-0"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup align="start" positionMethod="fixed" side="right">
                <ComboboxInput
                    endAddon={
                        <Kbd>
                            <CmdKbd />F
                        </Kbd>
                    }
                    placeholder="Organize collections"
                />
                <ComboboxEmpty>No matching options</ComboboxEmpty>
                <ComboboxList>
                    {(group: ComboboxGroupData) => (
                        <React.Fragment key={group.group}>
                            <ComboboxGroup items={group.items}>
                                <ComboboxGroupLabel>
                                    {GROUP_LABELS[group.group]}
                                </ComboboxGroupLabel>
                                <ComboboxCollection>
                                    {(option: ComboboxValue) => (
                                        <ComboboxItem
                                            key={getComboboxOptionValue(option)}
                                            shouldShowIndicatorLast
                                            value={option}
                                        >
                                            <CollectionsComboboxOptionRow
                                                icon={option.icon}
                                                label={option.label}
                                            />
                                        </ComboboxItem>
                                    )}
                                </ComboboxCollection>
                            </ComboboxGroup>
                            {group.group === "sort" && <ComboboxSeparator />}
                        </React.Fragment>
                    )}
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

function CollectionsListCreateButton({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { openCreateDialog } = useCollectionsListActions();

    const onClick = useStableCallback(onClickProp);
    const handleClick = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            onClick?.(event);
            openCreateDialog();
        }
    );

    return (
        <Button
            {...props}
            aria-label="Create collection"
            onClick={handleClick}
            size="icon-xs"
            title={`Create a new collection (${getSystemControlKey()}N)`}
            variant="ghost"
        >
            <PlusIcon
                aria-hidden
                className="inline-block size-4 shrink-0"
                focusable="false"
            />
        </Button>
    );
}

function CollectionsListCalloutPopover() {
    const { disabled, isLoading, setEnabled } = useSmartCollectionsToggle();

    const handleToggle = useStableCallback(async () => {
        if (typeof disabled === "undefined") {
            // Not loaded yet
            return;
        }
        await setEnabled(disabled);
    });

    if (isLoading || typeof disabled === "undefined") {
        return (
            <div className="flex items-center gap-0.5 text-nowrap font-medium text-[11px] opacity-40">
                Smart Collections
                <span>is</span>
                <Skeleton className="size-4" />
            </div>
        );
    }

    return (
        <Popover>
            <span
                aria-atomic="true"
                aria-live="polite"
                className="sr-only"
                role="status"
            >
                Smart Collections is {disabled ? "off" : "active"}
            </span>
            <PopoverTrigger
                className={cn(
                    "group not-sr-only flex items-center text-nowrap font-medium text-[11px]",
                    disabled
                        ? "opacity-50"
                        : "opacity-70 data-popup-open:opacity-100"
                )}
                openOnHover
            >
                <GradientWaveText
                    ariaLabel="Smart Collections"
                    className="w-fit underline decoration-muted-foreground/20 decoration-dotted underline-offset-2"
                >
                    Smart Collections
                </GradientWaveText>
                &nbsp;is {disabled ? "off" : "active"}{" "}
                <ChevronDownFilledIcon
                    aria-hidden
                    className="mb-px size-4 rotate-90 group-data-popup-open:opacity-10!"
                    focusable="false"
                />
            </PopoverTrigger>
            <PopoverPopup align="start" positionMethod="fixed">
                <Image
                    alt=""
                    aria-hidden
                    className="-mx-(--viewport-inline-padding) -mt-4 aspect-32/9 h-auto max-h-24 w-(--positioner-width) min-w-0 max-w-(--positioner-width) rounded-t-lg"
                    priority
                    sizes="auto,288px"
                    src={SmartCollectionsBackgroundImg}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle>Let Cache do the organizing</PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs leading-snug">
                        Smart Collections uses AI to automatically group your
                        saves into contextual collections as you add new
                        entries. Cache even learns your preferences over time.
                    </PopoverDescription>
                    <Button
                        className="w-fit px-0 text-muted-foreground text-xs"
                        onClick={handleToggle}
                        size="xs"
                        variant="link"
                    >
                        {disabled
                            ? "Turn on Smart Collections"
                            : "Turn off Smart Collections"}
                    </Button>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

interface CollectionsListItemProps extends React.ComponentProps<"div"> {
    collection: LibraryCollectionSummary;
    source: CollectionListSource;
}

function CollectionsListItem({
    className,
    collection,
    onMouseEnter: onMouseEnterProp,
    onMouseLeave: onMouseLeaveProp,
    source,
    style: styleProp,
    ...props
}: CollectionsListItemProps) {
    const { selectedCollectionIdSet } = useCollectionsContext();
    const { hoveredCollectionIdRef } = useCollectionsListState();
    const { setHoveredCollectionSource } = useCollectionsListActions();

    const isSelected = selectedCollectionIdSet.has(collection.id);
    const style = getCollectionItemStyle(collection.name, isSelected);

    const handleMouseEnter = useStableCallback(onMouseEnterProp);
    const handleMouseLeave = useStableCallback(onMouseLeaveProp);

    const hoverClaimIdRef = React.useRef(0);

    const releaseHoverClaim = useStableCallback(() => {
        releaseCollectionHoverHotkeySurface(hoverClaimIdRef.current);
        hoverClaimIdRef.current = 0;
        if (hoveredCollectionIdRef.current === collection.id) {
            hoveredCollectionIdRef.current = null;
            setHoveredCollectionSource(null);
        }
    });

    React.useEffect(() => releaseHoverClaim, [releaseHoverClaim]);

    const onMouseEnter = useStableCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            hoveredCollectionIdRef.current = collection.id;
            setHoveredCollectionSource(source);
            hoverClaimIdRef.current = claimCollectionHoverHotkeySurface();
            handleMouseEnter?.(event);
        }
    );

    const onMouseLeave = useStableCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            releaseHoverClaim();
            handleMouseLeave?.(event);
        }
    );

    return (
        <CollectionsListItemContext value={{ collection, isSelected, source }}>
            <div
                {...props}
                className={cn(
                    "group relative flex select-none items-center",
                    className
                )}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ ...style, ...styleProp }}
            />
        </CollectionsListItemContext>
    );
}

function CollectionsListItemTrigger({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof PreviewCardTrigger>) {
    const { onSelectCollection } = useCollectionsContext();
    const { collectionPreviewThumbnailUrlsById } = useLibraryItemsContext();
    const { collection, isSelected } = useCollectionsListItemContext();
    // Intent from Base UI (delayed open / close). Pointer over is raw presence
    // so we can warm images during the open delay without mount-time N preloads.
    const [isHoverIntent, setIsHoverIntent] = React.useState(false);
    const [isPointerOver, setIsPointerOver] = React.useState(false);

    const thumbnails =
        collectionPreviewThumbnailUrlsById.get(collection.id) ??
        EMPTY_PREVIEW_THUMBNAILS;

    const shouldLoad = isPointerOver || isHoverIntent;
    const { activeSlide, reportSlideError } = useCollectionPreviewPlayback({
        isCycling: isHoverIntent,
        shouldLoad,
        thumbnails,
    });

    // Gate the visible popup on a ready slide, but hard-clear intent on leave
    // so a late load cannot ghost-open after the pointer is gone.
    const isOpen = isHoverIntent && activeSlide !== null;

    const onClick = useStableCallback(onClickProp);
    const handleClick = useStableCallback(
        (
            event: BaseUIEvent<React.MouseEvent<HTMLAnchorElement, MouseEvent>>
        ) => {
            onClick?.(event);
            onSelectCollection(collection.id);
            setIsHoverIntent(false);
            setIsPointerOver(false);
        }
    );

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        setIsHoverIntent(nextOpen);
    });

    const handlePointerEnter = useStableCallback(() => {
        setIsPointerOver(true);
    });

    const handlePointerLeave = useStableCallback(() => {
        setIsPointerOver(false);
        setIsHoverIntent(false);
    });

    return (
        <PreviewCard onOpenChange={handleOpenChange} open={isOpen}>
            <PreviewCardTrigger
                {...props}
                {...(isSelected ? { "data-active": true } : {})}
                onClick={handleClick}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-8.5 text-left before:bg-(--collection-background) hover:bg-transparent focus-visible:ring-(--accent-color)"
                        render={<Button variant="ghost" />}
                    />
                }
            />
            <PreviewCardPopup
                className="flex flex-col overflow-hidden p-0"
                positionMethod="fixed"
                side="right"
            >
                {activeSlide ? (
                    <CollectionsListItemPreviewStack
                        activeSlide={activeSlide}
                        collectionName={collection.name}
                        onSlideError={reportSlideError}
                    />
                ) : null}
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListItemPreviewStack({
    activeSlide,
    collectionName,
    onSlideError,
}: {
    activeSlide: ReadyPreviewSlide;
    collectionName: string;
    onSlideError: (src: string) => void;
}) {
    const [current, setCurrent] = React.useState(activeSlide);
    const [outgoing, setOutgoing] = React.useState<ReadyPreviewSlide | null>(
        null
    );
    const [isFading, setIsFading] = React.useState(false);
    const fadeTimeout = useTimeout();
    const rootRef = React.useRef<HTMLDivElement>(null);

    if (current.src !== activeSlide.src) {
        setOutgoing(current);
        setCurrent(activeSlide);
        setIsFading(false);
    }

    useIsoLayoutEffect(() => {
        if (outgoing === null) {
            return;
        }

        // Commit prepare styles (outgoing @1, incoming @0) before flipping to
        // the fade classes. Without this forced reflow, React can paint only
        // the end state and the opacity transition never runs.
        const root = rootRef.current;
        if (root) {
            root.getBoundingClientRect();
        }
        setIsFading(true);

        fadeTimeout.start(PREVIEW_CROSSFADE_MS, () => {
            setOutgoing(null);
            setIsFading(false);
        });

        return () => {
            fadeTimeout.clear();
        };
    }, [current.src, fadeTimeout, outgoing]);

    const handleCurrentError = useStableCallback(() => {
        onSlideError(current.src);
    });

    const crossfadeStyle = {
        transitionDuration: `${PREVIEW_CROSSFADE_MS}ms`,
    } satisfies React.CSSProperties;

    return (
        <div
            className="relative w-full"
            ref={rootRef}
            style={{ aspectRatio: String(current.aspectRatio) }}
        >
            {outgoing ? (
                // biome-ignore lint/correctness/useImageSize: parent aspect-ratio drives layout
                <img
                    alt=""
                    aria-hidden
                    className={cn(
                        "absolute inset-0 size-full object-cover transition-opacity ease-out",
                        isFading ? "opacity-0" : "opacity-100"
                    )}
                    decoding="async"
                    draggable={false}
                    key={outgoing.src}
                    src={outgoing.src}
                    style={crossfadeStyle}
                />
            ) : null}
            {/* biome-ignore lint/correctness/useImageSize: parent aspect-ratio drives layout */}
            <img
                alt={`${collectionName} preview`}
                className={cn(
                    "absolute inset-0 size-full object-cover transition-opacity ease-out",
                    outgoing === null || isFading ? "opacity-100" : "opacity-0"
                )}
                decoding="async"
                draggable={false}
                key={current.src}
                onError={handleCurrentError}
                src={current.src}
                style={crossfadeStyle}
            />
        </div>
    );
}

function CollectionsListItemValue() {
    const { collection, isSelected } = useCollectionsListItemContext();

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span
                className="max-w-full shrink-0 truncate font-medium text-sm tracking-tight"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {isSelected ? (
                <span className="max-w-full flex-1 truncate py-px text-[11px] text-muted-foreground opacity-100">
                    <T>Unselect</T>
                </span>
            ) : null}
            {isSelected || collection.sources.length === 0 ? null : (
                <span className="max-w-full flex-1 truncate py-px text-[11px] text-muted-foreground opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-80">
                    {collection.sources.map(getSourceLabel).join(", ")}
                </span>
            )}
        </div>
    );
}

function CollectionsListItemPriorityCombobox() {
    const { pendingPriorityComboboxOpen } = useCollectionsListState();
    const { onUpdatePriority, setPendingPriorityComboboxOpen } =
        useCollectionsListActions();
    const { collection, source } = useCollectionsListItemContext();

    const collectionOpenToken = buildPriorityOpenToken(source, collection.id);
    const SelectedPriorityIcon = getPriorityOption(collection.priority).icon;
    const isOpen = pendingPriorityComboboxOpen === collectionOpenToken;

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setPendingPriorityComboboxOpen(collectionOpenToken);
        } else if (isOpen) {
            setPendingPriorityComboboxOpen(null);
        }
    });

    const handleValueChange = useStableCallback((nextPriority) => {
        if (nextPriority && nextPriority !== collection.priority) {
            onUpdatePriority(collection.id, nextPriority);
        }
        setPendingPriorityComboboxOpen(null);
    });

    return (
        <Combobox
            autoHighlight
            items={PRIORITIES}
            onOpenChange={handleOpenChange}
            onValueChange={handleValueChange}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Change priority for ${collection.name}`}
                        className="absolute top-1/2 left-1.25 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--accent-color)"
                        size="icon-xs"
                        title="Organize collections by relevance level"
                        variant="ghost"
                    />
                }
            >
                <SelectedPriorityIcon
                    aria-hidden
                    className="size-4"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup className="max-w-64" positionMethod="fixed">
                <ComboboxInput
                    endAddon={<Kbd>P</Kbd>}
                    placeholder={
                        collection.priority === "none"
                            ? "Set priority to..."
                            : "Change priority to..."
                    }
                />
                <ComboboxEmpty>No matching priorities</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(priorityOption: PriorityOption) => (
                            <ComboboxItem
                                key={priorityOption.value}
                                shouldShowIndicatorLast
                                value={priorityOption.value}
                            >
                                <CollectionsComboboxOptionRow
                                    icon={priorityOption.icon}
                                    label={priorityOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
                <div className="flex gap-1.5 pt-1.5 pr-2 pb-2.5 pl-3">
                    <Info
                        aria-hidden
                        className="inline-block size-3.5 shrink-0"
                        focusable="false"
                    />
                    <p className="max-w-48 text-[10px] text-muted-foreground leading-tight">
                        Highlight your collection based on its relevance to you
                    </p>
                </div>
            </ComboboxPopup>
        </Combobox>
    );
}

function CollectionsListItemShareSubMenu() {
    const { collection } = useCollectionsListItemContext();
    const {
        claimCollectionAction,
        isCollectionActionPending,
        syncCollectionShare,
    } = useCollectionsContext();
    const { setFeedback } = useCollectionsListStateStore();
    const { showError, showSuccess } = useCollectionFeedbackWriter();
    const ensureAccess = useCollectionAccessGate();
    const copyWithFeedback = useCopyWithFeedback();
    const { copyToClipboard } = useCopyToClipboard();
    const [isSharePending, startTransition] = React.useTransition();

    const isShared = !!collection.shareId;
    const isShareActionPending =
        isSharePending || isCollectionActionPending("share", collection.id);
    const runShareAction = useStableCallback(
        (
            action: () => Promise<void>,
            ensureAccessAction?: CollectionAccessAction
        ) => {
            if (
                ensureAccessAction &&
                !ensureAccess(collection, ensureAccessAction)
            ) {
                return;
            }

            const releaseAction = claimCollectionAction("share", collection.id);
            if (!releaseAction) {
                return;
            }

            setFeedback(null);
            startTransition(async () => {
                try {
                    await action();
                } finally {
                    releaseAction();
                }
            });
        }
    );

    const handleCopyShareLink = useStableCallback(async () => {
        if (!collection.shareId) {
            showError(COPY_SHARE_LINK_MISSING_MESSAGE);
            return;
        }

        await copyWithFeedback(
            buildPublicCollectionShareUrl(collection.shareId),
            `Public link for ${collection.name} copied to the clipboard.`,
            COPY_SHARE_LINK_ERROR_MESSAGE
        );
    });

    const handleDisableShare = useStableCallback(() => {
        runShareAction(async () => {
            const result = await disableCollectionSharingSafely({
                collectionId: collection.id,
            });

            if (result.status === ACTION_STATUS.DISABLED) {
                syncCollectionShare(result.collection);
                showSuccess(`${collection.name} is no longer publicly shared.`);
            } else {
                showError(result.message);
            }
        });
    });

    const handleEnableShare = useStableCallback(() => {
        runShareAction(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status === ACTION_STATUS.SHARED) {
                syncCollectionShare(result.collection);
                const linkCopied = await copyToClipboard(result.shareUrl);
                showSuccess(
                    linkCopied
                        ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                        : `${collection.name} is now publicly shared.`
                );
            } else {
                showError(result.message);
            }
        }, "share");
    });

    return (
        <MenuSub>
            <MenuSubTrigger>
                <ShareArrowSolidIcon
                    aria-hidden
                    className="inline-block size-4 text-muted-foreground"
                    focusable="false"
                />
                Share
            </MenuSubTrigger>
            <MenuSubPopup>
                {isShared ? (
                    <MenuItem
                        disabled={isShareActionPending}
                        onClick={handleCopyShareLink}
                    >
                        <LinkIcon
                            aria-hidden
                            className="size-4 text-muted-foreground"
                            focusable="false"
                        />
                        Copy public link
                    </MenuItem>
                ) : (
                    <MenuItem
                        closeOnClick={false}
                        disabled={isShareActionPending}
                        onClick={handleEnableShare}
                    >
                        <UserRoundPlus
                            aria-hidden
                            className="size-4 text-muted-foreground"
                            focusable="false"
                        />
                        Create public link
                    </MenuItem>
                )}
                <MenuItem closeOnClick={false} disabled>
                    <LockKeyhole
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    {isShared ? "Anyone with the link" : "Just me"}
                </MenuItem>
                {isShared ? (
                    <MenuItem
                        closeOnClick={false}
                        disabled={isShareActionPending}
                        onClick={handleDisableShare}
                        variant="destructive"
                    >
                        <Trash2Icon
                            aria-hidden
                            className="size-4"
                            focusable="false"
                        />
                        Stop sharing
                    </MenuItem>
                ) : null}
            </MenuSubPopup>
        </MenuSub>
    );
}

function CollectionsListItemExportSubMenu() {
    const { onCopyLinks, onCopyTitle, onExportCsv, onOpenLinks } =
        useCollectionsListActions();
    const { collection } = useCollectionsListItemContext();
    const { claimCollectionAction, isCollectionActionPending } =
        useCollectionsContext();
    const { setFeedback } = useCollectionsListStateStore();
    const { showError, showSuccess } = useCollectionFeedbackWriter();
    const ensureAccess = useCollectionAccessGate();
    const [isSendingToNotion, startTransition] = React.useTransition();

    const hasItems = collection.itemCount > 0;
    const isNotionPending =
        isSendingToNotion || isCollectionActionPending("notion", collection.id);

    const handleCopyLinks = useStableCallback(() => onCopyLinks(collection));
    const handleCopyTitle = useStableCallback(() => onCopyTitle(collection));
    const handleExportCsv = useStableCallback(() => onExportCsv(collection));
    const handleOpenLinks = useStableCallback(() => onOpenLinks(collection));
    const handleSendToNotion = useStableCallback(() => {
        if (!ensureAccess(collection, "send to Notion")) {
            return;
        }

        const releaseAction = claimCollectionAction("notion", collection.id);
        if (!releaseAction) {
            return;
        }

        setFeedback(null);
        startTransition(async () => {
            try {
                const result = await sendCollectionToNotionSafely({
                    collectionId: collection.id,
                });

                if (result.status === ACTION_STATUS.SUCCESS) {
                    showSuccess(`${collection.name} sent to Notion.`);
                    openExternal(result.pageUrl);
                } else {
                    showError(result.message);
                }
            } finally {
                releaseAction();
            }
        });
    });

    return (
        <MenuSub>
            <MenuSubTrigger>
                <Download
                    aria-hidden
                    className="inline-block size-4 text-muted-foreground"
                    focusable="false"
                />
                Export
            </MenuSubTrigger>
            <MenuSubPopup>
                <MenuItem onClick={handleCopyTitle}>
                    <CopyIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Copy title
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={handleCopyLinks}>
                    <CopyIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Copy all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={handleOpenLinks}>
                    <ExternalLinkIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Open all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={handleExportCsv}>
                    <FileSpreadsheetIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Export to CSV
                </MenuItem>
                <MenuItem
                    disabled={!hasItems || isNotionPending}
                    onClick={handleSendToNotion}
                >
                    <NotionIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    {isNotionPending
                        ? "Sending to Notion..."
                        : "Send to Notion"}
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionsListItemMetadataProps {
    children: React.ReactNode;
}

function CollectionsListItemMetadata({
    children,
}: CollectionsListItemMetadataProps) {
    const { favoriteCollectionIdSet, toggleFavorite } =
        useToggleCollectionFavorite();
    const { onRename, onDelete, onDuplicate, onUpdatePriority } =
        useCollectionsListActions();
    const { collection } = useCollectionsListItemContext();
    const isFavorite = favoriteCollectionIdSet.has(collection.id);
    const isArchived = collection.priority === "archive";

    const handleRename = useStableCallback(() => onRename(collection));
    const handleDelete = useStableCallback(() => onDelete(collection));
    const handleFavoriteToggle = useStableCallback(() => {
        toggleFavorite(collection);
    });
    const handleMakeCopy = useStableCallback(() => onDuplicate(collection));
    const handleArchiveToggle = useStableCallback(() =>
        onUpdatePriority(
            collection.id,
            getToggledArchivePriority(collection.priority)
        )
    );

    const updatedAt = dayjs(collection.updatedAt);

    return (
        <div className="absolute top-1/2 right-0 flex size-9 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums focus-visible:opacity-0 group-focus-within:opacity-0 pointer-fine:group-hover:opacity-0">
                {children}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            aria-label={`Collection actions for ${collection.name}`}
                            className="absolute text-(--accent-color) pointer-fine:opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100 group-focus:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100"
                            size="icon-xs"
                            title={`Collection actions for ${collection.name}`}
                            variant="ghost"
                        />
                    }
                >
                    <EllipsisIcon
                        aria-hidden
                        className="inline-block size-4"
                        focusable="false"
                    />
                </MenuTrigger>
                <MenuPopup align="start" side="right">
                    <MenuGroup>
                        <MenuGroupLabel className="flex items-center gap-1.5">
                            Collection
                            <Badge size="sm" variant="secondary">
                                {collection.shareId ? (
                                    <>
                                        <Globe
                                            aria-hidden
                                            className="size-3"
                                            focusable="false"
                                        />
                                        Public
                                    </>
                                ) : (
                                    <>
                                        <LockKeyhole
                                            aria-hidden
                                            className="size-3"
                                            focusable="false"
                                        />
                                        Private
                                    </>
                                )}
                            </Badge>
                        </MenuGroupLabel>
                        <MenuItem onClick={handleFavoriteToggle}>
                            <Star
                                aria-hidden
                                className={cn(
                                    "size-4 text-muted-foreground",
                                    isFavorite && "fill-current"
                                )}
                                focusable="false"
                            />
                            {isFavorite ? "Unfavorite" : "Favorite"}
                            {isFavorite ? null : (
                                <MenuShortcut>
                                    <AltKbd />F
                                </MenuShortcut>
                            )}
                        </MenuItem>
                        <MenuItem onClick={handleRename}>
                            <PencilIcon
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Rename
                            <MenuShortcut>
                                <AltKbd />E
                            </MenuShortcut>
                        </MenuItem>
                        <MenuItem onClick={handleMakeCopy}>
                            <CopyPlus
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Make a copy
                        </MenuItem>
                        <MenuItem onClick={handleArchiveToggle}>
                            {isArchived ? (
                                <ArchiveX
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                    focusable="false"
                                />
                            ) : (
                                <ArchiveIcon
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                    focusable="false"
                                />
                            )}
                            {isArchived ? "Unarchive" : "Archive"}
                            <MenuShortcut>
                                <ShiftKbd />
                                <CmdKbd />A
                            </MenuShortcut>
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionsListItemShareSubMenu />
                        <CollectionsListItemExportSubMenu />
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem onClick={handleDelete}>
                            Delete
                            <MenuShortcut>⌫</MenuShortcut>
                        </MenuItem>
                    </MenuGroup>
                    <MenuItem disabled>
                        <div className="-mt-0.5 space-y-1 text-[10px] text-muted-foreground leading-none *:text-nowrap">
                            <div>Last updated {updatedAt.fromNow()}</div>
                            <div>
                                {updatedAt.format("MMM DD, YYYY, h:mm A")}
                            </div>
                        </div>
                    </MenuItem>
                </MenuPopup>
            </Menu>
        </div>
    );
}

function CollectionsRenameDialog() {
    const { collections } = useCollectionsContext();
    const { pendingRenameId } = useCollectionsListState();
    const pendingRename =
        collections.find((collection) => collection.id === pendingRenameId) ??
        null;
    const { showSuccess } = useCollectionFeedbackWriter();
    const { closePendingRename, syncName } = useCollectionsListActions();
    const isOpen = pendingRename !== null;
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [, startRename] = React.useTransition();
    const renameSubmissionPendingRef = React.useRef(false);

    const [nameDraft, setNameDraft] = React.useState(
        () => pendingRename?.name ?? ""
    );
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const renameTargetRef = React.useRef<LibraryCollectionSummary | null>(null);

    // Sync draft before paint so the input never flashes empty on open.
    useIsoLayoutEffect(() => {
        if (!pendingRename) {
            renameTargetRef.current = null;
            return;
        }
        if (renameTargetRef.current?.id === pendingRename.id) {
            return;
        }
        renameTargetRef.current = pendingRename;
        setNameDraft(pendingRename.name);
        setErrorMessage(null);
        setIsSubmitting(false);
    }, [pendingRename]);

    const inputId = React.useId();
    const errorId = React.useId();

    const handleNameDraftChange = useStableCallback((draft: string) => {
        setNameDraft(draft);
        if (errorMessage) {
            setErrorMessage(null);
        }
    });

    const handleNameChange = useStableCallback(
        (event: React.ChangeEvent<HTMLInputElement>) =>
            handleNameDraftChange(event.currentTarget.value)
    );

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (!(nextOpen || renameSubmissionPendingRef.current)) {
            closePendingRename();
        }
    });

    const handleSubmit = useStableCallback(() => {
        if (isSubmitting || renameSubmissionPendingRef.current) {
            return;
        }

        const target = renameTargetRef.current;
        if (!target || target.id !== pendingRenameId) {
            return;
        }

        const previousName = target.name;
        const nextName = normalizeWhitespace(nameDraft);

        if (nextName.length === 0) {
            setErrorMessage(NAME_REQUIRED_MESSAGE);
            return;
        }

        if (nextName === previousName) {
            closePendingRename();
            return;
        }

        syncName(target.id, nextName);
        renameSubmissionPendingRef.current = true;
        setIsSubmitting(true);

        startRename(async () => {
            try {
                const result = await renameCollectionSafely({
                    collectionId: target.id,
                    name: nextName,
                });

                if (result.status === ACTION_STATUS.UPDATED) {
                    syncName(result.collection.id, result.collection.name);
                    closePendingRename();
                    showSuccess(`${result.collection.name} renamed.`);
                    return;
                }

                syncName(target.id, previousName);
                setErrorMessage(result.message);
            } finally {
                renameSubmissionPendingRef.current = false;
                setIsSubmitting(false);
            }
        });
    });

    const handleFormSubmit = useStableCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            handleSubmit();
        }
    );

    return (
        <Dialog onOpenChange={handleOpenChange} open={isOpen}>
            <DialogPopup>
                <form className="contents" onSubmit={handleFormSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename collection</DialogTitle>
                        <DialogDescription>
                            Update how this collection appears across your
                            library.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={inputId}
                            >
                                Name
                            </label>
                            <Input
                                aria-describedby={
                                    errorMessage ? errorId : undefined
                                }
                                aria-invalid={errorMessage ? true : undefined}
                                autoFocus
                                id={inputId}
                                maxLength={NAME_MAX_LENGTH}
                                onChange={handleNameChange}
                                placeholder="Collection name"
                                required
                                type="text"
                                value={nameDraft}
                            />
                            {errorMessage ? (
                                <DialogFieldError id={errorId}>
                                    {errorMessage}
                                </DialogFieldError>
                            ) : null}
                        </div>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose
                            disabled={isSubmitting}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            isLoading={isSubmitting}
                            size="sm"
                            type="submit"
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface CreateFormState {
    descriptionDraft: string;
    descriptionErrorMessage: string | null;
    errorMessage: string | null;
    nameDraft: string;
}

const INITIAL_CREATE_FORM_STATE: CreateFormState = {
    descriptionDraft: "",
    descriptionErrorMessage: null,
    errorMessage: null,
    nameDraft: "",
};

function CollectionsCreateDialog() {
    const { createItemId, isCreateOpen } = useCollectionsListState();
    const { showSuccess } = useCollectionFeedbackWriter();
    const { closeCreateDialog, createSubmissionPendingRef, syncCreated } =
        useCollectionsListActions();
    const { disabled, setEnabled } = useSmartCollectionsToggle();
    const { mutate: mutateRecommendations } = useCollectionRecommendations();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDescriptionTransitionPending, startDescription] =
        React.useTransition();
    const [, startCreate] = React.useTransition();

    const [formState, setFormState] = React.useState(INITIAL_CREATE_FORM_STATE);
    const descriptionRequestVersionRef = React.useRef(0);
    const activeDescriptionRequestVersionRef = React.useRef<number | null>(
        null
    );

    // Reset before paint so reopening never shows the previous draft.
    useIsoLayoutEffect(() => {
        if (isCreateOpen) {
            descriptionRequestVersionRef.current += 1;
            setFormState(INITIAL_CREATE_FORM_STATE);
            setIsSubmitting(false);
        }
    }, [isCreateOpen]);

    const {
        descriptionDraft,
        descriptionErrorMessage,
        errorMessage,
        nameDraft,
    } = formState;
    const isDescriptionPending =
        isDescriptionTransitionPending &&
        activeDescriptionRequestVersionRef.current ===
            descriptionRequestVersionRef.current;
    const isNameValid = normalizeWhitespace(nameDraft).length > 0;
    const nameInputId = React.useId();
    const errorId = React.useId();
    const descriptionInputId = React.useId();
    const descriptionErrorId = React.useId();

    const handleNameDraftChange = useStableCallback((draft: string) => {
        descriptionRequestVersionRef.current += 1;
        setFormState((current) =>
            current.errorMessage || current.descriptionErrorMessage
                ? {
                      ...current,
                      descriptionErrorMessage: null,
                      errorMessage: null,
                      nameDraft: draft,
                  }
                : { ...current, nameDraft: draft }
        );
    });

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (nextOpen) {
            return;
        }
        if (createSubmissionPendingRef.current) {
            return;
        }
        descriptionRequestVersionRef.current += 1;
        closeCreateDialog();
    });

    const runCreate = useStableCallback(
        (input: {
            description: string | undefined;
            name: string;
            onStart?: () => void;
            refreshRecommendations: boolean;
            successMessage: (collectionName: string) => string;
        }) => {
            if (
                isDescriptionPending ||
                isSubmitting ||
                createSubmissionPendingRef.current
            ) {
                return;
            }
            input.onStart?.();

            createSubmissionPendingRef.current = true;
            setIsSubmitting(true);

            startCreate(async () => {
                try {
                    const result = await createCollectionSafely({
                        assignToItemId: createItemId ?? undefined,
                        description: input.description,
                        name: input.name,
                    });
                    if (result.status !== ACTION_STATUS.CREATED) {
                        setFormState((current) => ({
                            ...current,
                            errorMessage: result.message,
                        }));
                        return;
                    }
                    syncCreated({
                        assignedItemIds: getCreatedAssignedItemIds(result),
                        collection: result.collection,
                    });
                    if (input.refreshRecommendations) {
                        await mutateRecommendations();
                    }
                    showSuccess(input.successMessage(result.collection.name));
                    closeCreateDialog();
                } finally {
                    createSubmissionPendingRef.current = false;
                    setIsSubmitting(false);
                }
            });
        }
    );

    const handleSubmit = useStableCallback(() => {
        const name = normalizeWhitespace(nameDraft);
        if (name.length === 0) {
            setFormState((current) => ({
                ...current,
                errorMessage: NAME_REQUIRED_MESSAGE,
            }));
            return;
        }

        runCreate({
            description: normalizeWhitespace(descriptionDraft) || undefined,
            name,
            refreshRecommendations: false,
            successMessage: (collectionName) => `${collectionName} created.`,
        });
    });

    const handleFormSubmit = useStableCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            handleSubmit();
        }
    );

    const handleNameChange = useStableCallback(
        (event: React.ChangeEvent<HTMLInputElement>) =>
            handleNameDraftChange(event.currentTarget.value)
    );

    const handleDescriptionChange = useStableCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const nextDescriptionDraft = event.currentTarget.value;
            descriptionRequestVersionRef.current += 1;
            setFormState((current) => ({
                ...current,
                descriptionDraft: nextDescriptionDraft,
                descriptionErrorMessage: null,
            }));
        }
    );

    const handleGenerateDescription = useStableCallback(() => {
        const title = normalizeWhitespace(nameDraft);
        if (
            title.length === 0 ||
            isDescriptionPending ||
            isSubmitting ||
            createSubmissionPendingRef.current
        ) {
            return;
        }

        const requestVersion = descriptionRequestVersionRef.current + 1;
        descriptionRequestVersionRef.current = requestVersion;
        activeDescriptionRequestVersionRef.current = requestVersion;
        setFormState((current) => ({
            ...current,
            descriptionErrorMessage: null,
        }));

        startDescription(async () => {
            const result = await getCollectionDescriptionSafely({ title });
            if (requestVersion !== descriptionRequestVersionRef.current) {
                return;
            }

            if (result.status !== ACTION_STATUS.SUCCESS) {
                activeDescriptionRequestVersionRef.current = null;
                setFormState((current) => ({
                    ...current,
                    descriptionErrorMessage: result.message,
                }));
                return;
            }

            activeDescriptionRequestVersionRef.current = null;
            setFormState((current) => ({
                ...current,
                descriptionDraft: result.description,
                descriptionErrorMessage: null,
            }));
        });
    });

    const handleEnableSmartCollections = useStableCallback(async () => {
        await setEnabled(true);
    });

    const handleCreateFromTemplate = useStableCallback(
        (value: TemplateValue | null) => {
            if (!value) {
                return;
            }
            const template = TEMPLATE_BY_VALUE.get(value);
            if (!template) {
                return;
            }
            runCreate({
                description: template.description,
                name: template.name,
                onStart: () =>
                    setFormState((current) =>
                        current.errorMessage
                            ? { ...current, errorMessage: null }
                            : current
                    ),
                refreshRecommendations: true,
                successMessage: () => `${template.name} created from template.`,
            });
        }
    );

    return (
        <Dialog onOpenChange={handleOpenChange} open={isCreateOpen}>
            <DialogPopup>
                <form className="contents" onSubmit={handleFormSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-1">
                            <Badge size="lg" variant="outline">
                                <Image
                                    alt=""
                                    height={12}
                                    src={AppIconSmall}
                                    width={12}
                                />
                                Cache
                            </Badge>
                            <ChevronRight
                                aria-hidden
                                className="inline-block size-3.5 shrink-0"
                                focusable="false"
                            />
                            <DialogTitle className="font-medium text-sm">
                                New collection
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogPanel className="space-y-2">
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={nameInputId}
                            >
                                Name
                            </label>
                            <Input
                                aria-describedby={
                                    errorMessage ? errorId : undefined
                                }
                                aria-invalid={errorMessage ? true : undefined}
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl tracking-tight"
                                id={nameInputId}
                                isUnstyled
                                maxLength={NAME_MAX_LENGTH}
                                onChange={handleNameChange}
                                placeholder="Collection name"
                                required
                                size="lg"
                                type="text"
                                value={nameDraft}
                            />
                        </div>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={descriptionInputId}
                            >
                                Description (optional)
                            </label>
                            <div className="relative">
                                <Textarea
                                    aria-describedby={
                                        descriptionErrorMessage
                                            ? descriptionErrorId
                                            : undefined
                                    }
                                    aria-invalid={
                                        descriptionErrorMessage
                                            ? true
                                            : undefined
                                    }
                                    className="-mx-[calc(--spacing(3)-1px)] *:resize-none *:pr-10"
                                    id={descriptionInputId}
                                    isUnstyled
                                    maxLength={DESCRIPTION_MAX_LENGTH}
                                    onChange={handleDescriptionChange}
                                    placeholder="Describe what belongs here..."
                                    size="lg"
                                    value={descriptionDraft}
                                />
                                {isNameValid ? (
                                    <Button
                                        aria-label="Suggest a description"
                                        className="absolute top-0.5 right-0"
                                        disabled={isSubmitting}
                                        isLoading={isDescriptionPending}
                                        onClick={handleGenerateDescription}
                                        size="icon-xs"
                                        title="Suggest a description"
                                        type="button"
                                        variant="ghost"
                                    >
                                        <PencilSparkles
                                            aria-hidden
                                            focusable="false"
                                        />
                                    </Button>
                                ) : null}
                            </div>
                            {descriptionErrorMessage ? (
                                <DialogFieldError id={descriptionErrorId}>
                                    {descriptionErrorMessage}
                                </DialogFieldError>
                            ) : null}
                        </div>
                        {errorMessage ? (
                            <DialogFieldError id={errorId}>
                                {errorMessage}
                            </DialogFieldError>
                        ) : null}
                        <Alert>
                            <Lightbulb aria-hidden focusable="false" />
                            <AlertDescription>
                                <p>
                                    Collections keep your best saves and content
                                    in one place. Use them for ongoing goals, or
                                    just to keep things tidy. Smart Collections
                                    can auto-assign matching entries to it – no
                                    extra work for you.{" "}
                                    {disabled === true ? (
                                        <Button
                                            className="inline-flex h-fit! w-fit px-0 leading-tight sm:text-[11px]"
                                            onClick={
                                                handleEnableSmartCollections
                                            }
                                            size="xs"
                                            type="button"
                                            variant="link"
                                        >
                                            Enable Smart Collections
                                        </Button>
                                    ) : null}
                                </p>
                            </AlertDescription>
                        </Alert>
                    </DialogPanel>
                    <DialogFooter>
                        <Combobox
                            autoHighlight
                            items={TEMPLATES}
                            onValueChange={handleCreateFromTemplate}
                        >
                            <ComboboxTrigger
                                disabled={isDescriptionPending || isSubmitting}
                                render={
                                    <Button
                                        className="mr-auto -ml-2"
                                        size="xs"
                                        variant="link"
                                    />
                                }
                            >
                                <LibraryBig
                                    aria-hidden
                                    className="mr-0.5! size-4"
                                    focusable="false"
                                />
                                Explore Templates
                            </ComboboxTrigger>
                            <ComboboxPopup align="start" className="max-w-80">
                                <ComboboxInput placeholder="Create collection from template..." />
                                <ComboboxEmpty>
                                    No matching templates
                                </ComboboxEmpty>
                                <ComboboxList>
                                    <ComboboxCollection>
                                        {(template) => (
                                            <ComboboxItem
                                                key={template.value}
                                                value={template.value}
                                            >
                                                <div className="flex min-w-0 max-w-80 flex-col gap-0.5">
                                                    <span className="min-w-0 truncate text-foreground text-sm">
                                                        {template.name}
                                                    </span>
                                                    <span className="line-clamp-2 text-muted-foreground text-xs">
                                                        {template.description}
                                                    </span>
                                                </div>
                                            </ComboboxItem>
                                        )}
                                    </ComboboxCollection>
                                </ComboboxList>
                                <div className="flex gap-2 px-3 pt-1.5 pb-2.5">
                                    <Info
                                        aria-hidden
                                        className="inline-block size-3.5 shrink-0"
                                        focusable="false"
                                    />
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                        <strong className="font-medium">
                                            Smart Collections&nbsp;
                                            <Sparkle
                                                aria-hidden
                                                className="mb-px inline-block size-3"
                                                focusable="false"
                                            />
                                        </strong>{" "}
                                        can automatically assign collections to
                                        saved content that matches these
                                        templates.
                                    </p>
                                </div>
                            </ComboboxPopup>
                        </Combobox>
                        <Button
                            disabled={!isNameValid || isDescriptionPending}
                            isLoading={isSubmitting}
                            size="sm"
                            type="submit"
                        >
                            Create collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

function CollectionsDeleteDialog() {
    const { collections } = useCollectionsContext();
    const { pendingDeleteId } = useCollectionsListState();
    const pendingDelete =
        collections.find((collection) => collection.id === pendingDeleteId) ??
        null;
    const { showError, showSuccess } = useCollectionFeedbackWriter();
    const { closePendingDelete, syncDeleted } = useCollectionsListActions();
    const [isSubmitting, startDelete] = React.useTransition();

    const handleConfirm = useStableCallback(() => {
        const target = pendingDelete;
        if (!target) {
            return;
        }

        startDelete(async () => {
            const result = await deleteCollectionSafely({
                collectionId: target.id,
            });

            if (result.status !== ACTION_STATUS.DELETED) {
                showError(result.message);
                return;
            }

            syncDeleted(result.collection.id);
            closePendingDelete();
            showSuccess(`${result.collection.name} deleted.`);
        });
    });

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (!(nextOpen || isSubmitting)) {
            closePendingDelete();
        }
    });

    const handleFormSubmit = useStableCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            handleConfirm();
        }
    );

    return (
        <Dialog onOpenChange={handleOpenChange} open={pendingDelete !== null}>
            <DialogPopup>
                <form className="contents" onSubmit={handleFormSubmit}>
                    <DialogHeader>
                        <DialogTitle>Delete collection?</DialogTitle>
                        <DialogDescription>
                            Remove {pendingDelete?.name || "this collection"}{" "}
                            from Cache. Saved items will remain in your library,
                            but they won't belong to this collection anymore.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel />
                    <DialogFooter>
                        <DialogClose
                            disabled={isSubmitting}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            isLoading={isSubmitting}
                            size="sm"
                            type="submit"
                            variant="destructive"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

function DialogFieldError({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            {...props}
            aria-atomic="true"
            className={cn("pt-2 text-destructive text-xs", className)}
            role="alert"
        />
    );
}

function CollectionsPriorityBreakdown({
    entries,
}: {
    entries: PriorityBreakdownEntry[];
}) {
    return (
        <ul className="flex flex-col gap-1.5">
            {entries.map(({ count, icon: Icon, label, value }) => (
                <li className="flex items-center gap-2" key={value}>
                    <Icon
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                        focusable="false"
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
                        {label}
                    </span>
                    <span className="font-medium text-xs tabular-nums">
                        {count}
                    </span>
                </li>
            ))}
        </ul>
    );
}
