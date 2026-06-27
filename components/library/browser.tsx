"use client";

import {
    BlockPaywallBanner,
    InlinePaywallBanner,
} from "@/components/billing/paywall";
import { useSubscriptionAccess } from "@/components/billing/subscription";
import {
    Composer,
    ComposerActionClear,
    ComposerActionNew,
    ComposerActionNewCollection,
    ComposerActionOnboarding,
    ComposerActions,
    ComposerInput,
    ComposerSuggestions,
    type CommandSuggestion,
    type PaletteStackEntry,
} from "@/components/library/composer";
import type { NoteDraft } from "@/components/library/notes";
import {
    QuickLookDrawer,
    QuickLookDrawerSurface,
    QuickLookDrawerTrigger,
} from "@/components/library/quick-look";
import {
    NAME_COLLATOR,
    OpenFavoriteItemRefContext,
    useWorkspaceContext,
} from "@/components/library/workspace";
import {
    Attachment,
    AttachmentInfo,
    AttachmentPreview,
    AttachmentPreviewCard,
    AttachmentPreviewCardPopup,
    AttachmentPreviewCardTrigger,
    AttachmentRemove,
    Attachments,
    getAttachmentLabel,
    getMediaCategory,
} from "@/components/ui/attachments";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { BackToTopButton } from "@/components/ui/back-to-top-button";
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
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import {
    Drawer,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerViewport,
} from "@/components/ui/drawer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { AltKbd, CmdKbd, Kbd } from "@/components/ui/kbd";
import { Masonry } from "@/components/ui/masonry";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Ticker } from "@/components/ui/ticker";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { useLastVisited } from "@/hooks/use-last-visited";
import type { CollectionCreateFromItemsResult } from "@/lib/collections/actions";
import { downloadMedia } from "@/lib/collections/actions";
import {
    deleteLibraryItem,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemDeleteResult,
    type LibraryItemsCollectionsUpdateResult,
} from "@/lib/collections/items";
import {
    itemPreviewImageUrl,
    itemPreviewVideoUrl,
    type LibraryCollectionSummary,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { removeValue, toggleValue } from "@/lib/common/arrays";
import { cn } from "@/lib/common/cn";
import { getColorGradientFromName } from "@/lib/common/colors";
import {
    CACHE_EXTENSION_DOWNLOAD_URL,
    FALLBACK_URL,
    ITEM_KIND_NOTE,
} from "@/lib/common/constants";
import { parseDate } from "@/lib/common/dates";
import { getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import {
    revokeFileAttachmentObjectUrl,
    saveFile,
    type createFileAttachment,
} from "@/lib/common/file";
import { filterValidImageUrls } from "@/lib/common/image";
import { getImageColors } from "@/lib/common/image-colors";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    escapeCsv,
    getNoteExcerpt,
    normalizeWhitespace,
    slugify,
    truncateLabel,
} from "@/lib/common/strings";
import {
    normalizeURL,
    openExternal,
    parseDisplayUrl,
    toValidUrl,
} from "@/lib/common/url";
import {
    createChromeBookmarkFromUrl,
    type CreateChromeBookmarkFromUrlResult,
} from "@/lib/integrations/chrome/actions";
import {
    createNote,
    updateNote,
    type NoteMutationResult,
} from "@/lib/integrations/notes/actions";
import { getSourceIcon } from "@/lib/integrations/support";
import { askCache, getSectionDescription } from "@/lib/intelligence/actions";
import type {
    AskCacheComposerPatch,
    AskCacheRequest,
    AskCacheResult,
} from "@/lib/intelligence/composer/ask-cache";
import {
    ASK_CACHE_CONTEXT_COLLECTION_LIMIT,
    ASK_CACHE_CONTEXT_DOMAIN_LIMIT,
} from "@/lib/intelligence/composer/ask-cache";
import {
    SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT,
    SECTION_DESCRIPTION_DOMAIN_MAX_LENGTH,
    SECTION_DESCRIPTION_TEXT_MAX_LENGTH,
    SECTION_DESCRIPTION_TITLE_MAX_LENGTH,
    SECTION_DESCRIPTION_URL_MAX_LENGTH,
    SectionDescriptionRequestSchema,
    type SectionDescriptionContextItem,
} from "@/lib/intelligence/overview";
import { LibraryItemSource } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import type {
    AutocompleteRootChangeEventDetails,
    BaseUIEvent,
} from "@base-ui/react";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { T } from "gt-next";
import {
    ArrowDownWideNarrow,
    ArrowUpIcon,
    ArrowUpRight,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDown,
    ChevronsUp,
    ChevronUp,
    CircleDashed,
    CircleFadingPlus,
    Component,
    DownloadIcon,
    Ellipsis,
    ExternalLinkIcon,
    EyeIcon,
    FilePenLineIcon,
    FileSpreadsheetIcon,
    FolderOpen,
    Funnel,
    Globe,
    History,
    Layers3,
    LinkIcon,
    ListChevronsUpDown,
    RotateCcw,
    SearchIcon,
    SearchX,
    Squircle,
    Star,
    Tags,
    Volume2Icon,
    VolumeXIcon,
    XIcon,
    ZoomIn,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";

import type { ReactNode } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { Streamdown } from "streamdown";
import useSWR from "swr";

const log = createLogger("library:browser");

const CSV_CONTENT_TYPE = "text/csv";

const CSV_HEADERS = [
    "Section",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const SUGGESTION_LIMIT = 3;
const SUGGESTION_ICON_CLASS = "size-3.5 shrink-0";
const MULTI_WORD_QUERY_PATTERN = /\S+\s+\S+/;

interface BuildCommandSuggestionsInput {
    clearLibraryPalette: () => void;
    collectionMembershipFilter: CollectionMembershipFilter;
    collections: LibraryCollectionSummary[];
    domainFilters: string[];
    groupBy: GroupByMode;
    isExtensionInstalled: boolean;
    items: LibraryItemWithCollections[];
    lastVisitedFilterEnabled: boolean;
    onClearCollectionFilters: () => void;
    onCreateCollection: () => void;
    onToggleCollectionSelection: (id: string) => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setIsCommandOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setQuery: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | LibraryItemSource[]
            | ((value: LibraryItemSource[]) => LibraryItemSource[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: LibraryItemSource[];
}

function buildCommandSuggestions({
    clearLibraryPalette,
    collectionMembershipFilter,
    collections,
    items,
    lastVisitedFilterEnabled,
    onClearCollectionFilters,
    onCreateCollection,
    onToggleCollectionSelection,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setDomainFilters,
    setGroupBy,
    setIsCommandOpen,
    setQuery,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sourceFilters,
    domainFilters,
    groupBy,
    isExtensionInstalled,
    sortMode,
}: BuildCommandSuggestionsInput): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const suggestionLabels = new Set<string>();
    const collectionById = new Map(
        collections.map((collection) => [collection.id, collection])
    );
    const collectionCounts = new Map<string, number>();
    const sourceCounts = new Map<LibraryItemSource, number>();
    const domainCounts = new Map<string, number>();
    const addedMonthKeys = new Set<string>();
    const createdMonthKeys = new Set<string>();
    const addedYearKeys = new Set<string>();
    const createdYearKeys = new Set<string>();

    for (const item of items) {
        const itemCollectionIds = new Set<string>();
        for (const collection of item.collections) {
            if (itemCollectionIds.has(collection.id)) {
                continue;
            }
            itemCollectionIds.add(collection.id);
            collectionCounts.set(
                collection.id,
                (collectionCounts.get(collection.id) ?? 0) + 1
            );
        }
        sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
        const domain = itemDomain(item.url);
        domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
        addedMonthKeys.add(itemMonthKey(item, "added"));
        createdMonthKeys.add(itemMonthKey(item, "created"));
        addedYearKeys.add(itemYearKey(item, "added"));
        createdYearKeys.add(itemYearKey(item, "created"));
    }

    const hasAnyRefinements =
        searchTerms.length > 0 ||
        selectedCollectionIds.length > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        lastVisitedFilterEnabled;

    const commitSelection = (fn: () => void) => () => {
        fn();
        setQuery("");
        setIsCommandOpen(false);
    };

    const addSuggestion = (suggestion: CommandSuggestion | null) => {
        if (
            suggestion === null ||
            suggestionLabels.has(suggestion.label) ||
            suggestions.length >= SUGGESTION_LIMIT
        ) {
            return;
        }

        suggestionLabels.add(suggestion.label);
        suggestions.push(suggestion);
    };

    const addDefaultSuggestion = (suggestion: CommandSuggestion | null) => {
        if (hasAnyRefinements) {
            return;
        }

        addSuggestion(suggestion);
    };

    const pickTopEntry = <T,>(
        counts: Map<T, number>,
        isAllowed: (value: T) => boolean,
        getLabel: (value: T) => string
    ): T | null => {
        const entries = Array.from(counts.entries()).filter(([value]) =>
            isAllowed(value)
        );

        entries.sort(
            ([aValue, aCount], [bValue, bCount]) =>
                bCount - aCount ||
                NAME_COLLATOR.compare(getLabel(aValue), getLabel(bValue))
        );

        return entries[0]?.[0] ?? null;
    };

    const topCollectionId = pickTopEntry(
        collectionCounts,
        (collectionId) => !selectedCollectionIds.includes(collectionId),
        (collectionId) => collectionById.get(collectionId)?.name ?? collectionId
    );
    const topSource = pickTopEntry(
        sourceCounts,
        (source) => !sourceFilters.includes(source),
        (source) => sourceLabel(source)
    );
    const topDomain = pickTopEntry(
        domainCounts,
        (domain) => !domainFilters.includes(domain),
        (domain) => domain
    );

    const topCollection =
        topCollectionId === null ? null : collectionById.get(topCollectionId);

    const currentGroupCount = getGroupCount(items, groupBy);

    const buildCollectionSuggestion = (): CommandSuggestion | null => {
        if (!topCollection) {
            return null;
        }

        const collectionLabel = truncateLabel(topCollection.name, 24);
        let label = `Browse \u201c${collectionLabel}\u201d`;
        if (selectedCollectionIds.length > 0) {
            label = `Add \u201c${collectionLabel}\u201d collection`;
        } else if (hasAnyRefinements) {
            label = `Filter to \u201c${collectionLabel}\u201d`;
        }

        return {
            icon: <FolderOpen className={SUGGESTION_ICON_CLASS} />,
            label,
            onSelect: commitSelection(() =>
                onToggleCollectionSelection(topCollection.id)
            ),
        };
    };

    const buildSourceSuggestion = (): CommandSuggestion | null => {
        if (!topSource) {
            return null;
        }

        return {
            icon: <Funnel className={SUGGESTION_ICON_CLASS} />,
            label: `Filter by ${sourceLabel(topSource)}`,
            onSelect: commitSelection(() =>
                setSourceFilters((current) => toggleValue(current, topSource))
            ),
        };
    };

    const buildDomainSuggestion = (): CommandSuggestion | null => {
        if (!topDomain) {
            return null;
        }

        return {
            icon: <Globe className={SUGGESTION_ICON_CLASS} />,
            label: `Filter to ${truncateLabel(topDomain, 24)}`,
            onSelect: commitSelection(() =>
                setDomainFilters((current) => toggleValue(current, topDomain))
            ),
        };
    };

    let groupingCandidates: GroupByMode[] = [
        "source",
        "domain",
        "collection",
        "year-added",
        "year-created",
        "month-added",
        "month-created",
    ];
    if (sourceFilters.length > 0) {
        groupingCandidates = [
            "domain",
            "collection",
            "year-added",
            "year-created",
            "month-added",
            "month-created",
            "source",
        ];
    } else if (domainFilters.length > 0) {
        groupingCandidates = [
            "source",
            "collection",
            "year-added",
            "year-created",
            "month-added",
            "month-created",
            "domain",
        ];
    }

    const nextGroupBy =
        groupingCandidates.find((mode) => {
            if (mode === groupBy) {
                return false;
            }

            if (mode === "source") {
                return sourceCounts.size > 1;
            }
            if (mode === "domain") {
                return domainCounts.size > 1;
            }
            if (mode === "collection") {
                return collectionCounts.size > 0;
            }
            if (mode === "month-added") {
                return addedMonthKeys.size > 1;
            }
            if (mode === "month-created") {
                return createdMonthKeys.size > 1;
            }
            if (mode === "year-added") {
                return addedYearKeys.size > 1;
            }
            return createdYearKeys.size > 1;
        }) ?? null;

    const buildGroupingSuggestion = (): CommandSuggestion | null => {
        if (!nextGroupBy) {
            return null;
        }

        const label =
            groupBy === "none"
                ? `Group by ${groupByLabel(nextGroupBy).toLowerCase()}`
                : `Try ${groupByLabel(nextGroupBy).toLowerCase()} groups`;

        return {
            icon: <Layers3 className={SUGGESTION_ICON_CLASS} />,
            label,
            onSelect: commitSelection(() => setGroupBy(nextGroupBy)),
        };
    };

    if (
        groupBy !== "none" &&
        sortMode !== "count-desc" &&
        currentGroupCount > 1
    ) {
        addSuggestion({
            icon: <ArrowDownWideNarrow className={SUGGESTION_ICON_CLASS} />,
            label: "Sort groups by size",
            onSelect: commitSelection(() => setSortMode("count-desc")),
        });
    }

    if (!isExtensionInstalled) {
        addDefaultSuggestion({
            icon: <DownloadIcon className={SUGGESTION_ICON_CLASS} />,
            label: "Get extension",
            onSelect: commitSelection(() =>
                openExternal(CACHE_EXTENSION_DOWNLOAD_URL)
            ),
        });
    }

    if (!hasAnyRefinements) {
        addDefaultSuggestion(buildCollectionSuggestion());
        addDefaultSuggestion(buildSourceSuggestion());
        addDefaultSuggestion(buildGroupingSuggestion());
        addDefaultSuggestion(buildDomainSuggestion());
    } else if (selectedCollectionIds.length > 0) {
        addSuggestion(buildSourceSuggestion());
        addSuggestion(buildDomainSuggestion());
        addSuggestion(buildGroupingSuggestion());
        addSuggestion(buildCollectionSuggestion());
    } else if (
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        searchTerms.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER
    ) {
        addSuggestion(buildCollectionSuggestion());
        addSuggestion(buildGroupingSuggestion());
        addSuggestion(buildSourceSuggestion());
        addSuggestion(buildDomainSuggestion());
    } else {
        addSuggestion(buildCollectionSuggestion());
        addSuggestion(buildSourceSuggestion());
        addSuggestion(buildGroupingSuggestion());
        addSuggestion(buildDomainSuggestion());
    }

    if (items.length === 0 || suggestions.length < SUGGESTION_LIMIT) {
        if (searchTerms.length > 0) {
            addSuggestion({
                icon: <SearchX className={SUGGESTION_ICON_CLASS} />,
                label: "Clear searches",
                onSelect: commitSelection(() => setSearchTerms([])),
            });
        }

        if (selectedCollectionIds.length > 0) {
            addSuggestion({
                icon: <FolderOpen className={SUGGESTION_ICON_CLASS} />,
                label: "Show all collections",
                onSelect: commitSelection(onClearCollectionFilters),
            });
        }

        if (sourceFilters.length > 0) {
            addSuggestion({
                icon: <Funnel className={SUGGESTION_ICON_CLASS} />,
                label: "Show all sources",
                onSelect: commitSelection(() => setSourceFilters([])),
            });
        }

        if (domainFilters.length > 0) {
            addSuggestion({
                icon: <Globe className={SUGGESTION_ICON_CLASS} />,
                label: "Show all domains",
                onSelect: commitSelection(() => setDomainFilters([])),
            });
        }

        if (
            collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER
        ) {
            addSuggestion({
                icon: <Tags className={SUGGESTION_ICON_CLASS} />,
                label: "Show all items",
                onSelect: commitSelection(() =>
                    setCollectionMembershipFilter(
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER
                    )
                ),
            });
        }

        if (groupBy !== "none") {
            addSuggestion({
                icon: <Layers3 className={SUGGESTION_ICON_CLASS} />,
                label: "Clear grouping",
                onSelect: commitSelection(() => setGroupBy("none")),
            });
        }

        if (sortMode !== DEFAULT_SORT_MODE) {
            addSuggestion({
                icon: <ArrowDownWideNarrow className={SUGGESTION_ICON_CLASS} />,
                label: "Reset sort",
                onSelect: commitSelection(() => setSortMode(DEFAULT_SORT_MODE)),
            });
        }

        if (hasAnyRefinements) {
            addSuggestion({
                icon: <RotateCcw className={SUGGESTION_ICON_CLASS} />,
                label: "Reset browser",
                onSelect: commitSelection(clearLibraryPalette),
            });
        }
    }

    if (items.length === 0 && !hasAnyRefinements) {
        addSuggestion({
            icon: <FolderOpen className={SUGGESTION_ICON_CLASS} />,
            label: "Create a new collection",
            onSelect: commitSelection(() => onCreateCollection()),
        });
    }

    return suggestions;
}

interface SectionDescriptionResponse {
    summary: string;
}

type SectionDescriptionSWRKey = readonly [requestBody: string];

async function fetchSectionDescription([
    payload,
]: SectionDescriptionSWRKey): Promise<SectionDescriptionResponse> {
    let rawInput: unknown;
    try {
        rawInput = JSON.parse(payload);
    } catch {
        throw new Error("Failed to parse section description request payload.");
    }

    const parsed = SectionDescriptionRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
        throw new Error(
            "Section description request failed schema validation."
        );
    }

    const result = await getSectionDescription(parsed.data);

    if (result.status !== "SUCCESS") {
        throw new Error(result.message);
    }

    const summary = result.summary.trim();
    if (summary.length === 0) {
        throw new Error("Section description response was empty.");
    }

    return { summary };
}

function getSectionDescriptionSWRKey(
    payload: string,
    itemCount: number
): SectionDescriptionSWRKey | null {
    return itemCount > 0 ? [payload] : null;
}

function normalizeSectionDescriptionText(
    value: string | null | undefined,
    maxLength: number
): string {
    const normalized = normalizeWhitespace(value ?? "");
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function toIsoTimestamp(value: Date | string | null | undefined) {
    const date = parseDate(value);
    return date?.toISOString();
}

function buildSectionDescriptionContextItem(
    item: LibraryItemWithCollections
): SectionDescriptionContextItem {
    const title =
        normalizeSectionDescriptionText(
            getItemTitle(item),
            SECTION_DESCRIPTION_TITLE_MAX_LENGTH
        ) || "Untitled";

    const noteExcerpt =
        item.kind === "note"
            ? normalizeSectionDescriptionText(
                  getNoteExcerpt(item.noteContentText),
                  SECTION_DESCRIPTION_TEXT_MAX_LENGTH
              ) || undefined
            : undefined;

    const primaryText =
        noteExcerpt ??
        (normalizeSectionDescriptionText(
            itemPrimaryText(item),
            SECTION_DESCRIPTION_TEXT_MAX_LENGTH
        ) ||
            title);

    const normalizedUrl =
        item.kind === "note"
            ? undefined
            : normalizeSectionDescriptionText(
                  normalizeURL(item.url),
                  SECTION_DESCRIPTION_URL_MAX_LENGTH
              ) || undefined;

    const domain =
        item.kind === "note"
            ? undefined
            : normalizeSectionDescriptionText(
                  itemDomain(item.url),
                  SECTION_DESCRIPTION_DOMAIN_MAX_LENGTH
              ) || undefined;

    return {
        addedAt: toIsoTimestamp(item.scrapedAt ?? item.createdAt),
        createdAt: toIsoTimestamp(
            item.postedAt ?? item.scrapedAt ?? item.createdAt
        ),
        domain,
        kind: item.kind === "note" ? "note" : "bookmark",
        noteExcerpt,
        primaryText,
        source: item.source,
        title,
        url: normalizedUrl,
    };
}

const COMBOBOX_ITEM_PRESS_REASON = "item-press";
const COMBOBOX_ESCAPE_KEY_REASON = "escape-key";
const ALL_DOMAIN_FILTER = "__all_domains__";
const UNSPECIFIC_DOMAIN_FILTER = "Other";

const SEARCH_HOTKEYS = [
    "ctrl+g",
    "ctrl+k",
    "ctrl+p",
    "cmd+g",
    "cmd+k",
    "cmd+p",
    "Meta+g",
    "Meta+k",
    "Meta+p",
    "/",
] as const;

const COLLECTION_NAME_MAX_LENGTH = 64;

type GroupByMode =
    | "none"
    | "source"
    | "domain"
    | "collection"
    | "year-added"
    | "year-created"
    | "month-added"
    | "month-created";

type SortMode =
    | "added-newest"
    | "added-oldest"
    | "created-newest"
    | "created-oldest"
    | "count-desc"
    | "source"
    | "domain"
    | "title";

type CollectionMembershipFilter =
    | "all"
    | "in-collections"
    | "not-in-collections";
type ColumnCountMode = "auto" | "2" | "3" | "4" | "5" | "6";

type ContainerWidth = "comfortable" | "full";

type PaletteSection =
    | "search"
    | "filter"
    | "group"
    | "sort"
    | "columns"
    | "width"
    | "ai-response";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_CONTAINER_WIDTH: ContainerWidth = "comfortable";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
const NOTE_DRAWER_NEW = Symbol("note-drawer-new");

const COBALT_SOURCES = new Set<LibraryItemSource>([
    LibraryItemSource.google_photos,
    LibraryItemSource.instagram,
    LibraryItemSource.pinterest,
    LibraryItemSource.tiktok,
    LibraryItemSource.x_bookmarks,
    LibraryItemSource.youtube_watch_later,
]);

const DOMAIN_RELATED_SOURCES = new Set<LibraryItemSource>([
    LibraryItemSource.chrome_bookmarks,
    LibraryItemSource.other,
]);

const FILTERABLE_LIBRARY_SOURCES = [
    LibraryItemSource.cache_note,
    LibraryItemSource.chrome_bookmarks,
    LibraryItemSource.github_starred_repositories,
    LibraryItemSource.google_photos,
    LibraryItemSource.instagram,
    LibraryItemSource.pinterest,
    LibraryItemSource.tiktok,
    LibraryItemSource.x_bookmarks,
    LibraryItemSource.youtube_watch_later,
] as const satisfies LibraryItemSource[];

const SOURCE_LABEL_BY_VALUE: Partial<Record<string, string>> = {
    [LibraryItemSource.cache_note]: "Notes",
    [LibraryItemSource.chrome_bookmarks]: "Chrome",
    [LibraryItemSource.github_starred_repositories]: "GitHub",
    [LibraryItemSource.google_photos]: "Google Photos",
    [LibraryItemSource.instagram]: "Instagram",
    [LibraryItemSource.pinterest]: "Pinterest",
    [LibraryItemSource.tiktok]: "TikTok",
    [LibraryItemSource.x_bookmarks]: "X",
    [LibraryItemSource.youtube_watch_later]: "YouTube",
};

const EMPTY_LIBRARY_PEEK_PLACEHOLDERS = [
    { aspect: "aspect-[3/4]", id: "library-empty-peek-0" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-1" },
    { aspect: "aspect-square", id: "library-empty-peek-2" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-3" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-4" },
    { aspect: "aspect-square", id: "library-empty-peek-5" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-6" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-7" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-8" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-9" },
] as const;

const PALETTE_SORT_OPTIONS = [
    { label: "Added: Newest first", value: "added-newest" },
    { label: "Added: Oldest first", value: "added-oldest" },
    { label: "Created: Newest first", value: "created-newest" },
    { label: "Created: Oldest first", value: "created-oldest" },
    { label: "Count: Most items first", value: "count-desc" },
    { label: "Source", value: "source" },
    { label: "Domain", value: "domain" },
    { label: "Title", value: "title" },
] satisfies readonly { label: string; value: SortMode }[];

const PALETTE_GROUP_OPTIONS = [
    { label: "No grouping", value: "none" },
    { label: "Source", value: "source" },
    { label: "Domain", value: "domain" },
    { label: "Collection", value: "collection" },
    { label: "Year Added", value: "year-added" },
    { label: "Year Created", value: "year-created" },
    { label: "Month Added", value: "month-added" },
    { label: "Month Created", value: "month-created" },
] satisfies readonly { label: string; value: GroupByMode }[];

const PALETTE_COLUMN_OPTIONS = [
    { label: "Adjust automatically", value: "auto" },
    { label: "2 columns", value: "2" },
    { label: "3 columns", value: "3" },
    { label: "4 columns", value: "4" },
    { label: "5 columns", value: "5" },
    { label: "6 columns", value: "6" },
] satisfies readonly { label: string; value: ColumnCountMode }[];

const PALETTE_SOURCE_OPTIONS = [
    { label: "All sources", value: "all" },
    ...FILTERABLE_LIBRARY_SOURCES.map((source) => ({
        label: SOURCE_LABEL_BY_VALUE[source] ?? "Other",
        value: source,
    })),
    {
        label: SOURCE_LABEL_BY_VALUE[LibraryItemSource.other] ?? "Other",
        value: LibraryItemSource.other,
    },
] satisfies readonly { label: string; value: LibraryItemSource | "all" }[];

const PALETTE_SOURCE_FILTER_OPTIONS = PALETTE_SOURCE_OPTIONS.filter(
    (option): option is { label: string; value: LibraryItemSource } =>
        option.value !== "all"
);

export interface CommandPaletteItem {
    active?: boolean;
    description?: string;
    disabled?: boolean;
    label: string;
    onSelect: (
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void | Promise<void>;
    render?: (item: CommandPaletteItem) => ReactNode;
    shortcut?: string;
    value: string;
}

export interface CommandPaletteGroup {
    items: CommandPaletteItem[];
    label: string;
    layout?: "horizontal" | "vertical";
}

interface BrowserGroup {
    items: LibraryItemWithCollections[];
    key: string;
    title: string | null;
}

interface LibraryCommandAttachment
    extends ReturnType<typeof createFileAttachment> {
    id: string;
}

type AskCacheResponseState =
    | {
          prompt: string;
          status: "loading";
      }
    | {
          markdown: string;
          operationCount: number;
          prompt: string;
          status: "success";
      }
    | {
          message: string;
          prompt: string;
          status: "error";
      };

function itemDomain(url: string): string {
    return parseDisplayUrl(url) || UNSPECIFIC_DOMAIN_FILTER;
}

function buildBrowserSectionCsv(
    sectionTitle: string,
    items: LibraryItemWithCollections[]
): string {
    const rows = items.map((item) => [
        sectionTitle,
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

function getBrowserSectionExportFileName(sectionTitle: string): string {
    const slug = slugify(sectionTitle);
    return slug.length > 0 ? `${slug}-links` : "results-links";
}

function itemDate(
    item: LibraryItemWithCollections,
    mode: "added" | "created" = "added"
): Date {
    const value =
        mode === "created"
            ? (item.postedAt ?? item.scrapedAt ?? item.createdAt)
            : (item.scrapedAt ?? item.createdAt);
    return value instanceof Date ? value : new Date(value);
}

function itemTimestamp(
    item: LibraryItemWithCollections,
    mode: "added" | "created" = "added"
): number {
    return itemDate(item, mode).getTime();
}

function itemMonthKey(
    item: LibraryItemWithCollections,
    mode: "added" | "created" = "added"
): string {
    const date = itemDate(item, mode);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function itemYearKey(
    item: LibraryItemWithCollections,
    mode: "added" | "created" = "added"
): string {
    const date = itemDate(item, mode);
    return date.getFullYear().toString();
}

function getItemGroupKey(
    item: LibraryItemWithCollections,
    groupBy: GroupByMode
): string {
    if (groupBy === "source") {
        return item.source;
    }
    if (groupBy === "domain") {
        return itemDomain(item.url);
    }
    if (groupBy === "month-added") {
        return itemMonthKey(item, "added");
    }
    if (groupBy === "month-created") {
        return itemMonthKey(item, "created");
    }
    if (groupBy === "year-added") {
        return itemYearKey(item, "added");
    }
    if (groupBy === "year-created") {
        return itemYearKey(item, "created");
    }
    return UNSPECIFIC_DOMAIN_FILTER;
}

function getGroupCount(
    items: LibraryItemWithCollections[],
    groupBy: GroupByMode
): number {
    if (groupBy === "none") {
        return 0;
    }

    if (groupBy === "collection") {
        const collectionKeys = new Set<string>();
        let hasUncategorized = false;
        for (const item of items) {
            if (item.collections.length === 0) {
                hasUncategorized = true;
            } else {
                for (const c of item.collections) {
                    collectionKeys.add(c.id);
                }
            }
        }
        return collectionKeys.size + (hasUncategorized ? 1 : 0);
    }

    return new Set(items.map((item) => getItemGroupKey(item, groupBy))).size;
}

function itemPrimaryText(item: LibraryItemWithCollections): string {
    if (item.kind === "note") {
        return item.noteContentText?.trim() || "Untitled note";
    }
    const caption = item.caption?.trim();
    return caption && caption.length > 0 ? caption : item.url;
}

function sourceLabel(source: LibraryItemSource): string {
    return SOURCE_LABEL_BY_VALUE[source] ?? "Other";
}

function buildResultsCollectionName(searchTerms: string[]): string {
    const normalizedTerms = searchTerms
        .map((term) => term.trim())
        .filter((term) => term.length > 0);

    if (normalizedTerms.length === 0) {
        return "";
    }

    return normalizedTerms.join(" + ").slice(0, COLLECTION_NAME_MAX_LENGTH);
}

function formatGroupHeading(
    mode: GroupByMode,
    key: string,
    collectionNames?: Map<string, string>
): string {
    if (mode === "collection") {
        if (key === "__uncategorized__") {
            return "Uncategorized";
        }
        return collectionNames?.get(key) ?? key;
    }
    if (mode === "source") {
        return SOURCE_LABEL_BY_VALUE[key] ?? "Other";
    }
    if (mode === "month-added" || mode === "month-created") {
        const [ys, ms] = key.split("-");
        const y = Number(ys);
        const m = Number(ms);
        if (!(Number.isFinite(y) && Number.isFinite(m))) {
            return key;
        }
        return new Date(y, m - 1).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
        });
    }
    return key;
}

function compareItems(
    a: LibraryItemWithCollections,
    b: LibraryItemWithCollections,
    sortMode: SortMode
): number {
    if (sortMode === "added-newest") {
        return (
            itemTimestamp(b, "added") - itemTimestamp(a, "added") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "added-oldest") {
        return (
            itemTimestamp(a, "added") - itemTimestamp(b, "added") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-newest") {
        return (
            itemTimestamp(b, "created") - itemTimestamp(a, "created") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-oldest") {
        return (
            itemTimestamp(a, "created") - itemTimestamp(b, "created") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "source") {
        return (
            NAME_COLLATOR.compare(
                sourceLabel(a.source),
                sourceLabel(b.source)
            ) || NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "title") {
        return NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b));
    }
    return (
        NAME_COLLATOR.compare(itemDomain(a.url), itemDomain(b.url)) ||
        NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
    );
}

function compareSectionKeys(
    a: string,
    b: string,
    groupBy: GroupByMode,
    sortMode: SortMode,
    collectionNames?: Map<string, string>
): number {
    if (
        groupBy === "month-added" ||
        groupBy === "month-created" ||
        groupBy === "year-added" ||
        groupBy === "year-created"
    ) {
        const isOldest =
            sortMode === "added-oldest" || sortMode === "created-oldest";
        return isOldest ? a.localeCompare(b) : b.localeCompare(a);
    }
    if (groupBy === "source") {
        return NAME_COLLATOR.compare(
            formatGroupHeading(groupBy, a),
            formatGroupHeading(groupBy, b)
        );
    }
    if (groupBy === "collection") {
        const aName = collectionNames?.get(a) ?? a;
        const bName = collectionNames?.get(b) ?? b;
        return NAME_COLLATOR.compare(aName, bName);
    }
    return NAME_COLLATOR.compare(a, b);
}

function appendUniqueSearchTerm(values: string[], next: string): string[] {
    const normalized = next.trim();
    if (!normalized) {
        return [...values];
    }
    return values.some(
        (value) => value.toLowerCase() === normalized.toLowerCase()
    )
        ? [...values]
        : [...values, normalized];
}

function isMultiWordQuery(query: string): boolean {
    return MULTI_WORD_QUERY_PATTERN.test(query.trim());
}

/**
 * Build the ordered palette stack entries that both the trailing chips
 * and the Backspace-removal logic consume.  Keeping the shape in one
 * place guarantees that removing the last entry always corresponds to
 * the right-most visible chip.
 */
interface BuildPaletteStackEntriesInput {
    collectionMembershipFilter: CollectionMembershipFilter;
    collections: LibraryCollectionSummary[];
    columnCountMode: ColumnCountMode;
    commandAttachments: LibraryCommandAttachment[];
    containerWidth: ContainerWidth;
    domainFilters: string[];
    groupBy: GroupByMode;
    lastVisitedFilterEnabled: boolean;
    onRemoveCollectionFilter: (id: string) => void;
    onRemoveCommandAttachment: (id: string) => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setContainerWidth: (value: ContainerWidth) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLastVisitedFilterEnabled: (value: boolean) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | LibraryItemSource[]
            | ((value: LibraryItemSource[]) => LibraryItemSource[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: LibraryItemSource[];
}

function buildPaletteStackEntries({
    collectionMembershipFilter,
    collections,
    columnCountMode,
    commandAttachments,
    containerWidth,
    domainFilters,
    groupBy,
    lastVisitedFilterEnabled,
    onRemoveCollectionFilter,
    onRemoveCommandAttachment,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setContainerWidth,
    setDomainFilters,
    setGroupBy,
    setLastVisitedFilterEnabled,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: BuildPaletteStackEntriesInput): PaletteStackEntry[] {
    const entries: PaletteStackEntry[] = [];

    for (const collectionId of selectedCollectionIds) {
        const collection = collections.find((c) => c.id === collectionId);
        if (collection) {
            const onRemove = () => onRemoveCollectionFilter(collectionId);
            entries.push({
                chip: (
                    <PaletteChip
                        key={`collection-${collectionId}`}
                        label={`Collection: ${truncateLabel(collection.name)}`}
                        onRemove={onRemove}
                    />
                ),
                key: `collection-${collectionId}`,
                onRemove,
            });
        }
    }

    for (const attachment of commandAttachments) {
        const onRemove = () => onRemoveCommandAttachment(attachment.id);
        entries.push({
            chip: (
                <PaletteAttachmentChip
                    attachment={attachment}
                    key={`attachment-${attachment.id}`}
                    onRemove={onRemoveCommandAttachment}
                />
            ),
            key: `attachment-${attachment.id}`,
            onRemove,
        });
    }

    for (const term of searchTerms) {
        const onRemove = () =>
            setSearchTerms((current) => removeValue(current, term));
        entries.push({
            chip: (
                <PaletteChip
                    key={`search-${term}`}
                    label={`Search: ${truncateLabel(term)}`}
                    onRemove={onRemove}
                />
            ),
            key: `search-${term}`,
            onRemove,
        });
    }

    for (const source of sourceFilters) {
        const onRemove = () =>
            setSourceFilters((current) => removeValue(current, source));
        entries.push({
            chip: (
                <PaletteChip
                    key={`source-${source}`}
                    label={`Source: ${sourceLabel(source)}`}
                    onRemove={onRemove}
                />
            ),
            key: `source-${source}`,
            onRemove,
        });
    }

    for (const domainFilter of domainFilters) {
        const onRemove = () =>
            setDomainFilters((current) => removeValue(current, domainFilter));
        entries.push({
            chip: (
                <PaletteChip
                    key={`domain-${domainFilter}`}
                    label={`Domain: ${truncateLabel(domainFilter)}`}
                    onRemove={onRemove}
                />
            ),
            key: `domain-${domainFilter}`,
            onRemove,
        });
    }

    if (collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER) {
        const onRemove = () =>
            setCollectionMembershipFilter(DEFAULT_COLLECTION_MEMBERSHIP_FILTER);
        entries.push({
            chip: (
                <PaletteChip
                    key="collection-membership"
                    label={`Collections: ${collectionMembershipFilterLabel(collectionMembershipFilter)}`}
                    onRemove={onRemove}
                />
            ),
            key: "collection-membership",
            onRemove,
        });
    }

    if (groupBy !== "none") {
        const onRemove = () => setGroupBy("none");
        entries.push({
            chip: (
                <PaletteChip
                    key="group"
                    label={`Group: ${groupByLabel(groupBy)}`}
                    onRemove={onRemove}
                />
            ),
            key: "group",
            onRemove,
        });
    }

    if (lastVisitedFilterEnabled) {
        const onRemove = () => setLastVisitedFilterEnabled(false);
        entries.push({
            chip: (
                <PaletteChip
                    key="last-visited"
                    label="Last visited"
                    onRemove={onRemove}
                />
            ),
            key: "last-visited",
            onRemove,
        });
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
        const onRemove = () => setSortMode(DEFAULT_SORT_MODE);
        entries.push({
            chip: (
                <PaletteChip
                    key="sort"
                    label={`Sort: ${sortModeLabel(sortMode)}`}
                    onRemove={onRemove}
                />
            ),
            key: "sort",
            onRemove,
        });
    }

    if (columnCountMode !== DEFAULT_COLUMN_COUNT_MODE) {
        const onRemove = () => setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        entries.push({
            chip: (
                <PaletteChip
                    key="columns"
                    label={`Columns: ${columnCountLabel(columnCountMode)}`}
                    onRemove={onRemove}
                />
            ),
            key: "columns",
            onRemove,
        });
    }

    if (containerWidth !== DEFAULT_CONTAINER_WIDTH) {
        const onRemove = () => setContainerWidth(DEFAULT_CONTAINER_WIDTH);
        entries.push({
            chip: (
                <PaletteChip
                    key="width"
                    label={`Width: ${containerWidth === "full" ? "Full width" : "Comfortable"}`}
                    onRemove={onRemove}
                />
            ),
            key: "width",
            onRemove,
        });
    }

    return entries;
}

function removeLastPaletteStackEntry(entries: PaletteStackEntry[]): boolean {
    const lastEntry = entries.at(-1);
    if (!lastEntry) {
        return false;
    }
    lastEntry.onRemove();
    return true;
}

function isSearchHotkey(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const hasMeta = event.metaKey;
    const hasCtrl = event.ctrlKey;
    const hasAlt = event.altKey;
    const eventHotkeys = new Set<string>();

    if (!(hasAlt || hasMeta || hasCtrl)) {
        eventHotkeys.add(key);
    }
    if (!hasAlt && hasMeta) {
        eventHotkeys.add(`cmd+${key}`);
        eventHotkeys.add(`Meta+${key}`);
    }
    if (!hasAlt && hasCtrl) {
        eventHotkeys.add(`ctrl+${key}`);
    }

    return SEARCH_HOTKEYS.some((hotkey) => eventHotkeys.has(hotkey));
}

function isTextEntryTarget(
    target: EventTarget | null,
    ownerWindow: Window & typeof globalThis
): boolean {
    return (
        target instanceof ownerWindow.HTMLElement &&
        (target.isContentEditable ||
            Boolean(
                target.closest('input, textarea, select, [role="textbox"]')
            ))
    );
}

function isPrintablePaletteKey(event: KeyboardEvent): boolean {
    return (
        event.key.length === 1 &&
        event.key.trim() !== "" &&
        !event.isComposing &&
        event.key !== "Dead" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
    );
}

function sortModeLabel(mode: SortMode): string {
    return (
        PALETTE_SORT_OPTIONS.find((opt) => opt.value === mode)?.label ??
        sortModeLabel(DEFAULT_SORT_MODE)
    );
}

function groupByLabel(mode: GroupByMode): string {
    return (
        PALETTE_GROUP_OPTIONS.find((opt) => opt.value === mode)?.label ?? "None"
    );
}

function columnCountLabel(mode: ColumnCountMode): string {
    return (
        PALETTE_COLUMN_OPTIONS.find((opt) => opt.value === mode)?.label ??
        "Adjust automatically"
    );
}

function collectionMembershipFilterLabel(
    filter: CollectionMembershipFilter
): string {
    if (filter === "in-collections") {
        return "In collections";
    }
    if (filter === "not-in-collections") {
        return "Not in collections";
    }
    return "All items";
}

function collectionItemCountLabel(count: number): string {
    return `${count} item${count === 1 ? "" : "s"}`;
}

function buildCollectionPaletteDescription(
    collection: LibraryCollectionSummary,
    isActive: boolean
): string {
    const details = [collectionItemCountLabel(collection.itemCount)];

    if (collection.sources.length > 0) {
        details.push(collection.sources.map(sourceLabel).join(", "));
    }

    return isActive
        ? `Active collection filter. ${details.join(". ")}`
        : details.join(". ");
}

function buildCollectionPaletteItems({
    collections,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    wrapOnSelect,
}: {
    collections: LibraryCollectionSummary[];
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    wrapOnSelect: (fn: () => void) => () => void;
}): CommandPaletteItem[] {
    return [
        {
            active: selectedCollectionIds.length === 0,
            description:
                selectedCollectionIds.length === 0
                    ? "Show items from every collection"
                    : "Clear the selected collection filters",
            label: "Collections: All collections",
            onSelect: wrapOnSelect(onClearCollectionFilters),
            value: "filter collection all",
        },
        ...collections.map((collection) => {
            const isActive = selectedCollectionIds.includes(collection.id);

            return {
                active: isActive,
                description: buildCollectionPaletteDescription(
                    collection,
                    isActive
                ),
                label: `Collection: ${collection.name}`,
                onSelect: wrapOnSelect(() =>
                    onToggleCollectionSelection(collection.id)
                ),
                value: `filter collection ${collection.id}`,
            } satisfies CommandPaletteItem;
        }),
    ];
}

function PaletteChip({
    label,
    onRemove,
}: {
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="inline-flex max-w-[min(100%,12rem)] items-center gap-0.5 rounded-full border border-border/60 bg-background/90 py-0.5 ps-2 pe-0.5 font-medium text-foreground text-xs shadow-xs/5">
            <span className="min-w-0 max-w-full truncate text-xs">{label}</span>
            <Button
                aria-label={`Remove ${label}`}
                className="rounded-full"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                }}
                size="icon-xs"
                variant="ghost"
            >
                <XIcon className="size-3.5 shrink-0" />
            </Button>
        </span>
    );
}

function AskCacheResponsePanel({
    response,
}: {
    response: AskCacheResponseState | null;
}) {
    if (!response || response.status === "loading") {
        return (
            <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-2">
                <div className="flex items-center gap-2">
                    <GradientWaveText
                        ariaLabel="Ask Cache"
                        className="font-medium text-muted-foreground text-xs"
                    >
                        Cache AI
                    </GradientWaveText>
                    {response?.prompt ? (
                        <span className="min-w-0 max-w-xs truncate text-muted-foreground text-xs">
                            {response.prompt}
                        </span>
                    ) : null}
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        );
    }

    if (response.status === "error") {
        return (
            <div className="flex min-w-0 flex-1 flex-col gap-1 py-1 pr-2">
                <GradientWaveText
                    ariaLabel="Ask Cache"
                    className="font-medium text-muted-foreground text-xs"
                >
                    Cache AI
                </GradientWaveText>
                <p className="text-sm">{response.message}</p>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-2">
            <GradientWaveText
                ariaLabel="Ask Cache"
                className="font-medium text-muted-foreground text-xs"
            >
                Cache AI
            </GradientWaveText>
            <Streamdown className="whitespace-pre-line text-sm leading-relaxed">
                {response.markdown}
            </Streamdown>
        </div>
    );
}

function PaletteAttachmentChip({
    attachment,
    onRemove,
}: {
    attachment: LibraryCommandAttachment;
    onRemove: (id: string) => void;
}) {
    const label = getAttachmentLabel(attachment);
    const mediaCategory = getMediaCategory(attachment);

    return (
        <Attachments className="gap-0" variant="inline">
            <AttachmentPreviewCard>
                <AttachmentPreviewCardTrigger
                    render={
                        <Attachment
                            className="max-w-[min(100%,12rem)] rounded-full border-border/60 bg-background/90 py-0.5 ps-1 pe-0.5 text-xs shadow-xs/5"
                            data={attachment}
                            onRemove={() => onRemove(attachment.id)}
                        />
                    }
                >
                    <AttachmentPreview className="size-4 rounded-full bg-transparent" />
                    <AttachmentInfo />
                    <AttachmentRemove
                        className="rounded-full opacity-100"
                        size="icon-xs"
                    >
                        <XIcon className="size-3.5! shrink-0" />
                    </AttachmentRemove>
                </AttachmentPreviewCardTrigger>
                <AttachmentPreviewCardPopup className="max-w-80">
                    <div className="space-y-3">
                        {mediaCategory === "image" && attachment.url ? (
                            <div className="flex max-h-80 w-72 items-center justify-center overflow-clip rounded-md border">
                                <img
                                    alt=""
                                    className="max-h-full max-w-full object-contain"
                                    height={320}
                                    src={attachment.url}
                                    width={288}
                                />
                            </div>
                        ) : null}
                        <div className="space-y-1 px-0.5">
                            <h4 className="font-semibold text-sm leading-none">
                                {label}
                            </h4>
                            {attachment.mediaType ? (
                                <p className="font-mono text-muted-foreground text-xs">
                                    {attachment.mediaType}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </AttachmentPreviewCardPopup>
            </AttachmentPreviewCard>
        </Attachments>
    );
}

const LibraryGridCardContext =
    React.createContext<LibraryGridCardContextValue | null>(null);

function useLibraryGridCardContext(): LibraryGridCardContextValue {
    const context = React.use(LibraryGridCardContext);
    if (!context) {
        throw new Error(
            "LibraryGridCard components must be used inside <LibraryGridCardProvider>."
        );
    }
    return context;
}

interface BrowserResultsContextValue {
    clearLibraryPalette: () => void;
    collapsedSectionKeys: Set<string>;
    collections: LibraryCollectionSummary[];
    columnCount?: number;
    containerWidth: ContainerWidth;
    enableSectionCollapse: boolean;
    favoriteItemIdSet: ReadonlySet<string>;
    onCollapseAllSections?: () => void;
    onCopyLink: (item: LibraryItemWithCollections) => void;
    onCreateCollectionFromResults?: () => void;
    onDelete: (item: LibraryItemWithCollections) => void;
    onExpandAllSections?: () => void;
    onExportSectionResults?: (
        sectionTitle: string,
        items: LibraryItemWithCollections[]
    ) => void;
    onFindSimilar: (item: LibraryItemWithCollections) => void;
    onItemFavoriteToggle: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab: (item: LibraryItemWithCollections) => void;
    onOpenNote: (item: LibraryItemWithCollections) => void;
    onToggleSection: (key: string) => void;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    pendingDeleteItemId: string | null;
    shouldShowEmptyLibraryPeek: boolean;
    shouldShowNoFilteredResults: boolean;
}

const BrowserResultsContext =
    React.createContext<BrowserResultsContextValue | null>(null);

function useBrowserResultsContext(): BrowserResultsContextValue {
    const context = React.use(BrowserResultsContext);
    if (!context) {
        throw new Error(
            "BrowserResults components must be used inside <BrowserResults>."
        );
    }
    return context;
}

interface BrowserGroupContextValue {
    accentKey: string;
    collapsed: boolean;
    isMainResults: boolean;
    items: LibraryItemWithCollections[];
    key: string;
    onToggle: () => void;
    title: string;
}

const BrowserGroupContext =
    React.createContext<BrowserGroupContextValue | null>(null);

function useBrowserGroupContext(): BrowserGroupContextValue {
    const context = React.use(BrowserGroupContext);
    if (!context) {
        throw new Error(
            "BrowserGroup components must be used inside <BrowserGroupProvider>."
        );
    }
    return context;
}

function BrowserResults({
    children,
    ...contextValue
}: BrowserResultsContextValue & { children: ReactNode }) {
    return (
        <BrowserResultsContext value={contextValue}>
            {children}
        </BrowserResultsContext>
    );
}

function BrowserEmpty() {
    const { shouldShowEmptyLibraryPeek } = useBrowserResultsContext();

    if (!shouldShowEmptyLibraryPeek) {
        return null;
    }

    return (
        <>
            <div className="mx-4 flex flex-col gap-1 px-1">
                <h3 className="font-medium text-foreground text-sm">
                    <GradientWaveText
                        ariaLabel="Welcome to your Cache"
                        className="inline"
                    >
                        Welcome to your Cache
                    </GradientWaveText>
                    <span className="ml-3 opacity-50">Ready to start?</span>
                </h3>
                <p className="text-muted-foreground text-xs leading-tight">
                    Everything you bookmark, unified and searchable. Cache is a
                    purpose-built bookmark manager designed to find what matters
                    to you. Images, Videos, Links and Files you add will appear
                    here.
                </p>
            </div>
            <Masonry
                columnCount={4}
                columnGutter={16}
                itemKey={(data) => data.id}
                items={[...EMPTY_LIBRARY_PEEK_PLACEHOLDERS]}
                render={({ data, index }) => {
                    const opacity = Math.max(0.06, 1 - index * 0.095);

                    return (
                        <div
                            className="flex flex-col bg-card/40"
                            style={{ opacity }}
                        >
                            <Skeleton
                                className={cn(
                                    "squircle w-full rounded-xl",
                                    data.aspect
                                )}
                            />
                            <Skeleton className="mt-2 h-3 w-[92%]" />
                        </div>
                    );
                }}
                rowGutter={16}
            />
        </>
    );
}

function BrowserFiltersEmpty() {
    const { shouldShowNoFilteredResults, clearLibraryPalette } =
        useBrowserResultsContext();

    if (!shouldShowNoFilteredResults) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 border-dashed bg-card/30 px-6 py-14 text-center">
            <p className="max-w-md text-balance text-muted-foreground text-sm">
                No saved items match the current search and filters.
            </p>
            <Button onClick={clearLibraryPalette} size="sm" variant="outline">
                Reset browser
            </Button>
        </div>
    );
}

function BrowserList({
    sections,
    children,
}: {
    sections: BrowserGroup[];
    children: (section: BrowserGroup) => ReactNode;
}) {
    return sections.map((section) => (
        <BrowserGroupProvider key={section.key} section={section}>
            {children(section)}
        </BrowserGroupProvider>
    ));
}

function BrowserGroupProvider({
    children,
    section,
}: {
    children: ReactNode;
    section: BrowserGroup;
}) {
    const { collapsedSectionKeys, onToggleSection } =
        useBrowserResultsContext();

    return (
        <BrowserGroupContext
            value={{
                accentKey: section.key,
                collapsed: collapsedSectionKeys.has(section.key),
                isMainResults: section.title === null,
                items: section.items,
                key: section.key,
                onToggle: () => onToggleSection(section.key),
                title: section.title ?? "Results",
            }}
        >
            {children}
        </BrowserGroupContext>
    );
}

function BrowserHeader() {
    const group = useBrowserGroupContext();
    const {
        enableSectionCollapse,
        onCreateCollectionFromResults,
        onExportSectionResults,
        onExpandAllSections,
        onCollapseAllSections,
    } = useBrowserResultsContext();

    const hasItems = group.items.length > 0;
    const canCreateCollectionFromResults =
        group.isMainResults && Boolean(onCreateCollectionFromResults);
    const canExportSectionResults = Boolean(onExportSectionResults);
    const shouldShowSectionMenu =
        hasItems &&
        (canCreateCollectionFromResults ||
            canExportSectionResults ||
            enableSectionCollapse);

    return (
        <ContextMenu>
            <ContextMenuTrigger
                // biome-ignore lint/a11y/useSemanticElements: Group role
                render={<div className="contents" role="group" />}
            >
                <div
                    className="sticky z-10 flex items-center justify-between gap-3 rounded-xl bg-muted pr-3"
                    style={{
                        background: getColorGradientFromName(group.accentKey),
                        top: "var(--library-section-sticky-top)",
                    }}
                >
                    <div className="flex items-center">
                        {enableSectionCollapse ? (
                            <Button
                                aria-expanded={!group.collapsed}
                                className="group min-w-0 flex-1 justify-start rounded-xl"
                                onClick={group.onToggle}
                                size="lg"
                                title={
                                    group.collapsed
                                        ? "Expand group"
                                        : "Collapse group"
                                }
                                variant="ghost"
                                {...(group.collapsed
                                    ? {}
                                    : { "data-panel-open": true })}
                            >
                                <ChevronDownFilledIcon />
                                <span className="ml-1 truncate font-medium">
                                    {group.title}
                                </span>
                            </Button>
                        ) : (
                            <h2 className="font-medium text-lg">
                                {group.title}
                            </h2>
                        )}
                        <span className="font-medium text-muted-foreground text-xs tabular-nums">
                            {group.items.length}
                        </span>
                    </div>
                    {shouldShowSectionMenu ? (
                        <Menu>
                            <MenuTrigger
                                render={
                                    <Button size="icon-sm" variant="ghost">
                                        <Ellipsis className="size-3.5" />
                                    </Button>
                                }
                            />
                            <MenuPopup align="end">
                                {enableSectionCollapse ? (
                                    <>
                                        <MenuItem
                                            disabled={!group.collapsed}
                                            onClick={group.onToggle}
                                        >
                                            <ChevronDown className="size-4.5 text-muted-foreground" />
                                            Expand
                                        </MenuItem>
                                        <MenuItem
                                            disabled={group.collapsed}
                                            onClick={group.onToggle}
                                        >
                                            <ChevronUp className="size-4.5 text-muted-foreground" />
                                            Collapse
                                        </MenuItem>
                                        {(onExpandAllSections ||
                                            onCollapseAllSections) && (
                                            <>
                                                <MenuSeparator />
                                                {onExpandAllSections && (
                                                    <MenuItem
                                                        onClick={
                                                            onExpandAllSections
                                                        }
                                                    >
                                                        <ChevronsDown className="size-4.5 text-muted-foreground" />
                                                        Expand all
                                                    </MenuItem>
                                                )}
                                                {onCollapseAllSections && (
                                                    <MenuItem
                                                        onClick={
                                                            onCollapseAllSections
                                                        }
                                                    >
                                                        <ChevronsUp className="size-4.5 text-muted-foreground" />
                                                        Collapse all
                                                    </MenuItem>
                                                )}
                                            </>
                                        )}
                                        {(canCreateCollectionFromResults ||
                                            canExportSectionResults) && (
                                            <MenuSeparator />
                                        )}
                                    </>
                                ) : null}
                                {canCreateCollectionFromResults ? (
                                    <MenuItem
                                        onClick={onCreateCollectionFromResults}
                                    >
                                        <CircleFadingPlus className="size-4.5 text-muted-foreground" />
                                        New collection with these results
                                    </MenuItem>
                                ) : null}
                                {canCreateCollectionFromResults &&
                                canExportSectionResults ? (
                                    <MenuSeparator />
                                ) : null}
                                {onExportSectionResults ? (
                                    <MenuItem
                                        disabled={!hasItems}
                                        onClick={() =>
                                            onExportSectionResults(
                                                group.title,
                                                group.items
                                            )
                                        }
                                    >
                                        <FileSpreadsheetIcon className="size-4.5 text-muted-foreground" />
                                        Export to CSV
                                    </MenuItem>
                                ) : null}
                            </MenuPopup>
                        </Menu>
                    ) : null}
                </div>
            </ContextMenuTrigger>
            {enableSectionCollapse && (
                <ContextMenuPopup>
                    <ContextMenuItem
                        disabled={!group.collapsed}
                        onClick={group.onToggle}
                    >
                        <ChevronDown className="size-4.5 text-muted-foreground" />
                        Expand
                    </ContextMenuItem>
                    <ContextMenuItem
                        disabled={group.collapsed}
                        onClick={group.onToggle}
                    >
                        <ChevronUp className="size-4.5 text-muted-foreground" />
                        Collapse
                    </ContextMenuItem>
                    {(onExpandAllSections || onCollapseAllSections) && (
                        <>
                            <ContextMenuSeparator />
                            {onExpandAllSections && (
                                <ContextMenuItem onClick={onExpandAllSections}>
                                    <ChevronsDown className="size-4.5 text-muted-foreground" />
                                    Expand all
                                </ContextMenuItem>
                            )}
                            {onCollapseAllSections && (
                                <ContextMenuItem
                                    onClick={onCollapseAllSections}
                                >
                                    <ChevronsUp className="size-4.5 text-muted-foreground" />
                                    Collapse all
                                </ContextMenuItem>
                            )}
                        </>
                    )}
                </ContextMenuPopup>
            )}
        </ContextMenu>
    );
}

function BrowserGroupEmpty({ className, ...props }: React.ComponentProps<"p">) {
    const { collapsed, items } = useBrowserGroupContext();

    if (collapsed || items.length > 0) {
        return null;
    }

    return (
        <p
            {...props}
            className={cn("text-muted-foreground text-sm", className)}
        />
    );
}

function BrowserGroupOverview({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) {
    const { collapsed } = useBrowserGroupContext();

    if (collapsed) {
        return null;
    }

    return (
        <div
            {...props}
            className={cn(
                "flex w-full flex-1 flex-col pt-1 pr-3 pb-3 pl-4",
                className
            )}
        >
            <GradientWaveText
                ariaLabel="Overview"
                className="font-medium text-muted-foreground text-xs opacity-80"
            >
                Overview
            </GradientWaveText>
            {children}
        </div>
    );
}

function BrowserGroupOverviewContent() {
    const { collapsed, items, title } = useBrowserGroupContext();

    const contentId = React.useId();
    const [isExpanded, setIsExpanded] = React.useState(false);

    const payload = React.useDeferredValue(
        JSON.stringify({
            expanded: isExpanded,
            items: items
                .slice(0, SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT)
                .map(buildSectionDescriptionContextItem),
            sectionTitle: title,
        })
    );

    const handleToggleExpanded = useStableCallback(() => {
        setIsExpanded((prev) => !prev);
    });

    const { data, isLoading } = useSWR<SectionDescriptionResponse>(
        getSectionDescriptionSWRKey(payload, items.length),
        fetchSectionDescription,
        {
            dedupingInterval: 60_000,
            keepPreviousData: true,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    if (collapsed) {
        return null;
    }

    const summary = data?.summary.trim();

    return isLoading && !data ? (
        <div className="block w-full text-xs leading-snug">
            <Skeleton className="my-0.5 h-4 w-full" />
            <Skeleton className="my-0.5 h-4 w-48" />
        </div>
    ) : (
        <div
            aria-busy={isLoading}
            className={cn(
                "fade-in-0 flex w-full animate-in items-start gap-2 text-xs leading-snug motion-reduce:animate-none",
                isLoading && "opacity-60"
            )}
            id={contentId}
        >
            <Streamdown className="min-w-0 flex-1 whitespace-pre-line pt-1">
                {summary && summary.length > 0
                    ? summary
                    : "Description is unavailable right now."}
            </Streamdown>
            &nbsp;
            <Button
                aria-controls={contentId}
                aria-expanded={isExpanded}
                onClick={handleToggleExpanded}
                size="xs"
                variant="link"
            >
                {isExpanded ? "Brief" : "Detailed"}
                &nbsp;
                <ListChevronsUpDown className="mb-px inline-block size-3.5 shrink-0" />
            </Button>
        </div>
    );
}

interface BrowserMansonryProps {
    children: (
        item: LibraryItemWithCollections,
        index: number
    ) => React.ReactNode;
}

function BrowserMasonry({ children }: BrowserMansonryProps) {
    const { collapsed, items } = useBrowserGroupContext();
    const { columnCount } = useBrowserResultsContext();

    if (collapsed || items.length === 0) {
        return null;
    }

    return (
        <Masonry
            columnCount={columnCount}
            columnGutter={16}
            itemKey={(data) => data.id}
            items={items}
            render={({ data, index }) => children(data, index)}
            rowGutter={16}
        />
    );
}

function BrowserCardProvider({ children }: { children: ReactNode }) {
    const {
        collections,
        favoriteItemIdSet,
        onCopyLink,
        onDelete,
        onFindSimilar,
        onItemFavoriteToggle,
        onOpenInNewTab,
        onOpenNote,
        onUpdateItemCollections,
        pendingDeleteItemId,
    } = useBrowserResultsContext();

    return (
        <LibraryGridCardContext
            value={{
                collections,
                favoriteItemIdSet,
                onCopyLink,
                onDelete,
                onFindSimilar,
                onItemFavoriteToggle,
                onOpenInNewTab,
                onOpenNote,
                onUpdateItemCollections,
                pendingDeleteItemId,
            }}
        >
            {children}
        </LibraryGridCardContext>
    );
}

function BrowserGroup({ children }: { children: ReactNode }) {
    return (
        <section className="flex w-full flex-col gap-3">
            <BrowserCardProvider>{children}</BrowserCardProvider>
        </section>
    );
}

function CategoryThumbnail({ urls }: { urls: string[] }) {
    const [validUrls, setValidUrls] = React.useState<string[]>([]);
    const [hasImageError, setHasImageError] = React.useState(false);

    React.useEffect(() => {
        setHasImageError(false);
        if (urls.length === 0) {
            setValidUrls([]);
            return;
        }
        let isMounted = true;
        filterValidImageUrls(urls).then((valid) => {
            if (isMounted) {
                setValidUrls(valid);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [urls]);

    const src = validUrls[0];

    if (hasImageError || !src) {
        return null;
    }

    return (
        <img
            alt=""
            className="absolute top-10 left-3 z-10 h-auto w-full rounded-sm object-cover transition-transform group-data-highlighted:-translate-y-1"
            draggable="false"
            fetchPriority="high"
            height={104}
            loading="eager"
            onError={() => setHasImageError(true)}
            src={src}
            width={140}
        />
    );
}

function buildSearchPaletteGroups({
    collections,
    collectionPreviewThumbnailUrlsById,
    clearLibraryPalette,
    draft,
    hasAnyRefinements,
    lastVisitedFilterEnabled,
    lastVisitedItemIds,
    navigationItems,
    onAskCacheSubmit,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    searchTerms,
    setIsCommandOpen,
    setLastVisitedFilterEnabled,
    setQuery,
    setSearchTerms,
}: {
    collections: LibraryCollectionSummary[];
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    clearLibraryPalette: () => void;
    draft: string;
    hasAnyRefinements: boolean;
    lastVisitedFilterEnabled: boolean;
    lastVisitedItemIds: string[];
    navigationItems: CommandPaletteItem[];
    onAskCacheSubmit: (prompt: string) => void | Promise<void>;
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    searchTerms: string[];
    setIsCommandOpen: (value: boolean) => void;
    setLastVisitedFilterEnabled: (value: boolean) => void;
    setQuery: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
}): CommandPaletteGroup[] {
    const groups: CommandPaletteGroup[] = [];
    const draftAlreadyIncluded = searchTerms.some(
        (term) => term.toLowerCase() === draft.toLowerCase()
    );
    const isDefaultState = draft.length === 0 && !hasAnyRefinements;
    const showCollectionsGroup =
        collections.length > 0 &&
        (draft.length > 0 ||
            selectedCollectionIds.length > 0 ||
            isDefaultState);

    const applyCollectionFilter = (fn: () => void) => () => {
        fn();
        setQuery("");
        setIsCommandOpen(true);
    };

    if (draft) {
        const shouldDefaultToAskCache = isMultiWordQuery(draft);
        const addSearchItem: CommandPaletteItem = {
            active: draftAlreadyIncluded,
            description: draftAlreadyIncluded
                ? "Already included in the search"
                : "Add this search term",
            label: `Add search "${draft}"`,
            onSelect: () => {
                setSearchTerms((current) =>
                    appendUniqueSearchTerm(current, draft)
                );
                setQuery("");
                setIsCommandOpen(true);
            },
            shortcut: shouldDefaultToAskCache ? undefined : "Enter",
            value: `add search ${draft}`,
        };
        const askCacheItem: CommandPaletteItem = {
            description: "AI Search",
            label: `Ask Cache "${draft}"`,
            onSelect: () => onAskCacheSubmit(draft),
            shortcut: shouldDefaultToAskCache ? "Enter" : "Tab",
            value: `ask cache ${draft}`,
        };

        groups.push({
            items: shouldDefaultToAskCache
                ? [askCacheItem, addSearchItem]
                : [addSearchItem, askCacheItem],
            label: "Search",
        });
    }

    if (searchTerms.length > 0) {
        groups.push({
            items: [
                ...searchTerms.map((term) => ({
                    active: true,
                    description: "Active stacked search term",
                    label: `Search: ${truncateLabel(term, 28)}`,
                    onSelect: () =>
                        setSearchTerms((current) => removeValue(current, term)),
                    value: `remove search ${term}`,
                })),
                {
                    description: "Remove every search term",
                    label: "Clear all searches",
                    onSelect: () => {
                        setSearchTerms([]);
                        setIsCommandOpen(true);
                    },
                    value: "clear all searches",
                },
            ],
            label: "Current search",
        });
    }

    if (showCollectionsGroup) {
        if (isDefaultState) {
            const collectionItems = collections
                .map((collection) => ({
                    collection,
                    thumbnails:
                        collectionPreviewThumbnailUrlsById.get(collection.id) ??
                        [],
                }))
                .filter(({ thumbnails }) => thumbnails.length > 1)
                .slice(0, 4);

            groups.push({
                items: collectionItems.map(({ collection, thumbnails }) => ({
                    active: selectedCollectionIds.includes(collection.id),
                    label: collection.name,
                    onSelect: applyCollectionFilter(() =>
                        onToggleCollectionSelection(collection.id)
                    ),
                    render: () => (
                        <div className="flex aspect-4/3 size-full flex-1 flex-col">
                            {thumbnails.length > 0 && (
                                <CategoryThumbnail urls={thumbnails} />
                            )}
                            <span className="z-30 truncate p-1 font-medium">
                                {collection.name}
                            </span>
                        </div>
                    ),
                    value: `filter collection ${collection.id}`,
                })),
                label: "Collections",
                layout: "horizontal",
            });
        } else {
            groups.push({
                items: buildCollectionPaletteItems({
                    collections,
                    onClearCollectionFilters,
                    onToggleCollectionSelection,
                    selectedCollectionIds,
                    wrapOnSelect: applyCollectionFilter,
                }),
                label: "Collections",
            });
        }
    }

    if (lastVisitedItemIds.length > 0 && !lastVisitedFilterEnabled) {
        groups.push({
            items: [
                {
                    label: "Pick up where you left off",
                    onSelect: applyCollectionFilter(() =>
                        setLastVisitedFilterEnabled(true)
                    ),
                    render: () => (
                        <div className="flex items-center gap-2.5">
                            <ArrowUpIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">
                                Pick up where you left off
                            </span>
                            <span className="text-muted-foreground/60 text-xs tabular-nums">
                                {lastVisitedItemIds.length}
                            </span>
                        </div>
                    ),
                    value: "filter last visited",
                },
            ],
            label: "Recent",
        });
    }

    groups.push({
        items: navigationItems,
        label: "Customize display",
    });

    if (hasAnyRefinements) {
        groups.push({
            items: [
                {
                    description:
                        "Reset search, filters, grouping, sort, and layout",
                    label: "Reset browser",
                    onSelect: clearLibraryPalette,
                    value: "reset browser state",
                },
            ],
            label: "Quick actions",
        });
    }

    return groups;
}

function buildAskCachePaletteGroups({
    askCacheResponse,
    backItem,
    draft,
    onAskCacheSubmit,
}: {
    askCacheResponse: AskCacheResponseState | null;
    backItem: CommandPaletteItem;
    draft: string;
    onAskCacheSubmit: (prompt: string) => void | Promise<void>;
}): CommandPaletteGroup[] {
    const items: CommandPaletteItem[] = [
        {
            label: "Ask Cache response",
            onSelect: () => undefined,
            render: () => <AskCacheResponsePanel response={askCacheResponse} />,
            value: "ask cache response",
        },
    ];

    if (draft) {
        items.unshift({
            label: `Ask Cache "${draft}"`,
            onSelect: () => onAskCacheSubmit(draft),
            value: `ask cache ${draft}`,
        });
    }

    return [
        {
            items: [backItem],
            label: "Navigation",
        },
        {
            items,
            label: "Ask Cache",
        },
    ];
}

interface BuildPaletteGroupsInput {
    askCacheResponse: AskCacheResponseState | null;
    clearLibraryPalette: () => void;
    collectionMembershipFilter: CollectionMembershipFilter;
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collections: LibraryCollectionSummary[];
    columnCountMode: ColumnCountMode;
    containerWidth: ContainerWidth;
    domainFilters: string[];
    domainOptions: {
        label: string;
        value: string;
    }[];
    groupBy: GroupByMode;
    lastVisitedFilterEnabled: boolean;
    lastVisitedItemIds: string[];
    onAskCacheSubmit: (prompt: string) => void | Promise<void>;
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    openPaletteSection: (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void;
    paletteSection: PaletteSection;
    query: string;
    returnToSearchSection: () => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setContainerWidth: (value: ContainerWidth) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setIsCommandOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setLastVisitedFilterEnabled: (value: boolean) => void;
    setQuery: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | LibraryItemSource[]
            | ((value: LibraryItemSource[]) => LibraryItemSource[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: LibraryItemSource[];
}

function buildDomainPaletteOptions(
    items: LibraryItemWithCollections[]
): { label: string; value: string }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const domain = itemDomain(item.url);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    const dynamicDomains = Array.from(counts.entries())
        .sort(
            ([aDomain, aCount], [bDomain, bCount]) =>
                bCount - aCount || NAME_COLLATOR.compare(aDomain, bDomain)
        )
        .map(([domain, count]) => ({
            label: `${domain} (${count})`,
            value: domain,
        }));

    return [
        { label: "All domains", value: ALL_DOMAIN_FILTER },
        ...dynamicDomains,
    ];
}

function buildPaletteGroups({
    askCacheResponse,
    clearLibraryPalette,
    columnCountMode,
    collectionMembershipFilter,
    collectionPreviewThumbnailUrlsById,
    collections,
    containerWidth,
    domainFilters,
    domainOptions,
    groupBy,
    lastVisitedFilterEnabled,
    lastVisitedItemIds,
    onClearCollectionFilters,
    onAskCacheSubmit,
    onToggleCollectionSelection,
    openPaletteSection,
    query,
    paletteSection,
    returnToSearchSection,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setContainerWidth,
    setIsCommandOpen,
    setDomainFilters,
    setGroupBy,
    setLastVisitedFilterEnabled,
    setQuery,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: BuildPaletteGroupsInput): CommandPaletteGroup[] {
    const draft = query.trim();
    const groups: CommandPaletteGroup[] = [];

    const applyAndReturn = (fn: () => void | Promise<void>) => async () => {
        await fn();
        returnToSearchSection();
    };

    const applyAndStay = (fn: () => void) => () => {
        fn();
        setQuery("");
        setIsCommandOpen(true);
    };

    const navigationItems: CommandPaletteItem[] = [
        {
            description: "Source and domain filters",
            label: "Add filters…",
            onSelect: (event) => openPaletteSection("filter", event),
            value: "navigate filters",
        },
        {
            description: `Current: ${groupByLabel(groupBy)}`,
            label: "Group items…",
            onSelect: (event) => openPaletteSection("group", event),
            value: "navigate grouping",
        },
        {
            description: `Current: ${sortModeLabel(sortMode)}`,
            label: "Sort items…",
            onSelect: (event) => openPaletteSection("sort", event),
            value: "navigate sorting",
        },
        {
            description: `Current: ${columnCountLabel(columnCountMode)}`,
            label: "Columns…",
            onSelect: (event) => openPaletteSection("columns", event),
            value: "navigate columns",
        },
        {
            description:
                containerWidth === "comfortable"
                    ? "Constrain to a comfortable reading width"
                    : "Expand to the full viewport width",
            label: "Width…",
            onSelect: (event) => openPaletteSection("width", event),
            value: "navigate width",
        },
    ];

    const backItem: CommandPaletteItem = {
        description: "Return to search and quick actions",
        label: "Back",
        onSelect: returnToSearchSection,
        shortcut: "Esc",
        value: "navigate back",
    };

    const hasAnyRefinements =
        searchTerms.length > 0 ||
        selectedCollectionIds.length > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

    if (paletteSection === "search") {
        return buildSearchPaletteGroups({
            clearLibraryPalette,
            collectionPreviewThumbnailUrlsById,
            collections,
            draft,
            hasAnyRefinements,
            lastVisitedFilterEnabled,
            lastVisitedItemIds,
            navigationItems,
            onAskCacheSubmit,
            onClearCollectionFilters,
            onToggleCollectionSelection,
            searchTerms,
            selectedCollectionIds,
            setIsCommandOpen,
            setLastVisitedFilterEnabled,
            setQuery,
            setSearchTerms,
        });
    }

    if (paletteSection === "ai-response") {
        return buildAskCachePaletteGroups({
            askCacheResponse,
            backItem,
            draft,
            onAskCacheSubmit,
        });
    }

    if (paletteSection === "filter") {
        groups.push({
            items: [backItem],
            label: "Navigation",
        });
        groups.push({
            items: [
                {
                    active: sourceFilters.length === 0,
                    description: "Show every source",
                    label: "Source: All sources",
                    onSelect: applyAndStay(() => setSourceFilters([])),
                    value: "filter source all",
                },
                ...PALETTE_SOURCE_FILTER_OPTIONS.map((option) => ({
                    active: sourceFilters.includes(option.value),
                    description: "Toggle this source in the filter stack",
                    label: `Source: ${option.label}`,
                    onSelect: applyAndStay(() =>
                        setSourceFilters((current) =>
                            toggleValue(current, option.value)
                        )
                    ),
                    value: `filter source ${option.value}`,
                })),
            ],
            label: "Conditions",
        });
        groups.push({
            items: [
                {
                    active:
                        collectionMembershipFilter ===
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                    description:
                        "Show items whether or not they are in collections",
                    label: "Collections: All items",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter(
                            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
                        )
                    ),
                    value: "filter collections all",
                },
                {
                    active: collectionMembershipFilter === "in-collections",
                    description:
                        "Show only items that belong to at least one collection",
                    label: "Collections: In collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("in-collections")
                    ),
                    value: "filter collections in",
                },
                {
                    active: collectionMembershipFilter === "not-in-collections",
                    description:
                        "Show only items that do not belong to any collection",
                    label: "Collections: Not in collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("not-in-collections")
                    ),
                    value: "filter collections not-in",
                },
            ],
            label: "Collection state",
        });
        groups.push({
            items: buildCollectionPaletteItems({
                collections,
                onClearCollectionFilters,
                onToggleCollectionSelection,
                selectedCollectionIds,
                wrapOnSelect: applyAndStay,
            }),
            label: "Collections",
        });
        groups.push({
            items: domainOptions.map((option) => ({
                active:
                    option.value === ALL_DOMAIN_FILTER
                        ? domainFilters.length === 0
                        : domainFilters.includes(option.value),
                description:
                    option.value === ALL_DOMAIN_FILTER
                        ? "Show items from every domain"
                        : "Toggle this domain in the filter stack",
                label: `Domain: ${option.label}`,
                onSelect: applyAndStay(() =>
                    option.value === ALL_DOMAIN_FILTER
                        ? setDomainFilters([])
                        : setDomainFilters((current) =>
                              toggleValue(current, option.value)
                          )
                ),
                value: `filter domain ${option.value}`,
            })),
            label: "Domain",
        });
        return groups;
    }

    if (paletteSection === "group") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: PALETTE_GROUP_OPTIONS.map((option) => ({
                    active: groupBy === option.value,
                    description: "Organize the grid into sections",
                    label: option.label,
                    onSelect: applyAndReturn(() => setGroupBy(option.value)),
                    value: `group ${option.value}`,
                })),
                label: "Grouping",
            },
        ];
    }

    if (paletteSection === "sort") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: PALETTE_SORT_OPTIONS.map((option) => ({
                    active: sortMode === option.value,
                    description: "Change the ordering within the current view",
                    label: option.label,
                    onSelect: applyAndReturn(() => setSortMode(option.value)),
                    value: `sort ${option.value}`,
                })),
                label: "Sorting",
            },
        ];
    }

    if (paletteSection === "columns") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: PALETTE_COLUMN_OPTIONS.map((option) => ({
                    active: columnCountMode === option.value,
                    description:
                        option.value === "auto"
                            ? "Choose the best column count for the available width"
                            : "Force a specific number of columns",
                    label: option.label,
                    onSelect: applyAndReturn(() =>
                        setColumnCountMode(option.value)
                    ),
                    value: `columns ${option.value}`,
                })),
                label: "Columns",
            },
        ];
    }

    if (paletteSection === "width") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: [
                    {
                        active: containerWidth === "comfortable",
                        description:
                            "Constrain results to a comfortable reading width",
                        label: "Comfortable",
                        onSelect: applyAndReturn(() =>
                            setContainerWidth("comfortable")
                        ),
                        value: "width comfortable",
                    },
                    {
                        active: containerWidth === "full",
                        description: "Expand results to the full viewport",
                        label: "Full width",
                        onSelect: applyAndReturn(() =>
                            setContainerWidth("full")
                        ),
                        value: "width full",
                    },
                ],
                label: "Width",
            },
        ];
    }

    return [{ items: [backItem], label: "Navigation" }];
}

function filterCommandItems(
    items: LibraryItemWithCollections[],
    input: {
        collectionMembershipFilter: CollectionMembershipFilter;
        domainFilters: string[];
        lastVisitedItemIds: string[];
        searchTerms: string[];
        selectedCollectionIds: string[];
        sourceFilters: LibraryItemSource[];
    }
): LibraryItemWithCollections[] {
    let list = [...items];
    const normalizedSearchTerms = input.searchTerms.map((term) =>
        term.trim().toLowerCase()
    );

    if (input.lastVisitedItemIds.length > 0) {
        list = list.filter((item) =>
            input.lastVisitedItemIds.includes(item.id)
        );
    }

    if (input.selectedCollectionIds.length > 0) {
        list = list.filter((item) =>
            item.collections.some((collection) =>
                input.selectedCollectionIds.includes(collection.id)
            )
        );
    }

    if (input.collectionMembershipFilter === "in-collections") {
        list = list.filter((item) => item.collections.length > 0);
    }

    if (input.collectionMembershipFilter === "not-in-collections") {
        list = list.filter((item) => item.collections.length === 0);
    }

    if (normalizedSearchTerms.length > 0) {
        list = list.filter((item) => {
            const cap = item.caption?.toLowerCase() ?? "";
            const noteText = item.noteContentText?.toLowerCase() ?? "";
            const url = item.url.toLowerCase();
            return normalizedSearchTerms.some(
                (term) =>
                    cap.includes(term) ||
                    noteText.includes(term) ||
                    url.includes(term)
            );
        });
    }

    if (input.sourceFilters.length > 0) {
        list = list.filter((item) => input.sourceFilters.includes(item.source));
    }

    if (input.domainFilters.length > 0) {
        list = list.filter((item) =>
            input.domainFilters.includes(itemDomain(item.url))
        );
    }

    return list;
}

function sortCommandItems(
    filteredItems: LibraryItemWithCollections[],
    sortMode: SortMode
): LibraryItemWithCollections[] {
    const itemSortMode =
        sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
    return filteredItems.toSorted((a, b) => compareItems(a, b, itemSortMode));
}

function buildBrowserSections(
    sortedItems: LibraryItemWithCollections[],
    groupBy: GroupByMode,
    sortMode: SortMode,
    collections?: LibraryCollectionSummary[]
): BrowserGroup[] {
    if (groupBy === "none") {
        return [
            {
                items: sortedItems,
                key: "all",
                title: null,
            },
        ];
    }

    const collectionNames = new Map(
        collections?.map((c) => [c.id, c.name]) ?? []
    );

    const buckets = new Map<string, LibraryItemWithCollections[]>();
    for (const item of sortedItems) {
        if (groupBy === "collection") {
            if (item.collections.length === 0) {
                const bucket = buckets.get("__uncategorized__") ?? [];
                bucket.push(item);
                buckets.set("__uncategorized__", bucket);
            } else {
                for (const collection of item.collections) {
                    const bucket = buckets.get(collection.id) ?? [];
                    bucket.push(item);
                    buckets.set(collection.id, bucket);
                }
            }
            continue;
        }

        const key = getItemGroupKey(item, groupBy);
        const bucket = buckets.get(key) ?? [];
        bucket.push(item);
        buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
        .sort(([a, aItems], [b, bItems]) => {
            if (sortMode === "count-desc") {
                return (
                    bItems.length - aItems.length ||
                    compareSectionKeys(a, b, groupBy, sortMode, collectionNames)
                );
            }

            return compareSectionKeys(a, b, groupBy, sortMode, collectionNames);
        })
        .map(([key, sectionItems]) => ({
            items: sectionItems,
            key,
            title: formatGroupHeading(groupBy, key, collectionNames),
        }));
}

async function saveLibraryNoteDraft({
    activeNoteId,
    draft,
}: {
    activeNoteId: string | null;
    draft: {
        contentHtml: string;
        contentState: unknown | null;
    };
}): Promise<NoteMutationResult> {
    try {
        return activeNoteId
            ? await updateNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
                  itemId: activeNoteId,
              })
            : await createNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
              });
    } catch {
        return {
            message: activeNoteId
                ? "We couldn't save this note right now."
                : "We couldn't create this note right now.",
            status: "ERROR",
        };
    }
}

async function createLibraryBookmarkFromPastedUrl({
    url,
}: {
    url: string;
}): Promise<CreateChromeBookmarkFromUrlResult> {
    try {
        return await createChromeBookmarkFromUrl({
            url,
        });
    } catch {
        return {
            message: "We couldn't save this URL right now.",
            status: "ERROR",
        };
    }
}

function browserHasActiveFilters(input: {
    collectionMembershipFilter: CollectionMembershipFilter;
    domainFilters: string[];
    lastVisitedItemIds: string[];
    searchTerms: string[];
    selectedCollectionIds: string[];
    sourceFilters: LibraryItemSource[];
}): boolean {
    return (
        input.searchTerms.length > 0 ||
        input.selectedCollectionIds.length > 0 ||
        input.sourceFilters.length > 0 ||
        input.domainFilters.length > 0 ||
        input.collectionMembershipFilter !==
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        input.lastVisitedItemIds.length > 0
    );
}

function useSectionCollapseState({
    groupBy,
    hasActiveFilters,
    sections,
    shouldShowEmptyLibraryPeek,
    shouldShowNoFilteredResults,
}: {
    groupBy: GroupByMode;
    hasActiveFilters: boolean;
    sections: BrowserGroup[];
    shouldShowEmptyLibraryPeek: boolean;
    shouldShowNoFilteredResults: boolean;
}) {
    const [collapsedSectionKeys, setCollapsedSectionKeys] = React.useState<
        string[]
    >([]);

    const enableSectionCollapse =
        !(shouldShowEmptyLibraryPeek || shouldShowNoFilteredResults) &&
        (hasActiveFilters || groupBy !== "none");

    React.useEffect(() => {
        const validKeys = new Set(sections.map((section) => section.key));
        setCollapsedSectionKeys((current) => {
            const next = current.filter((key) => validKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [sections]);

    React.useEffect(() => {
        if (!enableSectionCollapse) {
            setCollapsedSectionKeys((current) =>
                current.length === 0 ? current : []
            );
        }
    }, [enableSectionCollapse]);

    const toggleSection = useStableCallback((key: string) => {
        setCollapsedSectionKeys((current) =>
            current.includes(key)
                ? current.filter((entry) => entry !== key)
                : [...current, key]
        );
    });

    const collapseAllSections = useStableCallback(() => {
        setCollapsedSectionKeys(sections.map((section) => section.key));
    });

    const expandAllSections = useStableCallback(() => {
        setCollapsedSectionKeys([]);
    });

    return {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        toggleSection,
    };
}

interface LibraryProps {
    connectedIntegrationCount: number;
    lockedItemCount: number;
    totalItemCount: number;
}

function useLibraryItemActions(args: {
    onDeleteSuccess?: (
        result: Extract<LibraryItemDeleteResult, { status: "DELETED" }>
    ) => void;
    setVisibleItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void;
}) {
    const [pendingDeleteItem, setPendingDeleteItem] =
        React.useState<LibraryItemWithCollections | null>(null);
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const { copyToClipboard } = useCopyToClipboard();

    const handleOpenInNewTab = useStableCallback(
        (item: LibraryItemWithCollections) => {
            openExternal(normalizeURL(item.url));
        }
    );

    const handleCopyLink = useStableCallback(
        async (item: LibraryItemWithCollections) => {
            await copyToClipboard(normalizeURL(item.url));
        }
    );

    const handleRequestDelete = useStableCallback(
        (item: LibraryItemWithCollections) => {
            setPendingDeleteItem(item);
        }
    );

    const handleDeleteDialogOpenChange = useStableCallback((open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDeleteItem(null);
        }
    });

    const handleConfirmDelete = useStableCallback(() => {
        const targetItem = pendingDeleteItem;
        if (!targetItem) {
            return;
        }

        startDeleteTransition(async () => {
            let result: LibraryItemDeleteResult;

            try {
                result = await deleteLibraryItem(targetItem.id);
            } catch {
                result = {
                    message: "We couldn't delete this saved item right now.",
                    status: "ERROR",
                };
            }

            if (result.status === "DELETED") {
                args.setVisibleItems((current) =>
                    current.filter((item) => item.id !== result.itemId)
                );
                args.onDeleteSuccess?.(result);
                setPendingDeleteItem(null);
            }
        });
    });

    return {
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
    };
}

function MediaPreview({
    src,
    videoSrc,
}: {
    src: string | null;
    videoSrc?: string | null;
}) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    const [isHovered, setIsHovered] = React.useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = React.useState(true);

    const [hasImageFailed, setHasImageFailed] = React.useState(false);
    const [hasVideoFailed, setHasVideoFailed] = React.useState(false);
    const [hasVideoStarted, setHasVideoStarted] = React.useState(false);

    const canRenderImage = !!src;
    const canRenderVideo = !!videoSrc;

    const shouldLoadVideo = isHovered && canRenderVideo && !hasVideoFailed;
    const isVideoLoading = !hasVideoStarted && shouldLoadVideo;

    React.useEffect(() => {
        const video = videoRef.current;
        if (!(video && shouldLoadVideo)) {
            return;
        }

        if (isHovered) {
            video.play().catch((error: unknown) => {
                log.debug("Failed to resume hover preview", { error });
            });
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isHovered, shouldLoadVideo]);

    const handleCanPlay = useStableCallback(() => {
        setHasVideoStarted(true);
        const video = videoRef.current;
        if (video && isHovered && !hasVideoFailed) {
            video.play().catch((error: unknown) => {
                log.debug("Failed to play hover preview", { error });
            });
        }
    });

    const handleImageError = useStableCallback(() => {
        setHasImageFailed(true);
    });

    const handleMouseEnter = useStableCallback(() => {
        setIsHovered(true);
        setHasVideoFailed(false);
    });

    const handleMouseLeave = useStableCallback(() => {
        setIsHovered(false);
    });

    const handleVideoError = useStableCallback(() => {
        const video = videoRef.current;
        const mediaError = video?.error;
        log.debug("Video source failed to load", {
            mediaError,
            networkState: video?.networkState,
            readyState: video?.readyState,
            videoSrc,
        });
        setHasVideoFailed(true);
    });

    const handleSoundToggle = useStableCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsSoundEnabled((prev) => !prev);
    });

    const SoundIcon = isSoundEnabled ? Volume2Icon : VolumeXIcon;

    return (
        <div
            className="relative size-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {canRenderImage && !hasImageFailed ? (
                <img
                    alt=""
                    className="size-full object-cover transition-opacity duration-100"
                    draggable="false"
                    fetchPriority="auto"
                    height={400}
                    loading="eager"
                    onError={handleImageError}
                    src={src}
                    style={{ cursor: "pointer" }}
                    width={300}
                />
            ) : (
                <MediaPlaceholder className="-z-1 min-h-32" />
            )}
            {shouldLoadVideo ? (
                <>
                    <video
                        className={cn(
                            "squircle pointer-events-none absolute inset-0 size-full rounded-xl object-contain duration-150",
                            { "z-1": isHovered }
                        )}
                        crossOrigin="use-credentials"
                        loop
                        muted={!isSoundEnabled}
                        onCanPlay={handleCanPlay}
                        onError={handleVideoError}
                        playsInline
                        preload="metadata"
                        ref={videoRef}
                        src={videoSrc}
                    />
                    {isVideoLoading ? (
                        <div
                            className={cn(
                                "pointer-events-none absolute top-2 left-2 z-10 rounded-full bg-black/50 text-white opacity-0 transition-opacity",
                                { "opacity-100": isHovered }
                            )}
                        >
                            <Spinner
                                aria-hidden
                                className="m-1.5 size-4"
                                focusable="false"
                            />
                        </div>
                    ) : (
                        <Button
                            aria-label={
                                isSoundEnabled
                                    ? "Mute video preview"
                                    : "Enable video preview sound"
                            }
                            aria-pressed={isSoundEnabled}
                            className={cn(
                                "pointer-events-auto absolute top-2 left-2 z-10 rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/60 focus-visible:opacity-100 focus-visible:ring-ring/70",
                                { "opacity-100": isHovered }
                            )}
                            onClick={handleSoundToggle}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <SoundIcon
                                aria-hidden
                                className="size-4"
                                focusable="false"
                            />
                        </Button>
                    )}
                </>
            ) : null}
        </div>
    );
}

type LibraryGridCardContextValue = Pick<
    BrowserResultsContextValue,
    | "collections"
    | "favoriteItemIdSet"
    | "onCopyLink"
    | "onDelete"
    | "onFindSimilar"
    | "onItemFavoriteToggle"
    | "onOpenInNewTab"
    | "onOpenNote"
    | "onUpdateItemCollections"
    | "pendingDeleteItemId"
>;

interface CollectionComboboxPickerProps
    extends React.ComponentProps<typeof ComboboxTrigger> {
    collections: LibraryCollectionSummary[];
    items: LibraryItemWithCollections[];
    onOpenChange?: (open: boolean) => void;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    onUpdateItemsCollections?: (input: {
        itemIds: string[];
        nextSharedCollectionIds: string[];
        previousSharedCollectionIds: string[];
    }) => Promise<LibraryItemsCollectionsUpdateResult>;
    open?: boolean;
}

interface LibraryGridCardProps {
    item: LibraryItemWithCollections;
}

interface LibraryGridCardMenuProps {
    addedLabel: string;
    createdLabel: string;
    href: string;
    isDownloading: boolean;
    isOpen: boolean;
    item: LibraryItemWithCollections;
    kind: "context" | "menu";
    onDownload: () => void;
    onZoomIn: () => void;
    previewImageUrl: string | null;
}

function formatWaybackDate(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${y}${m}${d}${h}${min}${s}`;
}

function itemDateLabel(dateValue: Date | string | null | undefined): string {
    const date = parseDate(dateValue);
    if (!date) {
        return "";
    }
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getSharedCollectionIds(items: LibraryItemWithCollections[]): string[] {
    if (items.length === 0) {
        return [];
    }

    const [firstItem, ...remainingItems] = items;
    const sharedCollectionIds = new Set(
        firstItem?.collections.map((collection) => collection.id)
    );

    for (const item of remainingItems) {
        const itemCollectionIds = new Set(
            item.collections.map((collection) => collection.id)
        );
        for (const collectionId of [...sharedCollectionIds]) {
            if (!itemCollectionIds.has(collectionId)) {
                sharedCollectionIds.delete(collectionId);
            }
        }
    }

    return (
        firstItem?.collections
            .map((collection) => collection.id)
            .filter((collectionId) => sharedCollectionIds.has(collectionId)) ??
        []
    );
}

function getItemTitle(item: LibraryItemWithCollections): string {
    if (item.kind === "note") {
        return "";
    }
    const caption = item.caption?.trim();
    if (caption) {
        return caption;
    }
    return item.url;
}

async function downloadLibraryItemMedia(
    item: LibraryItemWithCollections
): Promise<void> {
    if (!COBALT_SOURCES.has(item.source)) {
        // TODO: more download options
        return;
    }

    const result = await downloadMedia(item.url);
    if (result.status !== "SUCCESS") {
        return;
    }

    const ownerDocument = getOwnerDocument();
    const link = ownerDocument.createElement("a");
    link.href = result.downloadUrl;
    link.download = "";
    link.target = "_blank";
    ownerDocument.body.appendChild(link);
    link.click();
    ownerDocument.body.removeChild(link);
}

function CollectionComboboxPicker({
    collections,
    items,
    onUpdateItemsCollections,
    onUpdateItemCollections,
    open: openProp,
    onOpenChange,
    children,
    ...props
}: CollectionComboboxPickerProps) {
    const [isOpenInternal, setIsOpenInternal] = React.useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;
    const selectedCollectionIds = getSharedCollectionIds(items);
    const selectedCount = selectedCollectionIds.length;

    return (
        <Combobox
            autoHighlight
            items={collections}
            multiple
            onOpenChange={setIsOpen}
            onValueChange={(nextIds) => {
                const nextCollectionIds = [...nextIds];

                if (items.length === 1) {
                    const [item] = items;
                    if (!item) {
                        return;
                    }
                    onUpdateItemCollections(item.id, nextCollectionIds).catch(
                        () => undefined
                    );
                    return;
                }

                if (!onUpdateItemsCollections) {
                    throw new Error(
                        "Bulk collection updates require onUpdateItemsCollections."
                    );
                }

                onUpdateItemsCollections({
                    itemIds: items.map((item) => item.id),
                    nextSharedCollectionIds: nextCollectionIds,
                    previousSharedCollectionIds: selectedCollectionIds,
                }).catch(() => undefined);
            }}
            open={isOpen}
            value={selectedCollectionIds}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={
                            selectedCount > 0
                                ? `Edit collections (${selectedCount} selected)`
                                : "Add to collections"
                        }
                        className="z-1 rounded-full transition-transform ease-in-out active:scale-95"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
                {...props}
            >
                {children ??
                    (selectedCount > 0 ? (
                        <Squircle
                            aria-hidden
                            aria-label="Collections"
                            className="size-4.5"
                        />
                    ) : (
                        <CircleDashed
                            aria-hidden
                            aria-label="Collections"
                            className="size-4"
                        />
                    ))}
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    endAddon={<Kbd>S</Kbd>}
                    placeholder="Assign collections..."
                />
                <ComboboxEmpty>No matching collections</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(collection) => (
                            <ComboboxItem
                                className="group/item"
                                key={collection.id}
                                value={collection.id}
                            >
                                <div className="flex max-w-56 items-center justify-between gap-3">
                                    <span className="min-w-0 max-w-full flex-1 truncate text-foreground text-sm">
                                        {collection.name}
                                    </span>
                                    <div className="relative flex w-fit items-center justify-end pl-4">
                                        <span className="shrink-0 text-nowrap text-muted-foreground text-xs tabular-nums group-data-highlighted/item:opacity-0">
                                            {collection.itemCount}
                                        </span>
                                        <span className="absolute right-0 shrink-0 text-nowrap text-muted-foreground text-xs opacity-0 group-data-highlighted/item:opacity-100">
                                            Save
                                        </span>
                                    </div>
                                </div>
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

function CardCollectionPicker({
    item,
    onOpenChange,
    open,
}: {
    item: LibraryItemWithCollections;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
}) {
    const { collections, onUpdateItemCollections } =
        useLibraryGridCardContext();

    return (
        <CollectionComboboxPicker
            collections={collections}
            items={[item]}
            onOpenChange={onOpenChange}
            onUpdateItemCollections={onUpdateItemCollections}
            open={open}
        />
    );
}

function PreviewColor({ value }: { value: string }) {
    const { copyToClipboard, isCopied } = useCopyToClipboard();

    return (
        <Avatar
            className="relative size-4.5 cursor-pointer overflow-visible"
            onClick={() => copyToClipboard(value)}
        >
            <AvatarFallback style={{ backgroundColor: value }}>
                {isCopied ? (
                    <>
                        <Check className="size-3 text-black invert" />
                        <span className="absolute -bottom-4 text-nowrap rounded-full bg-white text-[11px] text-success-foreground">
                            Copied!
                        </span>
                    </>
                ) : null}
            </AvatarFallback>
        </Avatar>
    );
}

function PreviewColorPalette({ src }: { src: string }) {
    const { data } = useSWR(src, getImageColors, {
        keepPreviousData: true,
    });

    if (!data) {
        return null;
    }

    return (
        <AvatarGroup className="justify-end -space-x-1">
            {data.map((value, i) => (
                <PreviewColor key={i} value={value} />
            ))}
        </AvatarGroup>
    );
}

function CardMenu({
    addedLabel,
    createdLabel,
    href,
    isDownloading,
    isOpen,
    item,
    kind,
    onDownload,
    onZoomIn,
    previewImageUrl,
}: LibraryGridCardMenuProps) {
    const {
        favoriteItemIdSet,
        onCopyLink,
        onDelete,
        onFindSimilar,
        onItemFavoriteToggle,
        onOpenInNewTab,
        onOpenNote,
        pendingDeleteItemId,
    } = useLibraryGridCardContext();
    const Item = kind === "context" ? ContextMenuItem : MenuItem;
    const ItemSeparator =
        kind === "context" ? ContextMenuSeparator : MenuSeparator;
    const isNote = item.kind === ITEM_KIND_NOTE;
    const isFavorite = favoriteItemIdSet.has(item.id);
    const isDeletePending = pendingDeleteItemId === item.id;
    const SourceIcon = getSourceIcon(item.source);
    const canPreview = !isNote && toValidUrl(href) !== FALLBACK_URL;

    useHotkeys(
        "alt+f",
        (event: KeyboardEvent) => {
            event.preventDefault();
            onItemFavoriteToggle(item);
        },
        {
            description: "Toggle favorite on selected item",
            enabled: isOpen && !isDeletePending,
            enableOnContentEditable: false,
            enableOnFormTags: false,
        },
        [isOpen, isDeletePending, item, onItemFavoriteToggle]
    );

    useHotkeys(
        "mod+backspace",
        (event: KeyboardEvent) => {
            event.preventDefault();
            if (!isDeletePending && onDelete) {
                onDelete(item);
            }
        },
        {
            description: "Delete selected item",
            enabled: isOpen && !isDeletePending,
            enableOnContentEditable: false,
            enableOnFormTags: false,
        },
        [isOpen, isDeletePending, item, onDelete]
    );

    return (
        <>
            <Collapsible>
                <CollapsibleTrigger
                    className="max-w-56"
                    render={
                        <Button
                            className="max-w-full justify-between rounded-xl"
                            variant="ghost"
                        />
                    }
                >
                    <span className="block truncate text-xs">
                        {itemPrimaryText(item)}
                    </span>
                    <ChevronDown className="ml-auto inline-block size-4" />
                </CollapsibleTrigger>
                <CollapsiblePanel className="px-2.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between gap-3 py-0.5">
                        <span>Created</span>
                        <span className="text-foreground tabular-nums">
                            {createdLabel}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-0.5">
                        <span>Added</span>
                        <span className="text-foreground tabular-nums">
                            {addedLabel}
                        </span>
                    </div>
                    {previewImageUrl ? (
                        <div className="flex items-center justify-between gap-3 py-0.5 pb-3">
                            <span>Palette</span>
                            <PreviewColorPalette src={previewImageUrl} />
                        </div>
                    ) : null}
                </CollapsiblePanel>
            </Collapsible>
            <ItemSeparator />
            <Item onClick={() => onItemFavoriteToggle(item)}>
                <Star
                    className={cn(
                        "size-4.5 text-muted-foreground",
                        isFavorite && "fill-current"
                    )}
                />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                <Kbd className="ml-auto">
                    <AltKbd />F
                </Kbd>
            </Item>
            {isNote ? (
                <Item onClick={() => onOpenNote?.(item)}>
                    <FilePenLineIcon className="size-4.5 text-muted-foreground" />
                    Edit note
                </Item>
            ) : null}
            {canPreview ? (
                <QuickLookDrawer
                    description={itemDomain(item.url)}
                    key={item.url}
                    title={getItemTitle(item)}
                    url={item.url}
                >
                    <QuickLookDrawerTrigger
                        nativeButton={false}
                        render={<Item closeOnClick={false} />}
                    >
                        <EyeIcon className="size-4.5 text-muted-foreground" />
                        Quick Look
                    </QuickLookDrawerTrigger>
                </QuickLookDrawer>
            ) : null}
            {previewImageUrl ? (
                <Item onClick={onZoomIn}>
                    <ZoomIn className="size-4.5 text-muted-foreground" />
                    Zoom in
                </Item>
            ) : null}
            {isNote ? null : (
                <>
                    <Item
                        className="cursor-alias"
                        onClick={() => onOpenInNewTab?.(item)}
                    >
                        {SourceIcon ? (
                            <SourceIcon className="size-4 text-muted-foreground" />
                        ) : (
                            <ExternalLinkIcon className="size-4.5 text-muted-foreground" />
                        )}
                        Open in new tab
                        <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                    </Item>
                    <Item onClick={() => onCopyLink?.(item)}>
                        <LinkIcon className="size-4.5 text-muted-foreground" />
                        Copy link URL
                    </Item>
                    <ItemSeparator />
                    <Item disabled={isDownloading} onClick={onDownload}>
                        <DownloadIcon className="size-4.5 text-muted-foreground" />
                        {isDownloading ? "Downloading..." : "Download media"}
                    </Item>
                </>
            )}
            <Item onClick={() => onFindSimilar(item)}>
                <SearchIcon className="size-4.5 text-muted-foreground" />
                Find similar
            </Item>
            {isNote ? null : (
                <MenuSub>
                    <MenuSubTrigger>
                        <History className="size-4.5 text-muted-foreground" />
                        Previous versions
                    </MenuSubTrigger>
                    <MenuSubPopup>
                        <MenuItem
                            onClick={() =>
                                openExternal(
                                    `https://web.archive.org/web/${formatWaybackDate(-30)}/${item.url}`
                                )
                            }
                        >
                            <History className="size-4 text-muted-foreground" />
                            1 month ago
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                openExternal(
                                    `https://web.archive.org/web/${formatWaybackDate(-90)}/${item.url}`
                                )
                            }
                        >
                            <History className="size-4 text-muted-foreground" />
                            3 months ago
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                openExternal(
                                    `https://web.archive.org/web/${formatWaybackDate(-365)}/${item.url}`
                                )
                            }
                        >
                            <History className="size-4 text-muted-foreground" />
                            1 year ago
                        </MenuItem>
                        <MenuItem
                            onClick={() =>
                                openExternal(
                                    `https://web.archive.org/web/*/${item.url}`
                                )
                            }
                        >
                            <History className="size-4 text-muted-foreground" />
                            View all snapshots
                        </MenuItem>
                    </MenuSubPopup>
                </MenuSub>
            )}
            <ItemSeparator />
            <Item disabled={isDeletePending} onClick={() => onDelete?.(item)}>
                {isDeletePending ? "Deleting..." : "Delete"}
                <Kbd className="ml-auto">
                    <CmdKbd />⌫
                </Kbd>
            </Item>
        </>
    );
}

function ImageZoomOverlay({
    onClose,
    src,
}: {
    onClose: () => void;
    src: string;
}) {
    const ownerDocument = getOwnerDocument();

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        ownerDocument.addEventListener("keydown", handleKeyDown);
        return () =>
            ownerDocument.removeEventListener("keydown", handleKeyDown);
    }, [onClose, ownerDocument]);

    return createPortal(
        <div
            aria-modal="true"
            className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/32 duration-250"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    onClose();
                }
            }}
            role="dialog"
        >
            <button
                className="absolute top-4 right-4 z-10 rounded-full bg-muted/80 p-2 text-muted-foreground hover:bg-muted"
                onClick={onClose}
                type="button"
            >
                <XIcon className="size-5" />
            </button>
            <img
                alt=""
                className="h-full w-auto object-contain"
                height={400}
                src={src}
                width={300}
            />
        </div>,
        ownerDocument.body
    );
}

function MediaCard({ item }: LibraryGridCardProps) {
    const { onOpenInNewTab, onOpenNote } = useLibraryGridCardContext();
    const isNote = item.kind === ITEM_KIND_NOTE;
    const [isDownloading, startDownloadTransition] = React.useTransition();
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] =
        React.useState(false);
    const [isCardMenuOpen, setIsCardMenuOpen] = React.useState(false);
    const [isContextMenuOpen, setIsContextMenuOpen] = React.useState(false);
    const [isZoomed, setIsZoomed] = React.useState(false);
    const href = normalizeURL(item.url);
    const previewImageUrl = itemPreviewImageUrl(item);
    const previewVideoUrl = itemPreviewVideoUrl(item);
    const createdLabel = itemDateLabel(item.createdAt);
    const addedLabel = itemDateLabel(item.scrapedAt ?? item.createdAt);
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const displayTitle = getItemTitle(item);
    const { markVisited, isLastVisited } = useLastVisited();

    const handleZoomIn = () => {
        setIsZoomed(true);
    };

    const handlePrimaryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isNote) {
            onOpenNote?.(item);
            return;
        }
        onOpenInNewTab?.(item);
        markVisited(item.id);
    };

    const handleDownload = () => {
        startDownloadTransition(async () => {
            try {
                await downloadLibraryItemMedia(item);
            } catch (error) {
                log.error("Failed to prepare media download", error, {
                    itemId: item.id,
                    url: item.url,
                });
            }
        });
    };

    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (
            event.defaultPrevented ||
            event.nativeEvent.isComposing ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            isCollectionPickerOpen ||
            isTextEntryTarget(
                event.target,
                getOwnerWindow(event.currentTarget)
            ) ||
            event.key.toLowerCase() !== "s"
        ) {
            return;
        }
        event.preventDefault();
        setIsCollectionPickerOpen(true);
    };

    return (
        <>
            <ContextMenu onOpenChange={setIsContextMenuOpen}>
                <ContextMenuTrigger
                    onKeyDown={handleCardKeyDown}
                    render={
                        // biome-ignore lint/a11y/useSemanticElements: Group role
                        <div
                            className="group relative flex shrink-0 flex-col focus-visible:outline-none"
                            role="group"
                        />
                    }
                >
                    <a
                        className="squircle flex flex-col overflow-clip rounded-xl focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        href={href}
                        onClick={handlePrimaryClick}
                        rel="noopener noreferrer"
                        target={isNote ? undefined : "_blank"}
                    >
                        {isNote ? (
                            <div className="relative flex h-auto min-h-56 w-full flex-col justify-between bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                                <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                                    <p className="whitespace-pre-wrap text-[11px] text-foreground leading-relaxed opacity-90">
                                        {noteExcerpt ||
                                            "Tap to start writing in this note"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <MediaPreview
                                    src={previewImageUrl}
                                    videoSrc={previewVideoUrl}
                                />
                                {isLastVisited(item.id) ? (
                                    <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-px font-medium text-white text-xs leading-normal">
                                        <T>Last visited</T>
                                        <ArrowUpRight
                                            aria-hidden
                                            className="hidden size-4 group-hover:inline-block"
                                            focusable="false"
                                        />
                                    </span>
                                ) : (
                                    <span className="absolute top-2 right-2 z-10 rounded-full bg-black/50 px-1.5 py-px font-medium text-white text-xs leading-normal opacity-0 group-hover:opacity-100">
                                        <ArrowUpRight
                                            aria-hidden
                                            className="size-4"
                                            focusable="false"
                                        />
                                    </span>
                                )}
                            </>
                        )}
                    </a>
                    <div className="flex items-center py-1 pr-3">
                        <CardCollectionPicker
                            item={item}
                            onOpenChange={setIsCollectionPickerOpen}
                            open={isCollectionPickerOpen}
                        />
                        <Menu
                            onOpenChange={setIsCardMenuOpen}
                            open={isCardMenuOpen}
                        >
                            <MenuTrigger
                                render={
                                    <button
                                        className="min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left font-normal text-[11px] text-foreground leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        title={displayTitle}
                                        type="button"
                                    />
                                }
                            >
                                <Ticker>{displayTitle}</Ticker>
                            </MenuTrigger>
                            <MenuPopup>
                                <CardMenu
                                    addedLabel={addedLabel}
                                    createdLabel={createdLabel}
                                    href={href}
                                    isDownloading={isDownloading}
                                    isOpen={isCardMenuOpen}
                                    item={item}
                                    kind="menu"
                                    onDownload={handleDownload}
                                    onZoomIn={handleZoomIn}
                                    previewImageUrl={previewImageUrl}
                                />
                            </MenuPopup>
                        </Menu>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuPopup>
                    <CardMenu
                        addedLabel={addedLabel}
                        createdLabel={createdLabel}
                        href={href}
                        isDownloading={isDownloading}
                        isOpen={isContextMenuOpen}
                        item={item}
                        kind="context"
                        onDownload={handleDownload}
                        onZoomIn={handleZoomIn}
                        previewImageUrl={previewImageUrl}
                    />
                </ContextMenuPopup>
            </ContextMenu>
            {isZoomed && previewImageUrl ? (
                <ImageZoomOverlay
                    onClose={() => setIsZoomed(false)}
                    src={previewImageUrl}
                />
            ) : null}
        </>
    );
}

interface LockedLibraryPreviewPlaceholder {
    aspect: string;
    id: string;
    kind: "bookmark" | "note";
}

const LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS = [
    {
        aspect: "aspect-[4/5]",
        id: "locked-library-preview-1",
        kind: "bookmark",
    },
    { aspect: "aspect-[3/4]", id: "locked-library-preview-2", kind: "note" },
    {
        aspect: "aspect-square",
        id: "locked-library-preview-3",
        kind: "bookmark",
    },
    {
        aspect: "aspect-[5/6]",
        id: "locked-library-preview-4",
        kind: "bookmark",
    },
    { aspect: "aspect-[4/5]", id: "locked-library-preview-5", kind: "note" },
    {
        aspect: "aspect-[3/4]",
        id: "locked-library-preview-6",
        kind: "bookmark",
    },
    {
        aspect: "aspect-square",
        id: "locked-library-preview-7",
        kind: "bookmark",
    },
    { aspect: "aspect-[5/6]", id: "locked-library-preview-8", kind: "note" },
    {
        aspect: "aspect-[4/5]",
        id: "locked-library-preview-9",
        kind: "bookmark",
    },
] satisfies LockedLibraryPreviewPlaceholder[];

function LockedPreviewCard({
    placeholder,
}: {
    placeholder: LockedLibraryPreviewPlaceholder;
}) {
    return (
        <div className="relative flex flex-col overflow-clip rounded-xl ring-1 ring-border/30">
            {placeholder.kind === "note" ? (
                <div className="relative min-h-56 bg-linear-to-br from-amber-50 via-background to-stone-100 p-4">
                    <div className="absolute inset-0 bg-background/30" />
                    <div className="relative flex h-full flex-col gap-3">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-[86%]" />
                            <Skeleton className="h-3 w-[74%]" />
                            <Skeleton className="h-3 w-[68%]" />
                            <Skeleton className="h-3 w-[56%]" />
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={cn(
                        "relative overflow-clip bg-linear-to-br from-muted/75 via-card to-muted/45",
                        placeholder.aspect
                    )}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_38%)]" />
                    <div className="absolute inset-0 bg-background/25" />
                    <div className="relative flex h-full flex-col justify-between p-4">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-[88%]" />
                            <Skeleton className="h-3 w-[62%]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface NoteDrawerProps {
    activeNote: LibraryItemWithCollections | typeof NOTE_DRAWER_NEW | null;
    container: React.RefObject<HTMLDivElement | null>;
    handlePasteUrlIntoLibrary: (url: string) => Promise<void>;
    handleSaveNote: (
        draft: NoteDraft,
        noteId: string | null
    ) => Promise<LibraryItemWithCollections | null>;
    isSavingNote: boolean;
    isSavingPastedUrl: boolean;
    onNoteDrawerClose: () => void;
}

/**
 * Lazily load the note editor so the ~350 KB Lexical subtree is not
 * included in the initial browser bundle.
 *
 * The component is always rendered so the chunk starts loading on
 * hydration, but it returns null while loading because the drawer is
 * closed most of the time and a loading skeleton would flash on every
 * page load.
 */
const NoteDrawer = dynamic(
    () =>
        import("@/components/library/notes").then((mod) => {
            const Note = mod.Note;

            function NoteDrawerShell({
                container,
                contentEditableRef,
                isNoteDrawerOpen,
            }: {
                container: React.RefObject<HTMLDivElement | null>;
                contentEditableRef: React.RefObject<HTMLDivElement | null>;
                isNoteDrawerOpen: boolean;
            }) {
                const { onOpenChange } = Note.useContext();

                return (
                    <Drawer
                        onOpenChange={onOpenChange}
                        open={isNoteDrawerOpen}
                        position="right"
                        swipeDirection="right"
                    >
                        <DrawerViewport
                            portalProps={{
                                container,
                            }}
                        >
                            <DrawerPopup
                                className="max-w-2xl"
                                initialFocus={contentEditableRef}
                                variant="straight"
                            >
                                <DrawerHeader
                                    allowSelection
                                    className="flex-row items-center justify-between"
                                >
                                    <DrawerTitle className="sr-only">
                                        <Note.Title />
                                    </DrawerTitle>
                                    <Note.Header />
                                </DrawerHeader>
                                <DrawerPanel allowSelection>
                                    <Note.Editor />
                                    <Note.Metrics />
                                </DrawerPanel>
                            </DrawerPopup>
                        </DrawerViewport>
                    </Drawer>
                );
            }

            return function NoteDrawer({
                activeNote,
                container,
                handlePasteUrlIntoLibrary,
                handleSaveNote,
                isSavingNote,
                isSavingPastedUrl,
                onNoteDrawerClose,
            }: NoteDrawerProps) {
                const isNoteDrawerOpen = activeNote !== null;
                const note = activeNote === NOTE_DRAWER_NEW ? null : activeNote;
                const contentEditableRef = React.useRef<HTMLDivElement | null>(
                    null
                );

                return (
                    <Note.Root
                        contentEditableRef={contentEditableRef}
                        isSaving={isSavingNote || isSavingPastedUrl}
                        note={note}
                        onOpenChange={(open) => {
                            if (!open) {
                                onNoteDrawerClose();
                            }
                        }}
                        onSave={handleSaveNote}
                        onUrlPaste={handlePasteUrlIntoLibrary}
                        open={isNoteDrawerOpen}
                    >
                        <NoteDrawerShell
                            container={container}
                            contentEditableRef={contentEditableRef}
                            isNoteDrawerOpen={isNoteDrawerOpen}
                        />
                    </Note.Root>
                );
            };
        }),
    { loading: () => null, ssr: false }
);

interface BrowserSimilarFilterState {
    collectionMembershipFilter: CollectionMembershipFilter;
    domainFilters: string[];
    searchTerms: string[];
    selectedCollectionIds: string[];
    sourceFilters: LibraryItemSource[];
}

interface BrowserSimilarFilterOptions {
    domain: string;
    source: LibraryItemSource;
}

function buildSimilarBrowserFilterState(
    state: BrowserSimilarFilterState,
    options: BrowserSimilarFilterOptions
): BrowserSimilarFilterState {
    const shouldUseDomainFilter =
        DOMAIN_RELATED_SOURCES.has(options.source) &&
        options.domain !== UNSPECIFIC_DOMAIN_FILTER;

    return {
        ...state,
        collectionMembershipFilter: DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
        domainFilters: shouldUseDomainFilter ? [options.domain] : [],
        searchTerms: [],
        selectedCollectionIds: [],
        sourceFilters: shouldUseDomainFilter ? [] : [options.source],
    };
}

export function Browser({
    connectedIntegrationCount,
    lockedItemCount,
    totalItemCount,
}: LibraryProps) {
    const { hasAccess } = useSubscriptionAccess();
    const isExtensionInstalled = useIsExtensionInstalled();
    const paletteCaretTimeout = useTimeout();
    const paletteFocusOutTimeout = useTimeout();

    const {
        collectionPreviewThumbnailUrlsById,
        collectionSummaries: collections,
        favoriteItemIdSet,
        items,
        onClearCollectionFilters,
        onCreateCollectionFromResults,
        onDeleteItemSuccess,
        onSelectCollection: onRemoveCollectionFilter,
        onToggleItemFavorite,
        onUpdateItemCollections,
        onUpdateItemsCollections,
        requestCreate,
        selectedCollectionIds,
        setItems: onItemsChange,
    } = useWorkspaceContext();

    const openFavoriteItemRef = React.use(OpenFavoriteItemRefContext);

    const [query, setQuery] = React.useState("");
    const [searchTerms, setSearchTerms] = React.useState<string[]>([]);
    const [sourceFilters, setSourceFilters] = React.useState<
        LibraryItemSource[]
    >([]);
    const [domainFilters, setDomainFilters] = React.useState<string[]>([]);
    const [collectionMembershipFilter, setCollectionMembershipFilter] =
        React.useState<CollectionMembershipFilter>(
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
        );
    const [groupBy, setGroupBy] = React.useState<GroupByMode>("none");
    const [sortMode, setSortMode] = React.useState<SortMode>(DEFAULT_SORT_MODE);
    const [columnCountMode, setColumnCountMode] =
        React.useState<ColumnCountMode>(DEFAULT_COLUMN_COUNT_MODE);
    const [containerWidth, setContainerWidth] = React.useState<ContainerWidth>(
        DEFAULT_CONTAINER_WIDTH
    );
    const { lastVisitedItemIds } = useLastVisited();
    const [lastVisitedFilterEnabled, setLastVisitedFilterEnabled] =
        React.useState(false);
    const { open: sidebarOpen } = useSidebar();
    const userHasSetWidthRef = React.useRef(false);
    const [paletteSection, setPaletteSection] =
        React.useState<PaletteSection>("search");
    const [commandAttachments, setCommandAttachments] = React.useState<
        LibraryCommandAttachment[]
    >([]);
    const [askCacheResponse, setAskCacheResponse] =
        React.useState<AskCacheResponseState | null>(null);
    const [activeNote, setActiveNote] = React.useState<
        LibraryItemWithCollections | typeof NOTE_DRAWER_NEW | null
    >(null);
    const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] =
        React.useState(false);
    const [createResultsNameDraft, setCreateResultsNameDraft] =
        React.useState("");
    const [createResultsDescriptionDraft, setCreateResultsDescriptionDraft] =
        React.useState("");
    const [createResultsError, setCreateResultsError] = React.useState<
        string | null
    >(null);

    const [isCommandOpen, setIsCommandOpen] = React.useState(false);
    const [isCommandFocused, setIsCommandFocused] = React.useState(false);

    const commandPanelContainerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const commandAttachmentsRef = React.useRef<LibraryCommandAttachment[]>([]);
    const askCacheRequestVersionRef = React.useRef(0);
    commandAttachmentsRef.current = commandAttachments;

    const createResultsNameInputId = React.useId();
    const createResultsDescriptionId = React.useId();
    /** Skips one combobox-driven close right after entering a drill-down section. */
    const suppressNextCommandCloseRef = React.useRef(false);
    const collectionUpdateFeedbackVersionByItemIdRef = React.useRef(
        new Map<string, number>()
    );

    const {
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
    } = useLibraryItemActions({
        onDeleteSuccess: (result) => {
            onDeleteItemSuccess(result);
        },
        setVisibleItems: onItemsChange,
    });

    const [isSavingNote, startSavingNoteTransition] = React.useTransition();
    const [isSavingPastedUrl, startSavingPastedUrlTransition] =
        React.useTransition();
    const [
        isCreatingResultsCollection,
        startCreateResultsCollectionTransition,
    ] = React.useTransition();

    const clearCommandAttachments = useStableCallback(() => {
        setCommandAttachments((current) => {
            for (const attachment of current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
            return [];
        });
    });

    const handleSetContainerWidth = useStableCallback(
        (width: ContainerWidth) => {
            userHasSetWidthRef.current = true;
            setContainerWidth(width);
        }
    );

    const clearLibraryPalette = useStableCallback(() => {
        setQuery("");
        setSearchTerms([]);
        setSourceFilters([]);
        setDomainFilters([]);
        clearCommandAttachments();
        setCollectionMembershipFilter(DEFAULT_COLLECTION_MEMBERSHIP_FILTER);
        onClearCollectionFilters();
        setGroupBy("none");
        setSortMode(DEFAULT_SORT_MODE);
        setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        setLastVisitedFilterEnabled(false);
        userHasSetWidthRef.current = false;
        setContainerWidth(sidebarOpen ? DEFAULT_CONTAINER_WIDTH : "full");
        setPaletteSection("search");
        setIsCommandOpen(false);
    });

    const buildAskCacheRequest = useStableCallback(
        (prompt: string): AskCacheRequest => ({
            composerState: {
                collectionMembershipFilter,
                columnCountMode,
                containerWidth,
                domainFilters,
                groupBy,
                searchTerms,
                selectedCollectionIds,
                sortMode,
                sourceFilters,
            },
            prompt,
            runtimeContext: {
                clientLocale: navigator.language,
                clientTimeZone:
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                surface: "library_composer",
            },
            visibleContext: {
                availableCollections: collections
                    .slice(0, ASK_CACHE_CONTEXT_COLLECTION_LIMIT)
                    .map((collection) => ({
                        id: collection.id,
                        itemCount: collection.itemCount,
                        name: collection.name,
                    })),
                availableDomains: domainOptions
                    .filter((option) => option.value !== ALL_DOMAIN_FILTER)
                    .slice(0, ASK_CACHE_CONTEXT_DOMAIN_LIMIT)
                    .map((option) => option.value),
                filteredItemCount: filterCommandItems(items, {
                    collectionMembershipFilter,
                    domainFilters,
                    lastVisitedItemIds: lastVisitedFilterEnabled
                        ? lastVisitedItemIds
                        : [],
                    searchTerms,
                    selectedCollectionIds,
                    sourceFilters,
                }).length,
                totalItemCount,
            },
        })
    );

    const applyAskCachePatch = useStableCallback(
        (patch: AskCacheComposerPatch) => {
            if (patch.reset) {
                clearLibraryPalette();
            }

            if (patch.searchTerms) {
                setSearchTerms(patch.searchTerms);
            }
            if (patch.sourceFilters) {
                setSourceFilters(patch.sourceFilters);
            }
            if (patch.domainFilters) {
                setDomainFilters(patch.domainFilters);
            }
            if (patch.collectionMembershipFilter) {
                setCollectionMembershipFilter(patch.collectionMembershipFilter);
            }
            if (patch.groupBy) {
                setGroupBy(patch.groupBy);
            }
            if (patch.sortMode) {
                setSortMode(patch.sortMode);
            }
            if (patch.columnCountMode) {
                setColumnCountMode(patch.columnCountMode);
            }
            if (patch.containerWidth) {
                handleSetContainerWidth(patch.containerWidth);
            }
            if (patch.selectedCollectionIds) {
                onClearCollectionFilters();
                for (const collectionId of patch.selectedCollectionIds) {
                    onRemoveCollectionFilter(collectionId);
                }
            }
        }
    );

    const handleAskCacheResult = useStableCallback(
        (prompt: string, result: AskCacheResult) => {
            if (result.status !== "SUCCESS") {
                setAskCacheResponse({
                    message: result.message,
                    prompt,
                    status: "error",
                });
                return;
            }

            for (const operation of result.operations) {
                applyAskCachePatch(operation);
            }
            setPaletteSection("ai-response");
            setIsCommandOpen(true);
            setAskCacheResponse({
                markdown: result.markdown,
                operationCount: result.operations.length,
                prompt,
                status: "success",
            });
        }
    );

    const handleAskCacheSubmit = useStableCallback(
        async (rawPrompt: string) => {
            const prompt = rawPrompt.trim();
            if (prompt.length === 0) {
                return;
            }

            const requestVersion = askCacheRequestVersionRef.current + 1;
            askCacheRequestVersionRef.current = requestVersion;
            setAskCacheResponse({ prompt, status: "loading" });
            setPaletteSection("ai-response");
            setQuery("");
            setIsCommandOpen(true);

            try {
                const result = await askCache(buildAskCacheRequest(prompt));
                if (askCacheRequestVersionRef.current !== requestVersion) {
                    return;
                }
                handleAskCacheResult(prompt, result);
            } catch (error) {
                if (askCacheRequestVersionRef.current !== requestVersion) {
                    return;
                }
                log.error("Failed to submit Ask Cache request", error);
                setAskCacheResponse({
                    message: "Ask Cache is unavailable right now.",
                    prompt,
                    status: "error",
                });
            } finally {
                if (askCacheRequestVersionRef.current === requestVersion) {
                    setPaletteSection("ai-response");
                    setIsCommandOpen(true);
                }
            }
        }
    );

    const returnToSearchSection = useStableCallback(() => {
        setPaletteSection("search");
        setQuery("");
        setIsCommandOpen(true);
    });

    const openPaletteSection = useStableCallback(
        (
            section: Exclude<PaletteSection, "search">,
            event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
        ) => {
            event.preventDefault();
            suppressNextCommandCloseRef.current = true;
            setPaletteSection(section);
            setQuery("");
        }
    );

    const domainOptions = buildDomainPaletteOptions(items);

    const groups = buildPaletteGroups({
        askCacheResponse,
        clearLibraryPalette,
        collectionMembershipFilter,
        collectionPreviewThumbnailUrlsById,
        collections,
        columnCountMode,
        containerWidth,
        domainFilters,
        domainOptions,
        groupBy,
        lastVisitedFilterEnabled,
        lastVisitedItemIds,
        onAskCacheSubmit: handleAskCacheSubmit,
        onClearCollectionFilters,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        openPaletteSection,
        paletteSection,
        query,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setContainerWidth: handleSetContainerWidth,
        setDomainFilters,
        setGroupBy,
        setIsCommandOpen,
        setLastVisitedFilterEnabled,
        setQuery,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    const filteredItems = filterCommandItems(items, {
        collectionMembershipFilter,
        domainFilters,
        lastVisitedItemIds: lastVisitedFilterEnabled ? lastVisitedItemIds : [],
        searchTerms,
        selectedCollectionIds,
        sourceFilters,
    });

    const sortedItems = sortCommandItems(filteredItems, sortMode);

    const sections = buildBrowserSections(
        sortedItems,
        groupBy,
        sortMode,
        collections
    );

    const hasActiveFilters = browserHasActiveFilters({
        collectionMembershipFilter,
        domainFilters,
        lastVisitedItemIds: lastVisitedFilterEnabled ? lastVisitedItemIds : [],
        searchTerms,
        selectedCollectionIds,
        sourceFilters,
    });

    const hasNonDefaultView =
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE ||
        containerWidth !== DEFAULT_CONTAINER_WIDTH ||
        sourceFilters.length > 0;

    const hasMeaningfulResultsView = hasActiveFilters || groupBy !== "none";

    const shouldShowEmptyLibraryPeek =
        items.length === 0 && filteredItems.length === 0 && !hasActiveFilters;

    const shouldShowNoFilteredResults =
        filteredItems.length === 0 && !shouldShowEmptyLibraryPeek;

    const {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        toggleSection,
    } = useSectionCollapseState({
        groupBy,
        hasActiveFilters,
        sections,
        shouldShowEmptyLibraryPeek,
        shouldShowNoFilteredResults,
    });

    const resolvedColumnCount =
        columnCountMode === "auto" ? undefined : Number(columnCountMode);

    const collapsedSectionKeySet = new Set(collapsedSectionKeys);

    const isPreviewOnly = !hasAccess && lockedItemCount > 0;

    let resultsSummary = `${filteredItems.length} of ${items.length} items`;
    if (filteredItems.length === items.length) {
        resultsSummary = `${items.length} item${items.length === 1 ? "" : "s"}`;
    }
    if (isPreviewOnly) {
        resultsSummary =
            filteredItems.length === items.length
                ? `${items.length} item${items.length === 1 ? "" : "s"} of ${totalItemCount}`
                : `${filteredItems.length} result${filteredItems.length === 1 ? "" : "s"} from ${items.length} visible`;
    }

    const visibleResultItems = sections.flatMap((section) => section.items);

    const canCreateCollectionFromResults =
        hasMeaningfulResultsView && visibleResultItems.length > 0;

    const resultCollectionItemIds = visibleResultItems.map((item) => item.id);

    const shouldShowLockedPreview =
        isPreviewOnly && !hasActiveFilters && groupBy === "none";

    const canClear =
        (hasActiveFilters || hasNonDefaultView) && !shouldShowEmptyLibraryPeek;

    const suggestions = buildCommandSuggestions({
        clearLibraryPalette,
        collectionMembershipFilter,
        collections,
        domainFilters,
        groupBy,
        isExtensionInstalled,
        items: filteredItems,
        lastVisitedFilterEnabled,
        onClearCollectionFilters,
        onCreateCollection: requestCreate,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setDomainFilters,
        setGroupBy,
        setIsCommandOpen,
        setQuery,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    const focusPaletteInput = useStableCallback((select = false) => {
        setIsCommandOpen(true);
        queueMicrotask(() => {
            inputRef.current?.focus();
            if (select) {
                inputRef.current?.select();
            }
        });
    });

    const placePaletteCaretAtEnd = useStableCallback((value: string) => {
        const end = value.length;
        const placeCaret = () => {
            inputRef.current?.setSelectionRange(end, end);
        };

        queueMicrotask(placeCaret);
        paletteCaretTimeout.start(0, placeCaret);
    });

    const handleCommandOpenChange = useStableCallback(
        (
            nextOpen: boolean,
            eventDetails: AutocompleteRootChangeEventDetails
        ) => {
            if (
                !nextOpen &&
                eventDetails.reason === COMBOBOX_ESCAPE_KEY_REASON &&
                paletteSection !== "search"
            ) {
                eventDetails.cancel();

                if (query.trim() === "") {
                    returnToSearchSection();
                    return;
                }

                setIsCommandOpen(true);
                return;
            }

            setIsCommandOpen(() => {
                if (!nextOpen && suppressNextCommandCloseRef.current) {
                    suppressNextCommandCloseRef.current = false;
                    return true;
                }

                if (!nextOpen) {
                    const shell = commandPanelContainerRef.current;
                    const ownerWindow = shell?.ownerDocument.defaultView;
                    const active = shell?.ownerDocument.activeElement;
                    const focusInsidePalette = Boolean(
                        shell &&
                            ownerWindow &&
                            active instanceof ownerWindow.Node &&
                            shell.contains(active)
                    );
                    const reason = eventDetails.reason;

                    // Inline autocomplete always requests close on item pick; keep the list
                    // visible while focus stays in the palette so the field matches the list.
                    if (
                        focusInsidePalette &&
                        reason === COMBOBOX_ITEM_PRESS_REASON
                    ) {
                        return true;
                    }
                }

                if (nextOpen) {
                    suppressNextCommandCloseRef.current = false;
                }

                return nextOpen;
            });
        }
    );

    const handleWindowKeyDown = useStableCallback((event: KeyboardEvent) => {
        const target = event.target;
        const ownerWindow = commandPanelContainerRef.current
            ? getOwnerWindow(commandPanelContainerRef.current)
            : getOwnerWindow();
        const isTextEntry = isTextEntryTarget(target, ownerWindow);
        const isPaletteEventTarget =
            target instanceof ownerWindow.Node &&
            commandPanelContainerRef.current?.contains(target);

        if (isSearchHotkey(event)) {
            event.preventDefault();
            focusPaletteInput(true);
            return;
        }

        if (
            event.key === "/" &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !isTextEntry
        ) {
            event.preventDefault();
            focusPaletteInput();
            return;
        }

        if (
            isCommandOpen &&
            !event.shiftKey &&
            !event.altKey &&
            (event.metaKey || event.ctrlKey)
        ) {
            const digit = event.key;
            const index = Number.parseInt(digit, 10) - 1;
            if (
                index >= 0 &&
                index < suggestions.length &&
                index < SUGGESTION_LIMIT
            ) {
                const suggestion = suggestions[index];
                if (suggestion) {
                    event.preventDefault();
                    suggestion.onSelect();
                    return;
                }
            }
        }

        if (
            event.defaultPrevented ||
            isTextEntry ||
            isPaletteEventTarget ||
            event.key.toLowerCase() === "s" ||
            !isPrintablePaletteKey(event)
        ) {
            return;
        }

        event.preventDefault();
        setQuery(event.key);
        focusPaletteInput();
        placePaletteCaretAtEnd(event.key);
    });

    useHotkeys(
        "*",
        handleWindowKeyDown,
        { description: "Focus command menu" },
        [focusPaletteInput]
    );

    const handleCommandInputChange = useStableCallback(
        (next: string, eventDetails: AutocompleteRootChangeEventDetails) => {
            if (
                groups
                    .flatMap((group) => group.items)
                    .some((value) => value.value === next)
            ) {
                eventDetails.cancel();
                return;
            }

            setQuery(next);
        }
    );

    const removeCommandAttachment = useStableCallback((id: string) => {
        setCommandAttachments((current) => {
            const nextAttachments: LibraryCommandAttachment[] = [];
            for (const attachment of current) {
                if (attachment.id === id) {
                    revokeFileAttachmentObjectUrl(attachment.url);
                    continue;
                }
                nextAttachments.push(attachment);
            }
            return nextAttachments;
        });
    });

    const paletteStackEntries = buildPaletteStackEntries({
        collectionMembershipFilter,
        collections,
        columnCountMode,
        commandAttachments,
        containerWidth,
        domainFilters,
        groupBy,
        lastVisitedFilterEnabled,
        onRemoveCollectionFilter,
        onRemoveCommandAttachment: removeCommandAttachment,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setContainerWidth: handleSetContainerWidth,
        setDomainFilters,
        setGroupBy,
        setLastVisitedFilterEnabled,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    const handlePaletteInputKeyDown = useStableCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (query.trim() !== "") {
                    setQuery("");
                    setIsCommandOpen(true);
                    return;
                }
                if (paletteSection !== "search") {
                    returnToSearchSection();
                    return;
                }
                setIsCommandOpen(false);
                event.currentTarget.blur();
                return;
            }

            if (
                event.key === "Tab" &&
                paletteSection === "search" &&
                query.trim() !== ""
            ) {
                event.preventDefault();
                event.stopPropagation();
                handleAskCacheSubmit(query).catch((error) => {
                    log.error("Failed to handle Ask Cache shortcut", error);
                });
                return;
            }

            if (event.key === "Backspace" && query.trim() === "") {
                event.preventDefault();
                if (paletteSection !== "search") {
                    returnToSearchSection();
                    return;
                }
                removeLastPaletteStackEntry(paletteStackEntries);
                return;
            }

            if (event.key === "ArrowDown" && !isCommandOpen) {
                setIsCommandOpen(true);
            }
        }
    );

    const handleCreateNote = useStableCallback(() => {
        setActiveNote(NOTE_DRAWER_NEW);
    });

    const handleOpenCommandFromOnboarding = useStableCallback(() => {
        setPaletteSection("search");
        focusPaletteInput(true);
    });

    const handleCreateResultsDialogOpenChange = useStableCallback(
        (open: boolean) => {
            if (open) {
                setCreateResultsError(null);
                setCreateResultsNameDraft(
                    buildResultsCollectionName(searchTerms)
                );
                setCreateResultsDescriptionDraft("");
                setIsCreateResultsDialogOpen(true);
                return;
            }

            if (!isCreatingResultsCollection) {
                setIsCreateResultsDialogOpen(false);
                setCreateResultsError(null);
            }
        }
    );

    const handleCreateCollectionFromResultsSubmit = useStableCallback(() => {
        startCreateResultsCollectionTransition(async () => {
            let result: CollectionCreateFromItemsResult;

            try {
                result = await onCreateCollectionFromResults({
                    description: createResultsDescriptionDraft || undefined,
                    itemIds: resultCollectionItemIds,
                    name: createResultsNameDraft,
                });
            } catch {
                result = {
                    message: "We couldn't create this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "CREATED") {
                setCreateResultsError(result.message);
                return;
            }

            setIsCreateResultsDialogOpen(false);
            setCreateResultsError(null);
        });
    });

    const handleExportSectionResults = useStableCallback(
        async (
            sectionTitle: string,
            sectionItems: LibraryItemWithCollections[]
        ) => {
            if (sectionItems.length === 0) {
                log.warn("Skipped empty browser section export", {
                    sectionTitle,
                });
                return;
            }

            try {
                await saveFile(
                    new Blob(
                        [buildBrowserSectionCsv(sectionTitle, sectionItems)],
                        { type: CSV_CONTENT_TYPE }
                    ),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: getBrowserSectionExportFileName(sectionTitle),
                    }
                );
            } catch (error) {
                log.error("Failed to export browser section results", error, {
                    itemCount: sectionItems.length,
                    sectionTitle,
                });
            }
        }
    );

    const handleOpenNote = useStableCallback(
        (item: LibraryItemWithCollections) => {
            setActiveNote(item);
        }
    );

    const handleOpenFavoriteItem = useStableCallback(
        (item: LibraryItemWithCollections) => {
            if (item.kind === ITEM_KIND_NOTE) {
                setActiveNote(item);
                return;
            }
            handleOpenInNewTab(item);
        }
    );

    const handleItemFavoriteToggle = useStableCallback(
        (item: LibraryItemWithCollections) => {
            onToggleItemFavorite(item).catch((error) => {
                log.error("Failed to toggle item favorite", {
                    error,
                    itemId: item.id,
                });
            });
        }
    );

    const handleFindSimilar = useStableCallback(
        (item: LibraryItemWithCollections) => {
            const similarDomain = itemDomain(item.url);
            const nextFilters = buildSimilarBrowserFilterState(
                {
                    collectionMembershipFilter,
                    domainFilters,
                    searchTerms,
                    selectedCollectionIds,
                    sourceFilters,
                },
                { domain: similarDomain, source: item.source }
            );

            setQuery("");
            setPaletteSection("search");
            setIsCommandOpen(false);
            setSearchTerms(nextFilters.searchTerms);
            setSourceFilters(nextFilters.sourceFilters);
            setDomainFilters(nextFilters.domainFilters);
            setCollectionMembershipFilter(
                nextFilters.collectionMembershipFilter
            );
            onClearCollectionFilters();
        }
    );

    const handleUpdateItemCollectionsWithFeedback = useStableCallback(
        async (
            itemId: string,
            collectionIds: string[]
        ): Promise<LibraryItemCollectionsUpdateResult> => {
            const requestVersion =
                (collectionUpdateFeedbackVersionByItemIdRef.current.get(
                    itemId
                ) ?? 0) + 1;
            collectionUpdateFeedbackVersionByItemIdRef.current.set(
                itemId,
                requestVersion
            );
            const result = await onUpdateItemCollections(itemId, collectionIds);

            if (
                collectionUpdateFeedbackVersionByItemIdRef.current.get(
                    itemId
                ) !== requestVersion
            ) {
                return result;
            }

            return result;
        }
    );

    const handleSaveNote = useStableCallback(
        async (
            draft: { contentHtml: string; contentState: unknown | null },
            noteId: string | null
        ) =>
            await new Promise<LibraryItemWithCollections | null>((resolve) => {
                startSavingNoteTransition(async () => {
                    const activeNoteId =
                        noteId ??
                        (activeNote === NOTE_DRAWER_NEW
                            ? null
                            : (activeNote?.id ?? null));
                    const result = await saveLibraryNoteDraft({
                        activeNoteId,
                        draft,
                    });

                    if (result.status !== "SUCCESS") {
                        resolve(null);
                        return;
                    }

                    onItemsChange((current) => {
                        const existingIndex = current.findIndex(
                            (item) => item.id === result.item.id
                        );

                        if (existingIndex === -1) {
                            return [result.item, ...current];
                        }

                        return current.map((item) =>
                            item.id === result.item.id ? result.item : item
                        );
                    });
                    setActiveNote(result.item);
                    resolve(result.item);
                });
            })
    );

    const handlePasteUrlIntoLibrary = useStableCallback(
        async (url: string) =>
            await new Promise<void>((resolve) => {
                startSavingPastedUrlTransition(async () => {
                    const result = await createLibraryBookmarkFromPastedUrl({
                        url,
                    });

                    if (result.status !== "SUCCESS") {
                        resolve();
                        return;
                    }

                    onItemsChange((current) => {
                        const existingIndex = current.findIndex(
                            (item) => item.id === result.item.id
                        );

                        if (existingIndex === -1) {
                            return [result.item, ...current];
                        }

                        return current.map((item) =>
                            item.id === result.item.id ? result.item : item
                        );
                    });

                    resolve();
                });
            })
    );

    useIsoLayoutEffect(() => {
        const element = commandPanelContainerRef.current;
        if (!element) {
            return;
        }
        const ownerWindow = getOwnerWindow(element);
        if (!ownerWindow) {
            return;
        }

        const handleFocusIn = (event: FocusEvent) => {
            setIsCommandFocused(true);
            if (event.target instanceof ownerWindow.HTMLInputElement) {
                setIsCommandOpen(true);
            }
        };

        const handleFocusOut = (event: FocusEvent) => {
            const { relatedTarget } = event;
            if (
                relatedTarget instanceof ownerWindow.Node &&
                element.contains(relatedTarget)
            ) {
                return;
            }
            const closeIfLeft = () => {
                const active = element.ownerDocument.activeElement;
                if (
                    !(
                        active instanceof ownerWindow.Node &&
                        element.contains(active)
                    )
                ) {
                    setIsCommandFocused(false);
                    setIsCommandOpen(false);
                }
            };
            queueMicrotask(closeIfLeft);
            paletteFocusOutTimeout.start(0, closeIfLeft);
        };

        element.addEventListener("focusin", handleFocusIn);
        element.addEventListener("focusout", handleFocusOut);
        return () => {
            paletteFocusOutTimeout.clear();
            element.removeEventListener("focusin", handleFocusIn);
            element.removeEventListener("focusout", handleFocusOut);
        };
    }, [paletteFocusOutTimeout]);

    React.useEffect(
        () => () => {
            for (const attachment of commandAttachmentsRef.current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
        },
        []
    );

    React.useEffect(() => {
        if (!openFavoriteItemRef) {
            return;
        }
        openFavoriteItemRef.current = handleOpenFavoriteItem;
        return () => {
            openFavoriteItemRef.current = null;
        };
    }, [handleOpenFavoriteItem, openFavoriteItemRef]);

    React.useEffect(() => {
        if (userHasSetWidthRef.current) {
            return;
        }
        setContainerWidth(sidebarOpen ? DEFAULT_CONTAINER_WIDTH : "full");
    }, [sidebarOpen]);

    const containerRef = React.useRef<HTMLDivElement>(null);

    let placeholder = "Search, filter, group, sort, and more";
    if (paletteSection === "search") {
        if (hasActiveFilters) {
            placeholder = "Ask Cache anything";
        } else if (isCommandFocused) {
            placeholder = "What are you looking for?";
        } else {
            placeholder = "Search, filter, group, sort, and more";
        }
    } else if (paletteSection === "filter") {
        placeholder = "Filter the library";
    } else if (paletteSection === "group") {
        placeholder = "Group results";
    } else if (paletteSection === "sort") {
        placeholder = "Sort results";
    } else if (paletteSection === "columns") {
        placeholder = "Set the number of columns";
    } else if (paletteSection === "width") {
        placeholder = "Set the container width";
    } else if (paletteSection === "ai-response") {
        placeholder = "Ask Cache anything";
    }

    return (
        <div
            className={cn(
                "relative z-0 flex w-full min-w-0 max-w-[1024px] flex-1 flex-col gap-4 p-8 2xl:mx-auto",
                { "max-w-full": containerWidth !== "comfortable" }
            )}
            ref={containerRef}
            style={
                { "--library-section-sticky-top": "8px" } as React.CSSProperties
            }
        >
            <Composer>
                <ComposerInput
                    containerRef={commandPanelContainerRef}
                    groups={groups}
                    isOpen={isCommandOpen}
                    onKeyDown={handlePaletteInputKeyDown}
                    onOpenChange={handleCommandOpenChange}
                    onValueChange={handleCommandInputChange}
                    placeholder={placeholder}
                    query={query}
                    ref={inputRef}
                    stackEntries={paletteStackEntries}
                />
                <ComposerActions
                    canClear={canClear}
                    canCreateCollectionFromResults={
                        canCreateCollectionFromResults
                    }
                    connectedIntegrationCount={connectedIntegrationCount}
                    groupBy={groupBy}
                    onClearPalette={clearLibraryPalette}
                    onCreateCollection={requestCreate}
                    onCreateNote={handleCreateNote}
                    onCreateResultsDialogOpen={
                        handleCreateResultsDialogOpenChange
                    }
                    onOpenCommandFromOnboarding={
                        handleOpenCommandFromOnboarding
                    }
                    resultsSummary={resultsSummary}
                    sectionsLength={sections.length}
                >
                    <ComposerActionNew />
                    <ComposerActionClear />
                    <ComposerActionNewCollection />
                    <ComposerActionOnboarding />
                </ComposerActions>
                <ComposerSuggestions suggestions={suggestions}>
                    {(suggestion, index) => (
                        <Button
                            className="rounded-full text-muted-foreground"
                            key={index}
                            onClick={suggestion.onSelect}
                            size="xs"
                            variant="ghost"
                        >
                            {suggestion.icon}
                            &nbsp;
                            {suggestion.label}
                            <Kbd className="bg-transparent px-0 text-[11px] opacity-50">
                                <CmdKbd />
                                {index + 1}
                            </Kbd>
                        </Button>
                    )}
                </ComposerSuggestions>
            </Composer>
            {isPreviewOnly ? <InlinePaywallBanner /> : null}
            <BrowserResults
                clearLibraryPalette={clearLibraryPalette}
                collapsedSectionKeys={collapsedSectionKeySet}
                collections={collections}
                columnCount={resolvedColumnCount}
                containerWidth={containerWidth}
                enableSectionCollapse={enableSectionCollapse}
                favoriteItemIdSet={favoriteItemIdSet}
                onCollapseAllSections={collapseAllSections}
                onCopyLink={handleCopyLink}
                onCreateCollectionFromResults={() =>
                    handleCreateResultsDialogOpenChange(true)
                }
                onDelete={handleRequestDelete}
                onExpandAllSections={expandAllSections}
                onExportSectionResults={handleExportSectionResults}
                onFindSimilar={handleFindSimilar}
                onItemFavoriteToggle={handleItemFavoriteToggle}
                onOpenInNewTab={handleOpenInNewTab}
                onOpenNote={handleOpenNote}
                onToggleSection={toggleSection}
                onUpdateItemCollections={
                    handleUpdateItemCollectionsWithFeedback
                }
                pendingDeleteItemId={pendingDeleteItem?.id ?? null}
                shouldShowEmptyLibraryPeek={shouldShowEmptyLibraryPeek}
                shouldShowNoFilteredResults={shouldShowNoFilteredResults}
            >
                <BrowserEmpty />
                <BrowserFiltersEmpty />
                <BrowserList sections={sections}>
                    {(section) =>
                        enableSectionCollapse ? (
                            <BrowserGroup>
                                <BrowserHeader />
                                {!section.title && (
                                    <BrowserGroupOverview>
                                        <BrowserGroupOverviewContent />
                                    </BrowserGroupOverview>
                                )}
                                <BrowserGroupEmpty>
                                    No items were found in this section.
                                </BrowserGroupEmpty>
                                <BrowserMasonry>
                                    {(item) => <MediaCard item={item} />}
                                </BrowserMasonry>
                            </BrowserGroup>
                        ) : (
                            <BrowserGroup>
                                <BrowserMasonry>
                                    {(item) => <MediaCard item={item} />}
                                </BrowserMasonry>
                            </BrowserGroup>
                        )
                    }
                </BrowserList>
            </BrowserResults>
            {shouldShowLockedPreview ? (
                <div className="relative isolate flex flex-col gap-8">
                    <BlockPaywallBanner length={totalItemCount} />
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
                    <div className="select-none opacity-70 blur-[1.5px] saturate-75">
                        <Masonry
                            columnCount={resolvedColumnCount}
                            columnGutter={16}
                            itemKey={(data) => data.id}
                            items={LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS}
                            render={({ data }) => (
                                <LockedPreviewCard placeholder={data} />
                            )}
                            rowGutter={16}
                        />
                    </div>
                </div>
            ) : null}
            <NoteDrawer
                activeNote={activeNote}
                container={containerRef}
                handlePasteUrlIntoLibrary={handlePasteUrlIntoLibrary}
                handleSaveNote={handleSaveNote}
                isSavingNote={isSavingNote}
                isSavingPastedUrl={isSavingPastedUrl}
                onNoteDrawerClose={() => setActiveNote(null)}
            />
            <QuickLookDrawerSurface />
            <BackToTopButton>
                <ArrowUpIcon aria-hidden className="size-4" />
                <T>Back to top</T>
            </BackToTopButton>
            <Dialog
                onOpenChange={handleDeleteDialogOpenChange}
                open={pendingDeleteItem !== null}
            >
                <DialogPopup>
                    <DialogHeader>
                        <DialogTitle>Delete saved item?</DialogTitle>
                        <DialogDescription>
                            Remove{" "}
                            {pendingDeleteItem?.noteContentText?.trim() ||
                                pendingDeleteItem?.caption?.trim() ||
                                pendingDeleteItem?.url ||
                                "this saved item"}{" "}
                            from Cache. This only deletes it from your library,
                            not from the original platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDelete}
                            variant="destructive"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
            <Dialog
                onOpenChange={handleCreateResultsDialogOpenChange}
                open={isCreateResultsDialogOpen}
            >
                <DialogPopup>
                    <form
                        className="contents"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleCreateCollectionFromResultsSubmit();
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
                                    New collection with{" "}
                                    {resultCollectionItemIds.length} current
                                    result
                                    {resultCollectionItemIds.length === 1
                                        ? ""
                                        : "s"}
                                </DialogTitle>
                            </div>
                        </DialogHeader>
                        <DialogPanel className="space-y-2">
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createResultsNameInputId}
                                >
                                    Name
                                </label>
                                <Input
                                    autoFocus
                                    className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                    id={createResultsNameInputId}
                                    maxLength={COLLECTION_NAME_MAX_LENGTH}
                                    onChange={(event) => {
                                        setCreateResultsNameDraft(
                                            event.currentTarget.value
                                        );
                                        if (createResultsError) {
                                            setCreateResultsError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    required
                                    size="lg"
                                    type="text"
                                    unstyled
                                    value={createResultsNameDraft}
                                />
                            </div>
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createResultsDescriptionId}
                                >
                                    Description (optional)
                                </label>
                                <Textarea
                                    className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                    id={createResultsDescriptionId}
                                    maxLength={1024}
                                    onChange={(event) => {
                                        setCreateResultsDescriptionDraft(
                                            event.currentTarget.value
                                        );
                                    }}
                                    placeholder="Describe what belongs here..."
                                    size="lg"
                                    unstyled
                                    value={createResultsDescriptionDraft}
                                />
                            </div>
                            {createResultsError ? (
                                <p className="text-destructive text-sm">
                                    {createResultsError}
                                </p>
                            ) : null}
                        </DialogPanel>
                        <DialogFooter>
                            <CollectionComboboxPicker
                                collections={collections}
                                items={visibleResultItems}
                                onUpdateItemCollections={
                                    handleUpdateItemCollectionsWithFeedback
                                }
                                onUpdateItemsCollections={
                                    onUpdateItemsCollections
                                }
                                render={
                                    <Button
                                        className="mr-auto -ml-2"
                                        size="xs"
                                        variant="link"
                                    />
                                }
                            >
                                <Component className="mr-0.5! size-4" />
                                Add to existing
                            </CollectionComboboxPicker>
                            <DialogClose
                                disabled={isCreatingResultsCollection}
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                loading={isCreatingResultsCollection}
                                size="sm"
                                type="submit"
                            >
                                Create collection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogPopup>
            </Dialog>
        </div>
    );
}
