"use client";

import {
    mergeCollectionSummaries,
    useWorkspace,
} from "@/components/library/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Combobox,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
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
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import {
    ChevronDownFilledIcon,
    NotionIcon,
    PriorityNoneIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { CtrlKbd, Kbd } from "@/components/ui/kbd";
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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useListPanelOpenState } from "@/hooks/use-list-panel-open-state";
import {
    createCollection,
    deleteCollection,
    duplicateCollection,
    renameCollection,
    updateCollectionPriority,
    type CollectionCreateResult,
    type CollectionDeleteResult,
    type CollectionDuplicateResult,
    type CollectionRenameResult,
    type CollectionPriorityUpdateResult,
} from "@/lib/collections/actions";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
    type CollectionPublicShareDisableResult,
    type CollectionPublicShareResult,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import { getSystemControlKey } from "@/lib/common/environment";
import { saveFile } from "@/lib/common/file";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import { normalizeURL, openSavedItemInNewTab } from "@/lib/common/url";
import { dayjs } from "@/lib/dayjs";
import { getSourceLabel } from "@/lib/integrations/support";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import { Toolbar } from "@base-ui/react/toolbar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    ArchiveIcon,
    ArrowUpRight,
    ChevronRight,
    Clock,
    Component,
    CopyIcon,
    CopyPlus,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Forward,
    Info,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    PlusIcon,
    Shapes,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Trash2Icon,
    UserRoundPlus,
    X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

// #region Domain/view types

type CollectionSortField =
    | "count"
    | "created"
    | "priority"
    | "text-match"
    | "updated";

type CollectionOptionIcon = React.ComponentType<{ className?: string }>;

type CollectionsListStatusTone = "error" | "success";

type SortableCollectionSummary = Pick<
    LibraryCollectionSummary,
    "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
>;

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

type SortingComboboxOption =
    | SortingOption
    | {
          icon: CollectionOptionIcon;
          label: string;
          query: string;
          value: "text-match";
      };

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isHovered: boolean;
}

type CollectionActionFeedbackTone = "error" | "success";

interface CollectionActionFeedback {
    message: string;
    tone: CollectionActionFeedbackTone;
}

type CollectionShareState = Pick<
    LibraryCollectionTag,
    "id" | "shareId" | "sharedAt" | "updatedAt"
>;

interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

interface SyncCreatedCollectionInput {
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}

// #endregion Domain/view types

// #region Constants

const COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS = 600;
const COLLECTION_CSV_CONTENT_TYPE = "text/csv;charset=utf-8";

const COLLECTION_CSV_HEADERS = [
    "Collection",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const COLLECTION_NAME_MAX_LENGTH = 64;

const CREATE_COLLECTION_ERROR_MESSAGE =
    "We couldn't create this collection right now.";
const DELETE_COLLECTION_ERROR_MESSAGE =
    "We couldn't delete this collection right now.";
const DUPLICATE_COLLECTION_ERROR_MESSAGE =
    "We couldn't make a copy of this collection right now.";
const EMPTY_COLLECTION_LINKS_MESSAGE =
    "There are no links in this collection yet.";
const RENAME_COLLECTION_ERROR_MESSAGE =
    "We couldn't rename this collection right now.";
const SHARE_COLLECTION_ERROR_MESSAGE =
    "We couldn't create a public link right now.";
const STOP_SHARING_COLLECTION_ERROR_MESSAGE =
    "We couldn't stop sharing this collection right now.";
const UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE =
    "We couldn't update this collection priority right now.";

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    notation: "compact",
});

export const NAME_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

const DEFAULT_PRIORITY_OPTION: PriorityOption = {
    icon: PriorityNoneIcon,
    label: "No priority",
    value: "none",
};

const PRIORITY_OPTIONS = [
    DEFAULT_PRIORITY_OPTION,
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
] satisfies PriorityOption[];

const PRIORITY_OPTION_BY_VALUE = new Map(
    PRIORITY_OPTIONS.map((option) => [option.value, option])
);

const SORTING_OPTIONS = [
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
        icon: Component,
        label: "Count",
        value: "count",
    },
] satisfies SortingOption[];

const SORTING_OPTION_BY_VALUE = new Map(
    SORTING_OPTIONS.map((option) => [option.value, option])
);

const COLLECTION_TEMPLATE_OPTIONS = [
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
        description: "Recipes and meal ideas you want to try later.",
        name: "Recipes",
        value: "recipes",
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
        name: "Things to Buy",
        value: "things_to_buy",
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
            "Personal admin items like purchases, reminders, and household tasks.",
        name: "Life Admin",
        value: "life_admin",
    },
] as const satisfies readonly CollectionTemplateOption[];

type CollectionTemplateValue =
    (typeof COLLECTION_TEMPLATE_OPTIONS)[number]["value"];

const COLLECTION_PRIORITY_ORDER: Record<CollectionPriority, number> = {
    archive: 3,
    none: 4,
    peripheral: 2,
    relevant: 1,
    very_relevant: 0,
};

// #endregion Constants

// #region Local stores/context

const { useStore: useCollectionsListStateStore } = createStore({
    isCollectionsListOpen: storage(false),
});

export const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
    collectionTextMatchQuery: storage(""),
});

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

function useCollectionsListOpenState() {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListStateStore();

    return [isCollectionsListOpen, setIsCollectionsListOpen] as const;
}

function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
}

function useCollectionItemHotkey(
    keys: Parameters<typeof useHotkeys>[0],
    onTrigger: () => void,
    enabled = true
) {
    const { isHovered } = useCollectionsListItemContext();
    const handleTrigger = useStableCallback(onTrigger);

    useHotkeys(
        keys,
        handleTrigger,
        {
            enabled: isHovered && enabled,
            preventDefault: true,
        },
        [enabled, handleTrigger, isHovered]
    );
}

function useControllableOpenState(
    open?: boolean | undefined,
    onOpenChange?: (open: boolean) => void
) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : uncontrolledOpen;

    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            if (!isControlled) {
                setUncontrolledOpen(nextOpen);
            }
            onOpenChange?.(nextOpen);
        },
        [isControlled, onOpenChange]
    );

    return [resolvedOpen, setOpen] as const;
}

function useCollectionItemPreviewIndex(
    isOpen: boolean,
    thumbnailCount: number
) {
    const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
    const hasMultipleThumbnails = thumbnailCount > 1;

    React.useEffect(() => {
        if (!(isOpen && hasMultipleThumbnails)) {
            setActivePreviewIndex(0);
            return;
        }

        const previewIntervalId = setInterval(() => {
            setActivePreviewIndex(
                (currentIndex) => (currentIndex + 1) % thumbnailCount
            );
        }, COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS);

        return () => {
            clearInterval(previewIntervalId);
        };
    }, [hasMultipleThumbnails, isOpen, thumbnailCount]);

    return activePreviewIndex;
}

// #endregion Local stores/context

// #region Pure helpers

function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_OPTION_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY_OPTION;
}

function getCollectionsListItemStyle(name: string, isSelected: boolean) {
    const assignedColor = getHexColorFromName(name);
    const backgroundOpacity = isSelected ? 15 : 10;
    return {
        "--collection-background": `color-mix(in srgb, ${assignedColor} ${backgroundOpacity}%, transparent)`,
        "--focus-ring-color": `color-mix(in srgb, ${assignedColor}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${assignedColor} 16%, black 18%)`,
    } as React.CSSProperties;
}

function compareCollectionNames<
    T extends Pick<SortableCollectionSummary, "name">,
>(a: T, b: T) {
    return NAME_COLLATOR.compare(a.name, b.name);
}

function compareCollectionPriorities<
    T extends Pick<SortableCollectionSummary, "name" | "priority">,
>(a: T, b: T) {
    const priorityDifference =
        COLLECTION_PRIORITY_ORDER[a.priority] -
        COLLECTION_PRIORITY_ORDER[b.priority];

    if (priorityDifference !== 0) {
        return priorityDifference;
    }

    return compareCollectionNames(a, b);
}

function compareCollectionCreatedAt<
    T extends Pick<SortableCollectionSummary, "createdAt">,
>(a: T, b: T) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareCollectionUpdatedAt<
    T extends Pick<SortableCollectionSummary, "updatedAt">,
>(a: T, b: T) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function compareCollectionItemCount<
    T extends Pick<SortableCollectionSummary, "itemCount">,
>(a: T, b: T) {
    return b.itemCount - a.itemCount;
}

function collectionTextMatchScore(
    collection: Pick<SortableCollectionSummary, "name">,
    query: string
) {
    const normalizedName = collection.name.trim().toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
        return 0;
    }

    if (normalizedName === normalizedQuery) {
        return 3;
    }

    if (normalizedName.startsWith(normalizedQuery)) {
        return 2;
    }

    if (normalizedName.includes(normalizedQuery)) {
        return 1;
    }

    return 0;
}

function compareCollectionTextMatch(
    query: string
): (a: SortableCollectionSummary, b: SortableCollectionSummary) => number {
    return (a, b) =>
        collectionTextMatchScore(b, query) -
            collectionTextMatchScore(a, query) ||
        NAME_COLLATOR.compare(a.name, b.name);
}

const COLLECTION_SUMMARY_SORTERS = {
    count: compareCollectionItemCount,
    created: compareCollectionCreatedAt,
    priority: compareCollectionPriorities,
    updated: compareCollectionUpdatedAt,
} satisfies Record<
    Exclude<CollectionSortField, "text-match">,
    (a: SortableCollectionSummary, b: SortableCollectionSummary) => number
>;

function sortCollectionList<T>(
    collections: readonly T[],
    compare: (a: T, b: T) => number
) {
    return [...collections].sort(compare);
}

export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: readonly T[]): T[] {
    return sortCollectionList(collections, compareCollectionPriorities);
}

export function sortCollectionSummaries<T extends SortableCollectionSummary>(
    collections: readonly T[],
    sortField: CollectionSortField,
    textMatchQuery = ""
): T[] {
    if (sortField === "text-match") {
        return sortCollectionList(
            collections,
            compareCollectionTextMatch(textMatchQuery)
        );
    }
    return sortCollectionList(
        collections,
        COLLECTION_SUMMARY_SORTERS[sortField]
    );
}

function toCollectionTag({
    createdAt,
    description,
    id,
    name,
    priority,
    sharedAt,
    shareId,
    updatedAt,
}: LibraryCollectionTag): LibraryCollectionTag {
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

function updateCollectionById<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    getNextCollection: (collection: T) => T
): T[] {
    return collections.map((collection) =>
        collection.id === collectionId
            ? getNextCollection(collection)
            : collection
    );
}

function updateItemCollectionTags(
    items: LibraryItemWithCollections[],
    getNextCollections: (
        collections: LibraryCollectionTag[]
    ) => LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: getNextCollections(item.collections),
    }));
}

function replaceCollectionShareState<T extends LibraryCollectionTag>(
    collections: T[],
    nextCollection: CollectionShareState
): T[] {
    return sortCollections(
        updateCollectionById(collections, nextCollection.id, (collection) => ({
            ...collection,
            sharedAt: nextCollection.sharedAt,
            shareId: nextCollection.shareId,
            updatedAt: nextCollection.updatedAt,
        }))
    );
}

function replaceCollectionPriority<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    priority: CollectionPriority
): T[] {
    return updateCollectionById(collections, collectionId, (collection) => ({
        ...collection,
        priority,
    }));
}

function replaceCollectionName<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    name: string
): T[] {
    return sortCollections(
        updateCollectionById(collections, collectionId, (collection) => ({
            ...collection,
            name,
        }))
    );
}

function replaceItemsCollectionName(
    items: LibraryItemWithCollections[],
    collectionId: string,
    name: string
): LibraryItemWithCollections[] {
    return updateItemCollectionTags(items, (collections) =>
        replaceCollectionName(collections, collectionId, name)
    );
}

function appendCollectionToItems(
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

function getCollectionItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function escapeCsvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function buildCollectionCsv(
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

    return [COLLECTION_CSV_HEADERS, ...rows]
        .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
        .join("\n");
}

function collectionExportFileName(name: string): string {
    const slug = name
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");

    return slug.length > 0 ? `${slug}-links` : "collection-links";
}

function normalizeCollectionName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

function getCreateCollectionAssignedItemIds(
    result: Extract<CollectionCreateResult, { status: "CREATED" }>
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

// #endregion Pure helpers

// #region Safe action adapters

async function createCollectionSafely(
    input: Parameters<typeof createCollection>[0]
): Promise<CollectionCreateResult> {
    try {
        return await createCollection(input);
    } catch {
        return {
            message: CREATE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function deleteCollectionSafely(
    input: Parameters<typeof deleteCollection>[0]
): Promise<CollectionDeleteResult> {
    try {
        return await deleteCollection(input);
    } catch {
        return {
            message: DELETE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function duplicateCollectionSafely(
    input: Parameters<typeof duplicateCollection>[0]
): Promise<CollectionDuplicateResult> {
    try {
        return await duplicateCollection(input);
    } catch {
        return {
            message: DUPLICATE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function renameCollectionSafely(
    input: Parameters<typeof renameCollection>[0]
): Promise<CollectionRenameResult> {
    try {
        return await renameCollection(input);
    } catch {
        return {
            message: RENAME_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function updateCollectionPrioritySafely(
    input: Parameters<typeof updateCollectionPriority>[0]
): Promise<CollectionPriorityUpdateResult> {
    try {
        return await updateCollectionPriority(input);
    } catch {
        return {
            message: UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function shareCollectionPubliclySafely(
    input: Parameters<typeof shareCollectionPublicly>[0]
): Promise<CollectionPublicShareResult> {
    try {
        return await shareCollectionPublicly(input);
    } catch {
        return {
            message: SHARE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function disableCollectionSharingSafely(
    input: Parameters<typeof disableCollectionSharing>[0]
): Promise<CollectionPublicShareDisableResult> {
    try {
        return await disableCollectionSharing(input);
    } catch {
        return {
            message: STOP_SHARING_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

// #endregion Safe action adapters

// #region Headless/compound list parts

function CollectionComboboxOptionRow({
    icon: Icon,
    label,
}: {
    icon: CollectionOptionIcon;
    label: string;
}) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
                <Icon className="size-4 text-muted-foreground" />
                <span className="truncate">{label}</span>
            </span>
        </div>
    );
}

function CollectionsListPreviewImageFallback() {
    return (
        <div className="flex size-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
            No preview image
        </div>
    );
}

function CollectionsListItemPreviewImage({
    alt,
    src,
}: {
    alt: string;
    src?: string;
}) {
    if (!src) {
        return <CollectionsListPreviewImageFallback />;
    }
    return (
        <CollectionsListResolvedPreviewImage alt={alt} key={src} src={src} />
    );
}

function CollectionsListResolvedPreviewImage({
    alt,
    src,
}: {
    alt: string;
    src: string;
}) {
    const [didFail, setDidFail] = React.useState(false);

    if (didFail) {
        return <CollectionsListPreviewImageFallback />;
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Fallback swaps in when the browser cannot render the image.
        <img
            alt={alt}
            className="size-full object-cover"
            height={192}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={src}
            width={288}
        />
    );
}

function CollectionsListInlineRow({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-2 pr-0.5 pl-1",
                className
            )}
            {...props}
        />
    );
}

interface CollectionsListSharePopoverProps {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    shareUrl: string | null;
}

function CollectionsListSharePopover({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    onEnableShare,
    shareUrl,
}: CollectionsListSharePopoverProps) {
    const shareInputId = React.useId();
    const isShared = Boolean(collection.shareId);

    return (
        <MenuSub>
            <MenuSubTrigger>
                <UserRoundPlus className="size-4 text-muted-foreground" />
                Share
            </MenuSubTrigger>
            <MenuSubPopup>
                <div className="max-w-xs p-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h3 className="font-medium text-sm">
                                Share collection
                            </h3>
                            <p className="text-muted-foreground text-xs leading-snug">
                                Anyone with the link can view this collection.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border bg-muted/40 p-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-xs/5">
                                {isShared ? (
                                    <LinkIcon className="size-4" />
                                ) : (
                                    <LockKeyhole className="size-4" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">
                                    {isShared
                                        ? "Anyone with the link"
                                        : "Only you"}
                                </p>
                                <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                                    {isShared
                                        ? "Shared publicly as a read-only page."
                                        : "Create a short, unlisted read-only link for this collection."}
                                </p>
                            </div>
                        </div>
                    </div>
                    {isShared ? (
                        <div className="mt-4 space-y-3">
                            <div className="space-y-1">
                                <label
                                    className="font-medium text-muted-foreground text-xs"
                                    htmlFor={shareInputId}
                                >
                                    Public link
                                </label>
                                <Input
                                    id={shareInputId}
                                    readOnly
                                    size="sm"
                                    value={shareUrl ?? ""}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-muted-foreground text-xs">
                                    Shared{" "}
                                    {collection.sharedAt
                                        ? dayjs(collection.sharedAt).fromNow()
                                        : "just now"}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        loading={isSharePending}
                                        onClick={onDisableShare}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        Disable
                                    </Button>
                                    <Button
                                        disabled={!shareUrl || isSharePending}
                                        onClick={onCopyShareLink}
                                        size="sm"
                                    >
                                        <CopyIcon className="size-4" />
                                        Copy link
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                Public links stay simple and read-only so your
                                collection can be browsed without signing in.
                            </p>
                            <Button
                                loading={isSharePending}
                                onClick={onEnableShare}
                                size="sm"
                            >
                                Create link
                            </Button>
                        </div>
                    )}
                </div>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionsListExportMenuProps {
    hasItems: boolean;
    onCopyLinks: () => void;
    onCopyTitle: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
}

function CollectionsListExportMenu({
    hasItems,
    onCopyLinks,
    onCopyTitle,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
}: CollectionsListExportMenuProps) {
    return (
        <MenuSub>
            <MenuSubTrigger>
                <Forward className="inline-block size-4 text-muted-foreground" />
                Export
            </MenuSubTrigger>
            <MenuSubPopup>
                <MenuItem onClick={onCopyTitle}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy title
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onCopyLinks}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onOpenLinks}>
                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                    Open all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onExportCsv}>
                    <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                    Export to CSV
                </MenuItem>
                <MenuItem onClick={onMakeCopy}>
                    <CopyPlus className="size-4 text-muted-foreground" />
                    Make a copy
                </MenuItem>
                <MenuItem disabled={!hasItems}>
                    <NotionIcon />
                    Send to Notion
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

function CollectionsList({
    onOpenChange,
    open,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const state = useCollectionsListOpenState();
    const [isOpen, handleOpenChange] = useListPanelOpenState({
        hotkey: "mod+c",
        onOpenChange,
        open,
        state,
    });

    return (
        <Collapsible onOpenChange={handleOpenChange} open={isOpen} {...props} />
    );
}

interface CollectionsListTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    collectionLabels: string[];
}

function CollectionsListTrigger({
    collectionLabels,
    ...props
}: CollectionsListTriggerProps) {
    const [isOpen] = useCollectionsListOpenState();
    const collectionLabelsText =
        collectionLabels.length > 0
            ? collectionLabels.join(", ")
            : "No collections yet";

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        render={<SidebarItem />}
                        title={isOpen ? "Collapse group" : "Expand group"}
                        {...props}
                    />
                }
            />
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="wrap-break-word w-full whitespace-normal font-medium leading-tight">
                    {collectionLabelsText}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

function CollectionsListPanel({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePanel>) {
    return <CollapsiblePanel className={cn("pl-1", className)} {...props} />;
}

interface CollectionsListItemPreviewProps
    extends React.ComponentProps<typeof PreviewCardTrigger> {
    thumbnails: readonly string[];
}

function CollectionsListItemPreview({
    onClick: onClickProp,
    thumbnails,
    ...props
}: CollectionsListItemPreviewProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const activePreviewIndex = useCollectionItemPreviewIndex(
        isOpen,
        thumbnails.length
    );
    const onClick = useStableCallback(onClickProp);

    return (
        <PreviewCard onOpenChange={setIsOpen}>
            <PreviewCardTrigger
                closeDelay={0}
                onClick={(event) => {
                    onClick?.(event);
                    setIsOpen(false);
                }}
                render={
                    <Button
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-9.5 text-left focus-visible:ring-(--focus-ring-color) focus-visible:ring-2"
                        variant="ghost"
                    />
                }
                {...props}
            />
            <PreviewCardPopup
                className="pointer-events-none aspect-3/2 p-0"
                positionMethod="fixed"
                side="right"
            >
                <CollectionsListItemPreviewImage
                    alt={`${collection.name} preview`}
                    src={thumbnails[activePreviewIndex]}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListItemValue() {
    const { collection } = useCollectionsListItemContext();
    const sourceLabels =
        collection.sources.length > 0
            ? collection.sources.map(getSourceLabel).join(", ")
            : null;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span
                className="max-w-full shrink-0 truncate font-medium text-sm"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {sourceLabels ? (
                <span className="max-w-full flex-1 truncate text-[11px] text-muted-foreground opacity-0 group-hover:opacity-80">
                    {sourceLabels}
                </span>
            ) : null}
        </div>
    );
}

interface CollectionsListItemPriorityComboboxProps {
    onValueChange: (priority: CollectionPriority) => void;
}

function CollectionsListItemPriorityCombobox({
    onValueChange,
}: CollectionsListItemPriorityComboboxProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = useControllableOpenState();
    const selectedOption = getPriorityOption(collection.priority);
    const SelectedPriorityIcon = selectedOption.icon;

    useCollectionItemHotkey(
        "p",
        () => {
            setIsOpen(true);
        },
        !isOpen
    );

    return (
        <Combobox
            autoHighlight
            items={PRIORITY_OPTIONS}
            onOpenChange={setIsOpen}
            onValueChange={(nextPriority) => {
                if (!nextPriority || nextPriority === collection.priority) {
                    return;
                }
                onValueChange(nextPriority);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Change priority for ${collection.name}`}
                        className="absolute top-1/2 left-1 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--focus-ring-color)"
                        size="icon-xs"
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
                                <CollectionComboboxOptionRow
                                    icon={priorityOption.icon}
                                    label={priorityOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
                <div className="flex max-w-xs gap-2 px-3 py-2">
                    <Info className="inline-block size-3.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                        Tell Cache what to keep detailed, summarize lightly, or
                        leave out when turning saved content into useful notes.
                    </p>
                </div>
            </ComboboxPopup>
        </Combobox>
    );
}

interface CollectionsListItemProps extends React.ComponentProps<"div"> {
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}

function CollectionsListItem({
    className,
    collection,
    isSelected,
    onMouseEnter,
    onMouseLeave,
    style: styleProp,
    ...props
}: CollectionsListItemProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const style = getCollectionsListItemStyle(collection.name, isSelected);

    return (
        <CollectionsListItemContext value={{ collection, isHovered }}>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover tracking scopes collection-level keyboard shortcuts. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Same as above. */}
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

interface CollectionsListItemMetaProps {
    isSharePending: boolean;
    onCopyLinks: () => void;
    onCopyShareLink: () => void;
    onCopyTitle: () => void;
    onDelete: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
    onRename: () => void;
    shareUrl: string | null;
}

function CollectionsListItemMeta({
    isSharePending,
    onCopyLinks,
    onCopyShareLink,
    onCopyTitle,
    onDelete,
    onDisableShare,
    onEnableShare,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
    onRename,
    shareUrl,
}: CollectionsListItemMetaProps) {
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    useCollectionItemHotkey("e", onRename);
    useCollectionItemHotkey(["delete", "backspace"], onDelete);
    useCollectionItemHotkey("c", onCopyLinks, hasItems);

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {COMPACT_NUMBER_FORMATTER.format(collection.itemCount)}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            className="absolute opacity-0 hover:bg-transparent focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
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
                        <MenuGroupLabel>Collection</MenuGroupLabel>
                        <MenuItem onClick={onRename}>
                            <PencilIcon className="size-4 text-muted-foreground" />
                            Rename
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionsListSharePopover
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            onEnableShare={onEnableShare}
                            shareUrl={shareUrl}
                        />
                        <CollectionsListExportMenu
                            hasItems={hasItems}
                            onCopyLinks={onCopyLinks}
                            onCopyTitle={onCopyTitle}
                            onExportCsv={onExportCsv}
                            onMakeCopy={onMakeCopy}
                            onOpenLinks={onOpenLinks}
                        />
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem onClick={onDelete} variant="destructive">
                            <Trash2Icon className="size-4" />
                            Delete
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <p className="text-nowrap p-2 text-[10px] text-muted-foreground leading-none">
                        Last updated {dayjs(collection.updatedAt).fromNow()}
                    </p>
                </MenuPopup>
            </Menu>
        </div>
    );
}

interface CollectionsListStatusProps extends React.ComponentProps<"p"> {
    onDismiss: () => void;
    tone?: CollectionsListStatusTone;
}

function CollectionsListStatus({
    className,
    onDismiss,
    tone = "success",
    ...props
}: CollectionsListStatusProps) {
    if (!props.children) {
        return null;
    }

    return (
        <CollectionsListInlineRow className="pt-1">
            <p
                aria-live="polite"
                className={cn(
                    "text-xs leading-tight",
                    tone === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    className
                )}
                role={tone === "error" ? "alert" : "status"}
                {...props}
            />
            <Button onClick={onDismiss} size="xs" variant="ghost">
                Dismiss
            </Button>
        </CollectionsListInlineRow>
    );
}

interface CollectionsListFilterClearProps
    extends React.ComponentProps<typeof Button> {
    isVisible: boolean;
}

function CollectionsListFilterClearIcon({
    isVisible,
    ...props
}: CollectionsListFilterClearProps) {
    if (!isVisible) {
        return null;
    }

    return (
        <Button
            aria-label="Clear selected collections"
            size="icon-xs"
            variant="ghost"
            {...props}
        >
            <X
                aria-hidden
                className="inline-block size-3.5 shrink-0"
                focusable="false"
            />
        </Button>
    );
}

function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <p
                className={cn(
                    "font-medium text-foreground text-sm leading-tight",
                    className
                )}
                {...props}
            />
        </div>
    );
}

function CollectionsListToolbar({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            className={cn(
                "flex w-full items-center justify-between",
                className
            )}
            {...props}
        />
    );
}

function CollectionsListToolbarGroup({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Group>) {
    return (
        <Toolbar.Group
            className={cn("flex items-center justify-end gap-1", className)}
            {...props}
        />
    );
}

function CollectionsListToolbarButton({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Button>) {
    return (
        <Toolbar.Button
            className={cn("opacity-80 hover:opacity-100", className)}
            {...props}
        />
    );
}

function CollectionsListNoticeCallout() {
    return (
        <Popover>
            <span aria-live="polite" className="sr-only" role="status">
                Smart Collections is active
            </span>
            <PopoverTrigger
                className="group not-sr-only flex items-center text-nowrap px-1.5 pt-1 pb-1.5 font-medium text-[11px] opacity-70"
                openOnHover
            >
                <Component className="mr-1.5 mb-px inline-block size-3 shrink-0" />
                <GradientWaveText
                    ariaLabel="Smart Collections"
                    className="w-fit underline decoration-muted-foreground/20 decoration-dotted underline-offset-2"
                    speed={2.2}
                >
                    Smart Collections
                </GradientWaveText>
                &nbsp;is active{" "}
                <ChevronDownFilledIcon className="mb-px size-4 rotate-90 group-data-popup-open:opacity-10!" />
            </PopoverTrigger>
            <PopoverPopup align="start" positionMethod="fixed">
                <Image
                    alt=""
                    aria-hidden
                    className="-mx-(--viewport-inline-padding) -mt-4 aspect-32/9 h-auto max-h-24 w-(--positioner-width) min-w-0 max-w-(--positioner-width) rounded-t-lg"
                    loading="eager"
                    priority
                    src={SmartCollectionsBackgroundImg}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle className="font-medium text-sm">
                        Let Cache do the organizing
                    </PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs">
                        As you add new entries, Cache AI groups your related
                        saves into contextual collections intuitively. Cache
                        also learns your preferences with time.
                    </PopoverDescription>
                    <div className="ml-auto flex items-center justify-end gap-2">
                        <Button size="xs" variant="ghost">
                            Activity
                            <ArrowUpRight className="inline-block size-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                        <Button size="xs" variant="destructive-outline">
                            Disable
                        </Button>
                    </div>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

function CollectionsListSortingCombobox(
    props: React.ComponentProps<typeof ComboboxTrigger>
) {
    const [isCollectionsListOpen] = useCollectionsListOpenState();
    const {
        collectionSortField,
        collectionTextMatchQuery,
        setCollectionSortField,
        setCollectionTextMatchQuery,
    } = useCollectionsSortStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const normalizedInputValue = inputValue.trim().toLowerCase();
    const matchingSortingOptions = SORTING_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedInputValue)
    );
    const textMatchOption =
        normalizedInputValue.length > 0 && matchingSortingOptions.length === 0
            ? ({
                  icon: ListFilter,
                  label: `Sort by "${inputValue.trim()}"`,
                  query: inputValue.trim(),
                  value: "text-match",
              } satisfies SortingComboboxOption)
            : null;
    const sortingOptions: SortingComboboxOption[] = textMatchOption
        ? [textMatchOption]
        : matchingSortingOptions;

    useHotkeys(
        "mod+f",
        (event) => {
            event.preventDefault();
            setIsOpen(true);
        },
        {
            enabled: isCollectionsListOpen && !isOpen,
        },
        [isCollectionsListOpen, isOpen]
    );

    return (
        <Combobox<SortingComboboxOption>
            autoHighlight
            filter={null}
            inputValue={inputValue}
            items={sortingOptions}
            itemToStringLabel={(option) =>
                option.value === "text-match"
                    ? option.query
                    : (SORTING_OPTION_BY_VALUE.get(option.value)?.label ?? "")
            }
            itemToStringValue={(option) => option.value}
            onInputValueChange={setInputValue}
            onOpenChange={setIsOpen}
            onValueChange={(nextOption) => {
                if (!nextOption) {
                    return;
                }

                if (nextOption.value === "text-match") {
                    if (nextOption.query === collectionTextMatchQuery) {
                        setIsOpen(false);
                        return;
                    }

                    setCollectionTextMatchQuery(nextOption.query);
                    setCollectionSortField(nextOption.value);
                    setInputValue("");
                    setIsOpen(false);
                    return;
                }

                if (nextOption.value === collectionSortField) {
                    setIsOpen(false);
                    return;
                }

                setCollectionSortField(nextOption.value);
                setInputValue("");
                setIsOpen(false);
            }}
            open={isOpen}
            value={
                collectionSortField === "text-match"
                    ? {
                          icon: ListFilter,
                          label: `Search by "${collectionTextMatchQuery}"`,
                          query: collectionTextMatchQuery,
                          value: "text-match",
                      }
                    : SORTING_OPTION_BY_VALUE.get(collectionSortField)
            }
        >
            <ComboboxTrigger
                render={<Button size="icon-xs" variant="ghost" />}
                title="Sort and organize collections"
                {...props}
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
                            <CtrlKbd />F
                        </Kbd>
                    }
                    placeholder="Sort by..."
                />
                <ComboboxList>
                    <ComboboxCollection>
                        {(sortOption: SortingComboboxOption) => (
                            <ComboboxItem
                                key={sortOption.value}
                                showIndicatorLast
                                value={sortOption}
                            >
                                <CollectionComboboxOptionRow
                                    icon={sortOption.icon}
                                    label={sortOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

// #endregion Headless/compound list parts

// #region Workspace-bound feature component

export function CollectionsListRoot() {
    const [isCollectionsListOpen] = useCollectionsListOpenState();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [createDialogDraftName, setCreateDialogDraftName] =
        React.useState("");
    const [createDialogDraftDescription, setCreateDialogDraftDescription] =
        React.useState("");
    const [createDialogAssignItemId, setCreateDialogAssignItemId] =
        React.useState<string | null>(null);

    const [renameDialogDraftName, setRenameDialogDraft] = React.useState("");

    const [createDialogErrorMessage, setCreateDialogErrorMessage] =
        React.useState<string | null>(null);
    const [renameDialogErrorMessage, setRenameDialogErrorMessage] =
        React.useState<string | null>(null);

    const [pendingRenameCollection, setPendingRenameCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [pendingDeleteCollection, setPendingDeleteCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [pendingShareCollectionId, setPendingShareCollectionId] =
        React.useState<string | null>(null);

    const [collectionActionFeedback, setCollectionActionFeedback] =
        React.useState<CollectionActionFeedback | null>(null);

    const [isCreatePending, startCreateTransition] = React.useTransition();
    const [isRenamePending, startRenameTransition] = React.useTransition();
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const [isSharePending, startShareTransition] = React.useTransition();
    const [, startDuplicateTransition] = React.useTransition();

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

    const showCollectionActionError = (message: string) => {
        setCollectionActionFeedback({ message, tone: "error" });
    };

    const showCollectionActionSuccess = (message: string) => {
        setCollectionActionFeedback({ message, tone: "success" });
    };

    const checkCollectionHasHiddenItems = (
        collection: LibraryCollectionSummary
    ) =>
        !hasAccess &&
        (itemsByCollectionId.get(collection.id)?.length ?? 0) <
            collection.itemCount;

    const ensureCollectionActionAccess = (
        collection: LibraryCollectionSummary,
        actionLabel: string
    ) => {
        if (!checkCollectionHasHiddenItems(collection)) {
            return true;
        }
        showCollectionActionError(
            `Upgrade to ${actionLabel} every item in ${collection.name}.`
        );
        return false;
    };

    const resetCreateDialog = () => {
        setCreateDialogDraftName("");
        setCreateDialogDraftDescription("");
        setCreateDialogErrorMessage(null);
        setCreateDialogAssignItemId(null);
    };

    const resetRenameDialog = () => {
        setPendingRenameCollection(null);
        setRenameDialogDraft("");
        setRenameDialogErrorMessage(null);
    };

    const syncCollectionShareState = (nextCollection: CollectionShareState) => {
        setCollections((current) =>
            replaceCollectionShareState(current, nextCollection)
        );
        setItems((current) =>
            updateItemCollectionTags(current, (collections) =>
                replaceCollectionShareState(collections, nextCollection)
            )
        );
    };

    const syncCollectionPriority = (
        collectionId: string,
        priority: CollectionPriority
    ) => {
        setCollections((current) =>
            replaceCollectionPriority(current, collectionId, priority)
        );
        setItems((current) =>
            updateItemCollectionTags(current, (collections) =>
                replaceCollectionPriority(collections, collectionId, priority)
            )
        );
    };

    const syncCreatedCollection = (input: SyncCreatedCollectionInput) => {
        setCollections((current) =>
            mergeCollectionSummaries(current, [input.collection])
        );

        if (input.assignedItemIds.length === 0) {
            return;
        }

        const collectionTag = toCollectionTag(input.collection);
        setItems((current) =>
            appendCollectionToItems(
                current,
                input.assignedItemIds,
                collectionTag
            )
        );
    };

    const handleCreateDialogOpenChange = (open: boolean) => {
        if (!(open || isCreatePending)) {
            resetCreateDialog();
        }
        setIsCreateDialogOpen(open);
    };

    const handleCreateCollectionRequest = (itemId?: string) => {
        setCreateDialogAssignItemId(itemId ?? null);
        setCreateDialogDraftName("");
        setCreateDialogDraftDescription("");
        setCreateDialogErrorMessage(null);
        setIsCreateDialogOpen(true);
    };

    useHotkeys(
        "mod+n",
        () => {
            if (isCreateDialogOpen) {
                setIsCreateDialogOpen(false);
            } else {
                handleCreateCollectionRequest();
            }
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [isCreateDialogOpen]
    );

    const handleRequestDeleteCollection = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingDeleteCollection(collection);
    };

    const handleRequestRenameCollection = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setRenameDialogDraft(collection.name);
        setRenameDialogErrorMessage(null);
        setPendingRenameCollection(collection);
    };

    const handleRenameDialogOpenChange = (open: boolean) => {
        if (!(open || isRenamePending)) {
            resetRenameDialog();
        }
    };

    const handleDeleteCollectionDialogOpenChange = (open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDeleteCollection(null);
        }
    };

    const handleCopyCollectionLinks = (
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "copy")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        if (copyToClipboard(urls.join("\n"))) {
            showCollectionActionSuccess(
                `Links from ${collection.name} copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError("We couldn't copy these links right now.");
    };

    const handleCopyCollectionTitle = (
        collection: LibraryCollectionSummary
    ) => {
        if (copyToClipboard(collection.name)) {
            showCollectionActionSuccess(
                `${collection.name} title copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError(
            "We couldn't copy this collection title right now."
        );
    };

    const handleCopyCollectionShareLink = (
        collection: LibraryCollectionSummary
    ) => {
        if (!collection.shareId) {
            showCollectionActionError(
                "Create a public link before trying to copy it."
            );
            return;
        }

        const shareUrl = buildPublicCollectionShareUrl(collection.shareId);

        if (copyToClipboard(shareUrl)) {
            showCollectionActionSuccess(
                `Public link for ${collection.name} copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError(
            "We couldn't copy this public link right now."
        );
    };

    const handleEnableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status !== "SHARED") {
                showCollectionActionError(result.message);
                setPendingShareCollectionId(null);
                return;
            }

            syncCollectionShareState(result.collection);
            setPendingShareCollectionId(null);
            showCollectionActionSuccess(
                copyToClipboard(result.shareUrl)
                    ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                    : `${collection.name} is now publicly shared.`
            );
        });
    };

    const handleDisableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            const result = await disableCollectionSharingSafely({
                collectionId: collection.id,
            });

            if (result.status !== "DISABLED") {
                showCollectionActionError(result.message);
                setPendingShareCollectionId(null);
                return;
            }

            syncCollectionShareState(result.collection);
            setPendingShareCollectionId(null);
            showCollectionActionSuccess(
                `${collection.name} is no longer publicly shared.`
            );
        });
    };

    const handleOpenCollectionLinks = (
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "open")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        showCollectionActionSuccess(
            `Opening ${urls.length} link${urls.length === 1 ? "" : "s"} from ${collection.name}.`
        );

        for (const url of urls) {
            openSavedItemInNewTab(url);
        }
    };

    const handleExportCollectionToCsv = (
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "export")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];

        if (collectionItems.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        React.startTransition(async () => {
            try {
                await saveFile(
                    new Blob(
                        [buildCollectionCsv(collection, collectionItems)],
                        {
                            type: COLLECTION_CSV_CONTENT_TYPE,
                        }
                    ),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: collectionExportFileName(collection.name),
                    }
                );

                showCollectionActionSuccess(
                    `${collection.name} exported as CSV.`
                );
            } catch {
                showCollectionActionError(
                    "We couldn't export this collection right now."
                );
            }
        });
    };

    const handleConfirmDeleteCollection = () => {
        const targetCollection = pendingDeleteCollection;
        if (!targetCollection) {
            return;
        }

        startDeleteTransition(async () => {
            const result = await deleteCollectionSafely({
                collectionId: targetCollection.id,
            });

            if (result.status !== "DELETED") {
                showCollectionActionError(result.message);
                return;
            }

            setCollections((current) =>
                current.filter(
                    (collection) => collection.id !== result.collection.id
                )
            );
            setItems((current) =>
                updateItemCollectionTags(current, (collections) =>
                    collections.filter(
                        (collection) => collection.id !== result.collection.id
                    )
                )
            );
            setPendingDeleteCollection(null);
            showCollectionActionSuccess(`${result.collection.name} deleted.`);
        });
    };

    const handleUpdateCollectionPriority = (
        collectionId: string,
        priority: CollectionPriority
    ) => {
        const previousPriority = collections.find(
            (collection) => collection.id === collectionId
        )?.priority;

        if (!previousPriority || previousPriority === priority) {
            return;
        }

        syncCollectionPriority(collectionId, priority);

        const runUpdate = async () => {
            const result = await updateCollectionPrioritySafely({
                collectionId,
                priority,
            });

            if (result.status === "UPDATED") {
                syncCollectionPriority(
                    result.collection.id,
                    result.collection.priority
                );
            } else {
                syncCollectionPriority(collectionId, previousPriority);
                showCollectionActionError(result.message);
            }
        };

        runUpdate().catch(() => {
            syncCollectionPriority(collectionId, previousPriority);
            showCollectionActionError(UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE);
        });
    };

    const handleRenameCollectionSubmit = () => {
        const targetCollection = pendingRenameCollection;
        if (!targetCollection) {
            return;
        }

        const previousName = targetCollection.name;
        const nextName = normalizeCollectionName(renameDialogDraftName);

        if (nextName.length === 0) {
            setRenameDialogErrorMessage("Enter a collection name.");
            return;
        }

        if (nextName === previousName) {
            resetRenameDialog();
            return;
        }

        setCollections((current) =>
            replaceCollectionName(current, targetCollection.id, nextName)
        );
        setItems((current) =>
            replaceItemsCollectionName(current, targetCollection.id, nextName)
        );

        startRenameTransition(async () => {
            const result = await renameCollectionSafely({
                collectionId: targetCollection.id,
                name: nextName,
            });

            if (result.status === "UPDATED") {
                setCollections((current) =>
                    replaceCollectionName(
                        current,
                        result.collection.id,
                        result.collection.name
                    )
                );
                setItems((current) =>
                    replaceItemsCollectionName(
                        current,
                        result.collection.id,
                        result.collection.name
                    )
                );
                resetRenameDialog();
                showCollectionActionSuccess(
                    `${result.collection.name} renamed.`
                );
                return;
            }

            setCollections((current) =>
                replaceCollectionName(
                    current,
                    targetCollection.id,
                    previousName
                )
            );
            setItems((current) =>
                replaceItemsCollectionName(
                    current,
                    targetCollection.id,
                    previousName
                )
            );
            setRenameDialogErrorMessage(result.message);
        });
    };

    const handleDuplicateCollection = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);

        startDuplicateTransition(async () => {
            const result = await duplicateCollectionSafely({
                collectionId: collection.id,
            });

            if (result.status !== "CREATED") {
                showCollectionActionError(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: result.assignedItemIds,
                collection: result.collection,
            });
            showCollectionActionSuccess(
                `${collection.name} copied as ${result.collection.name}.`
            );
        });
    };

    const handleCreateCollectionSubmit = () => {
        startCreateTransition(async () => {
            const result = await createCollectionSafely({
                assignToItemId: createDialogAssignItemId ?? undefined,
                description: createDialogDraftDescription || undefined,
                name: createDialogDraftName,
            });

            if (result.status !== "CREATED") {
                setCreateDialogErrorMessage(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: getCreateCollectionAssignedItemIds(result),
                collection: result.collection,
            });
            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

    const handleCreateTemplateCollection = (
        templateValue: CollectionTemplateValue | null
    ) => {
        if (!templateValue) {
            return;
        }

        const selectedTemplate = COLLECTION_TEMPLATE_OPTIONS.find(
            (template) => template.value === templateValue
        );
        if (!selectedTemplate) {
            return;
        }

        setCreateDialogErrorMessage(null);

        startCreateTransition(async () => {
            const result = await createCollectionSafely({
                assignToItemId: createDialogAssignItemId ?? undefined,
                description: selectedTemplate.description,
                name: selectedTemplate.name,
            });

            if (result.status !== "CREATED") {
                setCreateDialogErrorMessage(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: getCreateCollectionAssignedItemIds(result),
                collection: result.collection,
            });
            showCollectionActionSuccess(
                `${result.collection.name} created from template.`
            );
            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

    const handleCreateDialogDraftChange = (draft: string) => {
        setCreateDialogDraftName(draft);
        if (createDialogErrorMessage) {
            setCreateDialogErrorMessage(null);
        }
    };

    const handleCreateDialogDescriptionDraftChange = (draft: string) => {
        setCreateDialogDraftDescription(draft);
    };

    const handleRenameDialogDraftChange = (draft: string) => {
        setRenameDialogDraft(draft);
        if (renameDialogErrorMessage) {
            setRenameDialogErrorMessage(null);
        }
    };

    const hasAnySelectedCollections = selectedCollectionIds.length > 0;
    const collectionLabels = collectionSummaries.map(
        (collection) => collection.name
    );

    return (
        <>
            <CollectionsList>
                <CollectionsListToolbar>
                    <CollectionsListTrigger collectionLabels={collectionLabels}>
                        <span className="min-w-0 text-xs">My collections</span>
                        <ChevronDownFilledIcon className="-ml-0.5" />
                    </CollectionsListTrigger>
                    <CollectionsListToolbarGroup className="absolute right-2">
                        <CollectionsListToolbarButton
                            render={
                                <CollectionsListFilterClearIcon
                                    isVisible={hasAnySelectedCollections}
                                    onClick={onClearCollectionFilters}
                                />
                            }
                        />
                        {isCollectionsListOpen ? (
                            <CollectionsListToolbarButton
                                render={<CollectionsListSortingCombobox />}
                            />
                        ) : null}
                        <CollectionsListToolbarButton
                            render={
                                <Button
                                    onClick={() =>
                                        handleCreateCollectionRequest()
                                    }
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
                    <CollectionsListNoticeCallout />
                    {collectionSummaries.length === 0 ? (
                        <CollectionsListEmpty>
                            No collections found. Create your first collection
                            to start grouping saved items.
                        </CollectionsListEmpty>
                    ) : (
                        <>
                            {collectionSummaries.map((collection) => {
                                const isCollectionSelected =
                                    selectedCollectionIds.includes(
                                        collection.id
                                    );

                                return (
                                    <CollectionsListItem
                                        collection={collection}
                                        isSelected={isCollectionSelected}
                                        key={collection.id}
                                    >
                                        <CollectionsListItemPriorityCombobox
                                            onValueChange={(priority) =>
                                                handleUpdateCollectionPriority(
                                                    collection.id,
                                                    priority
                                                )
                                            }
                                        />
                                        <CollectionsListItemPreview
                                            {...(isCollectionSelected
                                                ? { "data-pressed": true }
                                                : {})}
                                            onClick={() =>
                                                onSelectCollection(
                                                    collection.id
                                                )
                                            }
                                            thumbnails={
                                                collectionPreviewThumbnailUrlsById.get(
                                                    collection.id
                                                ) ?? []
                                            }
                                        >
                                            <CollectionsListItemValue />
                                        </CollectionsListItemPreview>
                                        <CollectionsListItemMeta
                                            isSharePending={
                                                pendingShareCollectionId ===
                                                    collection.id &&
                                                isSharePending
                                            }
                                            onCopyLinks={() =>
                                                handleCopyCollectionLinks(
                                                    collection
                                                )
                                            }
                                            onCopyShareLink={() =>
                                                handleCopyCollectionShareLink(
                                                    collection
                                                )
                                            }
                                            onCopyTitle={() =>
                                                handleCopyCollectionTitle(
                                                    collection
                                                )
                                            }
                                            onDelete={() =>
                                                handleRequestDeleteCollection(
                                                    collection
                                                )
                                            }
                                            onDisableShare={() =>
                                                handleDisableCollectionShare(
                                                    collection
                                                )
                                            }
                                            onEnableShare={() =>
                                                handleEnableCollectionShare(
                                                    collection
                                                )
                                            }
                                            onExportCsv={() =>
                                                handleExportCollectionToCsv(
                                                    collection
                                                )
                                            }
                                            onMakeCopy={() =>
                                                handleDuplicateCollection(
                                                    collection
                                                )
                                            }
                                            onOpenLinks={() =>
                                                handleOpenCollectionLinks(
                                                    collection
                                                )
                                            }
                                            onRename={() =>
                                                handleRequestRenameCollection(
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
                            })}
                            <CollectionsListStatus
                                onDismiss={() =>
                                    setCollectionActionFeedback(null)
                                }
                                tone={collectionActionFeedback?.tone}
                            >
                                {collectionActionFeedback?.message}
                            </CollectionsListStatus>
                        </>
                    )}
                </CollectionsListPanel>
            </CollectionsList>
            <RenameCollectionDialog
                errorMessage={renameDialogErrorMessage}
                isOpen={pendingRenameCollection !== null}
                isPending={isRenamePending}
                nameDraft={renameDialogDraftName}
                onNameDraftChange={handleRenameDialogDraftChange}
                onOpenChange={handleRenameDialogOpenChange}
                onSubmit={handleRenameCollectionSubmit}
            />
            <CreateCollectionDialog
                descriptionDraft={createDialogDraftDescription}
                errorMessage={createDialogErrorMessage}
                isOpen={isCreateDialogOpen}
                isPending={isCreatePending}
                nameDraft={createDialogDraftName}
                onCreateFromTemplate={handleCreateTemplateCollection}
                onDescriptionDraftChange={
                    handleCreateDialogDescriptionDraftChange
                }
                onNameDraftChange={handleCreateDialogDraftChange}
                onOpenChange={handleCreateDialogOpenChange}
                onSubmit={handleCreateCollectionSubmit}
            />
            <DeleteCollectionDialog
                collection={pendingDeleteCollection}
                isPending={isDeletePending}
                onConfirm={handleConfirmDeleteCollection}
                onOpenChange={handleDeleteCollectionDialogOpenChange}
            />
        </>
    );
}

// #endregion Workspace-bound feature component

// #region Dialog subcomponents

interface RenameCollectionDialogProps {
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

function RenameCollectionDialog({
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: RenameCollectionDialogProps) {
    const inputId = React.useId();

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
                                autoFocus
                                id={inputId}
                                maxLength={COLLECTION_NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
                                required
                                type="text"
                                value={nameDraft}
                            />
                            {errorMessage ? (
                                <p className="pt-2 text-destructive text-xs">
                                    {errorMessage}
                                </p>
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

interface CreateCollectionDialogProps {
    descriptionDraft: string;
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onCreateFromTemplate: (
        templateValue: CollectionTemplateValue | null
    ) => void;
    onDescriptionDraftChange: (draft: string) => void;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

function CreateCollectionDialog({
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
}: CreateCollectionDialogProps) {
    const nameInputId = React.useId();
    const descriptionInputId = React.useId();

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
                            <ChevronRight className="inline-block size-3.5 shrink-0" />
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
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={nameInputId}
                                maxLength={COLLECTION_NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
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
                                placeholder="Add description..."
                                size="lg"
                                unstyled
                                value={descriptionDraft}
                            />
                        </div>
                        {errorMessage ? (
                            <p className="text-destructive text-xs">
                                {errorMessage}
                            </p>
                        ) : null}
                    </DialogPanel>
                    <DialogFooter>
                        <Combobox
                            autoHighlight
                            items={COLLECTION_TEMPLATE_OPTIONS}
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
                                <Shapes className="mr-0.5! size-4" />
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
                                <div className="flex gap-2 px-3 py-2">
                                    <Info className="inline-block size-3.5 shrink-0" />
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                        Cache's{" "}
                                        <strong className="font-medium">
                                            Smart Collections
                                        </strong>{" "}
                                        can automatically assign collections to
                                        entries that match with these.
                                    </p>
                                </div>
                            </ComboboxPopup>
                        </Combobox>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Create collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface DeleteCollectionDialogProps {
    collection: LibraryCollectionSummary | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

function DeleteCollectionDialog({
    collection,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteCollectionDialogProps) {
    return (
        <Dialog onOpenChange={onOpenChange} open={collection !== null}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Delete collection?</DialogTitle>
                    <DialogDescription>
                        Remove {collection?.name || "this collection"} from
                        Cache. Saved items will remain in your library, but they
                        won't belong to this collection anymore.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose
                        disabled={isPending}
                        render={<Button variant="ghost" />}
                    >
                        Cancel
                    </DialogClose>
                    <Button
                        loading={isPending}
                        onClick={onConfirm}
                        variant="destructive"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}

// #endregion Dialog subcomponents
