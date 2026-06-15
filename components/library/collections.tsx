"use client";

import { useSubscriptionAccess } from "@/components/billing/subscription";
import {
    appendCollection,
    mergeCollectionSummaries,
    RequestCreateRefContext,
    sortCollections,
    useCollectionsSortStore,
    useWorkspaceContext,
    type CollectionSortField,
    type CollectionView,
} from "@/components/library/workspace";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/ui/carousel";
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
import { DisclosureList } from "@/components/ui/disclosure-list";
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
import { Textarea } from "@/components/ui/textarea";
import { useSmartCollectionsPreference } from "@/hooks/queries/use-smart-collections-preference";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
    createCollection,
    deleteCollection,
    disableSmartCollections,
    duplicateCollection,
    renameCollection,
    updateCollectionPriority,
    type CollectionCreateResult,
} from "@/lib/collections/actions";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import {
    itemPreviewImageUrl,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { removeValue, toggleValue } from "@/lib/common/arrays";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import { saveFile } from "@/lib/common/file";
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
import { getSourceLabel } from "@/lib/integrations/support";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import type { BaseUIEvent } from "@base-ui/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { useInterval } from "@base-ui/utils/useInterval";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, useLocale } from "gt-next";
import {
    ArchiveIcon,
    ArchiveX,
    ArrowUpDown,
    ArrowUpRight,
    ChevronRight,
    Clock,
    Component,
    CopyIcon,
    CopyPlus,
    Download,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Globe,
    Info,
    LibraryBig,
    Lightbulb,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    PlusIcon,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Star,
    Trash2Icon,
    UserRoundPlus,
    X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const log = createLogger("library:collections");

const CSV_CONTENT_TYPE = "text/csv";
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

const CREATE_ERROR_MESSAGE = "We couldn't create this collection right now.";
const DELETE_ERROR_MESSAGE = "We couldn't delete this collection right now.";
const DUPLICATE_ERROR_MESSAGE =
    "We couldn't make a copy of this collection right now.";
const EMPTY_LINKS_ERROR_MESSAGE = "There are no links in this collection yet.";
const RENAME_ERROR_MESSAGE = "We couldn't rename this collection right now.";
const SHARE_ERROR_MESSAGE = "We couldn't create a public link right now.";
const DISABLE_SHARING_ERROR_MESSAGE =
    "We couldn't stop sharing this collection right now.";
const UPDATE_PRIORITY_ERROR_MESSAGE =
    "We couldn't update this collection's priority right now.";
const COPY_LINKS_ERROR_MESSAGE = "We couldn't copy these links right now.";
const COPY_TITLE_ERROR_MESSAGE =
    "We couldn't copy this collection's title right now.";
const COPY_SHARE_LINK_ERROR_MESSAGE =
    "We couldn't copy this public link right now.";
const EXPORT_CSV_ERROR_MESSAGE =
    "We couldn't export this collection right now.";
const DISABLE_SMART_COLLECTIONS_ERROR_MESSAGE =
    "We couldn't disable smart collections right now.";

type CollectionOptionIcon = React.ComponentType<{ className?: string }>;

type CollectionItemMetadataDisplay = "item-count" | "updated-at";

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

interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isHovered: boolean;
}

type CollectionShareState = Pick<
    LibraryCollectionTag,
    "id" | "shareId" | "sharedAt" | "updatedAt"
>;

interface SyncCreatedCollectionInput {
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}

interface PriorityOption {
    icon: CollectionOptionIcon;
    label: string;
    value: CollectionPriority;
}

interface SortingOption {
    icon: CollectionOptionIcon;
    label: string;
    value: Exclude<CollectionSortField, "text-match">;
}

// interface CollectionNotificationOption {
//     defaultChecked: boolean;
//     label: string;
//     value: string;
// }

interface ComboboxValue {
    icon: CollectionOptionIcon;
    label: string;
    sortField: CollectionSortField;
    sortQuery: string;
    view: CollectionView;
}

interface ComboboxGroupData {
    group: "sort" | "view";
    items: ComboboxValue[];
}

const PREVIEW_SLIDE_INTERVAL_MS = 600;

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

// const COLLECTION_NOTIFICATION_OPTIONS: CollectionNotificationOption[] = [
//     {
//         defaultChecked: true,
//         label: "New items added",
//         value: "new-items",
//     },
//     {
//         defaultChecked: true,
//         label: "Weekly digest",
//         value: "weekly-digest",
//     },
//     {
//         defaultChecked: false,
//         label: "Shared link activity",
//         value: "shared-link-activity",
//     },
// ];

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
        icon: Sparkle,
        label: "Created",
        value: "created",
    },
    {
        icon: Clock,
        label: "Updated",
        value: "updated",
    },
    {
        icon: ArrowUpDown,
        label: "Name",
        value: "name",
    },
    {
        icon: Component,
        label: "Count",
        value: "count",
    },
] as const satisfies SortingOption[];

const SORT_OPTION_BY_VALUE = new Map(
    SORT_OPTIONS.map((option) => [option.value, option])
);

const VIEW_OPTIONS = [
    { icon: ArchiveIcon, label: "Show all", value: "show-all" },
    { icon: ArchiveX, label: "Exclude archives", value: "exclude-archives" },
    { icon: Globe, label: "Show shared only", value: "show-shared-only" },
] as const;

const TEMPLATES = [
    {
        description:
            "Articles, essays, and references worth reading when you have time.",
        name: "Reading List",
        value: "reading_list",
    },
    {
        description:
            "Visual references, examples, and sparks to kick off new ideas.",
        name: "Inspiration",
        value: "inspiration",
    },
    {
        description:
            "Step-by-step tutorials, docs, and practical guides to revisit.",
        name: "Tutorials & Guides",
        value: "tutorials_guides",
    },
    {
        description:
            "APIs, standards, specs, and evergreen references you keep coming back to.",
        name: "Reference Shelf",
        value: "reference_shelf",
    },
    {
        description:
            "Apps, services, libraries, and useful tools worth keeping handy.",
        name: "Tools & Resources",
        value: "tools_resources",
    },
    {
        description: "Videos, talks, and media to watch when you're ready.",
        name: "Watch Later",
        value: "watch_later",
    },
    {
        description:
            "Background research, references, and findings for ongoing work.",
        name: "Research Notes",
        value: "research_notes",
    },
    {
        description:
            "Potential product concepts, opportunities, and experiments.",
        name: "Product Ideas",
        value: "product_ideas",
    },
    {
        description:
            "Products, gear, and purchase links you're comparing or planning to buy.",
        name: "Shopping List",
        value: "shopping_list",
    },
    {
        description:
            "Restaurants, cafes, shops, and spots you want to check out soon.",
        name: "Places to Try",
        value: "places_to_try",
    },
    {
        description:
            "Trips, destinations, and travel resources to plan effectively.",
        name: "Travel Plans",
        value: "travel_plans",
    },
    {
        description:
            "DIY ideas, home upgrades, decor references, and projects for your space.",
        name: "Home Projects",
        value: "home_projects",
    },
    {
        description:
            "Workouts, routines, nutrition ideas, and wellness resources to revisit.",
        name: "Wellness & Fitness",
        value: "wellness_fitness",
    },
    {
        description:
            "Learning goals, resources, and opportunities for professional growth.",
        name: "Career Growth",
        value: "career_growth",
    },
    {
        description:
            "Tickets, events, deadlines, deals, and opportunities that are only useful for a short window and should be acted on soon.",
        name: "Time-sensitive",
        value: "time_sensitive",
    },
    {
        description:
            "Personal finance, investment research, budgeting tools, and financial planning resources.",
        name: "Finance & Investing",
        value: "finance_investing",
    },
    {
        description:
            "Online courses, educational platforms, learning paths, and skill-building resources to grow your knowledge.",
        name: "Courses & Learning",
        value: "courses_learning",
    },
] as const satisfies readonly CollectionTemplateOption[];

type TemplateValue = (typeof TEMPLATES)[number]["value"];

const TEMPLATE_BY_VALUE = new Map(
    TEMPLATES.map((template) => [template.value, template])
);

const { useStore: useCollectionsListStateStore } = createStore({
    favoriteCollectionIds: storage<string[]>([]),
    isCollectionsListOpen: storage(false),
    isFavoritesListOpen: storage(true),
});

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

type CollectionsContextValue = ReturnType<typeof useCollectionsController>;

const CollectionsContext = React.createContext<CollectionsContextValue | null>(
    null
);

function useCollections(): CollectionsContextValue {
    const context = React.use(CollectionsContext);
    if (!context) {
        throw new Error(
            "Collections sub-components must be used within a CollectionsProvider."
        );
    }
    return context;
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

function replaceCollectionShareState<T extends LibraryCollectionTag>(
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
    result: Extract<CollectionCreateResult, { status: "CREATED" }>
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

function safeAction<TInput, TOutput extends { status: string }>(
    action: (input: TInput) => Promise<TOutput>,
    errorMessage: string
): (input: TInput) => Promise<TOutput | { message: string; status: "ERROR" }> {
    return async (input) => {
        try {
            return await action(input);
        } catch (error) {
            log.error("Server action failed before returning a result", {
                error,
            });
            return { message: errorMessage, status: "ERROR" as const };
        }
    };
}

const createCollectionSafely = safeAction(
    createCollection,
    CREATE_ERROR_MESSAGE
);
const deleteCollectionSafely = safeAction(
    deleteCollection,
    DELETE_ERROR_MESSAGE
);
const duplicateCollectionSafely = safeAction(
    duplicateCollection,
    DUPLICATE_ERROR_MESSAGE
);
const renameCollectionSafely = safeAction(
    renameCollection,
    RENAME_ERROR_MESSAGE
);
const updateCollectionPrioritySafely = safeAction(
    updateCollectionPriority,
    UPDATE_PRIORITY_ERROR_MESSAGE
);
const shareCollectionPubliclySafely = safeAction(
    shareCollectionPublicly,
    SHARE_ERROR_MESSAGE
);
const disableCollectionSharingSafely = safeAction(
    disableCollectionSharing,
    DISABLE_SHARING_ERROR_MESSAGE
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
                <CollectionsListPanel>
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
                            <CollectionItemRow
                                collection={collection}
                                key={collection.id}
                                metadataDisplay="updated-at"
                            />
                        )}
                    </CollectionsListFavoritesContent>
                </CollectionsListPanel>
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
                <CollectionsListPanel>
                    <div className="p-1.5 pt-1 pl-2.5">
                        <CollectionsListCalloutPopover />
                    </div>
                    <CollectionsListEmpty />
                    <CollectionsListContent>
                        {(collection) => (
                            <CollectionItemRow
                                collection={collection}
                                key={collection.id}
                                metadataDisplay="item-count"
                            />
                        )}
                    </CollectionsListContent>
                </CollectionsListPanel>
            </CollectionsList>
            <CollectionsListStatus />
            <CollectionsRenameDialog />
            <CollectionsCreateDialog />
            <CollectionsDeleteDialog />
        </CollectionsListProvider>
    );
}

function useCollectionsController() {
    const { mutate: mutateSmartCollectionsPreference } =
        useSmartCollectionsPreference();

    const {
        collectionPreviewThumbnailUrlsById,
        collections,
        collectionSummaries,
        favoriteItemIdSet,
        favoriteItems,
        itemsByCollectionId,
        onClearCollectionFilters,
        onOpenFavoriteItem,
        onSelectCollection,
        onToggleItemFavorite,
        selectedCollectionIds,
        setCollections,
        setItems,
    } = useWorkspaceContext();

    const { hasAccess } = useSubscriptionAccess();

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [createName, setCreateName] = React.useState("");
    const [createDescription, setCreateDescription] = React.useState("");
    const [createItemId, setCreateItemId] = React.useState<string | null>(null);
    const [createError, setCreateError] = React.useState<string | null>(null);
    const [isCreatePending, startCreate] = React.useTransition();

    const [pendingRename, setPendingRename] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [renameDraft, setRenameDraft] = React.useState("");
    const [renameError, setRenameError] = React.useState<string | null>(null);
    const [isRenamePending, startRename] = React.useTransition();

    const [pendingDelete, setPendingDelete] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [isDeletePending, startDelete] = React.useTransition();

    const [pendingShareIds, setPendingShareIds] = React.useState<string[]>([]);
    const [, startShare] = React.useTransition();

    const [, startDuplicate] = React.useTransition();

    const [feedback, setFeedback] = React.useState<CollectionFeedback | null>(
        null
    );

    const {
        favoriteCollectionIds,
        isCollectionsListOpen,
        isFavoritesListOpen,
        setFavoriteCollectionIds,
        setIsCollectionsListOpen,
        setIsFavoritesListOpen,
    } = useCollectionsListStateStore();

    const {
        collectionSortField,
        collectionTextMatchQuery,
        setCollectionSortField,
        setCollectionTextMatchQuery,
        setCollectionView,
        collectionView,
    } = useCollectionsSortStore();

    const { copyToClipboard } = useCopyToClipboard();

    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [sortInputValue, setSortInputValue] = React.useState("");
    const createSubmissionPendingRef = React.useRef(false);
    const pendingPriorityUpdateIdsRef = React.useRef(new Set<string>());
    const pendingShareIdSetRef = React.useRef(new Set<string>());
    const renameSubmissionPendingRef = React.useRef(false);
    const renameSubmissionVersionRef = React.useRef(0);

    const hasAnySelected = selectedCollectionIds.length > 0;
    const collectionLabels = collectionSummaries.map(
        (collection) => collection.name
    );
    const favoriteCollectionIdSet = new Set(favoriteCollectionIds);
    const favoriteCollectionSummaries = collectionSummaries.filter(
        (collection) => favoriteCollectionIdSet.has(collection.id)
    );
    const currentSortOption =
        collectionSortField === "text-match"
            ? {
                  icon: ListFilter,
                  label: `Sort by "${collectionTextMatchQuery}"`,
              }
            : (SORT_OPTION_BY_VALUE.get(collectionSortField) ?? null);
    const comboboxValue: ComboboxValue = {
        icon: currentSortOption?.icon ?? ListFilter,
        label: currentSortOption?.label ?? "Priority",
        sortField: collectionSortField,
        sortQuery: collectionTextMatchQuery,
        view: collectionView,
    };

    const showError = (message: string) =>
        setFeedback({ message, tone: "error" });
    const showSuccess = (message: string) =>
        setFeedback({ message, tone: "success" });

    const getCollectionItems = (collectionId: string) =>
        itemsByCollectionId.get(collectionId) ?? [];

    const hasHiddenItems = (collection: LibraryCollectionSummary) =>
        !hasAccess &&
        getCollectionItems(collection.id).length < collection.itemCount;

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

    const setCollectionSharePending = (
        collectionId: string,
        isPending: boolean
    ) => {
        if (isPending) {
            pendingShareIdSetRef.current.add(collectionId);
        } else {
            pendingShareIdSetRef.current.delete(collectionId);
        }

        setPendingShareIds((current) => {
            if (isPending) {
                return current.includes(collectionId)
                    ? current
                    : [...current, collectionId];
            }
            return removeValue(current, collectionId);
        });
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

    const syncItemTags = (
        updater: (tags: LibraryCollectionTag[]) => LibraryCollectionTag[]
    ) => {
        setItems((current) => updateItemTags(current, updater));
    };

    const syncShare = (next: CollectionShareState) => {
        setCollections((current) =>
            sortCollections(replaceCollectionShareState(current, next))
        );
        syncItemTags((tags) => replaceCollectionShareState(tags, next));
    };

    const syncPriority = (id: string, priority: CollectionPriority) => {
        setCollections((current) =>
            sortCollections(
                updateById(current, id, (collection) => ({
                    ...collection,
                    priority,
                }))
            )
        );
        syncItemTags((tags) =>
            updateById(tags, id, (tag) => ({ ...tag, priority }))
        );
    };

    const syncName = (id: string, name: string) => {
        setCollections((current) => replaceName(current, id, name));
        setItems((current) =>
            updateItemTags(current, (tags) => replaceName(tags, id, name))
        );
    };

    const syncCreated = (input: SyncCreatedCollectionInput) => {
        setCollections((current) =>
            mergeCollectionSummaries(current, [input.collection])
        );
        if (input.assignedItemIds.length === 0) {
            return;
        }
        setItems((current) =>
            appendCollection(current, input.assignedItemIds, input.collection)
        );
    };

    const startCreateCollection = (
        input: Parameters<typeof createCollection>[0],
        onSuccess?: () => void
    ) => {
        if (createSubmissionPendingRef.current) {
            return;
        }
        createSubmissionPendingRef.current = true;
        startCreate(async () => {
            try {
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
            } finally {
                createSubmissionPendingRef.current = false;
            }
        });
    };

    const requestCreate = useStableCallback((itemId?: string) => {
        setCreateItemId(itemId ?? null);
        setCreateName("");
        setCreateDescription("");
        setCreateError(null);
        setIsCreateOpen(true);
    });

    const handleCreateShortcutPress = useStableCallback(() => {
        if (createSubmissionPendingRef.current) {
            return;
        }
        if (isCreateOpen) {
            setIsCreateOpen(false);
            return;
        }
        requestCreate();
    });

    const handleCollectionsListShortcutPress = useStableCallback(() => {
        setIsCollectionsListOpen((current) => !current);
    });

    const handleFavoritesListShortcutPress = useStableCallback(() => {
        setIsFavoritesListOpen((current) => !current);
    });

    const handleSortShortcutPress = useStableCallback(
        (event: KeyboardEvent) => {
            event.preventDefault();
            setIsCollectionsListOpen(true);
            setIsSortOpen(true);
        }
    );

    useHotkeys("mod+n, v", handleCreateShortcutPress, {
        description: "Create a new collection",
        preventDefault: true,
    });

    useHotkeys("mod+c", handleCollectionsListShortcutPress, {
        description: "Toggle collections panel",
    });

    useHotkeys("shift+mod+f", handleFavoritesListShortcutPress, {
        description: "Toggle favorites panel",
        preventDefault: true,
    });

    useHotkeys("mod+f", handleSortShortcutPress, {
        description: "Sort and organize collections",
        enabled: !isSortOpen,
        preventDefault: true,
    });

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

        const items = getCollectionItems(collection.id);
        const urls = getItemUrls(items);

        if (urls.length === 0) {
            showError(EMPTY_LINKS_ERROR_MESSAGE);
            return;
        }

        await copyWithFeedback(
            urls.join("\n"),
            `Links from ${collection.name} copied to the clipboard.`,
            COPY_LINKS_ERROR_MESSAGE
        );
    };

    const handleCopyTitle = async (collection: LibraryCollectionSummary) => {
        await copyWithFeedback(
            collection.name,
            `${collection.name} title copied to the clipboard.`,
            COPY_TITLE_ERROR_MESSAGE
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
            COPY_SHARE_LINK_ERROR_MESSAGE
        );
    };

    const handleEnableShare = (collection: LibraryCollectionSummary) => {
        if (pendingShareIdSetRef.current.has(collection.id)) {
            return;
        }

        if (!ensureAccess(collection, "share")) {
            return;
        }

        setFeedback(null);
        setCollectionSharePending(collection.id, true);

        startShare(async () => {
            try {
                const result = await shareCollectionPubliclySafely({
                    collectionId: collection.id,
                });

                if (result.status === "SHARED") {
                    syncShare(result.collection);
                    const linkCopied = await copyToClipboard(result.shareUrl);
                    showSuccess(
                        linkCopied
                            ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                            : `${collection.name} is now publicly shared.`
                    );
                } else {
                    showError(result.message);
                }
            } finally {
                setCollectionSharePending(collection.id, false);
            }
        });
    };

    const handleDisableShare = (collection: LibraryCollectionSummary) => {
        if (pendingShareIdSetRef.current.has(collection.id)) {
            return;
        }

        setFeedback(null);
        setCollectionSharePending(collection.id, true);

        startShare(async () => {
            try {
                const result = await disableCollectionSharingSafely({
                    collectionId: collection.id,
                });

                if (result.status === "DISABLED") {
                    syncShare(result.collection);
                    showSuccess(
                        `${collection.name} is no longer publicly shared.`
                    );
                } else {
                    showError(result.message);
                }
            } finally {
                setCollectionSharePending(collection.id, false);
            }
        });
    };

    const handleOpenLinks = (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "open")) {
            return;
        }

        const items = getCollectionItems(collection.id);
        const urls = getItemUrls(items);

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
    };

    const handleExportCsv = (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "export")) {
            return;
        }

        const items = getCollectionItems(collection.id);

        if (items.length === 0) {
            showError(EMPTY_LINKS_ERROR_MESSAGE);
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
                        name: `${slugify(collection.name) || "collection"}-links`,
                    }
                );

                showSuccess(`${collection.name} exported as CSV.`);
            } catch {
                showError(EXPORT_CSV_ERROR_MESSAGE);
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
                current.filter(
                    (collection) => collection.id !== result.collection.id
                )
            );
            syncItemTags((tags) =>
                tags.filter(
                    (collection) => collection.id !== result.collection.id
                )
            );
            setFavoriteCollectionIds((current) =>
                removeValue(current, result.collection.id)
            );
            setPendingDelete(null);
            showSuccess(`${result.collection.name} deleted.`);
        });
    };

    const handleUpdatePriority = async (
        collectionId: string,
        priority: CollectionPriority
    ) => {
        if (pendingPriorityUpdateIdsRef.current.has(collectionId)) {
            return;
        }

        const previous = collections.find(
            (c) => c.id === collectionId
        )?.priority;

        if (!previous || previous === priority) {
            return;
        }

        pendingPriorityUpdateIdsRef.current.add(collectionId);
        syncPriority(collectionId, priority);

        try {
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
        } finally {
            pendingPriorityUpdateIdsRef.current.delete(collectionId);
        }
    };

    const handleRenameSubmit = () => {
        if (isRenamePending || renameSubmissionPendingRef.current) {
            return;
        }

        const target = pendingRename;
        if (!target) {
            return;
        }

        const previousName = target.name;
        const nextName = normalizeWhitespace(renameDraft);

        if (nextName.length === 0) {
            setRenameError("Enter a collection name.");
            return;
        }

        if (nextName === previousName) {
            resetRename();
            return;
        }

        syncName(target.id, nextName);
        const submissionVersion = renameSubmissionVersionRef.current + 1;
        renameSubmissionVersionRef.current = submissionVersion;
        renameSubmissionPendingRef.current = true;

        startRename(async () => {
            try {
                const result = await renameCollectionSafely({
                    collectionId: target.id,
                    name: nextName,
                });
                const isCurrentSubmission =
                    renameSubmissionVersionRef.current === submissionVersion;

                if (!isCurrentSubmission) {
                    return;
                }

                if (result.status === "UPDATED") {
                    syncName(result.collection.id, result.collection.name);
                    resetRename();
                    showSuccess(`${result.collection.name} renamed.`);
                    return;
                }

                syncName(target.id, previousName);
                setRenameError(result.message);
            } finally {
                if (renameSubmissionVersionRef.current === submissionVersion) {
                    renameSubmissionPendingRef.current = false;
                }
            }
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

    const handleFavoriteToggle = (collection: LibraryCollectionSummary) => {
        const isFavorite = favoriteCollectionIdSet.has(collection.id);
        setFavoriteCollectionIds((current) =>
            toggleValue(current, collection.id)
        );
        showSuccess(
            isFavorite
                ? `${collection.name} removed from Favorites.`
                : `${collection.name} added to Favorites.`
        );
    };

    const handleCreateSubmit = () => {
        const name = normalizeWhitespace(createName);
        if (name.length === 0) {
            setCreateError("Enter a collection name.");
            return;
        }

        startCreateCollection({
            assignToItemId: createItemId ?? undefined,
            description: normalizeWhitespace(createDescription) || undefined,
            name,
        });
    };

    const handleCreateFromTemplate = (value: TemplateValue | null) => {
        if (createSubmissionPendingRef.current) {
            return;
        }
        if (!value) {
            return;
        }
        const template = TEMPLATE_BY_VALUE.get(value);
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
        if (!open) {
            if (isCreatePending || createSubmissionPendingRef.current) {
                return;
            }
            resetCreate();
        }
        setIsCreateOpen(open);
    };

    const handleDeleteOpenChange = (open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDelete(null);
        }
    };

    const handleRenameOpenChange = (open: boolean) => {
        if (!(open || isRenamePending || renameSubmissionPendingRef.current)) {
            resetRename();
        }
    };

    const handleDisableSmartCollections = async () => {
        try {
            await mutateSmartCollectionsPreference(
                async () => {
                    const result = await disableSmartCollections();
                    if (result.status !== "DISABLED") {
                        throw new Error(result.message);
                    }
                    return { disabled: true };
                },
                { optimisticData: { disabled: true }, rollbackOnError: true }
            );
        } catch (error) {
            log.error("Failed to disable smart collections", { error });
            showError(DISABLE_SMART_COLLECTIONS_ERROR_MESSAGE);
        }
    };

    const handleDismissFeedback = useStableCallback(() => {
        setFeedback(null);
    });

    const handleComboboxValueChange = (nextValue: ComboboxValue | null) => {
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
            setSortInputValue("");
        }

        if (nextValue.view !== collectionView) {
            setCollectionView(nextValue.view);
        }

        setIsSortOpen(false);
    };

    return {
        collectionCount: collections.length,
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
            onOpenChange: handleDeleteOpenChange,
        },
        favoriteCollectionIdSet,
        favoriteCollectionSummaries,
        favoriteItemIdSet,
        favoriteItems,
        feedback,
        hasAnySelected,
        isCollectionsListOpen,
        isFavoritesListOpen,
        onClearCollectionFilters,
        onCopyLinks: handleCopyLinks,
        onCopyShareLink: handleCopyShareLink,
        onCopyTitle: handleCopyTitle,
        onDelete: requestDelete,
        onDisableShare: handleDisableShare,
        onDisableSmartCollections: handleDisableSmartCollections,
        onDismissFeedback: handleDismissFeedback,
        onDuplicate: handleDuplicate,
        onEnableShare: handleEnableShare,
        onExportCsv: handleExportCsv,
        onFavoriteToggle: handleFavoriteToggle,
        onOpenFavoriteItem,
        onOpenLinks: handleOpenLinks,
        onRename: requestRename,
        onSelectCollection,
        onToggleItemFavorite,
        onUpdatePriority: handleUpdatePriority,
        pendingShareIds,
        renameDialog: {
            errorMessage: renameError,
            isOpen: pendingRename !== null,
            isPending: isRenamePending,
            nameDraft: renameDraft,
            onNameDraftChange: handleRenameDraftChange,
            onOpenChange: handleRenameOpenChange,
            onSubmit: handleRenameSubmit,
        },
        requestCreate,
        selectedCollectionIds,
        setIsCollectionsListOpen,
        setIsFavoritesListOpen,
        sort: {
            inputValue: sortInputValue,
            isOpen: isSortOpen,
            onInputValueChange: setSortInputValue,
            onOpenChange: setIsSortOpen,
            onValueChange: handleComboboxValueChange,
            value: comboboxValue,
        },
    };
}

function CollectionsListProvider({ children }: React.PropsWithChildren) {
    const controller = useCollectionsController();

    return (
        <CollectionsContext value={controller}>{children}</CollectionsContext>
    );
}

/**
 * Register a keyboard shortcut scoped to the hovered collection item.
 *
 * Shortcuts only fire when the item is hovered so users don't trigger
 * actions on off-screen rows.
 */
function useCollectionItemHotkey(
    keys: Parameters<typeof useHotkeys>[0],
    onTrigger: () => void,
    description: string,
    enabled = true
) {
    const { isHovered } = useCollectionsListItemContext();
    const handleTrigger = useStableCallback(onTrigger);

    useHotkeys(
        keys,
        handleTrigger,
        {
            description,
            enabled: isHovered && enabled,
            preventDefault: true,
        },
        [enabled, handleTrigger, isHovered]
    );
}

interface CollectionItemRowProps {
    collection: LibraryCollectionSummary;
    metadataDisplay: CollectionItemMetadataDisplay;
}

function CollectionItemRow({
    collection,
    metadataDisplay = "item-count",
}: CollectionItemRowProps) {
    const controller = useCollections();
    const isSelected = controller.selectedCollectionIds.includes(collection.id);

    return (
        <CollectionItem collection={collection} isSelected={isSelected}>
            <CollectionItemPriorityCombobox />
            <CollectionItemTrigger
                {...(isSelected
                    ? {
                          "data-active": true,
                      }
                    : {})}
            >
                <CollectionItemValue />
            </CollectionItemTrigger>
            <CollectionItemMetadata metadataDisplay={metadataDisplay} />
        </CollectionItem>
    );
}

/**
 * Cycle through collection thumbnail previews on an interval while the
 * preview popup is open.
 *
 * Resets to the first image when closed so the sequence always starts
 * from the beginning.
 */
function useCollectionItemPreviewIndex(
    isOpen: boolean,
    thumbnailCount: number
) {
    const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
    const previewInterval = useInterval();
    const hasMultipleThumbnails = thumbnailCount > 1;

    React.useEffect(() => {
        if (!(isOpen && hasMultipleThumbnails)) {
            previewInterval.clear();
            setActivePreviewIndex(0);
            return;
        }
        previewInterval.start(PREVIEW_SLIDE_INTERVAL_MS, () => {
            setActivePreviewIndex(
                (currentIndex) => (currentIndex + 1) % thumbnailCount
            );
        });
        return () => {
            previewInterval.clear();
        };
    }, [hasMultipleThumbnails, isOpen, previewInterval, thumbnailCount]);

    return activePreviewIndex;
}

/**
 * Look up the full priority option (icon + label) for a given priority value.
 *
 * Falls back to `DEFAULT_PRIORITY` so callers never have to handle `undefined`.
 */
function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY;
}

/**
 * Derive CSS custom properties from a collection name so each row gets a
 * unique tint without adding inline styles for every possible color.
 *
 * The mix percentages are intentionally subtle (10-20 %) so the sidebar
 * stays readable against both light and dark backgrounds.
 */
function getCollectionItemStyle(
    name: string,
    isSelected: boolean
): CollectionItemStyle {
    const color = getHexColorFromName(name);
    const base = `color-mix(in srgb, ${color} ${isSelected ? 20 : 10}%, transparent)`;

    return {
        "--accent-color": `color-mix(in srgb, ${color}, black 50%)`,
        "--collection-background": isSelected
            ? `color-mix(in srgb, ${base}, white 3%)`
            : `color-mix(in srgb, ${base}, black 3%)`,
        "--text-muted-color": `color-mix(in srgb, ${color} 16%, black 18%)`,
    };
}

/**
 * Build grouped combobox options containing sort fields and view filters.
 *
 * Each item carries the full composite state so that `isItemEqualToValue`
 * can match one item from each group simultaneously.
 */
function getComboboxCollectionsSortingGroups(
    inputValue: string,
    currentValue: ComboboxValue
): ComboboxGroupData[] {
    const query = inputValue.trim();
    const normalizedQuery = query.toLowerCase();

    const matchingSortOptions = SORT_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
    );

    const sortItems: ComboboxValue[] =
        normalizedQuery.length === 0 || matchingSortOptions.length > 0
            ? matchingSortOptions.map((option) => ({
                  icon: option.icon,
                  label: option.label,
                  sortField: option.value,
                  sortQuery: currentValue.sortQuery,
                  view: currentValue.view,
              }))
            : [
                  {
                      icon: ListFilter,
                      label: `Sort by "${query}"`,
                      sortField: "text-match",
                      sortQuery: query,
                      view: currentValue.view,
                  },
              ];

    const matchingViewOptions = VIEW_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
    );

    const viewItems: ComboboxValue[] = matchingViewOptions.map((option) => ({
        icon: option.icon,
        label: option.label,
        sortField: currentValue.sortField,
        sortQuery: currentValue.sortQuery,
        view: option.value,
    }));

    const groups: ComboboxGroupData[] = [{ group: "sort", items: sortItems }];

    if (viewItems.length > 0) {
        groups.push({ group: "view", items: viewItems });
    }

    return groups;
}

function getComboboxOptionValue(value: ComboboxValue): string {
    return `${value.sortField}:${value.view}:${value.sortQuery}`;
}

/**
 * Determine whether an item should show its built-in ItemIndicator.
 *
 * Sort items match when their `sortField` equals the current value's
 * `sortField`. View items match when their `view` equals the current
 * value's `view`. This allows both a sort option and a view option to
 * appear selected at the same time in single-select mode.
 */
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
    icon: CollectionOptionIcon;
    label: string;
}) {
    return (
        <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
            <Icon className="size-4 text-muted-foreground" />
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
    const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
    const hasFailed = src !== undefined && failedSrc === src;

    const handleError = useStableCallback((): void => {
        setFailedSrc((src as string | undefined) ?? null);
    });

    if (!src || hasFailed) {
        return <MediaPlaceholder />;
    }

    return (
        <img
            {...props}
            alt={alt}
            className={cn("size-full object-cover", className)}
            height={192}
            loading="lazy"
            onError={handleError}
            src={src}
            width={288}
        />
    );
}

/**
 * Root wrapper for the collections list. Adds relative positioning so child
 * absolute elements (e.g. tooltips) layer correctly.
 */
function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const controller = useCollections();
    const requestCreateRef = React.use(RequestCreateRefContext);

    React.useEffect(() => {
        if (!requestCreateRef) {
            return;
        }
        requestCreateRef.current = controller.requestCreate;
        return () => {
            requestCreateRef.current = null;
        };
    }, [controller.requestCreate, requestCreateRef]);

    return (
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={controller.setIsCollectionsListOpen}
            open={controller.isCollectionsListOpen}
        />
    );
}

function CollectionsListTrigger({
    children,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const { collectionLabels, collectionSummaries, isCollectionsListOpen } =
        useCollections();

    return (
        <CollectionsListGroupTrigger
            {...props}
            count={collectionSummaries.length}
            isOpen={isCollectionsListOpen}
            labels={collectionLabels}
            placeholder="No collections yet"
        >
            {children}
        </CollectionsListGroupTrigger>
    );
}

function CollectionsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

function CollectionsListFavorites({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const {
        favoriteCollectionSummaries,
        favoriteItems,
        setIsFavoritesListOpen,
        isFavoritesListOpen,
    } = useCollections();

    if (!(favoriteCollectionSummaries.length || favoriteItems.length)) {
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
    const { favoriteCollectionSummaries, favoriteItems, isFavoritesListOpen } =
        useCollections();
    const labels = favoriteCollectionSummaries.map(
        (collection) => collection.name
    );

    return (
        <CollectionsListGroupTrigger
            {...props}
            count={favoriteCollectionSummaries.length + favoriteItems.length}
            isOpen={isFavoritesListOpen}
            labels={labels}
            placeholder="No favorites yet"
        >
            {children}
        </CollectionsListGroupTrigger>
    );
}

interface CollectionsListContentProps {
    children: (
        item: LibraryCollectionSummary,
        index: number
    ) => React.ReactNode;
}

interface CollectionsListFavoritesContentProps {
    children: (
        item: LibraryCollectionSummary,
        index: number
    ) => React.ReactNode;
}

interface CollectionsListFavoritesCarouselContentProps {
    children: (
        item: LibraryItemWithCollections,
        index: number
    ) => React.ReactNode;
}

interface CollectionsListGroupTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    count: number;
    isOpen: boolean;
    labels: string[];
    placeholder: string;
}

function CollectionsListGroupTrigger({
    children,
    count,
    isOpen,
    labels,
    placeholder,
    render,
    ...props
}: CollectionsListGroupTriggerProps) {
    const locale = useLocale();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
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
                    <span className="opacity-80">({count})</span>
                </span>
                <ChevronDownFilledIcon
                    aria-hidden
                    className="-ml-0.5"
                    focusable="false"
                />
            </PopoverTrigger>
            <PopoverPopup
                align="start"
                positionerClassName={cn(
                    isOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="whitespace-normal font-medium leading-tight">
                    {labels.length > 0
                        ? new Intl.ListFormat(locale, {
                              style: "long",
                              type: "conjunction",
                          }).format(labels)
                        : placeholder}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

function CollectionsListFavoritesCarouselContent({
    children,
}: CollectionsListFavoritesCarouselContentProps) {
    const { favoriteItems } = useCollections();

    if (!favoriteItems.length) {
        return null;
    }

    return (
        <Carousel className="mb-1 *:first:pl-2.5 [&>*:not(:last-child)]:me-1.5">
            {favoriteItems.map(children)}
        </Carousel>
    );
}

function CollectionsListFavoritesCarouselSlide({
    item,
}: {
    item: LibraryItemWithCollections;
}) {
    const { onOpenFavoriteItem, onToggleItemFavorite } = useCollections();
    const isNote = item.kind === ITEM_KIND_NOTE;
    const previewImageUrl = itemPreviewImageUrl(item);
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const previewLabel =
        (item.caption ?? "").trim() || (isNote ? "Note" : "Saved item");
    const [isOpen, setIsOpen] = React.useState(false);

    const handleClick = useStableCallback(
        (
            event: BaseUIEvent<React.MouseEvent<HTMLAnchorElement, MouseEvent>>
        ) => {
            event.preventDefault();
            onOpenFavoriteItem(item);
            setIsOpen(false);
        }
    );

    const handleRemoveFavorite = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleItemFavorite(item).catch((error) => {
                log.error("Failed to remove item from favorites", {
                    error,
                    itemId: item.id,
                });
            });
        }
    );

    return (
        <PreviewCard onOpenChange={setIsOpen} open={isOpen}>
            <div
                className="group relative inline-block aspect-3/4 h-14 overflow-hidden rounded-md bg-muted focus-within:ring-2 focus-within:ring-ring/60"
                title={previewLabel}
            >
                <PreviewCardTrigger
                    aria-label={previewLabel}
                    className="size-full focus-visible:outline-none"
                    closeDelay={0}
                    onClick={handleClick}
                >
                    {isNote ? (
                        <div className="flex size-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-1.5">
                            <p className="line-clamp-4 whitespace-pre-wrap text-left text-[9px] text-foreground leading-snug opacity-90">
                                {noteExcerpt || "Open note"}
                            </p>
                        </div>
                    ) : (
                        <CollectionsListItemPreviewImage
                            alt={previewLabel}
                            src={previewImageUrl ?? undefined}
                        />
                    )}
                </PreviewCardTrigger>
                <button
                    aria-label="Remove from favorites"
                    className="absolute top-0 left-0 z-10 flex size-4 items-center justify-center rounded-br-md bg-black/40 opacity-0 hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={handleRemoveFavorite}
                    type="button"
                >
                    <Trash2Icon className="size-2.5 text-white" />
                </button>
            </div>
            <PreviewCardPopup
                className="pointer-events-none p-0"
                positionMethod="fixed"
                side="top"
            >
                {isNote ? (
                    <div className="flex size-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                        <p className="line-clamp-6 whitespace-pre-wrap text-left text-foreground text-xs leading-snug">
                            {noteExcerpt || "Empty note"}
                        </p>
                    </div>
                ) : (
                    <CollectionsListItemPreviewImage
                        alt={previewLabel}
                        className="aspect-3/2"
                        src={previewImageUrl ?? undefined}
                    />
                )}
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListFavoritesContent({
    children,
}: CollectionsListFavoritesContentProps) {
    const { favoriteCollectionSummaries } = useCollections();

    if (!favoriteCollectionSummaries.length) {
        return null;
    }

    return favoriteCollectionSummaries.map(children);
}

function CollectionsListContent({ children }: CollectionsListContentProps) {
    const { collectionSummaries } = useCollections();

    if (!collectionSummaries.length) {
        return null;
    }

    return (
        <DisclosureList maxVisible={10}>
            {collectionSummaries.map(children)}
        </DisclosureList>
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

/**
 * Renders inside a dashed-border card so it looks intentional rather than
 * like missing data.
 */
function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { collectionCount, collectionSummaries, requestCreate } =
        useCollections();

    if (collectionSummaries.length > 0) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <p
                className={cn(
                    "font-medium text-muted-foreground text-xs italic leading-tight",
                    className
                )}
                {...props}
            >
                {collectionCount > 0 ? (
                    "No collections match this view."
                ) : (
                    <T>
                        No collections found.{" "}
                        <button
                            className="inline cursor-pointer underline hover:no-underline"
                            onClick={() => requestCreate()}
                            type="button"
                        >
                            Create your first collection
                        </button>{" "}
                        to start grouping saved items.
                    </T>
                )}
            </p>
        </div>
    );
}

/**
 * Accessibility-friendly status message for collection operations.
 *
 * Returns `null` when there is no feedback so assistive technologies do not
 * announce silent updates.
 */
function CollectionsListStatus({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { feedback, onDismissFeedback } = useCollections();
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
            <Button onClick={onDismissFeedback} size="xs" variant="ghost">
                Dismiss
            </Button>
        </div>
    );
}

/**
 * Small "X" button that clears the current collection filter selection.
 *
 * Returns `null` when no filters are active so the layout doesn't reserve
 * space for an invisible control.
 */
function CollectionsListClearFilterButton({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { hasAnySelected, onClearCollectionFilters } = useCollections();

    const onClick = useStableCallback(onClickProp);
    const handleOnClick = useStableCallback(
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
            onClick={handleOnClick}
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

/**
 * Combobox for sorting collections, filtering by text match, or toggling
 * archive visibility.
 *
 * Uses a composite value so that `isItemEqualToValue` can match one item
 * from each group simultaneously, causing the built-in ItemIndicator to
 * render for both the active sort and the active view option.
 */
function CollectionsListSortingCombobox({
    render,
    ...props
}: React.ComponentProps<typeof ComboboxTrigger>) {
    const { sort, isCollectionsListOpen } = useCollections();
    const {
        inputValue,
        isOpen,
        onInputValueChange,
        onOpenChange,
        onValueChange,
        value,
    } = sort;

    return (
        <Combobox
            autoHighlight
            filter={null}
            inputValue={inputValue}
            isItemEqualToValue={isComboboxValueEqual}
            items={getComboboxCollectionsSortingGroups(inputValue, value)}
            itemToStringValue={getComboboxOptionValue}
            onInputValueChange={onInputValueChange}
            onOpenChange={onOpenChange}
            onValueChange={onValueChange}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                {...props}
                render={
                    render ?? (
                        <Button
                            aria-label="Sort and organize collections"
                            className={
                                isCollectionsListOpen ? undefined : "hidden"
                            }
                            size="icon-xs"
                            variant="ghost"
                        />
                    )
                }
                title={`Sort and organize collections (${getSystemControlKey()}F)`}
            >
                <ListFilter
                    aria-hidden
                    className="inline-block size-3 shrink-0"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup align="end" positionMethod="fixed">
                <ComboboxInput
                    endAddon={
                        <Kbd>
                            <CmdKbd />F
                        </Kbd>
                    }
                    placeholder="Organize"
                />
                <ComboboxEmpty>No matching options</ComboboxEmpty>
                <ComboboxList>
                    {(group: ComboboxGroupData) => (
                        <React.Fragment key={group.group}>
                            <ComboboxGroup items={group.items}>
                                <ComboboxGroupLabel>
                                    {group.group === "sort"
                                        ? "Sort by"
                                        : "View"}
                                </ComboboxGroupLabel>
                                <ComboboxCollection>
                                    {(option: ComboboxValue) => (
                                        <ComboboxItem
                                            key={getComboboxOptionValue(option)}
                                            showIndicatorLast
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
    const { requestCreate } = useCollections();

    const onClick = useStableCallback(onClickProp);
    const handleOnClick = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            onClick?.(event);
            requestCreate();
        }
    );

    return (
        <Button
            {...props}
            aria-label="Create collection"
            onClick={handleOnClick}
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
    const controller = useCollections();
    const { disabled } = useSmartCollectionsPreference();

    const handleDisableSmartCollections = useStableCallback(() => {
        controller.onDisableSmartCollections();
    });

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
                    <PopoverTitle>
                        {disabled
                            ? "Smart Collections is off"
                            : "Let Cache do the organizing"}
                    </PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs leading-snug">
                        {disabled ? (
                            <>
                                Smart Collections uses AI to automatically group
                                your saves into contextual collections.
                            </>
                        ) : (
                            <>
                                As you add new entries, Cache AI proactively
                                groups your related saves into contextual
                                collections. Cache also learns your preferences
                                over time.{" "}
                                <Button
                                    className="h-fit! px-0 leading-snug sm:text-xs"
                                    render={<Link href="/automations" />}
                                    size="xs"
                                    variant="link"
                                >
                                    Automations
                                    <ArrowUpRight
                                        aria-hidden
                                        className="inline-block size-3 shrink-0 text-muted-foreground"
                                        focusable="false"
                                    />
                                </Button>
                            </>
                        )}
                    </PopoverDescription>
                    <Button
                        className="w-fit px-0 text-muted-foreground text-xs"
                        onClick={
                            disabled ? undefined : handleDisableSmartCollections
                        }
                        render={
                            disabled ? <Link href="/automations" /> : undefined
                        }
                        size="xs"
                        variant="link"
                    >
                        {disabled
                            ? "Learn more about Smart Collections"
                            : "Turn off Smart Collections"}
                    </Button>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

interface CollectionsListItemProps extends React.ComponentProps<"div"> {
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}

/**
 * A single row in the collections list.
 *
 * Provides `CollectionsListItemContext` to its children so compound parts
 * can read the collection and hover state without prop drilling.
 */
function CollectionItem({
    className,
    collection,
    isSelected,
    onMouseEnter: onMouseEnterProp,
    onMouseLeave: onMouseLeaveProp,
    style: styleProp,
    ...props
}: CollectionsListItemProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const onMouseEnter = useStableCallback(onMouseEnterProp);
    const onMouseLeave = useStableCallback(onMouseLeaveProp);
    const style = getCollectionItemStyle(collection.name, isSelected);

    return (
        <CollectionsListItemContext value={{ collection, isHovered }}>
            <div
                {...props}
                className={cn(
                    "group relative flex select-none items-center",
                    className
                )}
                onMouseEnter={(event) => {
                    setIsHovered(true);
                    onMouseEnter?.(event);
                }}
                onMouseLeave={(event) => {
                    setIsHovered(false);
                    onMouseLeave?.(event);
                }}
                style={{ ...style, ...styleProp }}
            />
        </CollectionsListItemContext>
    );
}

/**
 * Previewable trigger that cycles through collection thumbnails on hover.
 *
 * Clicking selects the collection and closes the preview popup.
 */
function CollectionItemTrigger({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof PreviewCardTrigger>) {
    const controller = useCollections();
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const thumbnails =
        controller.collectionPreviewThumbnailUrlsById.get(collection.id) ?? [];
    const activePreviewIndex = useCollectionItemPreviewIndex(
        isOpen,
        thumbnails.length
    );
    const activeThumbnail = thumbnails[activePreviewIndex];
    const onClick = useStableCallback(onClickProp);

    const handleClick = useStableCallback(
        (
            event: BaseUIEvent<React.MouseEvent<HTMLAnchorElement, MouseEvent>>
        ) => {
            onClick?.(event);
            controller.onSelectCollection(collection.id);
            setIsOpen(false);
        }
    );

    return (
        <PreviewCard onOpenChange={setIsOpen} open={isOpen}>
            <PreviewCardTrigger
                {...props}
                closeDelay={0}
                onClick={handleClick}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-10.5 text-left hover:bg-transparent focus-visible:ring-(--accent-color)"
                        render={<Button variant="ghost" />}
                    />
                }
            />
            <PreviewCardPopup
                className="pointer-events-none aspect-3/2 p-0"
                positionMethod="fixed"
                side="right"
            >
                <CollectionsListItemPreviewImage
                    alt={`${collection.name} preview`}
                    src={activeThumbnail}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

/**
 * Display the collection name and, on hover, a faded list of its sources.
 *
 * Sources are hidden by default to keep the sidebar compact; they fade in
 * on hover as a secondary cue.
 */
function CollectionItemValue() {
    const { collection } = useCollectionsListItemContext();

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span
                className="max-w-full shrink-0 truncate font-medium text-sm"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {collection.sources.length > 0 ? (
                <span className="max-w-full flex-1 truncate text-[11px] text-muted-foreground opacity-0 group-hover:opacity-80">
                    {collection.sources.map(getSourceLabel).join(", ")}
                </span>
            ) : null}
        </div>
    );
}

/**
 * Priority picker bound to the hovered collection item.
 *
 * The "P" hotkey opens the dropdown while the item is hovered.
 */
function CollectionItemPriorityCombobox() {
    const controller = useCollections();
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const SelectedPriorityIcon = getPriorityOption(collection.priority).icon;

    useCollectionItemHotkey(
        "p",
        () => {
            setIsOpen(true);
        },
        "Set priority for hovered collection",
        !isOpen
    );

    return (
        <Combobox
            autoHighlight
            items={PRIORITIES}
            onOpenChange={setIsOpen}
            onValueChange={(nextPriority) => {
                if (!nextPriority || nextPriority === collection.priority) {
                    setIsOpen(false);
                    return;
                }
                controller.onUpdatePriority(collection.id, nextPriority);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Change priority for ${collection.name}`}
                        className="absolute top-1/2 left-2.5 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--accent-color)"
                        size="icon-xs"
                        title="Organize collections by relevance level"
                        variant="ghost"
                    />
                }
            >
                <SelectedPriorityIcon className="size-4" />
            </ComboboxTrigger>
            <ComboboxPopup positionMethod="fixed">
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
                                showIndicatorLast
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
            </ComboboxPopup>
        </Combobox>
    );
}

function CollectionItemShareSubMenu() {
    const controller = useCollections();
    const { collection } = useCollectionsListItemContext();
    const isShared = !!collection.shareId;
    const isSharePending = controller.pendingShareIds.includes(collection.id);

    const onCopyShareLink = useStableCallback(() =>
        controller.onCopyShareLink(collection)
    );
    const onDisableShare = useStableCallback(() =>
        controller.onDisableShare(collection)
    );
    const onEnableShare = useStableCallback(() =>
        controller.onEnableShare(collection)
    );

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
                        disabled={isSharePending}
                        onClick={onCopyShareLink}
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
                        disabled={isSharePending}
                        onClick={onEnableShare}
                    >
                        <UserRoundPlus
                            aria-hidden
                            className="size-4 text-muted-foreground"
                            focusable="false"
                        />
                        Create public link
                    </MenuItem>
                )}
                <MenuItem
                    closeOnClick={false}
                    disabled={!isShared || isSharePending}
                >
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
                        disabled={isSharePending}
                        onClick={onDisableShare}
                        variant="destructive"
                    >
                        <Trash2Icon
                            aria-hidden
                            className="size-4"
                            focusable="false"
                        />
                        Disable public link
                    </MenuItem>
                ) : null}
            </MenuSubPopup>
        </MenuSub>
    );
}

/**
 * Sub-menu with export actions for a collection.
 *
 * Some items are disabled when the collection has no entries.
 */
function CollectionItemExportSubMenu() {
    const controller = useCollections();
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    const onCopyLinks = useStableCallback(() =>
        controller.onCopyLinks(collection)
    );
    const onCopyTitle = useStableCallback(() =>
        controller.onCopyTitle(collection)
    );
    const onExportCsv = useStableCallback(() =>
        controller.onExportCsv(collection)
    );
    const onOpenLinks = useStableCallback(() =>
        controller.onOpenLinks(collection)
    );

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
                <MenuItem onClick={onCopyTitle}>
                    <CopyIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Copy title
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onCopyLinks}>
                    <CopyIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Copy all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onOpenLinks}>
                    <ExternalLinkIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Open all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onExportCsv}>
                    <FileSpreadsheetIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    Export to CSV
                </MenuItem>
                <MenuItem disabled={!hasItems}>
                    <NotionIcon
                        aria-hidden
                        className="size-4"
                        focusable="false"
                    />
                    Send to Notion
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

// function CollectionItemSubscribeSubMenu() {
//     return (
//         <MenuSub>
//             <MenuSubTrigger disabled>
//                 <BellIcon
//                     aria-hidden
//                     className="inline-block size-4 text-muted-foreground"
//                     focusable="false"
//                 />
//                 Subscribe
//             </MenuSubTrigger>
//             <MenuSubPopup>
//                 <MenuGroup>
//                     <MenuGroupLabel>Inbox notifications</MenuGroupLabel>
//                     {COLLECTION_NOTIFICATION_OPTIONS.map((option) => (
//                         <MenuCheckboxItem
//                             defaultChecked={option.defaultChecked}
//                             key={option.value}
//                         >
//                             {option.label}
//                         </MenuCheckboxItem>
//                     ))}
//                 </MenuGroup>
//             </MenuSubPopup>
//         </MenuSub>
//     );
// }

interface CollectionItemMetadataProps {
    metadataDisplay: CollectionItemMetadataDisplay;
}

/**
 * Action menu and metadata for a collection list item.
 *
 * Renders a count badge that hides on hover, replacing it with an ellipsis
 * menu. Keyboard shortcuts (E, Delete/Backspace, C, Option+F) are active
 * while hovered.
 */
function CollectionItemMetadata({
    metadataDisplay,
}: CollectionItemMetadataProps) {
    const controller = useCollections();
    const { collection } = useCollectionsListItemContext();
    const isFavorite = controller.favoriteCollectionIdSet.has(collection.id);
    const hasItems = collection.itemCount > 0;

    const onRename = useStableCallback(() => controller.onRename(collection));
    const onDelete = useStableCallback(() => controller.onDelete(collection));
    const onFavoriteToggle = useStableCallback(() => {
        controller.onFavoriteToggle(collection);
    });
    const onMakeCopy = useStableCallback(() =>
        controller.onDuplicate(collection)
    );
    const onCopyLinks = useStableCallback(() =>
        controller.onCopyLinks(collection)
    );

    useCollectionItemHotkey("e", onRename, "Rename hovered collection");
    useCollectionItemHotkey(
        ["delete", "backspace"],
        onDelete,
        "Delete hovered collection"
    );
    useCollectionItemHotkey(
        "c",
        onCopyLinks,
        "Copy hovered collection",
        hasItems
    );
    const updatedAt = dayjs(collection.updatedAt);

    useCollectionItemHotkey(
        "alt+f",
        onFavoriteToggle,
        "Toggle hovered collection to Favorites",
        !isFavorite
    );

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {metadataDisplay === "updated-at"
                    ? updatedAt.fromNow(true)
                    : COMPACT_NUMBER_FORMATTER.format(collection.itemCount)}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            className="absolute opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100"
                            size="icon-xs"
                            title={`Collection actions for ${collection.name}`}
                            variant="ghost"
                        />
                    }
                >
                    <EllipsisIcon
                        aria-hidden
                        className="inline-block size-3.5 shrink-0"
                        focusable="false"
                    />
                </MenuTrigger>
                <MenuPopup align="start" side="right">
                    <MenuGroup>
                        <MenuGroupLabel className="flex items-center gap-1.5">
                            Collection
                            <Badge size="sm" variant="secondary">
                                {collection.shareId ? (
                                    <Globe className="size-3" />
                                ) : (
                                    <LockKeyhole className="size-3" />
                                )}
                            </Badge>
                        </MenuGroupLabel>
                        <MenuItem onClick={onFavoriteToggle}>
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
                        <MenuItem onClick={onRename}>
                            <PencilIcon
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Rename
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                        <MenuItem onClick={onMakeCopy}>
                            <CopyPlus
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Make a copy
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionItemShareSubMenu />
                        <CollectionItemExportSubMenu />
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem onClick={onDelete}>Delete</MenuItem>
                    </MenuGroup>
                    <MenuItem disabled>
                        <div className="-mt-1 space-y-1 text-[10px] text-muted-foreground leading-none *:text-nowrap">
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
    const {
        errorMessage,
        isOpen,
        isPending,
        nameDraft,
        onNameDraftChange,
        onOpenChange,
        onSubmit,
    } = useCollections().renameDialog;
    const inputId = React.useId();
    const errorId = React.useId();

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
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
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
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
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

function CollectionsCreateDialog() {
    const {
        descriptionDraft,
        errorMessage,
        isOpen,
        isPending,
        nameDraft,
        onCreateFromTemplate,
        onDescriptionDraftChange,
        onNameDraftChange,
        onOpenChange,
        onSubmit,
    } = useCollections().createDialog;
    const nameInputId = React.useId();
    const errorId = React.useId();
    const descriptionInputId = React.useId();
    const { disabled } = useSmartCollectionsPreference();
    const isNameValid = normalizeWhitespace(nameDraft).length > 0;

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
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
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={nameInputId}
                                maxLength={NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection name"
                                required
                                size="lg"
                                type="text"
                                unstyled
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
                            <Textarea
                                className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                id={descriptionInputId}
                                maxLength={1024}
                                onChange={(event) =>
                                    onDescriptionDraftChange(
                                        event.currentTarget.value
                                    )
                                }
                                placeholder="Describe what belongs here..."
                                size="lg"
                                unstyled
                                value={descriptionDraft}
                            />
                        </div>
                        {errorMessage ? (
                            <DialogFieldError id={errorId}>
                                {errorMessage}
                            </DialogFieldError>
                        ) : null}
                        <Alert>
                            <Lightbulb aria-hidden focusable="false" />
                            <AlertDescription>
                                Collections keep your best saves and content in
                                one place. Use them for ongoing goals, or just
                                to keep things tidy. Cache will auto-assign
                                matching entries to it.
                            </AlertDescription>
                        </Alert>
                    </DialogPanel>
                    <DialogFooter>
                        <Combobox
                            autoHighlight
                            items={TEMPLATES}
                            onValueChange={onCreateFromTemplate}
                        >
                            <ComboboxTrigger
                                disabled={isPending}
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
                                {disabled ? null : (
                                    <div className="flex gap-2 px-3 py-2">
                                        <Info
                                            aria-hidden
                                            className="inline-block size-3.5 shrink-0"
                                            focusable="false"
                                        />
                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                            Cache's{" "}
                                            <strong className="font-medium">
                                                Smart Collections&nbsp;
                                                <Sparkle
                                                    aria-hidden
                                                    className="mb-px inline-block size-3"
                                                    focusable="false"
                                                />
                                            </strong>{" "}
                                            can automatically assign collections
                                            to entries that match these
                                            templates.
                                        </p>
                                    </div>
                                )}
                            </ComboboxPopup>
                        </Combobox>
                        <Button
                            disabled={!isNameValid}
                            loading={isPending}
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
    const { collection, isPending, onConfirm, onOpenChange } =
        useCollections().deleteDialog;

    return (
        <Dialog onOpenChange={onOpenChange} open={collection !== null}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onConfirm();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Delete collection?</DialogTitle>
                        <DialogDescription>
                            Remove {collection?.name || "this collection"} from
                            Cache. Saved items will remain in your library, but
                            they won't belong to this collection anymore.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel />
                    <DialogFooter>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isPending}
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

function DialogFieldError({
    children,
    id,
}: {
    children: React.ReactNode;
    id: string;
}) {
    return (
        <p
            aria-atomic="true"
            className="pt-2 text-destructive text-xs"
            id={id}
            role="alert"
        >
            {children}
        </p>
    );
}
