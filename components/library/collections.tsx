"use client";

import {
    RequestCreateRefContext,
    appendCollection,
    mergeCollectionSummaries,
    sortCollections,
    useCollectionsSortStore,
    useWorkspace,
    type CollectionSortField,
} from "@/components/library/workspace";
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
import { DisclosureList } from "@/components/ui/disclosure-list";
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
import { useSmartCollectionsPreference } from "@/hooks/use-smart-collections-preference";
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
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import { getSystemControlKey } from "@/lib/common/environment";
import { saveFile } from "@/lib/common/file";
import { filterValidImageUrls } from "@/lib/common/image";
import { createLogger } from "@/lib/common/logs/console/logger";
import { normalizeWhitespace, slugify } from "@/lib/common/strings";
import { normalizeURL, openExternal } from "@/lib/common/url";
import { dayjs } from "@/lib/dayjs";
import { getSourceLabel } from "@/lib/integrations/support";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import { Toolbar } from "@base-ui/react/toolbar";
import { useInterval } from "@base-ui/utils/useInterval";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
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
import Link from "next/link";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const LOG = createLogger("CollectionsController");

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

type CollectionOptionIcon = React.ComponentType<{ className?: string }>;

type CollectionsListStatusTone = "error" | "success";

interface CollectionFeedback {
    message: string;
    tone: CollectionsListStatusTone;
}

interface CollectionItemStyle extends React.CSSProperties {
    "--collection-background": string;
    "--focus-ring-color": string;
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

interface CollectionShareState
    extends Pick<
        LibraryCollectionTag,
        "id" | "shareId" | "sharedAt" | "updatedAt"
    > {}

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

type SortingComboboxOption =
    | SortingOption
    | {
          icon: CollectionOptionIcon;
          label: string;
          query: string;
          value: "text-match";
      };

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
] satisfies PriorityOption[];

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
        icon: Component,
        label: "Count",
        value: "count",
    },
] satisfies SortingOption[];

const SORT_OPTION_BY_VALUE = new Map(
    SORT_OPTIONS.map((option) => [option.value, option])
);

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

type TemplateValue = (typeof TEMPLATES)[number]["value"];

const { useStore: useCollectionsListStateStore } = createStore({
    isCollectionsListOpen: storage(false),
});

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

/**
 * Access the collection and hover state for the current list item.
 *
 * Must be used inside `CollectionsListItem` so compound parts can share
 * state without prop drilling.
 */
function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
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
    const slug = slugify(name);
    return slug.length > 0 ? `${slug}-links` : "collection-links";
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

/**
 * Composed workspace root that wires the controller into the
 * `CollectionsList` compound components and dialogs.
 *
 * Also registers itself with the `RequestCreateRefContext` so any parent
 * can open the create dialog imperatively via `requestCreate()`.
 */
export function Collections() {
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
                            <T>My collections</T> (
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
                            <T>
                                No collections found. Create your first
                                collection to start grouping saved items.
                            </T>
                        </CollectionsListEmpty>
                    ) : (
                        <>
                            <DisclosureList maxVisible={10}>
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

/**
 * Central controller for all collection-related UI state and side effects.
 *
 * Coordinates dialog open states, server actions, optimistic updates,
 * keyboard shortcuts, and feedback messages.
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

    const [validatedPreviewUrls, setValidatedPreviewUrls] = React.useState(
        collectionPreviewThumbnailUrlsById
    );
    const validationCacheRef = React.useRef(new Map<string, boolean>());

    React.useEffect(() => {
        let cancelled = false;
        const cache = validationCacheRef.current;

        async function validate() {
            const allUrls = new Set<string>();
            for (const urls of collectionPreviewThumbnailUrlsById.values()) {
                for (const url of urls) {
                    allUrls.add(url);
                }
            }

            if (allUrls.size === 0) {
                if (!cancelled) {
                    setValidatedPreviewUrls(new Map());
                }
                return;
            }

            const urlsToValidate: string[] = [];
            for (const url of allUrls) {
                if (!cache.has(url)) {
                    urlsToValidate.push(url);
                }
            }

            const buildValidatedMap = () => {
                const next = new Map<string, string[]>();
                for (const [id, urls] of collectionPreviewThumbnailUrlsById) {
                    const filtered = urls.filter((url) => cache.get(url));
                    if (filtered.length > 0) {
                        next.set(id, filtered);
                    }
                }
                return next;
            };

            if (urlsToValidate.length === 0) {
                if (!cancelled) {
                    setValidatedPreviewUrls(buildValidatedMap());
                }
                return;
            }

            if (!cancelled) {
                setValidatedPreviewUrls(collectionPreviewThumbnailUrlsById);
            }

            try {
                const validUrls = await filterValidImageUrls(urlsToValidate);
                for (const url of urlsToValidate) {
                    cache.set(url, validUrls.includes(url));
                }

                if (!cancelled) {
                    setValidatedPreviewUrls(buildValidatedMap());
                }
            } catch (err) {
                LOG.error("Preview URL validation failed", { error: err });
                if (!cancelled) {
                    setValidatedPreviewUrls(collectionPreviewThumbnailUrlsById);
                }
            }
        }

        validate();

        return () => {
            cancelled = true;
        };
    }, [collectionPreviewThumbnailUrlsById]);
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
        const nextName = normalizeWhitespace(renameDraft);

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
        collectionPreviewThumbnailUrlsById: validatedPreviewUrls,
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

/**
 * Register a keyboard shortcut scoped to the hovered collection item.
 *
 * Shortcuts only fire when the item is hovered so users don't trigger
 * actions on off-screen rows.
 */
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
        "--collection-background": isSelected
            ? `color-mix(in srgb, ${base}, white 3%)`
            : `color-mix(in srgb, ${base}, black 3%)`,
        "--focus-ring-color": `color-mix(in srgb, ${color}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${color} 16%, black 18%)`,
    };
}

/**
 * Build the static sort options or the dynamic text-match option from the
 * current combobox query.
 */
function getSortingComboboxOptions(
    inputValue: string
): SortingComboboxOption[] {
    const query = inputValue.trim();
    const normalizedQuery = query.toLowerCase();
    const matchingOptions = SORT_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
    );

    if (normalizedQuery.length === 0 || matchingOptions.length > 0) {
        return matchingOptions;
    }

    return [
        {
            icon: ListFilter,
            label: `Sort by "${query}"`,
            query,
            value: "text-match",
        },
    ];
}

/**
 * Convert the selected sort option back to the text shown in the combobox.
 */
function getSortingComboboxOptionLabel(option: SortingComboboxOption): string {
    return option.value === "text-match" ? option.query : option.label;
}

/**
 * Consistent row layout for combobox items that show an icon + label pair.
 */
function CollectionComboboxOptionRow({
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

/**
 * Placeholder shown when a collection has no thumbnail or every image fails
 * to load.
 */
function CollectionsListPreviewImageFallback() {
    return (
        <div className="flex size-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
            No preview available
        </div>
    );
}

/**
 * Preview image that falls back when the source is missing or fails to load.
 */
function CollectionsListItemPreviewImage({
    alt,
    src,
}: {
    alt: string;
    src?: string;
}) {
    const [didFail, setDidFail] = React.useState(false);
    const handleError = useStableCallback(() => {
        setDidFail(true);
    });

    if (!src || didFail) {
        return <CollectionsListPreviewImageFallback />;
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Fallback swaps in when the browser cannot render the image.
        <img
            alt={alt}
            className="size-full object-cover"
            height={192}
            loading="lazy"
            onError={handleError}
            src={src}
            width={288}
        />
    );
}

/**
 * Horizontal flex row used for inline status and filter lines.
 */
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

/**
 * Root wrapper for the collections list. Adds relative positioning so child
 * absolute elements (e.g. tooltips) layer correctly.
 */
function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    return <Collapsible className={cn("relative", className)} {...props} />;
}

interface CollectionsListTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    collectionLabels: readonly string[];
    isOpen: boolean;
}

/**
 * Button that toggles the collections list panel.
 *
 * Shows a tooltip with all collection labels on hover when collapsed.
 */
function CollectionsListTrigger({
    collectionLabels,
    isOpen,
    ...props
}: CollectionsListTriggerProps) {
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        render={
                            <SidebarItem render={<button type="button" />} />
                        }
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
                    {collectionLabels.length > 0
                        ? collectionLabels.join(", ")
                        : "No collections yet"}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

/**
 * Collapsible panel that holds the collection list contents.
 *
 * Indents by `pl-1` to visually nest items under the trigger.
 */
function CollectionsListPanel({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePanel>) {
    return <CollapsiblePanel className={cn("pl-1", className)} {...props} />;
}

/**
 * Toolbar that sits above the collection list and hosts the trigger,
 * sort combobox, and create button.
 */
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

/**
 * Right-aligned group inside the collections toolbar.
 */
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

/**
 * Individual button in the collections toolbar with subtle opacity
 * transitions so the bar doesn't feel visually heavy.
 */
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

/**
 * Empty state shown when the user has no collections.
 *
 * Renders inside a dashed-border card so it looks intentional rather than
 * like missing data.
 */
function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <p
                className={cn(
                    "font-medium text-muted-foreground text-xs leading-tight",
                    className
                )}
                {...props}
            />
        </div>
    );
}

interface CollectionsListStatusProps extends React.ComponentProps<"p"> {
    onDismiss: () => void;
    tone?: CollectionsListStatusTone;
}

/**
 * Accessibility-friendly status message for collection operations.
 *
 * Returns `null` when there are no children so assistive technologies do not
 * announce silent updates.
 */
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

/**
 * Small "X" button that clears the current collection filter selection.
 *
 * Returns `null` when no filters are active so the layout doesn't reserve
 * space for an invisible control.
 */
function CollectionsListFilterClearButton({
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

interface CollectionsListSortingComboboxProps
    extends Omit<React.ComponentProps<typeof ComboboxTrigger>, "value"> {
    inputValue: string;
    isOpen: boolean;
    onInputValueChange: (value: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onValueChange: (option: SortingComboboxOption | null) => void;
    value: SortingComboboxOption | null;
}

/**
 * Combobox for sorting collections or filtering by text match.
 *
 * Supports fixed sort fields and a dynamic text-match mode when the input
 * does not match any field label.
 */
function CollectionsListSortingCombobox({
    inputValue,
    isOpen,
    onInputValueChange,
    onOpenChange,
    onValueChange,
    value,
    ...props
}: CollectionsListSortingComboboxProps) {
    return (
        <Combobox<SortingComboboxOption>
            autoHighlight
            filter={null}
            inputValue={inputValue}
            items={getSortingComboboxOptions(inputValue)}
            itemToStringLabel={getSortingComboboxOptionLabel}
            itemToStringValue={(option) => option.value}
            onInputValueChange={onInputValueChange}
            onOpenChange={onOpenChange}
            onValueChange={onValueChange}
            open={isOpen}
            value={value}
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
                <ComboboxEmpty>No matching sort options</ComboboxEmpty>
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

/**
 * Callout that informs users when Smart Collections is active.
 */
function CollectionsListNoticeCallout({
    isDisabled,
    onDisable,
}: {
    isDisabled: boolean;
    onDisable: () => Promise<void>;
}) {
    return (
        <Popover>
            <span aria-live="polite" className="sr-only" role="status">
                {isDisabled
                    ? "Smart Collections"
                    : "Smart Collections is active"}
            </span>
            <PopoverTrigger
                className="group not-sr-only flex items-center text-nowrap font-medium text-[11px] opacity-70 data-popup-open:opacity-100"
                openOnHover
            >
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
                        <Button
                            render={<Link href="/activity" />}
                            size="xs"
                            variant="ghost"
                        >
                            Activity
                            <ArrowUpRight className="inline-block size-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                        <Button
                            onClick={onDisable}
                            size="xs"
                            variant="destructive-outline"
                        >
                            Disable
                        </Button>
                    </div>
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
    const style = getCollectionItemStyle(collection.name, isSelected);

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

interface CollectionsListItemPreviewProps
    extends React.ComponentProps<typeof PreviewCardTrigger> {
    thumbnails: readonly string[];
}

/**
 * Previewable trigger that cycles through collection thumbnails on hover.
 *
 * Clicking selects the collection and closes the preview popup.
 */
function CollectionsListItemPreview({
    onClick,
    thumbnails,
    ...props
}: CollectionsListItemPreviewProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const activePreviewIndex = useCollectionItemPreviewIndex(
        isOpen,
        thumbnails.length
    );
    const activeThumbnail = thumbnails[activePreviewIndex];

    return (
        <PreviewCard onOpenChange={setIsOpen} open={isOpen}>
            <PreviewCardTrigger
                closeDelay={0}
                onClick={(event) => {
                    onClick?.(event);
                    setIsOpen(false);
                }}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-10 text-left hover:bg-transparent focus-visible:ring-(--focus-ring-color)"
                        render={<Button variant="ghost" />}
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
                    key={activeThumbnail ?? "missing-preview"}
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
function CollectionsListItemValue() {
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

interface CollectionsListItemPriorityComboboxProps {
    onValueChange: (priority: CollectionPriority) => void;
}

/**
 * Priority picker bound to the hovered collection item.
 *
 * The "P" hotkey opens the dropdown while the item is hovered.
 */
function CollectionsListItemPriorityCombobox({
    onValueChange,
}: CollectionsListItemPriorityComboboxProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const SelectedPriorityIcon = getPriorityOption(collection.priority).icon;

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
            items={PRIORITIES}
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
                        className="absolute top-1/2 left-1.5 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--focus-ring-color)"
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
            </ComboboxPopup>
        </Combobox>
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

/**
 * Visual card inside the share popover that communicates the current
 * sharing state (public vs. private) at a glance.
 */
function CollectionsListShareStatusCard({ isShared }: { isShared: boolean }) {
    return (
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
                        {isShared ? "Anyone with the link" : "Only you"}
                    </p>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                        {isShared
                            ? "Shared publicly as a read-only page."
                            : "Create a short, unlisted read-only link for this collection."}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Controls shown after a collection has been shared: a read-only URL input,
 * a copy button, and a disable button.
 */
function CollectionsListShareLinkControls({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    shareUrl,
}: {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    shareUrl: string | null;
}) {
    const shareInputId = React.useId();

    return (
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
    );
}

/**
 * Initial CTA shown when a collection is not yet shared.
 */
function CollectionsListShareEnableAction({
    isSharePending,
    onEnableShare,
}: {
    isSharePending: boolean;
    onEnableShare: () => void;
}) {
    return (
        <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground leading-tight">
                Public links stay simple and read-only so your collection can be
                browsed without signing in.
            </p>
            <Button
                autoFocus
                loading={isSharePending}
                onClick={onEnableShare}
                size="sm"
            >
                Create link
            </Button>
        </div>
    );
}

/**
 * Sub-menu for enabling, disabling, or copying a public share link.
 */
function CollectionsListSharePopover({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    onEnableShare,
    shareUrl,
}: CollectionsListSharePopoverProps) {
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
                    <CollectionsListShareStatusCard isShared={isShared} />
                    {isShared ? (
                        <CollectionsListShareLinkControls
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            shareUrl={shareUrl}
                        />
                    ) : (
                        <CollectionsListShareEnableAction
                            isSharePending={isSharePending}
                            onEnableShare={onEnableShare}
                        />
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

/**
 * Sub-menu with export and duplication actions for a collection.
 *
 * Some items are disabled when the collection has no entries.
 */
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

/**
 * Action menu and metadata for a collection list item.
 *
 * Renders a count badge that hides on hover, replacing it with an ellipsis
 * menu. Keyboard shortcuts (E, Delete/Backspace, C) are active while hovered.
 */
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
                            className="absolute opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
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
                    <p className="text-nowrap p-2 pb-0 text-[10px] text-muted-foreground leading-none">
                        Last updated {dayjs(collection.updatedAt).fromNow()}
                    </p>
                    <p className="text-nowrap p-2 pt-1 text-[10px] text-muted-foreground leading-none">
                        {dayjs(collection.updatedAt).format(
                            "MMM DD, YYYY, h:mm A"
                        )}
                    </p>
                </MenuPopup>
            </Menu>
        </div>
    );
}

interface RenameDialogProps {
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

/**
 * Dialog for renaming an existing collection.
 */
function RenameDialog({
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: RenameDialogProps) {
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
                                maxLength={NAME_MAX_LENGTH}
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

interface CreateDialogProps {
    descriptionDraft: string;
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onCreateFromTemplate: (templateValue: TemplateValue | null) => void;
    onDescriptionDraftChange: (draft: string) => void;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

/**
 * Dialog for creating a new collection with an optional template picker.
 */
function CreateDialog({
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
}: CreateDialogProps) {
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
                                maxLength={NAME_MAX_LENGTH}
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
                                placeholder="Add Description... Describe what belongs here"
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
                                            Smart Collections&nbsp;
                                            <Sparkle className="mb-px inline-block size-3" />
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

interface DeleteDialogProps {
    collection: LibraryCollectionSummary | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

/**
 * Confirmation dialog for deleting a collection.
 */
function DeleteDialog({
    collection,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteDialogProps) {
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

export type { CollectionSortField } from "@/components/library/workspace";
export {
    CollectionsList,
    CollectionsListEmpty,
    CollectionsListFilterClearButton,
    CollectionsListInlineRow,
    CollectionsListItem,
    CollectionsListItemMeta,
    CollectionsListItemPreview,
    CollectionsListItemPriorityCombobox,
    CollectionsListItemValue,
    CollectionsListNoticeCallout,
    CollectionsListPanel,
    CollectionsListSharePopover,
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
    type CollectionsListItemContextValue,
    type CollectionsListItemMetaProps,
    type CollectionsListItemPreviewProps,
    type CollectionsListItemProps,
    type CollectionsListSharePopoverProps,
    type CollectionsListSortingComboboxProps,
    type CollectionsListStatusProps,
    type CollectionsListTriggerProps,
    type CreateDialogProps,
    type DeleteDialogProps,
    type PriorityOption,
    type RenameDialogProps,
    type SortingComboboxOption,
    type TemplateValue,
};
