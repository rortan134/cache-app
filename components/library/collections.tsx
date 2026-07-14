"use client";

import { useSubscriptionAccess } from "@/components/billing/subscription";
import {
    appendCollection,
    mergeCollectionSummaries,
    replaceCollectionShareState,
    RequestCreateRefContext,
    shareCollectionPubliclySafely,
    sortCollections,
    useCollectionsSortStore,
    useWorkspaceContext,
    type CollectionShareState,
    type CollectionSortField,
    type CollectionView,
} from "@/components/library/workspace";
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
import type { CollectionPreview } from "@/lib/collections/service";
import { disableCollectionSharing } from "@/lib/collections/sharing/actions";
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
    addUnique,
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
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import EmptyCollectionStateImage from "@/public/empty-collection-state.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import type { BaseUIEvent } from "@base-ui/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { useAnimationFrame } from "@base-ui/utils/useAnimationFrame";
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

type CollectionOptionIcon = React.ComponentType<{
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
    focusable?: boolean | "false" | "true";
}>;

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

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}

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

const PREVIEW_SLIDE_INTERVAL_MS = 1400;
const PREVIEW_CROSSFADE_MS = 400;
const PREVIEW_IMAGE_CACHE_MAX = 200;
const PREVIEW_IMAGE_LOAD_CONCURRENCY = 2;
const EMPTY_PREVIEW_THUMBNAILS: string[] = [];

interface ReadyPreviewSlide {
    aspectRatio: number;
    src: string;
}

/** Session cache of successfully decoded preview images (url → aspect ratio). */
const previewImageCache = new Map<string, number>();
const previewImageLoads = new Map<string, Promise<ReadyPreviewSlide | null>>();

function rememberPreviewImage(url: string, aspectRatio: number): void {
    if (
        !previewImageCache.has(url) &&
        previewImageCache.size >= PREVIEW_IMAGE_CACHE_MAX
    ) {
        const oldestKey = previewImageCache.keys().next().value;
        if (oldestKey !== undefined) {
            previewImageCache.delete(oldestKey);
        }
    }
    previewImageCache.set(url, aspectRatio);
}

function loadPreviewImage(url: string): Promise<ReadyPreviewSlide | null> {
    const cachedAspectRatio = previewImageCache.get(url);
    if (cachedAspectRatio !== undefined) {
        return Promise.resolve({ aspectRatio: cachedAspectRatio, src: url });
    }

    const inflight = previewImageLoads.get(url);
    if (inflight) {
        return inflight;
    }

    const promise = new Promise<ReadyPreviewSlide | null>((resolve) => {
        const image = document.createElement("img");
        image.decoding = "async";
        image.onload = () => {
            previewImageLoads.delete(url);
            const { naturalHeight, naturalWidth } = image;
            if (naturalHeight <= 0 || naturalWidth <= 0) {
                resolve(null);
                return;
            }
            const aspectRatio = naturalWidth / naturalHeight;
            rememberPreviewImage(url, aspectRatio);
            resolve({ aspectRatio, src: url });
        };
        image.onerror = () => {
            // Failures are not cached so transient CDN/network errors can retry.
            previewImageLoads.delete(url);
            resolve(null);
        };
        image.src = url;
    });

    previewImageLoads.set(url, promise);
    return promise;
}

function getReadyPreviewSlides(urls: string[]): ReadyPreviewSlide[] {
    const slides: ReadyPreviewSlide[] = [];
    for (const url of urls) {
        const aspectRatio = previewImageCache.get(url);
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

/**
 * Start preview image loads with a small concurrency pool so arming a row
 * does not fan out unlimited /api/preview work at once.
 */
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

const PENDING_ACTION_PREFIX = {
    NOTION: "notion-",
    PRIORITY: "priority-",
    SHARE: "share-",
} as const;

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
        icon: Sparkle,
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
    { icon: ArchiveIcon, label: "Show all", value: "show-all" },
    { icon: ArchiveX, label: "Exclude archives", value: "exclude-archives" },
    { icon: Globe, label: "Show shared only", value: "show-shared-only" },
] as const;

const { useStore: useCollectionsListStateStore } = createStore({
    favoriteCollectionIds: storage<string[]>([]),
    isCollectionsListOpen: storage(false),
    isFavoritesListOpen: storage(true),
    isRecommendationsOpen: storage(true),
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

type CollectionsState = ReturnType<typeof useCollectionsController>["state"];
type CollectionsActions = ReturnType<
    typeof useCollectionsController
>["actions"];

const CollectionsStateContext = React.createContext<CollectionsState | null>(
    null
);
const CollectionsActionsContext =
    React.createContext<CollectionsActions | null>(null);

function updateItemTags(
    items: LibraryItemWithCollections[],
    updater: (tags: LibraryCollectionTag[]) => LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: updater(item.collections),
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
                    <CollectionsListRecommendations />
                </CollapsiblePanel>
            </CollectionsList>
            <CollectionsListStatus />
            <CollectionsRenameDialog />
            <CollectionsCreateDialog />
            <CollectionsDeleteDialog />
        </CollectionsListProvider>
    );
}

const PREVIEW_CELL_KEYS = ["tl", "tr", "bl", "br"] as const;

export function CollectionsGrid({
    collections,
}: {
    collections: CollectionPreview[];
}) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((collection) => (
                <CollectionCard collection={collection} key={collection.id} />
            ))}
        </div>
    );
}

function CollectionCard({ collection }: { collection: CollectionPreview }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <CollectionThumbnailGrid urls={collection.previewImageUrls} />
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

function CollectionThumbnailGrid({ urls }: { urls: string[] }) {
    return (
        <div className="grid h-40 w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted/40">
            {PREVIEW_CELL_KEYS.map((cellKey, slot) => (
                <CollectionThumbnailCell
                    key={cellKey}
                    url={urls[slot] ?? null}
                />
            ))}
        </div>
    );
}

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

function useCollectionsController() {
    const { mutate: mutateSmartCollectionsPreference } =
        useSmartCollectionsPreference();
    const {
        isLoading: recommendationsLoading,
        items: recommendationItems,
        mutate: onRecommendationsMutate,
    } = useCollectionRecommendations();

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

    const {
        favoriteCollectionIds,
        isCollectionsListOpen,
        isFavoritesListOpen,
        isRecommendationsOpen,
        setFavoriteCollectionIds,
        setIsCollectionsListOpen,
        setIsFavoritesListOpen,
        setIsRecommendationsOpen,
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
    const [, startTransition] = React.useTransition();

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [createItemId, setCreateItemId] = React.useState<string | null>(null);
    const createSubmissionPendingRef = React.useRef(false);

    const [pendingRename, setPendingRename] =
        React.useState<LibraryCollectionSummary | null>(null);

    const [pendingDelete, setPendingDelete] =
        React.useState<LibraryCollectionSummary | null>(null);

    const [pendingShareIds, setPendingShareIds] = React.useState<string[]>([]);
    const [pendingNotionCollectionIds, setPendingNotionCollectionIds] =
        React.useState<string[]>([]);

    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [sortInputValue, setSortInputValue] = React.useState("");

    const [
        pendingPriorityComboboxCollectionId,
        setPendingPriorityComboboxCollectionId,
    ] = React.useState<string | null>(null);

    const [feedback, setFeedback] = React.useState<CollectionFeedback | null>(
        null
    );

    const pendingActionIdsRef = React.useRef(new Set<string>());
    const favoriteCollectionIdSetRef = React.useRef(new Set<string>());
    const hoveredCollectionRef = React.useRef<LibraryCollectionSummary | null>(
        null
    );

    const hasAnySelected = selectedCollectionIds.length > 0;
    const selectedCollectionIdSet = new Set(selectedCollectionIds);
    const pendingShareIdSet = new Set(pendingShareIds);
    const pendingNotionCollectionIdSet = new Set(pendingNotionCollectionIds);
    const collectionLabels = collectionSummaries.map(
        (collection) => collection.name
    );
    const favoriteCollectionIdSet = new Set(favoriteCollectionIds);
    favoriteCollectionIdSetRef.current = favoriteCollectionIdSet;
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

    const showError = useStableCallback((message: string) =>
        setFeedback({ message, tone: "error" })
    );
    const showSuccess = useStableCallback((message: string) =>
        setFeedback({ message, tone: "success" })
    );

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

    const setCollectionSharePending = useTogglePendingId(setPendingShareIds);
    const setCollectionNotionPending = useTogglePendingId(
        setPendingNotionCollectionIds
    );

    const syncItemTags = useStableCallback(
        (updater: (tags: LibraryCollectionTag[]) => LibraryCollectionTag[]) => {
            setItems((current) => updateItemTags(current, updater));
        }
    );

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

    const syncName = useStableCallback((id: string, name: string) => {
        setCollections((current) => replaceName(current, id, name));
        setItems((current) =>
            updateItemTags(current, (tags) => replaceName(tags, id, name))
        );
    });

    const syncCreated = useStableCallback(
        (input: SyncCreatedCollectionInput) => {
            setCollections((current) =>
                mergeCollectionSummaries(current, [input.collection])
            );
            if (input.assignedItemIds.length === 0) {
                return;
            }
            setItems((current) =>
                appendCollection(
                    current,
                    input.assignedItemIds,
                    input.collection
                )
            );
        }
    );

    const syncDeleted = useStableCallback((collectionId: string) => {
        if (hoveredCollectionRef.current?.id === collectionId) {
            hoveredCollectionRef.current = null;
        }
        setCollections((current) =>
            current.filter((collection) => collection.id !== collectionId)
        );
        syncItemTags((tags) => tags.filter((tag) => tag.id !== collectionId));
        setFavoriteCollectionIds((current) =>
            removeValue(current, collectionId)
        );
    });

    const requestCreate = useStableCallback((itemId?: string) => {
        setCreateItemId(itemId ?? null);
        setIsCreateOpen(true);
    });

    const handleCreateShortcutPress = useStableCallback(() => {
        if (isCreateOpen) {
            if (createSubmissionPendingRef.current) {
                return;
            }
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

    useHotkeys("mod+n", handleCreateShortcutPress, {
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

    const requestDelete = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setFeedback(null);
            setPendingDelete(collection);
        }
    );

    const requestRename = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setFeedback(null);
            setPendingRename(collection);
        }
    );

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

    const handleCopyLinks = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
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
        }
    );

    const handleCopyTitle = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
            await copyWithFeedback(
                collection.name,
                `${collection.name} title copied to the clipboard.`,
                COPY_TITLE_ERROR_MESSAGE
            );
        }
    );

    const handleCopyShareLink = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
            if (!collection.shareId) {
                showError(COPY_SHARE_LINK_MISSING_MESSAGE);
                return;
            }

            const url = buildPublicCollectionShareUrl(collection.shareId);
            await copyWithFeedback(
                url,
                `Public link for ${collection.name} copied to the clipboard.`,
                COPY_SHARE_LINK_ERROR_MESSAGE
            );
        }
    );

    const runGuardedAction = useStableCallback(
        <T,>(config: {
            action: () => Promise<T>;
            collection: LibraryCollectionSummary;
            ensureAccessAction?: string;
            keyPrefix: string;
            setPending: (isPending: boolean) => void;
        }) => {
            const key = `${config.keyPrefix}${config.collection.id}`;
            if (pendingActionIdsRef.current.has(key)) {
                return;
            }

            if (
                config.ensureAccessAction &&
                !ensureAccess(config.collection, config.ensureAccessAction)
            ) {
                return;
            }

            setFeedback(null);
            pendingActionIdsRef.current.add(key);
            config.setPending(true);

            startTransition(async () => {
                try {
                    await config.action();
                } finally {
                    pendingActionIdsRef.current.delete(key);
                    config.setPending(false);
                }
            });
        }
    );

    const handleEnableShare = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            runGuardedAction({
                action: async () => {
                    const result = await shareCollectionPubliclySafely({
                        collectionId: collection.id,
                    });

                    if (result.status === ACTION_STATUS.SHARED) {
                        syncShare(result.collection);
                        const linkCopied = await copyToClipboard(
                            result.shareUrl
                        );
                        showSuccess(
                            linkCopied
                                ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                                : `${collection.name} is now publicly shared.`
                        );
                    } else {
                        showError(result.message);
                    }
                },
                collection,
                ensureAccessAction: "share",
                keyPrefix: PENDING_ACTION_PREFIX.SHARE,
                setPending: (isPending) =>
                    setCollectionSharePending(collection.id, isPending),
            });
        }
    );

    const handleDisableShare = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            runGuardedAction({
                action: async () => {
                    const result = await disableCollectionSharingSafely({
                        collectionId: collection.id,
                    });

                    if (result.status === ACTION_STATUS.DISABLED) {
                        syncShare(result.collection);
                        showSuccess(
                            `${collection.name} is no longer publicly shared.`
                        );
                    } else {
                        showError(result.message);
                    }
                },
                collection,
                keyPrefix: PENDING_ACTION_PREFIX.SHARE,
                setPending: (isPending) =>
                    setCollectionSharePending(collection.id, isPending),
            });
        }
    );

    const handleOpenLinks = useStableCallback(
        (collection: LibraryCollectionSummary) => {
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
        }
    );

    const handleExportCsv = useStableCallback(
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

    const handleSendToNotion = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            runGuardedAction({
                action: async () => {
                    const result = await sendCollectionToNotionSafely({
                        collectionId: collection.id,
                    });

                    if (result.status === ACTION_STATUS.SUCCESS) {
                        showSuccess(`${collection.name} sent to Notion.`);
                        openExternal(result.pageUrl);
                    } else {
                        showError(result.message);
                    }
                },
                collection,
                ensureAccessAction: "send to Notion",
                keyPrefix: PENDING_ACTION_PREFIX.NOTION,
                setPending: (isPending) =>
                    setCollectionNotionPending(collection.id, isPending),
            });
        }
    );

    const handleUpdatePriority = useStableCallback(
        async (collectionId: string, priority: CollectionPriority) => {
            const key = `${PENDING_ACTION_PREFIX.PRIORITY}${collectionId}`;
            if (pendingActionIdsRef.current.has(key)) {
                return;
            }

            const previous = collections.find(
                (c) => c.id === collectionId
            )?.priority;

            if (!previous || previous === priority) {
                return;
            }

            pendingActionIdsRef.current.add(key);
            syncPriority(collectionId, priority);

            try {
                const result = await updateCollectionPrioritySafely({
                    collectionId,
                    priority,
                });

                if (result.status === ACTION_STATUS.UPDATED) {
                    syncPriority(
                        result.collection.id,
                        result.collection.priority
                    );
                } else {
                    syncPriority(collectionId, previous);
                    showError(result.message);
                }
            } finally {
                pendingActionIdsRef.current.delete(key);
            }
        }
    );

    const handleDuplicate = useStableCallback(
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

                syncCreated({
                    assignedItemIds: result.assignedItemIds,
                    collection: result.collection,
                });
                showSuccess(
                    `${collection.name} copied as ${result.collection.name}.`
                );
            });
        }
    );

    const handleCreateFromTemplate = useStableCallback(
        async (
            template: { description: string; name: string },
            assignToItemId?: string
        ) => {
            setFeedback(null);

            const result = await createCollectionSafely({
                assignToItemId,
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
            onRecommendationsMutate();
            showSuccess(`${template.name} created from template.`);
        }
    );

    const handleFavoriteToggle = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            const isFavorite = favoriteCollectionIdSet.has(collection.id);
            setFavoriteCollectionIds((current) =>
                toggleValue(current, collection.id)
            );
            showSuccess(
                isFavorite
                    ? `${collection.name} removed from Favorites.`
                    : `${collection.name} added to Favorites.`
            );
        }
    );

    useHotkeys(
        "e",
        (event) => {
            const target = hoveredCollectionRef.current;
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
            const target = hoveredCollectionRef.current;
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
            const target = hoveredCollectionRef.current;
            if (target && target.itemCount > 0) {
                event.preventDefault();
                handleCopyLinks(target);
            }
        },
        { description: "Copy links from hovered collection" }
    );

    useHotkeys(
        "alt+f",
        (event) => {
            const target = hoveredCollectionRef.current;
            if (target) {
                const isFavorite = favoriteCollectionIdSetRef.current.has(
                    target.id
                );
                if (!isFavorite) {
                    event.preventDefault();
                    handleFavoriteToggle(target);
                }
            }
        },
        { description: "Favorite hovered collection" }
    );

    useHotkeys(
        "p",
        () => {
            const target = hoveredCollectionRef.current;
            if (!target) {
                return;
            }
            setPendingPriorityComboboxCollectionId(target.id);
        },
        {
            description: "Set priority for hovered collection",
            preventDefault: true,
        }
    );

    const handleSetSmartCollectionsEnabled = useStableCallback(
        async (enabled: boolean) => {
            const actionVerb = enabled ? "enable" : "disable";
            const errorMessage = enabled
                ? ENABLE_SMART_COLLECTIONS_ERROR_MESSAGE
                : DISABLE_SMART_COLLECTIONS_ERROR_MESSAGE;

            try {
                await mutateSmartCollectionsPreference(
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
                log.error(`Failed to ${actionVerb} smart collections`, {
                    error,
                });
                showError(errorMessage);
            }
        }
    );

    const handleDisableSmartCollections = useStableCallback(() =>
        handleSetSmartCollectionsEnabled(false)
    );

    const handleEnableSmartCollections = useStableCallback(() =>
        handleSetSmartCollectionsEnabled(true)
    );

    const handleDismissFeedback = useStableCallback(() => {
        setFeedback(null);
    });

    const handleComboboxValueChange = useStableCallback(
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
                setSortInputValue("");
            }

            if (nextValue.view !== collectionView) {
                setCollectionView(nextValue.view);
            }

            setIsSortOpen(false);
        }
    );

    return {
        actions: {
            createSubmissionPendingRef,
            onCopyLinks: handleCopyLinks,
            onCopyShareLink: handleCopyShareLink,
            onCopyTitle: handleCopyTitle,
            onCreateFromTemplate: handleCreateFromTemplate,
            onDelete: requestDelete,
            onDisableShare: handleDisableShare,
            onDisableSmartCollections: handleDisableSmartCollections,
            onDismissFeedback: handleDismissFeedback,
            onDuplicate: handleDuplicate,
            onEnableShare: handleEnableShare,
            onEnableSmartCollections: handleEnableSmartCollections,
            onExportCsv: handleExportCsv,
            onFavoriteToggle: handleFavoriteToggle,
            onOpenLinks: handleOpenLinks,
            onRecommendationsMutate,
            onRename: requestRename,
            onSendToNotion: handleSendToNotion,
            onUpdatePriority: handleUpdatePriority,
            setFavoriteCollectionIds,
            setIsCollectionsListOpen,
            setIsCreateOpen,
            setIsFavoritesListOpen,
            setIsRecommendationsOpen,
            setPendingDelete,
            setPendingPriorityComboboxCollectionId,
            setPendingRename,
            syncCreated,
            syncDeleted,
            syncItemTags,
            syncName,
        },
        state: {
            collectionCount: collections.length,
            collectionLabels,
            collectionPreviewThumbnailUrlsById,
            collectionSummaries,
            createItemId,
            favoriteCollectionIdSet,
            favoriteCollectionSummaries,
            favoriteItemIdSet,
            favoriteItems,
            feedback,
            hasAnySelected,
            hoveredCollectionRef,
            isCollectionsListOpen,
            isCreateOpen,
            isFavoritesListOpen,
            isRecommendationsOpen,
            onClearCollectionFilters,
            onOpenFavoriteItem,
            onSelectCollection,
            onToggleItemFavorite,
            pendingDelete,
            pendingNotionCollectionIdSet,
            pendingPriorityComboboxCollectionId,
            pendingRename,
            pendingShareIdSet,
            recommendations: {
                isLoading: recommendationsLoading,
                items: recommendationItems,
            },
            requestCreate,
            selectedCollectionIdSet,
            showError,
            showSuccess,
            sort: {
                inputValue: sortInputValue,
                isOpen: isSortOpen,
                onInputValueChange: setSortInputValue,
                onOpenChange: setIsSortOpen,
                onValueChange: handleComboboxValueChange,
                value: comboboxValue,
            },
        },
    };
}

function useCollectionsState(): CollectionsState {
    const context = React.use(CollectionsStateContext);
    if (!context) {
        throw new Error(
            "Collections state must be read within a CollectionsListProvider."
        );
    }
    return context;
}

function useCollectionsActions(): CollectionsActions {
    const context = React.use(CollectionsActionsContext);
    if (!context) {
        throw new Error(
            "Collections actions must be used within a CollectionsListProvider."
        );
    }
    return context;
}

function useTogglePendingId(
    setPendingIds: (updater: (current: string[]) => string[]) => void
): (id: string, isPending: boolean) => void {
    return useStableCallback((id: string, isPending: boolean) => {
        setPendingIds((current) =>
            isPending ? addUnique(current, id) : removeValue(current, id)
        );
    });
}

function CollectionsListProvider({ children }: React.PropsWithChildren) {
    const { state, actions } = useCollectionsController();

    return (
        <CollectionsStateContext value={state}>
            <CollectionsActionsContext value={actions}>
                {children}
            </CollectionsActionsContext>
        </CollectionsStateContext>
    );
}

/**
 * Load-gated collection preview playback.
 *
 * Loads only while armed (pointer over the row or open intent). Failures are
 * skipped, not shown. Advances only across slides that have already loaded.
 * Active slide is keyed by `src` so late-arriving earlier URLs cannot jump the
 * visible frame when the ready list is re-ordered.
 */
function useCollectionPreviewPlayback(
    shouldLoad: boolean,
    isCycling: boolean,
    thumbnails: string[]
) {
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
        previewImageCache.delete(src);
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

/**
 * Look up the full priority option (icon + label) for a given priority value.
 *
 * The map covers every `CollectionPriority` enum value, so the lookup always
 * returns an entry — callers don't have to handle `undefined`.
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

    const textMatchOption: ComboboxValue | null =
        currentValue.sortField === "text-match" &&
        currentValue.sortQuery.length > 0 &&
        (normalizedQuery.length === 0 ||
            currentValue.sortQuery.toLowerCase().includes(normalizedQuery) ||
            `sort by "${currentValue.sortQuery}"`.includes(normalizedQuery))
            ? {
                  icon: ListFilter,
                  label: `Sort by "${currentValue.sortQuery}"`,
                  sortField: "text-match",
                  sortQuery: currentValue.sortQuery,
                  view: currentValue.view,
              }
            : null;

    const sortItems: ComboboxValue[] =
        normalizedQuery.length === 0 || matchingSortOptions.length > 0
            ? [
                  ...(textMatchOption ? [textMatchOption] : []),
                  ...matchingSortOptions.map((option) => ({
                      icon: option.icon,
                      label: option.label,
                      sortField: option.value,
                      sortQuery: currentValue.sortQuery,
                      view: currentValue.view,
                  })),
              ]
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
        // Dimensions are driven by the parent container (PreviewStack, carousel)
        // whose aspect ratio is computed dynamically from the loaded image.
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

/**
 * Root wrapper for the collections list. Adds relative positioning so child
 * absolute elements (e.g. tooltips) layer correctly.
 */
function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { isCollectionsListOpen, requestCreate } = useCollectionsState();
    const collectionsActions = useCollectionsActions();
    const requestCreateRef = React.use(RequestCreateRefContext);

    React.useEffect(() => {
        if (!requestCreateRef) {
            return;
        }
        requestCreateRef.current = requestCreate;
        return () => {
            requestCreateRef.current = null;
        };
    }, [requestCreate, requestCreateRef]);

    return (
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={collectionsActions.setIsCollectionsListOpen}
            open={isCollectionsListOpen}
        />
    );
}

function CollectionsListTrigger({
    children,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const { collectionLabels, collectionSummaries, isCollectionsListOpen } =
        useCollectionsState();

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

function CollectionsListFavorites({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { favoriteCollectionSummaries, favoriteItems, isFavoritesListOpen } =
        useCollectionsState();
    const { setIsFavoritesListOpen } = useCollectionsActions();

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
    const locale = useLocale();
    const { favoriteCollectionSummaries, favoriteItems, isFavoritesListOpen } =
        useCollectionsState();
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
    description?: string;
    isOpen: boolean;
    labels: string[];
    placeholder: string;
}

const listFormatters = new Map<string, Intl.ListFormat>();

function getListFormatter(locale: string): Intl.ListFormat {
    let formatter = listFormatters.get(locale);
    if (!formatter) {
        formatter = new Intl.ListFormat(locale, {
            style: "long",
            type: "conjunction",
        });
        listFormatters.set(locale, formatter);
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

function CollectionsListGroupTrigger({
    children,
    count,
    description,
    isOpen,
    labels,
    placeholder,
    render,
    ...props
}: CollectionsListGroupTriggerProps) {
    const locale = useLocale();
    const summary =
        description ??
        (labels.length > 0
            ? getListFormatter(locale).format(labels)
            : placeholder);

    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <PreviewCard onOpenChange={setIsHovered} open={isHovered && !isOpen}>
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
                <p className="whitespace-normal font-medium text-xs leading-tight">
                    {summary}
                </p>
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListFavoritesCarouselContent({
    children,
}: CollectionsListFavoritesCarouselContentProps) {
    const { favoriteItems } = useCollectionsState();

    if (!favoriteItems.length) {
        return null;
    }

    return (
        <Carousel>
            <CarouselPanel className="mb-1 *:first:pl-2.5 [&>*:not(:last-child)]:me-1.5">
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
    const { onOpenFavoriteItem, onToggleItemFavorite } = useCollectionsState();
    const isNote = item.kind === ITEM_KIND_NOTE;
    const previewImageUrl = itemPreviewImageUrl(item);
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const previewLabel =
        (item.caption ?? "").trim() || (isNote ? "Note" : "Saved item");
    const [isOpen, setIsOpen] = React.useState(false);

    const handleClick = useStableCallback((event: React.SyntheticEvent) => {
        event.preventDefault();
        onOpenFavoriteItem(item);
        setIsOpen(false);
    });

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
                className="group relative inline-block aspect-3/4 h-14 overflow-hidden rounded-md bg-muted transition-transform duration-100 ease-out focus-within:ring-2 focus-within:ring-ring/60 active:scale-[0.97]"
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
                            className="size-full object-cover"
                            src={previewImageUrl ?? undefined}
                        />
                    )}
                </PreviewCardTrigger>
                <button
                    aria-label="Remove from favorites"
                    className="absolute top-0 left-0 z-10 flex size-4 items-center justify-center rounded-br-md bg-black/40 opacity-100 pointer-fine:opacity-0 transition-opacity duration-150 ease-out hover:bg-black/60 focus-visible:opacity-100 pointer-fine:group-hover:opacity-100"
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
}: CollectionsListFavoritesContentProps) {
    const { favoriteCollectionSummaries } = useCollectionsState();

    if (!favoriteCollectionSummaries.length) {
        return null;
    }

    return favoriteCollectionSummaries.map(children);
}

function CollectionsListContent({ children }: CollectionsListContentProps) {
    const { collectionSummaries } = useCollectionsState();

    if (!collectionSummaries.length) {
        return null;
    }

    return (
        <DisclosureListVertical maxVisible={10}>
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
            className={cn(
                "opacity-80 transition-opacity duration-150 ease-out hover:opacity-100",
                className
            )}
        />
    );
}

function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { collectionCount, collectionSummaries, requestCreate } =
        useCollectionsState();

    const handleRequestCreate = useStableCallback(() => requestCreate());

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
                    "No collections match this view."
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
    const { onCreateFromTemplate } = useCollectionsActions();
    const [isCreating, setIsCreating] = React.useState(false);

    const handleClick = useStableCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            if (isCreating) {
                event.preventDefault();
                return;
            }
            setIsCreating(true);
            try {
                await onCreateFromTemplate(template);
            } finally {
                setIsCreating(false);
            }
        }
    );

    return (
        <div className="group relative flex select-none items-center">
            <SidebarItem
                className="w-full min-w-0 flex-1 justify-start rounded-lg pr-8 pl-10.5 text-left hover:bg-transparent"
                render={
                    <button
                        disabled={isCreating}
                        onClick={handleClick}
                        type="button"
                    />
                }
            >
                <span className="absolute top-1/2 left-2.5 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-md border-none bg-muted text-muted-foreground sm:size-6">
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
                    <span className="absolute right-3 text-muted-foreground text-xs opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
                        Create
                    </span>
                )}
            </SidebarItem>
        </div>
    );
}

function CollectionsListRecommendations() {
    const { collectionSummaries, isRecommendationsOpen, recommendations } =
        useCollectionsState();
    const { setIsRecommendationsOpen } = useCollectionsActions();
    const { items, isLoading } = recommendations;

    if (collectionSummaries.length === 0 || items.length === 0 || isLoading) {
        return null;
    }

    return (
        <Collapsible
            className="flex flex-col gap-1 pt-0.5"
            onOpenChange={setIsRecommendationsOpen}
            open={isRecommendationsOpen}
        >
            <CollapsibleTrigger
                className="flex w-full items-center px-2.5 py-1.5 text-muted-foreground text-xs transition-colors duration-150 ease-out hover:text-foreground"
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
                <div className="flex flex-col gap-1">
                    {items.map((template) => (
                        <CollectionRecommendationItem
                            key={template.value}
                            template={template}
                        />
                    ))}
                </div>
            </CollapsiblePanel>
        </Collapsible>
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
    const { feedback } = useCollectionsState();
    const { onDismissFeedback } = useCollectionsActions();
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
    const { hasAnySelected, onClearCollectionFilters } = useCollectionsState();

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
    const { sort, isCollectionsListOpen } = useCollectionsState();
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
    const { requestCreate } = useCollectionsState();

    const onClick = useStableCallback(onClickProp);
    const handleClick = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            onClick?.(event);
            requestCreate();
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
    const { onDisableSmartCollections, onEnableSmartCollections } =
        useCollectionsActions();
    const { disabled, isLoading } = useSmartCollectionsPreference();

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
                    <PopoverTitle>
                        {disabled
                            ? "Smart Collections is off"
                            : "Let Cache do the organizing"}
                    </PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs leading-snug">
                        Smart Collections uses AI to automatically group your
                        saves into contextual collections as you add new
                        entries. Cache even learns your preferences over time.
                    </PopoverDescription>
                    <Button
                        className="w-fit px-0 text-muted-foreground text-xs"
                        onClick={
                            disabled
                                ? onEnableSmartCollections
                                : onDisableSmartCollections
                        }
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
}

/**
 * A single row in the collections list.
 *
 * Provides `CollectionsListItemContext` to its children so compound parts
 * can read the collection and selection state without prop drilling.
 */
function CollectionsListItem({
    className,
    collection,
    onMouseEnter: onMouseEnterProp,
    onMouseLeave: onMouseLeaveProp,
    style: styleProp,
    ...props
}: CollectionsListItemProps) {
    const { hoveredCollectionRef, selectedCollectionIdSet } =
        useCollectionsState();
    const handleMouseEnter = useStableCallback(onMouseEnterProp);
    const handleMouseLeave = useStableCallback(onMouseLeaveProp);
    const isSelected = selectedCollectionIdSet.has(collection.id);
    const style = getCollectionItemStyle(collection.name, isSelected);

    const onMouseEnter = useStableCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            hoveredCollectionRef.current = collection;
            handleMouseEnter?.(event);
        }
    );

    const onMouseLeave = useStableCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (hoveredCollectionRef.current?.id === collection.id) {
                hoveredCollectionRef.current = null;
            }
            handleMouseLeave?.(event);
        }
    );

    return (
        <CollectionsListItemContext value={{ collection, isSelected }}>
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

/**
 * Previewable trigger that cycles through collection thumbnails on hover.
 *
 * Clicking selects the collection and closes the preview popup.
 * The popup stays closed until at least one thumbnail has actually loaded
 * so the first frame is never a blank shell.
 */
function CollectionsListItemTrigger({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof PreviewCardTrigger>) {
    const { collectionPreviewThumbnailUrlsById, onSelectCollection } =
        useCollectionsState();
    const { collection, isSelected } = useCollectionsListItemContext();
    // Intent from Base UI (delayed open / close). Armed is pointer presence so
    // we can warm images during the open delay without mount-time N preloads.
    const [isOpenIntent, setIsOpenIntent] = React.useState(false);
    const [isArmed, setIsArmed] = React.useState(false);

    const thumbnails =
        collectionPreviewThumbnailUrlsById.get(collection.id) ??
        EMPTY_PREVIEW_THUMBNAILS;

    const shouldLoad = isArmed || isOpenIntent;
    const { activeSlide, reportSlideError } = useCollectionPreviewPlayback(
        shouldLoad,
        isOpenIntent,
        thumbnails
    );

    // Gate the visible popup on a ready slide, but hard-clear intent on leave
    // so a late load cannot ghost-open after the pointer is gone.
    const isOpen = isOpenIntent && activeSlide !== null;

    const onClick = useStableCallback(onClickProp);

    const handleClick = useStableCallback(
        (
            event: BaseUIEvent<React.MouseEvent<HTMLAnchorElement, MouseEvent>>
        ) => {
            onClick?.(event);
            onSelectCollection(collection.id);
            setIsOpenIntent(false);
            setIsArmed(false);
        }
    );

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        setIsOpenIntent(nextOpen);
    });

    const handlePointerEnter = useStableCallback(() => {
        setIsArmed(true);
    });

    const handlePointerLeave = useStableCallback(() => {
        setIsArmed(false);
        setIsOpenIntent(false);
    });

    return (
        <PreviewCard onOpenChange={handleOpenChange} open={isOpen}>
            <PreviewCardTrigger
                {...props}
                {...(isSelected ? { "data-active": true } : {})}
                closeDelay={0}
                onClick={handleClick}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-10.5 text-left before:bg-(--collection-background) hover:bg-transparent focus-visible:ring-(--accent-color)"
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

/**
 * Crossfading stack of ready collection thumbnails.
 *
 * Slides are preloaded before they become active, so layout always has a
 * known aspect ratio and the outgoing layer can fade from opacity 1 → 0
 * while the incoming layer fades 0 → 1 after a paint (real crossfade).
 */
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
    const animationFrame = useAnimationFrame();

    if (current.src !== activeSlide.src) {
        setOutgoing(current);
        setCurrent(activeSlide);
        setIsFading(false);
    }

    useIsoLayoutEffect(() => {
        if (outgoing === null) {
            return;
        }

        // Layout effect runs before paint, so the prepare frame (outgoing at
        // opacity 1, incoming at 0) is committed first. The next animation
        // frame starts the opacity transition.
        animationFrame.request(() => {
            setIsFading(true);
        });

        fadeTimeout.start(PREVIEW_CROSSFADE_MS, () => {
            setOutgoing(null);
            setIsFading(false);
        });

        return () => {
            animationFrame.cancel();
            fadeTimeout.clear();
        };
    }, [animationFrame, current.src, fadeTimeout, outgoing]);

    const handleCurrentError = useStableCallback(() => {
        onSlideError(current.src);
    });

    return (
        <div
            className="relative w-full"
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
                    src={outgoing.src}
                    style={{
                        transitionDuration: `${PREVIEW_CROSSFADE_MS}ms`,
                    }}
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
                onError={handleCurrentError}
                src={current.src}
                style={{
                    transitionDuration: `${PREVIEW_CROSSFADE_MS}ms`,
                }}
            />
        </div>
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
                className="max-w-full shrink-0 truncate font-medium text-sm tracking-tight"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {collection.sources.length > 0 ? (
                <span className="max-w-full flex-1 truncate py-px text-[11px] text-muted-foreground opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-80">
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
function CollectionsListItemPriorityCombobox() {
    const { pendingPriorityComboboxCollectionId } = useCollectionsState();
    const { onUpdatePriority, setPendingPriorityComboboxCollectionId } =
        useCollectionsActions();
    const { collection } = useCollectionsListItemContext();
    const SelectedPriorityIcon = getPriorityOption(collection.priority).icon;

    const isOpen = pendingPriorityComboboxCollectionId === collection.id;

    const handleOpenChange = useStableCallback((open: boolean) => {
        if (open) {
            setPendingPriorityComboboxCollectionId(collection.id);
        } else {
            setPendingPriorityComboboxCollectionId(null);
        }
    });

    const handleValueChange = useStableCallback((nextPriority) => {
        if (!nextPriority || nextPriority === collection.priority) {
            setPendingPriorityComboboxCollectionId(null);
            return;
        }
        onUpdatePriority(collection.id, nextPriority);
        setPendingPriorityComboboxCollectionId(null);
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
                        className="absolute top-1/2 left-2.5 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--accent-color) transition-transform duration-100 ease-out active:scale-[0.97]"
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
                    <p className="text-[11px] text-muted-foreground leading-tight">
                        Set a priority to highlight your collections based on
                        their relevance to you
                    </p>
                </div>
            </ComboboxPopup>
        </Combobox>
    );
}

function CollectionsListItemShareSubMenu() {
    const { pendingShareIdSet } = useCollectionsState();
    const {
        onCopyShareLink: onCopyShareLinkAction,
        onDisableShare: onDisableShareAction,
        onEnableShare: onEnableShareAction,
    } = useCollectionsActions();
    const { collection } = useCollectionsListItemContext();
    const isShared = !!collection.shareId;
    const isSharePending = pendingShareIdSet.has(collection.id);

    const handleCopyShareLink = useStableCallback(() =>
        onCopyShareLinkAction(collection)
    );
    const handleDisableShare = useStableCallback(() =>
        onDisableShareAction(collection)
    );
    const handleEnableShare = useStableCallback(() =>
        onEnableShareAction(collection)
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
                        disabled={isSharePending}
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
                        disabled={isSharePending}
                        onClick={handleDisableShare}
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
function CollectionsListItemExportSubMenu() {
    const { pendingNotionCollectionIdSet } = useCollectionsState();
    const {
        onCopyLinks: onCopyLinksAction,
        onCopyTitle: onCopyTitleAction,
        onExportCsv: onExportCsvAction,
        onOpenLinks: onOpenLinksAction,
        onSendToNotion: onSendToNotionAction,
    } = useCollectionsActions();
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    const handleCopyLinks = useStableCallback(() =>
        onCopyLinksAction(collection)
    );
    const handleCopyTitle = useStableCallback(() =>
        onCopyTitleAction(collection)
    );
    const handleExportCsv = useStableCallback(() =>
        onExportCsvAction(collection)
    );
    const handleOpenLinks = useStableCallback(() =>
        onOpenLinksAction(collection)
    );
    const handleSendToNotion = useStableCallback(() =>
        onSendToNotionAction(collection)
    );
    const isSendingToNotion = pendingNotionCollectionIdSet.has(collection.id);

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
                    disabled={!hasItems || isSendingToNotion}
                    onClick={handleSendToNotion}
                >
                    <NotionIcon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    {isSendingToNotion
                        ? "Sending to Notion..."
                        : "Send to Notion"}
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionsListItemMetadataProps {
    children?: React.ReactNode;
}

/**
 * Action menu and metadata for a collection list item.
 *
 * Renders children (typically a count or recency badge) that hides on hover,
 * replacing it with an ellipsis menu. Keyboard shortcuts (E, Delete/Backspace,
 * C, Option+F) are active while hovered.
 */
function CollectionsListItemMetadata({
    children,
}: CollectionsListItemMetadataProps) {
    const { favoriteCollectionIdSet } = useCollectionsState();
    const {
        onRename: onRenameAction,
        onDelete: onDeleteAction,
        onFavoriteToggle: onFavoriteToggleAction,
        onDuplicate: onDuplicateAction,
        onUpdatePriority: onUpdatePriorityAction,
    } = useCollectionsActions();
    const { collection } = useCollectionsListItemContext();
    const isFavorite = favoriteCollectionIdSet.has(collection.id);
    const isArchived = collection.priority === "archive";

    const handleRename = useStableCallback(() => onRenameAction(collection));
    const handleDelete = useStableCallback(() => onDeleteAction(collection));
    const handleFavoriteToggle = useStableCallback(() => {
        onFavoriteToggleAction(collection);
    });
    const handleMakeCopy = useStableCallback(() =>
        onDuplicateAction(collection)
    );
    const handleArchive = useStableCallback(() =>
        onUpdatePriorityAction(collection.id, "archive")
    );

    const updatedAt = dayjs(collection.updatedAt);

    return (
        <div className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums transition-opacity duration-150 ease-out focus-visible:opacity-0 group-focus-within:opacity-0 pointer-fine:group-hover:opacity-0">
                {children}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            aria-label={`Collection actions for ${collection.name}`}
                            className="absolute opacity-100 pointer-fine:opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100 group-focus:opacity-100 data-popup-open:bg-muted data-popup-open:opacity-100"
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
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                        <MenuItem onClick={handleMakeCopy}>
                            <CopyPlus
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Make a copy
                        </MenuItem>
                        <MenuItem disabled={isArchived} onClick={handleArchive}>
                            <ArchiveIcon
                                aria-hidden
                                className="size-4 text-muted-foreground"
                                focusable="false"
                            />
                            Archive
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
    const { pendingRename, showSuccess } = useCollectionsState();
    const { syncName, setPendingRename } = useCollectionsActions();
    const isOpen = pendingRename !== null;
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [, startRename] = React.useTransition();
    const renameSubmissionPendingRef = React.useRef(false);

    const [nameDraft, setNameDraft] = React.useState(
        () => pendingRename?.name ?? ""
    );
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    // Sync draft before paint so the input never flashes empty on open.
    useIsoLayoutEffect(() => {
        if (pendingRename) {
            setNameDraft(pendingRename.name);
            setErrorMessage(null);
            setIsSubmitting(false);
        }
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

    const handleOpenChange = useStableCallback((open: boolean) => {
        if (!(open || renameSubmissionPendingRef.current)) {
            setPendingRename(null);
        }
    });

    const handleSubmit = useStableCallback(() => {
        if (isSubmitting || renameSubmissionPendingRef.current) {
            return;
        }

        const target = pendingRename;
        if (!target) {
            return;
        }

        const previousName = target.name;
        const nextName = normalizeWhitespace(nameDraft);

        if (nextName.length === 0) {
            setErrorMessage(NAME_REQUIRED_MESSAGE);
            return;
        }

        if (nextName === previousName) {
            setPendingRename(null);
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
                    setPendingRename(null);
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

    const handleFormSubmit = useStableCallback((event: React.ChangeEvent) => {
        event.preventDefault();
        handleSubmit();
    });

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
    errorMessage: string | null;
    nameDraft: string;
}

const INITIAL_CREATE_FORM_STATE: CreateFormState = {
    descriptionDraft: "",
    errorMessage: null,
    nameDraft: "",
};

function CollectionsCreateDialog() {
    const { createItemId, isCreateOpen, showSuccess } = useCollectionsState();
    const {
        createSubmissionPendingRef,
        onEnableSmartCollections,
        onRecommendationsMutate,
        setIsCreateOpen,
        syncCreated,
    } = useCollectionsActions();
    const { disabled } = useSmartCollectionsPreference();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [, startCreate] = React.useTransition();

    const [formState, setFormState] = React.useState(INITIAL_CREATE_FORM_STATE);

    // Reset before paint so reopening never shows the previous draft.
    useIsoLayoutEffect(() => {
        if (isCreateOpen) {
            setFormState(INITIAL_CREATE_FORM_STATE);
            setIsSubmitting(false);
        }
    }, [isCreateOpen]);

    const { descriptionDraft, errorMessage, nameDraft } = formState;
    const isNameValid = normalizeWhitespace(nameDraft).length > 0;
    const nameInputId = React.useId();
    const errorId = React.useId();
    const descriptionInputId = React.useId();

    const handleNameDraftChange = useStableCallback((draft: string) => {
        setFormState((current) =>
            current.errorMessage
                ? { ...current, errorMessage: null, nameDraft: draft }
                : { ...current, nameDraft: draft }
        );
    });

    const handleOpenChange = useStableCallback((open: boolean) => {
        if (!open && createSubmissionPendingRef.current) {
            return;
        }
        setIsCreateOpen(open);
    });

    const handleSubmit = useStableCallback(() => {
        const name = normalizeWhitespace(nameDraft);
        if (name.length === 0) {
            setFormState((current) => ({
                ...current,
                errorMessage: NAME_REQUIRED_MESSAGE,
            }));
            return;
        }

        if (isSubmitting || createSubmissionPendingRef.current) {
            return;
        }
        createSubmissionPendingRef.current = true;
        setIsSubmitting(true);

        startCreate(async () => {
            try {
                const result = await createCollectionSafely({
                    assignToItemId: createItemId ?? undefined,
                    description:
                        normalizeWhitespace(descriptionDraft) || undefined,
                    name,
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
                showSuccess(`${result.collection.name} created.`);
                setIsCreateOpen(false);
            } finally {
                createSubmissionPendingRef.current = false;
                setIsSubmitting(false);
            }
        });
    });

    const handleFormSubmit = useStableCallback((event: React.ChangeEvent) => {
        event.preventDefault();
        handleSubmit();
    });

    const handleNameChange = useStableCallback(
        (event: React.ChangeEvent<HTMLInputElement>) =>
            handleNameDraftChange(event.currentTarget.value)
    );

    const handleDescriptionChange = useStableCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const nextDescriptionDraft = event.currentTarget.value;
            setFormState((current) => ({
                ...current,
                descriptionDraft: nextDescriptionDraft,
            }));
        }
    );

    const handleCreateFromTemplate = useStableCallback(
        (value: TemplateValue | null) => {
            if (isSubmitting || createSubmissionPendingRef.current) {
                return;
            }
            if (!value) {
                return;
            }
            const template = TEMPLATE_BY_VALUE.get(value);
            if (!template) {
                return;
            }
            setFormState((current) =>
                current.errorMessage
                    ? { ...current, errorMessage: null }
                    : current
            );
            createSubmissionPendingRef.current = true;
            setIsSubmitting(true);

            startCreate(async () => {
                try {
                    const result = await createCollectionSafely({
                        assignToItemId: createItemId ?? undefined,
                        description: template.description,
                        name: template.name,
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
                    onRecommendationsMutate();
                    showSuccess(`${template.name} created from template.`);
                    setIsCreateOpen(false);
                } finally {
                    createSubmissionPendingRef.current = false;
                    setIsSubmitting(false);
                }
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
                            <Textarea
                                className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                id={descriptionInputId}
                                isUnstyled
                                maxLength={1024}
                                onChange={handleDescriptionChange}
                                placeholder="Describe what belongs here..."
                                size="lg"
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
                                <p>
                                    Collections keep your best saves and content
                                    in one place. Use them for ongoing goals, or
                                    just to keep things tidy. Smart Collections
                                    can auto-assign matching entries to it.{" "}
                                    {disabled === true ? (
                                        <Button
                                            className="inline-flex h-fit! w-fit px-0 leading-tight sm:text-[11px]"
                                            onClick={onEnableSmartCollections}
                                            size="xs"
                                            type="button"
                                            variant="link"
                                        >
                                            Turn on Smart Collections
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
                                disabled={isSubmitting}
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
                                        entries that match these templates – no
                                        extra work for you.
                                    </p>
                                </div>
                            </ComboboxPopup>
                        </Combobox>
                        <Button
                            disabled={!isNameValid}
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
    const { pendingDelete, showSuccess, showError } = useCollectionsState();
    const { setPendingDelete, syncDeleted } = useCollectionsActions();
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
            setPendingDelete(null);
            showSuccess(`${result.collection.name} deleted.`);
        });
    });

    const handleOpenChange = useStableCallback((open: boolean) => {
        if (!(open || isSubmitting)) {
            setPendingDelete(null);
        }
    });

    const handleFormSubmit = useStableCallback((event: React.ChangeEvent) => {
        event.preventDefault();
        handleConfirm();
    });

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
