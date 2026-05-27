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
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { CmdKbd, Kbd, ShiftKbd } from "@/components/ui/kbd";
import {
    Menu,
    MenuCheckboxItem,
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
import {
    itemPreviewImageUrl,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import { getSystemControlKey } from "@/lib/common/environment";
import { saveFile } from "@/lib/common/file";
import { filterValidImageUrls } from "@/lib/common/image";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
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
import { Toolbar } from "@base-ui/react/toolbar";
import { useInterval } from "@base-ui/utils/useInterval";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, useLocale } from "gt-next";
import {
    ArchiveIcon,
    ArchiveX,
    ArrowUpRight,
    BellIcon,
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
    Lightbulb,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    PlusIcon,
    Shapes,
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
const CSV_HEADERS = [
    "Collection",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const COLLECTION_LABEL_LIST_FORMAT_OPTIONS: Intl.ListFormatOptions = {
    style: "long",
    type: "conjunction",
};

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
const COPY_LINKS_ERROR_MESSAGE = "We couldn't copy these links right now.";
const COPY_TITLE_ERROR_MESSAGE =
    "We couldn't copy this collection title right now.";
const COPY_SHARE_LINK_ERROR_MESSAGE =
    "We couldn't copy this public link right now.";
const EXPORT_CSV_ERROR_MESSAGE =
    "We couldn't export this collection right now.";

type CollectionOptionIcon = React.ComponentType<{ className?: string }>;

type CollectionItemMetadataDisplay = "item-count" | "updated-at";

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

interface CollectionNotificationOption {
    defaultChecked: boolean;
    label: string;
    value: string;
}

/**
 * Composite value for the collections combobox.
 *
 * Each item carries the full state (sort + view) so that
 * `isItemEqualToValue` can match multiple items simultaneously —
 * one from the sort group and one from the view group — causing the
 * built-in ItemIndicator to render for both.
 */
interface ComboboxValue {
    icon: CollectionOptionIcon;
    label: string;
    sortField: CollectionSortField;
    sortQuery: string;
    view: "show-all" | "exclude-archives";
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

const COLLECTION_NOTIFICATION_OPTIONS: CollectionNotificationOption[] = [
    {
        defaultChecked: true,
        label: "New items added",
        value: "new-items",
    },
    {
        defaultChecked: true,
        label: "Weekly digest",
        value: "weekly-digest",
    },
    {
        defaultChecked: false,
        label: "Shared link activity",
        value: "shared-link-activity",
    },
];

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

const VIEW_OPTIONS = [
    { icon: ArchiveIcon, label: "Show all", value: "show-all" as const },
    {
        icon: ArchiveX,
        label: "Exclude archives",
        value: "exclude-archives" as const,
    },
];

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

function formatCollectionLabelList(collectionLabels: string[], locale: string) {
    return new Intl.ListFormat(
        locale,
        COLLECTION_LABEL_LIST_FORMAT_OPTIONS
    ).format(collectionLabels);
}

function CollectionsListProvider({ children }: { children: React.ReactNode }) {
    const controller = useCollectionsController();
    return (
        <CollectionsContext value={controller}>{children}</CollectionsContext>
    );
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

function replaceItemCollectionNames(
    items: LibraryItemWithCollections[],
    id: string,
    name: string
): LibraryItemWithCollections[] {
    return updateItemTags(items, (tags) => replaceName(tags, id, name));
}

function getItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
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
        .join("\n");
}

function getExportFileName(name: string): string {
    const slug = slugify(name);
    return slug.length > 0 ? `${slug}-links` : "collection-links";
}

function getCreatedAssignedItemIds(
    result: Extract<CollectionCreateResult, { status: "CREATED" }>
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

/**
 * Wrap a server action so network failures surface as typed errors instead
 * of uncaught exceptions. Callers expect a result object; throwing would
 * break the controller's optimistic-update rollback logic.
 */
function safeAction<TInput, TOutput extends { status: string }>(
    action: (input: TInput) => Promise<TOutput>,
    errorMessage: string
): (input: TInput) => Promise<TOutput | { message: string; status: "ERROR" }> {
    return async (input) => {
        try {
            return await action(input);
        } catch {
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
    STOP_SHARING_ERROR_MESSAGE
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
                    <ListFavoritesCarouselContent>
                        {(item) => (
                            <FavoriteItemCarouselSlide
                                item={item}
                                key={item.id}
                            />
                        )}
                    </ListFavoritesCarouselContent>
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
                            render={<CollectionsListFilterClearButton />}
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
                        <CollectionsCalloutPopover />
                    </div>
                    <CollectionsListEmpty>
                        <T>
                            No collections found. Create your first collection
                            to start grouping saved items.
                        </T>
                    </CollectionsListEmpty>
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
            <CollectionsListStatus data-sidebar-collapsible="" />
            <CollectionsRenameDialog />
            <CollectionsCreateDialog />
            <CollectionsDeleteDialog />
        </CollectionsListProvider>
    );
}

/**
 * Validate preview image URLs asynchronously with caching.
 *
 * Filters out broken or unreachable images so the preview card never shows
 * a failed load state.
 */
function usePreviewUrls(
    collectionPreviewThumbnailUrlsById: ReadonlyMap<string, readonly string[]>
): Map<string, readonly string[]> {
    const [validatedPreviewUrls, setValidatedPreviewUrls] = React.useState(
        new Map(collectionPreviewThumbnailUrlsById)
    );
    const validationCacheRef = React.useRef(new Map<string, boolean>());

    React.useEffect(() => {
        let cancelled = false;
        const cache = validationCacheRef.current;

        async function validate() {
            const allUrls = new Set<string>();
            const urlsToValidate: string[] = [];

            for (const urls of collectionPreviewThumbnailUrlsById.values()) {
                for (const url of urls) {
                    if (allUrls.has(url)) {
                        continue;
                    }
                    allUrls.add(url);
                    if (!cache.has(url)) {
                        urlsToValidate.push(url);
                    }
                }
            }

            if (allUrls.size === 0) {
                if (!cancelled) {
                    setValidatedPreviewUrls(new Map());
                }
                return;
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
                setValidatedPreviewUrls(
                    new Map(collectionPreviewThumbnailUrlsById)
                );
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
                log.error("Preview URL validation failed", { error: err });
                if (!cancelled) {
                    setValidatedPreviewUrls(
                        new Map(collectionPreviewThumbnailUrlsById)
                    );
                }
            }
        }

        validate();

        return () => {
            cancelled = true;
        };
    }, [collectionPreviewThumbnailUrlsById]);

    return validatedPreviewUrls;
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

    const {
        collectionPreviewThumbnailUrlsById,
        collectionSummaries,
        collections,
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

    const previewURLs = usePreviewUrls(collectionPreviewThumbnailUrlsById);

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
        setShouldExcludeArchives,
        shouldExcludeArchives,
    } = useCollectionsSortStore();

    const { copyToClipboard } = useCopyToClipboard();

    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [sortInputValue, setSortInputValue] = React.useState("");

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
        view: shouldExcludeArchives ? "exclude-archives" : "show-all",
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
        syncItemTags((tags) =>
            sortCollections(replaceCollectionShareState(tags, next))
        );
    };

    const syncPriority = (id: string, priority: CollectionPriority) => {
        setCollections((current) => replacePriority(current, id, priority));
        syncItemTags((tags) => replacePriority(tags, id, priority));
    };

    const syncName = (id: string, name: string) => {
        setCollections((current) => replaceName(current, id, name));
        setItems((current) => replaceItemCollectionNames(current, id, name));
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

    const handleCreateShortcutPress = useStableCallback(() => {
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
            showError(EMPTY_LINKS_MESSAGE);
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
        setFeedback(null);
        setPendingShareId(collection.id);

        startShare(async () => {
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
            setPendingShareId(null);
        });
    };

    const handleDisableShare = (collection: LibraryCollectionSummary) => {
        setFeedback(null);
        setPendingShareId(collection.id);

        startShare(async () => {
            const result = await disableCollectionSharingSafely({
                collectionId: collection.id,
            });

            if (result.status === "DISABLED") {
                syncShare(result.collection);
                showSuccess(`${collection.name} is no longer publicly shared.`);
            } else {
                showError(result.message);
            }
            setPendingShareId(null);
        });
    };

    const handleOpenLinks = (collection: LibraryCollectionSummary) => {
        if (!ensureAccess(collection, "open")) {
            return;
        }

        const items = getCollectionItems(collection.id);
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

        const items = getCollectionItems(collection.id);

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
                current.filter((id) => id !== result.collection.id)
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

        syncName(target.id, nextName);

        startRename(async () => {
            const result = await renameCollectionSafely({
                collectionId: target.id,
                name: nextName,
            });

            if (result.status === "UPDATED") {
                syncName(result.collection.id, result.collection.name);
                resetRename();
                showSuccess(`${result.collection.name} renamed.`);
                return;
            }

            syncName(target.id, previousName);
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

    const handleFavoriteToggle = (collection: LibraryCollectionSummary) => {
        const isFavorite = favoriteCollectionIdSet.has(collection.id);
        setFavoriteCollectionIds((current) =>
            isFavorite
                ? current.filter((id) => id !== collection.id)
                : [...current, collection.id]
        );
        showSuccess(
            isFavorite
                ? `${collection.name} removed from Favorites.`
                : `${collection.name} added to Favorites.`
        );
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
        if (!(open || isCreatePending)) {
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
        if (!(open || isRenamePending)) {
            resetRename();
        }
    };

    const handleDisableSmartCollections = async () => {
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
    };

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

        const nextShouldExclude = nextValue.view === "exclude-archives";
        if (nextShouldExclude !== shouldExcludeArchives) {
            setShouldExcludeArchives(nextShouldExclude);
        }

        setIsSortOpen(false);
    };

    return {
        collectionLabels,
        collectionPreviewThumbnailUrlsById: previewURLs,
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
        isSharePending,
        isSmartCollectionsDisabled,
        onClearCollectionFilters,
        onCopyLinks: handleCopyLinks,
        onCopyShareLink: handleCopyShareLink,
        onCopyTitle: handleCopyTitle,
        onDelete: requestDelete,
        onDisableShare: handleDisableShare,
        onDisableSmartCollections: handleDisableSmartCollections,
        onDismissFeedback: () => setFeedback(null),
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
        pendingShareId,
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
    const isFavorite = controller.favoriteCollectionIdSet.has(collection.id);

    return (
        <CollectionItem collection={collection} isSelected={isSelected}>
            <CollectionItemPriorityCombobox />
            <CollectionItemPreview
                {...(isSelected
                    ? {
                          "data-active": true,
                      }
                    : {})}
            >
                <CollectionItemValue />
            </CollectionItemPreview>
            <CollectionItemMetadata
                isFavorite={isFavorite}
                isSharePending={
                    controller.pendingShareId === collection.id &&
                    controller.isSharePending
                }
                metadataDisplay={metadataDisplay}
                onCopyLinks={() => controller.onCopyLinks(collection)}
                onCopyShareLink={() => controller.onCopyShareLink(collection)}
                onCopyTitle={() => controller.onCopyTitle(collection)}
                onDelete={() => controller.onDelete(collection)}
                onDisableShare={() => controller.onDisableShare(collection)}
                onEnableShare={() => controller.onEnableShare(collection)}
                onExportCsv={() => controller.onExportCsv(collection)}
                onFavoriteToggle={() => controller.onFavoriteToggle(collection)}
                onMakeCopy={() => controller.onDuplicate(collection)}
                onOpenLinks={() => controller.onOpenLinks(collection)}
                onRename={() => controller.onRename(collection)}
                shareUrl={
                    collection.shareId
                        ? buildPublicCollectionShareUrl(collection.shareId)
                        : null
                }
            />
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
export function getPriorityOption(
    priority: CollectionPriority
): PriorityOption {
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

function getComboboxOptionLabel(value: ComboboxValue): string {
    return value.label;
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

function CollectionsListPreviewImageFallback() {
    return (
        <div className="flex size-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
            No preview available
        </div>
    );
}

function CollectionsListItemPreviewImage({
    alt,
    src,
    ...props
}: React.ComponentProps<"img">) {
    const [didFail, setDidFail] = React.useState(false);
    const handleError = useStableCallback(() => {
        setDidFail(true);
    });

    if (!src || didFail) {
        return <CollectionsListPreviewImageFallback />;
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Fallback
        <img
            {...props}
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

function CollectionsListInlineRow({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "flex items-center justify-between gap-2 px-2.5",
                className
            )}
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
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={controller.setIsCollectionsListOpen}
            open={controller.isCollectionsListOpen}
        />
    );
}

/**
 * Button that toggles the collections list panel.
 *
 * Shows a tooltip with all collection labels on hover when collapsed.
 */
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

/**
 * Collapsible panel that holds the collection list contents.
 */
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

interface FavoriteItemsCarouselContentProps {
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
                            <SidebarItem render={<button type="button" />} />
                        }
                        title={isOpen ? "Collapse group" : "Expand group"}
                    />
                }
            >
                <span className="min-w-0 text-xs">
                    {children}&nbsp;({count})
                </span>
                <ChevronDownFilledIcon className="-ml-0.5" />
            </PopoverTrigger>
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="wrap-break-word w-full whitespace-normal font-medium leading-tight">
                    {labels.length > 0
                        ? formatCollectionLabelList(labels, locale)
                        : placeholder}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

/**
 * Renders favorite items in a horizontal scrollable carousel.
 */
function ListFavoritesCarouselContent({
    children,
}: FavoriteItemsCarouselContentProps) {
    const { favoriteItems } = useCollections();

    if (!favoriteItems.length) {
        return null;
    }

    return (
        <Carousel className="mb-1 ml-2.5 [&>*:not(:last-child)]:me-1.5">
            {favoriteItems.map(children)}
        </Carousel>
    );
}

function FavoriteItemCarouselSlide({
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

    const handleClick = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            onOpenFavoriteItem(item);
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
        <div className="group relative inline-block aspect-3/4 h-14 w-auto overflow-hidden rounded-md bg-muted ring-1 ring-border/50 focus-within:ring-2 focus-within:ring-ring/60">
            <button
                aria-label={previewLabel}
                className="size-full focus-visible:outline-none"
                onClick={handleClick}
                type="button"
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
                        className="size-full object-cover"
                        src={previewImageUrl ?? undefined}
                    />
                )}
            </button>
            <button
                aria-label="Remove from favorites"
                className="absolute top-0 left-0 z-10 flex size-4 items-center justify-center rounded-br-md bg-black/40 opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
                onClick={handleRemoveFavorite}
                type="button"
            >
                <Trash2Icon className="size-2.5 text-white" />
            </button>
        </div>
    );
}

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 */
function CollectionsListFavoritesContent({
    children,
}: CollectionsListContentProps) {
    const { favoriteCollectionSummaries } = useCollections();

    if (!favoriteCollectionSummaries.length) {
        return null;
    }

    return favoriteCollectionSummaries.map(children);
}

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 */
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
            {...props}
            className={cn(
                "flex w-full items-center justify-between",
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
 * Empty state shown when the user has no collections.
 *
 * Renders inside a dashed-border card so it looks intentional rather than
 * like missing data.
 */
function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    const { collectionSummaries } = useCollections();

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
            />
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
        <CollectionsListInlineRow className="pr-1" data-sidebar-collapsible="">
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
        </CollectionsListInlineRow>
    );
}

/**
 * Small "X" button that clears the current collection filter selection.
 *
 * Returns `null` when no filters are active so the layout doesn't reserve
 * space for an invisible control.
 */
function CollectionsListFilterClearButton({
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
            itemToStringLabel={getComboboxOptionLabel}
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
                            className={
                                isCollectionsListOpen ? undefined : "hidden"
                            }
                            size="icon-xs"
                            variant="ghost"
                        />
                    )
                }
                title="Sort and organize collections"
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
}: React.ComponentProps<"button">) {
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
            onClick={handleOnClick}
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
    );
}

function CollectionsCalloutPopover() {
    const controller = useCollections();
    const isDisabled = controller.isSmartCollectionsDisabled;

    return (
        <Popover>
            <span
                aria-atomic="true"
                aria-live="polite"
                className="sr-only"
                role="status"
            >
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
                    sizes="auto,288px"
                    src={SmartCollectionsBackgroundImg}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle>Let Cache do the organizing</PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs leading-snug">
                        As you add new entries, Cache AI proactively groups your
                        related saves into contextual collections. Cache also
                        learns your preferences over time.{" "}
                        <Button
                            className="h-fit! px-0 leading-snug sm:text-xs"
                            render={<Link href="/activity" />}
                            size="xs"
                            variant="link"
                        >
                            Activity
                            <ArrowUpRight className="inline-block size-3 shrink-0 text-muted-foreground" />
                        </Button>
                    </PopoverDescription>
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

/**
 * Previewable trigger that cycles through collection thumbnails on hover.
 *
 * Clicking selects the collection and closes the preview popup.
 */
function CollectionItemPreview({
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

    return (
        <PreviewCard onOpenChange={setIsOpen} open={isOpen}>
            <PreviewCardTrigger
                {...props}
                closeDelay={0}
                onClick={(event) => {
                    onClick?.(event);
                    controller.onSelectCollection(collection.id);
                    setIsOpen(false);
                }}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-10.5 text-left hover:bg-transparent focus-visible:ring-(--focus-ring-color)"
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
        "Priority picker for hovered collection",
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
                        className="absolute top-1/2 left-2.5 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--focus-ring-color)"
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

interface CollectionItemShareSubMenuProps {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    shareUrl: string | null;
}

function CollectionItemShareStatus({ isShared }: { isShared: boolean }) {
    return (
        <div className="mt-3 rounded-xl border bg-muted/40 p-2">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs/5">
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
                            : "Create a read-only link for this collection."}
                    </p>
                </div>
            </div>
        </div>
    );
}

interface CollectionItemShareControlsProps {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    shareUrl: string | null;
}

function CollectionItemShareControls({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    shareUrl,
}: CollectionItemShareControlsProps) {
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

function CollectionItemShareEnablePanel({
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

function CollectionItemShareSubMenu({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    onEnableShare,
    shareUrl,
}: CollectionItemShareSubMenuProps) {
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
                    <CollectionItemShareStatus isShared={isShared} />
                    {isShared ? (
                        <CollectionItemShareControls
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            shareUrl={shareUrl}
                        />
                    ) : (
                        <CollectionItemShareEnablePanel
                            isSharePending={isSharePending}
                            onEnableShare={onEnableShare}
                        />
                    )}
                </div>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionItemExportSubMenuProps {
    hasItems: boolean;
    onCopyLinks: () => void;
    onCopyTitle: () => void;
    onExportCsv: () => void;
    onOpenLinks: () => void;
}

/**
 * Sub-menu with export actions for a collection.
 *
 * Some items are disabled when the collection has no entries.
 */
function CollectionItemExportSubMenu({
    hasItems,
    onCopyLinks,
    onCopyTitle,
    onExportCsv,
    onOpenLinks,
}: CollectionItemExportSubMenuProps) {
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
                <MenuItem disabled={!hasItems}>
                    <NotionIcon />
                    Send to Notion
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

function CollectionItemSubscribeSubMenu() {
    return (
        <MenuSub>
            <MenuSubTrigger disabled>
                <BellIcon className="inline-block size-4 text-muted-foreground" />
                Subscribe
            </MenuSubTrigger>
            <MenuSubPopup>
                <MenuGroup>
                    <MenuGroupLabel>Inbox notifications</MenuGroupLabel>
                    {COLLECTION_NOTIFICATION_OPTIONS.map((option) => (
                        <MenuCheckboxItem
                            defaultChecked={option.defaultChecked}
                            key={option.value}
                        >
                            {option.label}
                        </MenuCheckboxItem>
                    ))}
                </MenuGroup>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionItemMetadataProps {
    isFavorite: boolean;
    isSharePending: boolean;
    metadataDisplay: CollectionItemMetadataDisplay;
    onCopyLinks: () => void;
    onCopyShareLink: () => void;
    onCopyTitle: () => void;
    onDelete: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    onExportCsv: () => void;
    onFavoriteToggle: () => void;
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
function CollectionItemMetadata({
    isFavorite,
    isSharePending,
    metadataDisplay,
    onCopyLinks,
    onCopyShareLink,
    onCopyTitle,
    onDelete,
    onDisableShare,
    onEnableShare,
    onExportCsv,
    onFavoriteToggle,
    onMakeCopy,
    onOpenLinks,
    onRename,
    shareUrl,
}: CollectionItemMetadataProps) {
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

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

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {metadataDisplay === "updated-at"
                    ? dayjs(collection.updatedAt).fromNow(true)
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
                        <MenuGroupLabel>Collection</MenuGroupLabel>
                        <MenuItem onClick={onRename}>
                            <PencilIcon className="size-4 text-muted-foreground" />
                            Rename
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                        <MenuItem onClick={onFavoriteToggle}>
                            <Star
                                className={cn(
                                    "size-4 text-muted-foreground",
                                    isFavorite && "fill-current"
                                )}
                            />
                            {isFavorite
                                ? "Remove from Favorites"
                                : "Add to Favorites"}
                        </MenuItem>
                        <MenuItem onClick={onMakeCopy}>
                            <CopyPlus className="size-4 text-muted-foreground" />
                            Make a copy
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionItemShareSubMenu
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            onEnableShare={onEnableShare}
                            shareUrl={shareUrl}
                        />
                        <CollectionItemExportSubMenu
                            hasItems={hasItems}
                            onCopyLinks={onCopyLinks}
                            onCopyTitle={onCopyTitle}
                            onExportCsv={onExportCsv}
                            onOpenLinks={onOpenLinks}
                        />
                        <CollectionItemSubscribeSubMenu />
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
    const descriptionInputId = React.useId();
    const { disabled } = useSmartCollectionsPreference();

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
                                placeholder="Describe what belongs here..."
                                size="lg"
                                unstyled
                                value={descriptionDraft}
                            />
                        </div>
                        {errorMessage ? (
                            <p
                                aria-atomic="true"
                                aria-live="polite"
                                className="text-destructive text-xs"
                                role="alert"
                            >
                                {errorMessage}
                            </p>
                        ) : null}
                        <Alert>
                            <Lightbulb />
                            <AlertDescription>
                                Collections keep your best saved items in one
                                place. Use them for ongoing work, or just to
                                keep things tidy.
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
                                {disabled ? null : (
                                    <div className="flex gap-2 px-3 py-2">
                                        <Info className="inline-block size-3.5 shrink-0" />
                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                            Cache's{" "}
                                            <strong className="font-medium">
                                                Smart Collections&nbsp;
                                                <Sparkle className="mb-px inline-block size-3" />
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
                            disabled={!nameDraft}
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
