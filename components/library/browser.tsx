"use client";

import {
    BlockPaywallBanner,
    InlinePaywallBanner,
} from "@/components/billing/paywall";
import { useSubscriptionAccess } from "@/components/billing/subscription";
import { getPriorityOption } from "@/components/library/collections";
import {
    Composer,
    ComposerActionClear,
    ComposerActionNew,
    ComposerActionNewCollection,
    ComposerActionOnboarding,
    ComposerActions,
    ComposerInput,
    ComposerSuggestions,
} from "@/components/library/composer";
import type { NoteDraft } from "@/components/library/notes";
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
import {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanItem,
} from "@/components/ui/kanban";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    PeekDrawer,
    PeekDrawerContent,
    PeekDrawerTrigger,
} from "@/components/ui/peek";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Ticker } from "@/components/ui/ticker";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
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
import {
    getColorGradientFromName,
    getHexColorFromName,
} from "@/lib/common/colors";
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
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import {
    ArrowDownWideNarrow,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDown,
    ChevronsUp,
    ChevronUp,
    CircleDashed,
    CircleDot,
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
    KanbanIcon,
    Layers3,
    LinkIcon,
    List,
    ListChevronsUpDown,
    NotebookPenIcon,
    RotateCcw,
    SearchIcon,
    SearchX,
    Star,
    Tags,
    Trash2Icon,
    Volume2Icon,
    VolumeXIcon,
    XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import * as React from "react";
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

interface CommandSuggestion {
    icon: ReactNode;
    label: string;
    onSelect: () => void;
}

const SUGGESTION_LIMIT = 3;
const SUGGESTION_ICON_CLASS = "size-3.5 shrink-0";

interface BuildCommandSuggestionsInput {
    clearLibraryPalette: () => void;
    collectionMembershipFilter: CollectionMembershipFilter;
    collections: LibraryCollectionSummary[];
    domainFilters: string[];
    groupBy: GroupByMode;
    isExtensionInstalled: boolean;
    items: LibraryItemWithCollections[];
    layoutMode: LayoutMode;
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
    setLayoutMode: (value: LayoutMode) => void;
    setQuery: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: SourceFilterValue[];
}

function buildCommandSuggestions({
    clearLibraryPalette,
    collectionMembershipFilter,
    collections,
    items,
    onClearCollectionFilters,
    onCreateCollection,
    searchTerms,
    selectedCollectionIds,
    sourceFilters,
    domainFilters,
    groupBy,
    isExtensionInstalled,
    sortMode,
    setCollectionMembershipFilter,
    setDomainFilters,
    setGroupBy,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    setQuery,
    setIsCommandOpen,
    onToggleCollectionSelection,
    layoutMode,
    setLayoutMode,
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
    }

    const hasAnyRefinements =
        searchTerms.length > 0 ||
        selectedCollectionIds.length > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE;

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

    const currentGroupCount =
        groupBy === "none"
            ? 0
            : new Set(
                  items.map((item) => {
                      if (groupBy === "source") {
                          return item.source;
                      }
                      if (groupBy === "domain") {
                          return itemDomain(item.url);
                      }
                      if (groupBy === "month-added") {
                          return itemMonthKey(item, "added");
                      }
                      return itemMonthKey(item, "created");
                  })
              ).size;

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
        "month-added",
        "month-created",
    ];
    if (sourceFilters.length > 0) {
        groupingCandidates = [
            "domain",
            "month-added",
            "month-created",
            "source",
        ];
    } else if (domainFilters.length > 0) {
        groupingCandidates = [
            "source",
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
            if (mode === "month-added") {
                return addedMonthKeys.size > 1;
            }
            return createdMonthKeys.size > 1;
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

    if (layoutMode === "masonry" && !hasAnyRefinements) {
        addSuggestion({
            icon: <KanbanIcon className={SUGGESTION_ICON_CLASS} />,
            label: "Try Board layout",
            onSelect: commitSelection(() => setLayoutMode("board")),
        });
        addSuggestion({
            icon: <List className={SUGGESTION_ICON_CLASS} />,
            label: "Try List layout",
            onSelect: commitSelection(() => setLayoutMode("list")),
        });
    } else if (layoutMode === "board" && !hasAnyRefinements) {
        addSuggestion({
            icon: <List className={SUGGESTION_ICON_CLASS} />,
            label: "Try List layout",
            onSelect: commitSelection(() => setLayoutMode("list")),
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

/** Base UI combobox close reason when an item is activated (inline mode still emits this). */
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
const SEARCH_CANCEL_KEYS = new Set(["esc", "tab"]);

const COLLECTION_NAME_MAX_LENGTH = 64;

type LibraryItem = LibraryItemWithCollections;

type GroupByMode =
    | "none"
    | "source"
    | "domain"
    | "month-added"
    | "month-created";
type SortMode =
    | "added-newest"
    | "added-oldest"
    | "created-newest"
    | "created-oldest"
    | "count-desc"
    | "source"
    | "domain";
type SourceFilterValue = LibraryItemSource;
type CollectionMembershipFilter =
    | "all"
    | "in-collections"
    | "not-in-collections";
type ColumnCountMode = "auto" | "2" | "3" | "4" | "5" | "6";
type LayoutMode = "masonry" | "board" | "list";
type PaletteSection =
    | "search"
    | "filter"
    | "group"
    | "sort"
    | "layout"
    | "ai-response";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_LAYOUT_MODE: LayoutMode = "masonry";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
const UNASSIGNED_COLLECTION_COLUMN_ID = "__unassigned__";
const NOTE_DRAWER_NEW = Symbol("note-drawer-new");
const LIST_LAYOUT_ROW_ESTIMATED_SIZE = 82;
const LIST_LAYOUT_ROW_OVERSCAN = 8;
const LIST_ROW_COLLECTION_PREVIEW_LIMIT = 2;
const VIRTUAL_SCROLL_EVENT_OPTIONS = { passive: true } as const;

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

/** Stable placeholders for empty-library masonry sneak peek (opacity fades by order). */
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
] satisfies readonly { label: string; value: SortMode }[];

const PALETTE_GROUP_OPTIONS = [
    { label: "No grouping", value: "none" },
    { label: "Source", value: "source" },
    { label: "Domain", value: "domain" },
    { label: "Month Added", value: "month-added" },
    { label: "Month Created", value: "month-created" },
] satisfies readonly { label: string; value: GroupByMode }[];

const PALETTE_COLUMN_OPTIONS = [
    { label: "Auto columns", value: "auto" },
    { label: "2 columns", value: "2" },
    { label: "3 columns", value: "3" },
    { label: "4 columns", value: "4" },
    { label: "5 columns", value: "5" },
    { label: "6 columns", value: "6" },
] satisfies readonly { label: string; value: ColumnCountMode }[];

const PALETTE_LAYOUT_MODE_OPTIONS = [
    { label: "Masonry", value: "masonry" },
    { label: "Board", value: "board" },
    { label: "List", value: "list" },
] satisfies readonly { label: string; value: LayoutMode }[];

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
] satisfies readonly { label: string; value: SourceFilterValue | "all" }[];

const PALETTE_SOURCE_FILTER_OPTIONS = PALETTE_SOURCE_OPTIONS.filter(
    (option): option is { label: string; value: SourceFilterValue } =>
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

type BrowserListEntry =
    | {
          key: string;
          section: BrowserGroup;
          type: "empty";
      }
    | {
          key: string;
          section: BrowserGroup;
          type: "header";
      }
    | {
          key: string;
          section: BrowserGroup;
          type: "overview";
      }
    | {
          item: LibraryItemWithCollections;
          itemPosition: number;
          key: string;
          section: BrowserGroup;
          totalItemCount: number;
          type: "item";
      };

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
    item: LibraryItem,
    mode: "added" | "created" = "added"
): Date {
    const value =
        mode === "created"
            ? (item.postedAt ?? item.scrapedAt ?? item.createdAt)
            : (item.scrapedAt ?? item.createdAt);
    return value instanceof Date ? value : new Date(value);
}

function itemTimestamp(
    item: LibraryItem,
    mode: "added" | "created" = "added"
): number {
    return itemDate(item, mode).getTime();
}

function itemMonthKey(
    item: LibraryItem,
    mode: "added" | "created" = "added"
): string {
    const date = itemDate(item, mode);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function itemPrimaryText(item: LibraryItem): string {
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

function formatGroupHeading(mode: GroupByMode, key: string): string {
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
    a: LibraryItem,
    b: LibraryItem,
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
    return (
        NAME_COLLATOR.compare(itemDomain(a.url), itemDomain(b.url)) ||
        NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
    );
}

function compareSectionKeys(
    a: string,
    b: string,
    groupBy: GroupByMode,
    sortMode: SortMode
): number {
    if (groupBy === "month-added" || groupBy === "month-created") {
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

interface PaletteStackEntry {
    chip: ReactNode;
    key: string;
    onRemove: () => void;
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
    domainFilters: string[];
    groupBy: GroupByMode;
    layoutMode: LayoutMode;
    onRemoveCollectionFilter: (id: string) => void;
    onRemoveCommandAttachment: (id: string) => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: SourceFilterValue[];
}

function buildPaletteStackEntries({
    collectionMembershipFilter,
    collections,
    columnCountMode,
    commandAttachments,
    domainFilters,
    groupBy,
    layoutMode,
    onRemoveCollectionFilter,
    onRemoveCommandAttachment,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setDomainFilters,
    setGroupBy,
    setLayoutMode,
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

    if (layoutMode !== DEFAULT_LAYOUT_MODE) {
        const onRemove = () => setLayoutMode(DEFAULT_LAYOUT_MODE);
        entries.push({
            chip: (
                <PaletteChip
                    key="layout-mode"
                    label={`Layout: ${layoutModeLabel(layoutMode)}`}
                    onRemove={onRemove}
                />
            ),
            key: "layout-mode",
            onRemove,
        });
    }

    if (
        layoutMode === "masonry" &&
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE
    ) {
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

function isSearchCancelKey(
    event: React.KeyboardEvent<HTMLInputElement>
): boolean {
    return SEARCH_CANCEL_KEYS.has(event.key.toLowerCase());
}

function sortModeLabel(mode: SortMode): string {
    if (mode === "added-newest") {
        return "Added: Newest first";
    }
    if (mode === "added-oldest") {
        return "Added: Oldest first";
    }
    if (mode === "created-newest") {
        return "Created: Newest first";
    }
    if (mode === "created-oldest") {
        return "Created: Oldest first";
    }
    if (mode === "count-desc") {
        return "Count: Most items first";
    }
    if (mode === "source") {
        return "Source";
    }
    if (mode === "domain") {
        return "Domain";
    }
    return sortModeLabel(DEFAULT_SORT_MODE);
}

function groupByLabel(mode: GroupByMode): string {
    if (mode === "source") {
        return "Source";
    }
    if (mode === "domain") {
        return "Domain";
    }
    if (mode === "month-added") {
        return "Month Added";
    }
    if (mode === "month-created") {
        return "Month Created";
    }
    return "None";
}

function columnCountLabel(mode: ColumnCountMode): string {
    return mode === "auto" ? "Auto columns" : `${mode} columns`;
}

function layoutModeLabel(mode: LayoutMode): string {
    if (mode === "board") {
        return "Board";
    }
    if (mode === "list") {
        return "List";
    }
    return "Masonry";
}

function layoutModeDescription(mode: LayoutMode): string {
    if (mode === "board") {
        return "Group entries by collections in columns";
    }
    if (mode === "list") {
        return "Scan saved items in a compact virtualized list";
    }
    return "Display saved items in a visual grid";
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
                            <div className="flex max-h-80 w-72 items-center justify-center overflow-hidden rounded-md border">
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
    enableSectionCollapse: boolean;
    favoriteItemIdSet: ReadonlySet<string>;
    layoutMode: LayoutMode;
    onCollapseAllSections?: () => void;
    onCopyLink: (item: LibraryItem) => void;
    onCreateCollectionFromResults?: () => void;
    onDelete: (item: LibraryItem) => void;
    onExpandAllSections?: () => void;
    onExportSectionResults?: (
        sectionTitle: string,
        items: LibraryItemWithCollections[]
    ) => void;
    onFindSimilar: (item: LibraryItemWithCollections) => void;
    onItemFavoriteToggle: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab: (item: LibraryItem) => void;
    onOpenNote: (item: LibraryItem) => void;
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
                    <GradientWaveText ariaLabel="Welcome to your Cache">
                        Welcome to your Cache
                    </GradientWaveText>
                    <span className="ml-3 opacity-50">Ready to start?</span>
                </h3>
                <p className="text-muted-foreground text-xs leading-tight">
                    Everything you bookmark, unified and searchable. Cache is
                    purpose-built to organize what matters to you into
                    collections so you can find it when you need it.
                </p>
            </div>
            <Masonry columnCount={5} gap={4}>
                {EMPTY_LIBRARY_PEEK_PLACEHOLDERS.map(
                    ({ aspect, id }, index) => {
                        const opacity = Math.max(0.06, 1 - index * 0.095);

                        return (
                            <MasonryItem
                                className="group flex flex-col overflow-hidden rounded-lg bg-card/40"
                                key={id}
                                style={{ opacity }}
                            >
                                <Skeleton
                                    className={cn(
                                        "w-full rounded-none",
                                        aspect
                                    )}
                                />
                                <div className="flex min-h-14 flex-col gap-1.5 p-3">
                                    <Skeleton className="h-2.5 w-[92%]" />
                                    <Skeleton className="h-2.5 w-[72%]" />
                                </div>
                            </MasonryItem>
                        );
                    }
                )}
            </Masonry>
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
    const headerGradient = enableSectionCollapse
        ? getColorGradientFromName(group.accentKey)
        : undefined;
    const headerStyle: React.CSSProperties | undefined = enableSectionCollapse
        ? {
              background: headerGradient,
              top: "var(--library-section-sticky-top)",
          }
        : undefined;
    const hasItems = group.items.length > 0;
    const canCreateCollectionFromResults =
        group.isMainResults && Boolean(onCreateCollectionFromResults);
    const canExportSectionResults = Boolean(onExportSectionResults);
    const shouldShowSectionMenu =
        hasItems && (canCreateCollectionFromResults || canExportSectionResults);

    return (
        <ContextMenu>
            <ContextMenuTrigger render={<div className="contents" />}>
                <div
                    className={cn(
                        "flex items-center justify-between gap-3 pr-3",
                        enableSectionCollapse &&
                            "sticky z-10 rounded-xl bg-muted/92 backdrop-blur-sm supports-backdrop-filter:bg-muted/50"
                    )}
                    style={headerStyle}
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

function BrowserGroupEmpty() {
    const { collapsed, items } = useBrowserGroupContext();
    if (collapsed || items.length > 0) {
        return null;
    }

    return (
        <p className="text-muted-foreground text-sm">
            No items were found in this group.
        </p>
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
                "flex w-full flex-1 flex-col py-1 pr-3 pl-4",
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
            <div className="inline-flex items-center justify-end">
                <Button
                    aria-controls={contentId}
                    aria-expanded={isExpanded}
                    onClick={handleToggleExpanded}
                    size="xs"
                    variant="link"
                >
                    {isExpanded ? "Collapse" : "Expand"}
                    &nbsp;
                    <ListChevronsUpDown className="mb-px inline-block size-3.5 shrink-0" />
                </Button>
            </div>
        </div>
    );
}

function BrowserBoard() {
    const { collapsed, items } = useBrowserGroupContext();
    if (collapsed) {
        return null;
    }
    return <BoardLayout items={items} />;
}

function BrowserMasonry() {
    const { collapsed, items } = useBrowserGroupContext();
    const { columnCount } = useBrowserResultsContext();

    if (collapsed || items.length === 0) {
        return null;
    }

    return (
        <Masonry columnCount={columnCount} gap={4}>
            {items.map((item) => (
                <MasonryItem key={item.id}>
                    <Card item={item} />
                </MasonryItem>
            ))}
        </Masonry>
    );
}

function BrowserCurrentLayout() {
    const { layoutMode } = useBrowserResultsContext();
    if (layoutMode === "board") {
        return <BrowserBoard />;
    }
    return <BrowserMasonry />;
}

function BrowserListResults({ sections }: { sections: BrowserGroup[] }) {
    const { collapsedSectionKeys, enableSectionCollapse } =
        useBrowserResultsContext();
    const entries = buildBrowserListEntries({
        collapsedSectionKeys,
        enableSectionCollapse,
        sections,
    });
    const [scrollMargin, setScrollMargin] = React.useState(0);
    const listRef = React.useRef<HTMLOListElement>(null);

    const getItemKey = useStableCallback(
        (index: number) => entries[index]?.key ?? index
    );

    const rowVirtualizer = useVirtualizer<HTMLElement, HTMLLIElement>({
        count: entries.length,
        estimateSize: () => LIST_LAYOUT_ROW_ESTIMATED_SIZE,
        getItemKey,
        getScrollElement: () =>
            listRef.current?.ownerDocument.documentElement ?? null,
        observeElementOffset: observeDocumentElementVirtualOffset,
        observeElementRect: observeDocumentElementVirtualRect,
        overscan: LIST_LAYOUT_ROW_OVERSCAN,
        scrollMargin,
    });

    useIsoLayoutEffect(() => {
        const element = listRef.current;
        if (!element) {
            return;
        }

        const ownerWindow = getOwnerWindow(element);
        if (!ownerWindow) {
            return;
        }

        const updateScrollMargin = () => {
            const nextScrollMargin =
                element.getBoundingClientRect().top + ownerWindow.scrollY;
            setScrollMargin((current) =>
                Math.abs(current - nextScrollMargin) < 1
                    ? current
                    : nextScrollMargin
            );
        };

        updateScrollMargin();
        ownerWindow.addEventListener("resize", updateScrollMargin);

        const ResizeObserverCtor = ownerWindow.ResizeObserver;
        if (typeof ResizeObserverCtor !== "function") {
            return () => {
                ownerWindow.removeEventListener("resize", updateScrollMargin);
            };
        }

        const resizeObserver = new ResizeObserverCtor(updateScrollMargin);
        resizeObserver.observe(element);
        resizeObserver.observe(element.ownerDocument.documentElement);
        resizeObserver.observe(element.ownerDocument.body);

        return () => {
            resizeObserver.disconnect();
            ownerWindow.removeEventListener("resize", updateScrollMargin);
        };
    }, []);

    if (entries.length === 0) {
        return null;
    }

    return (
        <BrowserCardProvider>
            <ol
                aria-label="Saved items"
                className="relative m-0 w-full list-none p-0"
                ref={listRef}
                style={{ height: rowVirtualizer.getTotalSize() }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const entry = entries[virtualRow.index];
                    if (!entry) {
                        return null;
                    }

                    return (
                        <li
                            className="absolute top-0 left-0 w-full pb-2"
                            {...getBrowserListEntryAria(entry)}
                            data-index={virtualRow.index}
                            key={virtualRow.key}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                transform: `translateY(${
                                    virtualRow.start - scrollMargin
                                }px)`,
                            }}
                        >
                            <BrowserGroupProvider section={entry.section}>
                                {renderBrowserListEntry(entry)}
                            </BrowserGroupProvider>
                        </li>
                    );
                })}
            </ol>
        </BrowserCardProvider>
    );
}

function renderBrowserListEntry(entry: BrowserListEntry): ReactNode {
    if (entry.type === "header") {
        return <BrowserHeader />;
    }
    if (entry.type === "overview") {
        return (
            <BrowserGroupOverview>
                <BrowserGroupOverviewContent />
            </BrowserGroupOverview>
        );
    }
    if (entry.type === "empty") {
        return <BrowserGroupEmpty />;
    }
    return <ListRow item={entry.item} />;
}

function getBrowserListEntryAria(
    entry: BrowserListEntry
): React.LiHTMLAttributes<HTMLLIElement> {
    if (entry.type !== "item") {
        return { role: "presentation" };
    }

    return {
        "aria-posinset": entry.itemPosition,
        "aria-setsize": entry.totalItemCount,
    };
}

function observeDocumentElementVirtualRect(
    instance: Virtualizer<HTMLElement, HTMLLIElement>,
    cb: (rect: { height: number; width: number }) => void
) {
    const scrollElement = instance.scrollElement;
    if (!scrollElement) {
        return;
    }

    const ownerWindow = getOwnerWindow(scrollElement);
    const handler = () => {
        cb({
            height: ownerWindow.innerHeight,
            width: ownerWindow.innerWidth,
        });
    };

    handler();
    ownerWindow.addEventListener(
        "resize",
        handler,
        VIRTUAL_SCROLL_EVENT_OPTIONS
    );

    return () => {
        ownerWindow.removeEventListener("resize", handler);
    };
}

function observeDocumentElementVirtualOffset(
    instance: Virtualizer<HTMLElement, HTMLLIElement>,
    cb: (offset: number, isScrolling: boolean) => void
) {
    const scrollElement = instance.scrollElement;
    if (!scrollElement) {
        return;
    }

    const ownerWindow = getOwnerWindow(scrollElement);
    let scrollEndTimeoutId = 0;
    const handleScrollEnd = () => {
        cb(scrollElement.scrollTop, false);
    };
    const handleScroll = () => {
        cb(scrollElement.scrollTop, true);
        ownerWindow.clearTimeout(scrollEndTimeoutId);
        scrollEndTimeoutId = ownerWindow.setTimeout(handleScrollEnd, 150);
    };

    handleScrollEnd();
    scrollElement.addEventListener(
        "scroll",
        handleScroll,
        VIRTUAL_SCROLL_EVENT_OPTIONS
    );

    return () => {
        ownerWindow.clearTimeout(scrollEndTimeoutId);
        scrollElement.removeEventListener("scroll", handleScroll);
    };
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
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: image load failures drive the visual fallback state
        <img
            alt=""
            className="absolute top-10 left-3 z-10 h-auto w-full rounded-sm object-cover transition-transform group-data-highlighted:-translate-y-1"
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
    navigationItems,
    onAskCacheSubmit,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    searchTerms,
    setIsCommandOpen,
    setQuery,
    setSearchTerms,
}: {
    collections: LibraryCollectionSummary[];
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    clearLibraryPalette: () => void;
    draft: string;
    hasAnyRefinements: boolean;
    navigationItems: CommandPaletteItem[];
    onAskCacheSubmit: (prompt: string) => void | Promise<void>;
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    searchTerms: string[];
    setIsCommandOpen: (value: boolean) => void;
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
        groups.push({
            items: [
                {
                    active: draftAlreadyIncluded,
                    description: draftAlreadyIncluded
                        ? "Already included in the stacked search"
                        : "Add this search term to the current stack",
                    label: `Add search "${draft}"`,
                    onSelect: () => {
                        setSearchTerms((current) =>
                            appendUniqueSearchTerm(current, draft)
                        );
                        setQuery("");
                        setIsCommandOpen(true);
                    },
                    shortcut: "Enter",
                    value: `add search ${draft}`,
                },
                {
                    description: "AI Search",
                    label: "Ask Cache",
                    onSelect: () => onAskCacheSubmit(draft),
                    shortcut: "Tab",
                    value: `ask cache ${draft}`,
                },
            ],
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
                    description: "Remove every committed search term",
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
            groups.push({
                items: collections
                    .filter((collection) => {
                        const thumbnails =
                            collectionPreviewThumbnailUrlsById.get(
                                collection.id
                            ) ?? [];
                        return thumbnails.length > 1;
                    })
                    .slice(0, 4)
                    .map((collection) => {
                        const thumbnails =
                            collectionPreviewThumbnailUrlsById.get(
                                collection.id
                            ) ?? [];
                        const isActive = selectedCollectionIds.includes(
                            collection.id
                        );
                        return {
                            active: isActive,
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
                        };
                    }),
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

    groups.push({
        items: navigationItems,
        label: "View",
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
}: {
    askCacheResponse: AskCacheResponseState | null;
    backItem: CommandPaletteItem;
}): CommandPaletteGroup[] {
    return [
        {
            items: [backItem],
            label: "Navigation",
        },
        {
            items: [
                {
                    label: "Ask Cache response",
                    onSelect: () => undefined,
                    render: () => (
                        <AskCacheResponsePanel response={askCacheResponse} />
                    ),
                    value: "ask cache response",
                },
            ],
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
    domainFilters: string[];
    domainOptions: {
        label: string;
        value: string;
    }[];
    groupBy: GroupByMode;
    layoutMode: LayoutMode;
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
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setIsCommandOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setQuery: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: SourceFilterValue[];
}

function buildDomainPaletteOptions(
    items: LibraryItem[]
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
    collections,
    clearLibraryPalette,
    columnCountMode,
    collectionMembershipFilter,
    collectionPreviewThumbnailUrlsById,
    domainFilters,
    domainOptions,
    groupBy,
    layoutMode,
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
    setIsCommandOpen,
    setDomainFilters,
    setGroupBy,
    setLayoutMode,
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
            label: "Filter by…",
            onSelect: (event) => openPaletteSection("filter", event),
            value: "navigate filters",
        },
        {
            description: `Current: ${groupByLabel(groupBy)}`,
            label: "Group by…",
            onSelect: (event) => openPaletteSection("group", event),
            value: "navigate grouping",
        },
        {
            description: `Current: ${sortModeLabel(sortMode)}`,
            label: "Sort by…",
            onSelect: (event) => openPaletteSection("sort", event),
            value: "navigate sorting",
        },
        {
            description: `Current: ${layoutModeLabel(layoutMode)}`,
            label: "Layout…",
            onSelect: (event) => openPaletteSection("layout", event),
            value: "navigate layout",
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
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE ||
        layoutMode !== DEFAULT_LAYOUT_MODE;

    if (paletteSection === "search") {
        return buildSearchPaletteGroups({
            clearLibraryPalette,
            collectionPreviewThumbnailUrlsById,
            collections,
            draft,
            hasAnyRefinements,
            navigationItems,
            onAskCacheSubmit,
            onClearCollectionFilters,
            onToggleCollectionSelection,
            searchTerms,
            selectedCollectionIds,
            setIsCommandOpen,
            setQuery,
            setSearchTerms,
        });
    }

    if (paletteSection === "ai-response") {
        return buildAskCachePaletteGroups({
            askCacheResponse,
            backItem,
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

    return [
        { items: [backItem], label: "Navigation" },
        ...(layoutMode === "masonry"
            ? [
                  {
                      items: PALETTE_COLUMN_OPTIONS.map((option) => ({
                          active: columnCountMode === option.value,
                          description:
                              option.value === "auto"
                                  ? "Let the masonry adapt to the available width"
                                  : "Force a specific number of columns",
                          label: option.label,
                          onSelect: applyAndReturn(() =>
                              setColumnCountMode(option.value)
                          ),
                          value: `columns ${option.value}`,
                      })),
                      label: "Columns",
                  },
              ]
            : []),
        {
            items: PALETTE_LAYOUT_MODE_OPTIONS.map((option) => ({
                active: layoutMode === option.value,
                description: layoutModeDescription(option.value),
                label: option.label,
                onSelect: applyAndReturn(() => setLayoutMode(option.value)),
                value: `layout ${option.value}`,
            })),
            label: "Layout",
        },
    ];
}

function filterCommandItems(
    items: LibraryItemWithCollections[],
    input: {
        collectionMembershipFilter: CollectionMembershipFilter;
        domainFilters: string[];
        searchTerms: string[];
        selectedCollectionIds: string[];
        sourceFilters: SourceFilterValue[];
    }
): LibraryItemWithCollections[] {
    let list = [...items];
    const normalizedSearchTerms = input.searchTerms.map((term) =>
        term.trim().toLowerCase()
    );

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
    sortMode: SortMode
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

    const buckets = new Map<string, LibraryItemWithCollections[]>();
    for (const item of sortedItems) {
        let key = UNSPECIFIC_DOMAIN_FILTER;
        if (groupBy === "source") {
            key = item.source;
        } else if (groupBy === "domain") {
            key = itemDomain(item.url);
        } else if (groupBy === "month-added") {
            key = itemMonthKey(item, "added");
        } else if (groupBy === "month-created") {
            key = itemMonthKey(item, "created");
        }

        const bucket = buckets.get(key) ?? [];
        bucket.push(item);
        buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
        .sort(([a, aItems], [b, bItems]) => {
            if (sortMode === "count-desc") {
                return (
                    bItems.length - aItems.length ||
                    compareSectionKeys(a, b, groupBy, sortMode)
                );
            }

            return compareSectionKeys(a, b, groupBy, sortMode);
        })
        .map(([key, sectionItems]) => ({
            items: sectionItems,
            key,
            title: formatGroupHeading(groupBy, key),
        }));
}

function buildBrowserListEntries({
    collapsedSectionKeys,
    enableSectionCollapse,
    sections,
}: {
    collapsedSectionKeys: Set<string>;
    enableSectionCollapse: boolean;
    sections: BrowserGroup[];
}): BrowserListEntry[] {
    let totalItemCount = 0;
    for (const section of sections) {
        if (enableSectionCollapse && collapsedSectionKeys.has(section.key)) {
            continue;
        }
        totalItemCount += section.items.length;
    }

    let itemPosition = 0;
    const entries: BrowserListEntry[] = [];
    for (const section of sections) {
        const isCollapsed =
            enableSectionCollapse && collapsedSectionKeys.has(section.key);

        if (enableSectionCollapse) {
            entries.push({
                key: `${section.key}:header`,
                section,
                type: "header",
            });

            if (!(section.title || isCollapsed)) {
                entries.push({
                    key: `${section.key}:overview`,
                    section,
                    type: "overview",
                });
            }
        }

        if (isCollapsed) {
            continue;
        }

        if (section.items.length === 0) {
            entries.push({
                key: `${section.key}:empty`,
                section,
                type: "empty",
            });
            continue;
        }

        for (const item of section.items) {
            itemPosition += 1;
            entries.push({
                item,
                itemPosition,
                key: `${section.key}:item:${item.id}`,
                section,
                totalItemCount,
                type: "item",
            });
        }
    }

    return entries;
}

async function saveLibraryNoteDraft({
    activeNote,
    draft,
}: {
    activeNote: LibraryItemWithCollections | null;
    draft: {
        contentHtml: string;
        contentState: unknown | null;
    };
}): Promise<NoteMutationResult> {
    try {
        return activeNote
            ? await updateNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
                  itemId: activeNote.id,
              })
            : await createNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
              });
    } catch {
        return {
            message: activeNote
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
    searchTerms: string[];
    selectedCollectionIds: string[];
    sourceFilters: SourceFilterValue[];
}): boolean {
    return (
        input.searchTerms.length > 0 ||
        input.selectedCollectionIds.length > 0 ||
        input.sourceFilters.length > 0 ||
        input.domainFilters.length > 0 ||
        input.collectionMembershipFilter !==
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
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
        React.useState<LibraryItem | null>(null);
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const { copyToClipboard } = useCopyToClipboard();

    const handleOpenInNewTab = useStableCallback((item: LibraryItem) => {
        openExternal(normalizeURL(item.url));
    });

    const handleCopyLink = useStableCallback(async (item: LibraryItem) => {
        await copyToClipboard(normalizeURL(item.url));
    });

    const handleRequestDelete = useStableCallback((item: LibraryItem) => {
        setPendingDeleteItem(item);
    });

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

interface BoardColumnItem {
    item: LibraryItemWithCollections;
    value: string;
}

interface PreviewMediaProps {
    isHovered?: boolean;
    src: string | null;
    videoSrc?: string | null;
}

function PreviewMedia({ isHovered = false, src, videoSrc }: PreviewMediaProps) {
    const imageSrc = src ?? undefined;
    const canRenderImage = Boolean(imageSrc);
    const [hasImageFailed, setHasImageFailed] = React.useState(false);
    const [hasVideoFailed, setHasVideoFailed] = React.useState(false);
    const [hasHoverIntent, setHasHoverIntent] = React.useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = React.useState(true);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    const canRenderVideo = Boolean(videoSrc) && !hasVideoFailed;
    const shouldLoadVideo = hasHoverIntent || hasImageFailed;
    const isVideoVisible = isHovered || (hasImageFailed && canRenderVideo);
    const hasBothFailed = hasImageFailed && !canRenderVideo;

    React.useEffect(() => {
        const video = videoRef.current;
        if (!(video && canRenderVideo)) {
            return;
        }

        if (isHovered) {
            if (hasHoverIntent) {
                video.play().catch((error: unknown) => {
                    log.debug("Failed to resume hover preview", { error });
                });
            } else {
                setHasHoverIntent(true);
            }
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isHovered, canRenderVideo, hasHoverIntent]);

    const handleCanPlay = useStableCallback(() => {
        const video = videoRef.current;
        if (video && isHovered) {
            video.play().catch((error: unknown) => {
                log.debug("Failed to play hover preview", { error });
            });
        }
    });

    const handleImageError = useStableCallback(() => {
        setHasImageFailed(true);
    });

    const handleVideoError = useStableCallback(() => {
        const video = videoRef.current;
        const mediaError = video?.error;
        log.debug("Video source failed to load", {
            mediaErrorCode: mediaError?.code,
            mediaErrorMessage: mediaError?.message,
            networkState: video?.networkState,
            readyState: video?.readyState,
            videoSrc,
        });
        setHasVideoFailed(true);
    });

    const handleSoundToggle = useStableCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsSoundEnabled((wasSoundEnabled) => !wasSoundEnabled);
    });

    const SoundIcon = isSoundEnabled ? Volume2Icon : VolumeXIcon;

    return (
        <div className="relative size-full">
            {canRenderImage ? (
                // biome-ignore lint/a11y/noNoninteractiveElementInteractions: image load failures drive the visual fallback state
                <img
                    alt=""
                    className={cn(
                        "size-full object-cover transition-opacity duration-150",
                        {
                            "opacity-0": canRenderVideo && isVideoVisible,
                        }
                    )}
                    height={400}
                    loading="lazy"
                    onError={handleImageError}
                    src={imageSrc}
                    width={300}
                />
            ) : null}
            {canRenderVideo ? (
                <>
                    <video
                        className={cn(
                            "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-150",
                            {
                                "opacity-0": !isVideoVisible,
                                "opacity-100": isVideoVisible,
                            }
                        )}
                        loop
                        muted={!isSoundEnabled}
                        onCanPlay={handleCanPlay}
                        onError={handleVideoError}
                        playsInline
                        preload="metadata"
                        ref={videoRef}
                        src={
                            shouldLoadVideo
                                ? (videoSrc ?? undefined)
                                : undefined
                        }
                    />
                    <Button
                        aria-label={
                            isSoundEnabled
                                ? "Mute video preview"
                                : "Enable video preview sound"
                        }
                        aria-pressed={isSoundEnabled}
                        className={cn(
                            "pointer-events-auto absolute top-2 left-2 z-10 rounded-full border-white/15 bg-black/45 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/60 focus-visible:opacity-100 focus-visible:ring-white/70",
                            {
                                "opacity-100": isHovered,
                            }
                        )}
                        onClick={handleSoundToggle}
                        size="icon-sm"
                        variant="ghost"
                    >
                        <SoundIcon className="size-4" />
                    </Button>
                </>
            ) : null}
            {hasBothFailed ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/50">
                    <Globe className="size-8 text-muted-foreground/50" />
                    <span className="text-muted-foreground text-xs">
                        No preview
                    </span>
                </div>
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

type CollectionComboboxPickerAppearance = "overlay" | "inline";

interface CollectionComboboxPickerProps
    extends React.ComponentProps<typeof ComboboxTrigger> {
    appearance?: CollectionComboboxPickerAppearance;
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
    item: LibraryItemWithCollections;
    kind: "context" | "menu";
    onDownload: () => void;
    previewImageUrl: string | null;
}

interface LibraryGridLayoutProps {
    items: LibraryItemWithCollections[];
}

function buildBoardColumns(
    collections: LibraryCollectionSummary[],
    items: LibraryItemWithCollections[]
): Record<string, BoardColumnItem[]> {
    const columns: Record<string, BoardColumnItem[]> = {
        [UNASSIGNED_COLLECTION_COLUMN_ID]: [],
    };

    for (const collection of collections) {
        columns[collection.id] = [];
    }

    for (const item of items) {
        if (item.collections.length === 0) {
            columns[UNASSIGNED_COLLECTION_COLUMN_ID]?.push({
                item,
                value: `${UNASSIGNED_COLLECTION_COLUMN_ID}:${item.id}`,
            });
            continue;
        }

        for (const collection of collections) {
            const belongsToCollection = item.collections.some(
                (entry) => entry.id === collection.id
            );
            if (!belongsToCollection) {
                continue;
            }

            columns[collection.id]?.push({
                item,
                value: `${collection.id}:${item.id}`,
            });
        }
    }

    return columns;
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
    appearance = "overlay",
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
                        className={cn(
                            "z-1 rounded-full transition-transform ease-in-out active:scale-95",
                            appearance === "overlay"
                                ? "mix-blend-difference invert hover:brightness-125"
                                : "border-border/70 text-muted-foreground hover:text-foreground"
                        )}
                        size="icon-sm"
                        variant={appearance === "overlay" ? "ghost" : "outline"}
                    />
                }
                {...props}
            >
                {children ??
                    (selectedCount > 0 ? (
                        <CircleDot
                            aria-hidden="true"
                            aria-label="Collections"
                            className="size-4.5"
                        />
                    ) : (
                        <CircleDashed
                            aria-hidden="true"
                            aria-label="Collections"
                            className="size-4.5"
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
                                key={collection.id}
                                value={collection.id}
                            >
                                <div className="flex max-w-64 items-center justify-between gap-3">
                                    <span className="min-w-0 max-w-full flex-1 truncate text-foreground text-sm">
                                        {collection.name}
                                    </span>
                                    <span className="shrink-0 text-nowrap text-muted-foreground text-xs tabular-nums">
                                        {collection.itemCount}
                                    </span>
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
    item,
    kind,
    onDownload,
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
    const canPreview = !isNote && toValidUrl(href) !== FALLBACK_URL;

    return (
        <>
            <div className="relative mx-auto flex max-w-56 items-center gap-2 py-2 pl-2.5 opacity-50">
                <span
                    className={cn("block truncate text-xs", {
                        "underline decoration-muted-foreground/20 underline-offset-2":
                            !isNote,
                    })}
                >
                    {isNote ? (
                        "Note"
                    ) : (
                        <a
                            href={item.url}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {item.url}
                        </a>
                    )}
                </span>
            </div>
            <div className="px-2.5 pb-2 text-[11px] text-muted-foreground">
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
                    <div className="flex items-center justify-between gap-3 py-0.5">
                        <span>Palette</span>
                        <PreviewColorPalette src={previewImageUrl} />
                    </div>
                ) : null}
            </div>
            <ItemSeparator />
            <Item onClick={() => onItemFavoriteToggle(item)}>
                <Star
                    className={cn(
                        "size-4.5 text-muted-foreground",
                        isFavorite && "fill-current"
                    )}
                />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </Item>
            {isNote ? (
                <Item onClick={() => onOpenNote?.(item)}>
                    <FilePenLineIcon className="size-4.5 text-muted-foreground" />
                    Edit note
                </Item>
            ) : null}
            {canPreview ? (
                <PeekDrawer
                    description={itemDomain(item.url)}
                    key={item.url}
                    title={getItemTitle(item)}
                    url={item.url}
                >
                    <PeekDrawerTrigger
                        nativeButton={false}
                        render={<Item closeOnClick={false} />}
                    >
                        <EyeIcon className="size-4.5 text-muted-foreground" />
                        Quick Look
                    </PeekDrawerTrigger>
                    <PeekDrawerContent />
                </PeekDrawer>
            ) : null}
            {isNote ? null : (
                <>
                    <Item onClick={() => onOpenInNewTab?.(item)}>
                        <ExternalLinkIcon className="size-4.5 text-muted-foreground" />
                        Open in new tab
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
            <ItemSeparator />
            {kind === "context" ? (
                <ContextMenuItem
                    className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                    disabled={isDeletePending}
                    onClick={() => onDelete?.(item)}
                >
                    <Trash2Icon className="size-4.5" />
                    {isDeletePending ? "Deleting..." : "Delete"}
                </ContextMenuItem>
            ) : (
                <MenuItem
                    disabled={isDeletePending}
                    onClick={() => onDelete?.(item)}
                    variant="destructive"
                >
                    <Trash2Icon className="size-4.5" />
                    {isDeletePending ? "Deleting..." : "Delete"}
                </MenuItem>
            )}
        </>
    );
}

function Card({ item }: LibraryGridCardProps) {
    const { onOpenInNewTab, onOpenNote } = useLibraryGridCardContext();
    const isNote = item.kind === ITEM_KIND_NOTE;
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] =
        React.useState(false);
    const [isCardHovered, setIsCardHovered] = React.useState(false);
    const href = normalizeURL(item.url);
    const previewImageUrl = itemPreviewImageUrl(item);
    const previewVideoUrl = itemPreviewVideoUrl(item);
    const createdLabel = itemDateLabel(item.createdAt);
    const addedLabel = itemDateLabel(item.scrapedAt ?? item.createdAt);
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const displayTitle = getItemTitle(item);

    const handlePrimaryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isNote) {
            onOpenNote?.(item);
            return;
        }
        onOpenInNewTab?.(item);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await downloadLibraryItemMedia(item);
        } catch (error) {
            log.error("Failed to prepare media download", error, {
                itemId: item.id,
                url: item.url,
            });
        } finally {
            setIsDownloading(false);
        }
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
        <ContextMenu>
            <ContextMenuTrigger
                onKeyDown={handleCardKeyDown}
                render={
                    <div className="group relative flex shrink-0 flex-col overflow-hidden rounded-xl ring-1 ring-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" />
                }
            >
                <a
                    className="flex flex-col focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    href={href}
                    onClick={handlePrimaryClick}
                    onMouseEnter={() => setIsCardHovered(true)}
                    onMouseLeave={() => setIsCardHovered(false)}
                    rel="noopener noreferrer"
                    target={isNote ? undefined : "_blank"}
                >
                    {isNote ? (
                        <div className="relative flex h-auto min-h-56 w-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                            <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                                <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed opacity-90">
                                    {noteExcerpt ||
                                        "Tap to start writing in this note"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <PreviewMedia
                            isHovered={isCardHovered}
                            src={previewImageUrl}
                            videoSrc={previewVideoUrl}
                        />
                    )}
                </a>
                <div
                    className={cn(
                        "overflow-fade-top absolute inset-x-0 bottom-0 flex items-center gap-0.5 overflow-hidden bg-black/35 px-1.5 pt-2 pb-1 backdrop-blur-[2.5px]",
                        {
                            "bg-black/4 opacity-80 mix-blend-difference":
                                isNote,
                        }
                    )}
                >
                    <CardCollectionPicker
                        item={item}
                        onOpenChange={setIsCollectionPickerOpen}
                        open={isCollectionPickerOpen}
                    />
                    <Menu>
                        <MenuTrigger
                            render={
                                <button
                                    className="min-w-0 flex-1 cursor-pointer truncate rounded-sm py-px text-left font-medium text-white text-xs leading-none mix-blend-difference outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
                                item={item}
                                kind="menu"
                                onDownload={handleDownload}
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
                    item={item}
                    kind="context"
                    onDownload={handleDownload}
                    previewImageUrl={previewImageUrl}
                />
            </ContextMenuPopup>
        </ContextMenu>
    );
}

function ListRow({ item }: LibraryGridCardProps) {
    const { collections, onOpenInNewTab, onOpenNote, onUpdateItemCollections } =
        useLibraryGridCardContext();
    const isNote = item.kind === ITEM_KIND_NOTE;
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] =
        React.useState(false);
    const [isRowHovered, setIsRowHovered] = React.useState(false);
    const href = normalizeURL(item.url);
    const title = itemPrimaryText(item);
    const domain = itemDomain(item.url);
    const previewImageUrl = itemPreviewImageUrl(item);
    const createdLabel = itemDateLabel(item.createdAt);
    const addedLabel = itemDateLabel(item.scrapedAt ?? item.createdAt);
    const collectionPreview = item.collections.slice(
        0,
        LIST_ROW_COLLECTION_PREVIEW_LIMIT
    );
    const hiddenCollectionCount = Math.max(
        0,
        item.collections.length - collectionPreview.length
    );

    const handlePrimaryClick = useStableCallback(
        (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            if (isNote) {
                onOpenNote?.(item);
                return;
            }
            onOpenInNewTab?.(item);
        }
    );

    const handleDownload = useStableCallback(async () => {
        setIsDownloading(true);
        try {
            await downloadLibraryItemMedia(item);
        } catch (error) {
            log.error("Failed to prepare media download", error, {
                itemId: item.id,
                url: item.url,
            });
        } finally {
            setIsDownloading(false);
        }
    });

    const handleRowKeyDown = useStableCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
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
        }
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger
                onKeyDown={handleRowKeyDown}
                render={
                    <div className="group flex min-h-18 w-full items-center gap-2 rounded-lg border border-border/60 bg-card/45 px-2.5 py-2 transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" />
                }
            >
                <a
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    href={href}
                    onClick={handlePrimaryClick}
                    onMouseEnter={() => setIsRowHovered(true)}
                    onMouseLeave={() => setIsRowHovered(false)}
                    rel="noopener noreferrer"
                    target={isNote ? undefined : "_blank"}
                >
                    <ListRowPreview
                        isHovered={isRowHovered}
                        item={item}
                        previewImageUrl={previewImageUrl}
                    />
                    <div className="grid min-w-0 flex-1 gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-medium text-sm">
                                {title}
                            </p>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
                            <span className="shrink-0">{domain}</span>
                            {addedLabel ? (
                                <>
                                    <span aria-hidden>·</span>
                                    <span className="shrink-0 tabular-nums">
                                        Added {addedLabel}
                                    </span>
                                </>
                            ) : null}
                            {createdLabel && createdLabel !== addedLabel ? (
                                <>
                                    <span aria-hidden>·</span>
                                    <span className="hidden shrink-0 tabular-nums md:inline">
                                        Created {createdLabel}
                                    </span>
                                </>
                            ) : null}
                        </div>
                    </div>
                </a>
                <div className="hidden min-w-0 max-w-56 shrink items-center justify-end gap-1 lg:flex">
                    {collectionPreview.map((collection) => (
                        <Badge
                            className="max-w-28 truncate"
                            key={collection.id}
                            size="sm"
                            variant="secondary"
                        >
                            {collection.name}
                        </Badge>
                    ))}
                    {hiddenCollectionCount > 0 ? (
                        <Badge size="sm" variant="secondary">
                            +{hiddenCollectionCount}
                        </Badge>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <CollectionComboboxPicker
                        appearance="inline"
                        collections={collections}
                        items={[item]}
                        onOpenChange={setIsCollectionPickerOpen}
                        onUpdateItemCollections={onUpdateItemCollections}
                        open={isCollectionPickerOpen}
                    />
                    <Menu>
                        <MenuTrigger
                            render={
                                <Button
                                    aria-label="Open item menu"
                                    className="rounded-full"
                                    size="icon-sm"
                                    variant="ghost"
                                >
                                    <Ellipsis className="size-4 text-muted-foreground" />
                                </Button>
                            }
                        />
                        <MenuPopup align="end">
                            <CardMenu
                                addedLabel={addedLabel}
                                createdLabel={createdLabel}
                                href={href}
                                isDownloading={isDownloading}
                                item={item}
                                kind="menu"
                                onDownload={handleDownload}
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
                    item={item}
                    kind="context"
                    onDownload={handleDownload}
                    previewImageUrl={previewImageUrl}
                />
            </ContextMenuPopup>
        </ContextMenu>
    );
}

function ListRowPreview({
    isHovered,
    item,
    previewImageUrl,
}: {
    isHovered: boolean;
    item: LibraryItemWithCollections;
    previewImageUrl: string | null;
}) {
    const [hasImageFailed, setHasImageFailed] = React.useState(false);

    const handleImageError = useStableCallback(() => {
        setHasImageFailed(true);
    });

    if (item.kind === ITEM_KIND_NOTE) {
        return (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-amber-50 via-background to-stone-100 ring-1 ring-border/50">
                <NotebookPenIcon className="size-5 text-amber-700/80" />
            </div>
        );
    }

    return (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/50">
            {previewImageUrl && !hasImageFailed ? (
                // biome-ignore lint/a11y/noNoninteractiveElementInteractions: image load failures drive the visual fallback state
                <img
                    alt=""
                    className={cn(
                        "size-full object-cover transition-transform duration-150",
                        isHovered && "scale-105"
                    )}
                    height={48}
                    loading="lazy"
                    onError={handleImageError}
                    src={previewImageUrl}
                    width={48}
                />
            ) : (
                <div className="flex size-full items-center justify-center">
                    <Globe className="size-5 text-muted-foreground/60" />
                </div>
            )}
        </div>
    );
}

function BoardLayout({ items }: LibraryGridLayoutProps) {
    const { collections } = useLibraryGridCardContext();
    const boardColumns = buildBoardColumns(collections, items);
    const columnIds = [
        UNASSIGNED_COLLECTION_COLUMN_ID,
        ...collections.map((collection) => collection.id),
    ];

    return (
        <div className="overflow-x-auto pb-1">
            <Kanban orientation="horizontal">
                <KanbanBoard className="min-w-max items-start gap-3">
                    {columnIds.map((columnId) => {
                        const column = collections.find(
                            (item) => item.id === columnId
                        );
                        const PriorityIcon = column
                            ? getPriorityOption(column.priority).icon
                            : null;
                        const columnName =
                            columnId === UNASSIGNED_COLLECTION_COLUMN_ID
                                ? "No collection"
                                : (column?.name ?? "Collection");
                        const columnItems = boardColumns[columnId] ?? [];
                        const priorityIconColor = column
                            ? `color-mix(in srgb, ${getHexColorFromName(column.name)}, black 50%)`
                            : undefined;

                        return (
                            <KanbanColumn className="w-76" key={columnId}>
                                <div className="mb-2 flex items-center gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {PriorityIcon ? (
                                            <span
                                                aria-hidden
                                                className="flex size-4 shrink-0 items-center justify-center"
                                                style={{
                                                    color: priorityIconColor,
                                                }}
                                            >
                                                <PriorityIcon className="size-4" />
                                            </span>
                                        ) : null}
                                        <h3 className="truncate font-medium text-sm">
                                            {columnName}
                                        </h3>
                                    </div>
                                    <span className="shrink-0 font-medium text-muted-foreground text-xs tabular-nums">
                                        {columnItems.length}
                                    </span>
                                </div>
                                <div className="flex min-h-24 flex-col gap-3">
                                    {columnItems.length === 0 ? (
                                        <p className="rounded-lg border border-border/60 border-dashed px-3 py-4 text-center text-muted-foreground text-xs">
                                            No items yet
                                        </p>
                                    ) : (
                                        columnItems.map((columnItem) => (
                                            <KanbanItem key={columnItem.value}>
                                                <Card item={columnItem.item} />
                                            </KanbanItem>
                                        ))
                                    )}
                                </div>
                            </KanbanColumn>
                        );
                    })}
                </KanbanBoard>
            </Kanban>
        </div>
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
        <div className="relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/30">
            {placeholder.kind === "note" ? (
                <div className="relative min-h-56 bg-linear-to-br from-amber-50 via-background to-stone-100 p-4">
                    <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />
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
                        "relative overflow-hidden bg-linear-to-br from-muted/75 via-card to-muted/45",
                        placeholder.aspect
                    )}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_38%)]" />
                    <div className="absolute inset-0 bg-background/25 backdrop-blur-sm" />
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

function LockedPreviewListRow({
    placeholder,
}: {
    placeholder: LockedLibraryPreviewPlaceholder;
}) {
    return (
        <div className="flex min-h-18 items-center gap-3 rounded-lg border border-border/50 bg-card/45 px-3 py-2">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border/40">
                {placeholder.kind === "note" ? (
                    <NotebookPenIcon className="size-5 text-muted-foreground/60" />
                ) : (
                    <Globe className="size-5 text-muted-foreground/60" />
                )}
            </div>
            <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-3 w-[72%]" />
                <Skeleton className="h-2.5 w-[48%]" />
            </div>
            <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
        </div>
    );
}

function LockedResults({
    columnCount,
    layoutMode,
    totalItemCount,
}: {
    columnCount?: number;
    layoutMode: LayoutMode;
    totalItemCount: number;
}) {
    let lockedPreviewContent: ReactNode;
    if (layoutMode === "list") {
        lockedPreviewContent = (
            <div className="flex flex-col gap-2">
                {LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS.map((placeholder) => (
                    <LockedPreviewListRow
                        key={placeholder.id}
                        placeholder={placeholder}
                    />
                ))}
            </div>
        );
    } else if (layoutMode === "board") {
        lockedPreviewContent = (
            <div className="grid gap-3 md:grid-cols-3">
                {["Locked", "Preview", "Upgrade"].map((label, index) => (
                    <div
                        className="rounded-2xl border border-border/50 bg-card/35 p-3"
                        key={label}
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="font-medium text-sm">{label}</h3>
                            <span className="font-medium text-muted-foreground text-xs tabular-nums">
                                3
                            </span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS.slice(
                                index * 3,
                                index * 3 + 3
                            ).map((placeholder) => (
                                <LockedPreviewCard
                                    key={placeholder.id}
                                    placeholder={placeholder}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    } else {
        lockedPreviewContent = (
            <Masonry columnCount={columnCount} gap={4}>
                {LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS.map((placeholder) => (
                    <MasonryItem key={placeholder.id}>
                        <LockedPreviewCard placeholder={placeholder} />
                    </MasonryItem>
                ))}
            </Masonry>
        );
    }

    return (
        <div className="relative isolate flex flex-col gap-8">
            <BlockPaywallBanner length={totalItemCount} />
            <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
            <div className="select-none opacity-70 blur-[1.5px] saturate-75">
                {lockedPreviewContent}
            </div>
        </div>
    );
}

interface NoteDrawerProps {
    activeNote: LibraryItemWithCollections | typeof NOTE_DRAWER_NEW | null;
    container: React.RefObject<HTMLDivElement | null>;
    handlePasteUrlIntoLibrary: (url: string) => Promise<void>;
    handleSaveNote: (draft: NoteDraft) => Promise<boolean>;
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
                isNoteDrawerOpen,
            }: {
                container: React.RefObject<HTMLDivElement | null>;
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

                return (
                    <Note.Root
                        note={note}
                        onOpenChange={(open) => {
                            if (!open) {
                                onNoteDrawerClose();
                            }
                        }}
                        onSave={handleSaveNote}
                        onUrlPaste={handlePasteUrlIntoLibrary}
                        open={isNoteDrawerOpen}
                        saving={isSavingNote || isSavingPastedUrl}
                    >
                        <NoteDrawerShell
                            container={container}
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
    sourceFilters: SourceFilterValue[];
}

interface BrowserSimilarFilterOptions {
    domain: string;
    source: SourceFilterValue;
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
    const router = useRouter();
    const { hasAccess } = useSubscriptionAccess();
    const isExtensionInstalled = useIsExtensionInstalled();
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
        SourceFilterValue[]
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
    const [layoutMode, setLayoutMode] =
        React.useState<LayoutMode>(DEFAULT_LAYOUT_MODE);
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
            if (!hasAccess) {
                router.refresh();
            }
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
        setLayoutMode(DEFAULT_LAYOUT_MODE);
        setPaletteSection("search");
        setIsCommandOpen(false);
    });

    const buildAskCacheRequest = useStableCallback(
        (prompt: string): AskCacheRequest => ({
            composerState: {
                collectionMembershipFilter,
                columnCountMode,
                domainFilters,
                groupBy,
                layoutMode,
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
            if (patch.layoutMode) {
                setLayoutMode(patch.layoutMode);
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
        domainFilters,
        domainOptions,
        groupBy,
        layoutMode,
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
        setDomainFilters,
        setGroupBy,
        setIsCommandOpen,
        setLayoutMode,
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
        searchTerms,
        selectedCollectionIds,
        sourceFilters,
    });

    const sortedItems = sortCommandItems(filteredItems, sortMode);

    const sections = buildBrowserSections(sortedItems, groupBy, sortMode);

    const hasActiveFilters = browserHasActiveFilters({
        collectionMembershipFilter,
        domainFilters,
        searchTerms,
        selectedCollectionIds,
        sourceFilters,
    });

    const hasNonDefaultView =
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE ||
        layoutMode !== DEFAULT_LAYOUT_MODE ||
        sourceFilters.length > 0;

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
        layoutMode === "masonry" && columnCountMode !== "auto"
            ? Number(columnCountMode)
            : undefined;

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
        (searchTerms.length > 0 || hasNonDefaultView) &&
        visibleResultItems.length > 0;

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
        layoutMode,
        onClearCollectionFilters,
        onCreateCollection: requestCreate,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setDomainFilters,
        setGroupBy,
        setIsCommandOpen,
        setLayoutMode,
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
            event.defaultPrevented ||
            isTextEntry ||
            isPaletteEventTarget ||
            !isPrintablePaletteKey(event)
        ) {
            return;
        }

        event.preventDefault();
        setQuery((current) => `${current}${event.key}`);
        focusPaletteInput();
    });

    useHotkeys(
        SEARCH_HOTKEYS,
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
        domainFilters,
        groupBy,
        layoutMode,
        onRemoveCollectionFilter,
        onRemoveCommandAttachment: removeCommandAttachment,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setDomainFilters,
        setGroupBy,
        setLayoutMode,
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

            if (isSearchCancelKey(event)) {
                setIsCommandOpen(false);
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
        async (draft: { contentHtml: string; contentState: unknown | null }) =>
            await new Promise<boolean>((resolve) => {
                startSavingNoteTransition(async () => {
                    const result = await saveLibraryNoteDraft({
                        activeNote:
                            activeNote === NOTE_DRAWER_NEW ? null : activeNote,
                        draft,
                    });

                    if (result.status !== "SUCCESS") {
                        resolve(false);
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
                    if (!hasAccess) {
                        router.refresh();
                    }
                    resolve(true);
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

                    if (!hasAccess) {
                        router.refresh();
                    }
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

    const containerRef = React.useRef<HTMLDivElement>(null);

    let placeholder = "Search, filter, group, sort, and more…";
    if (paletteSection === "search") {
        placeholder = "Search, filter, group, sort, and more…";
        if (isCommandFocused) {
            placeholder = "What are you looking for?";
        }
    } else if (paletteSection === "filter") {
        placeholder = "Filter the library…";
    } else if (paletteSection === "group") {
        placeholder = "Group results…";
    } else if (paletteSection === "sort") {
        placeholder = "Sort results…";
    } else if (paletteSection === "layout") {
        placeholder = "Change the layout…";
    } else if (paletteSection === "ai-response") {
        placeholder = "Ask Cache…";
    }

    return (
        <div
            className="relative z-0 flex w-full min-w-0 max-w-[1024px] flex-1 flex-col gap-4 p-8 2xl:mx-auto"
            ref={containerRef}
            style={
                { "--library-section-sticky-top": "8px" } as React.CSSProperties
            }
        >
            <Composer>
                <ComposerInput
                    canClear={canClear}
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
                enableSectionCollapse={enableSectionCollapse}
                favoriteItemIdSet={favoriteItemIdSet}
                layoutMode={layoutMode}
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
                {layoutMode === "list" ? (
                    <BrowserListResults sections={sections} />
                ) : (
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
                                    <BrowserGroupEmpty />
                                    <BrowserCurrentLayout />
                                </BrowserGroup>
                            ) : (
                                <BrowserGroup>
                                    <BrowserCurrentLayout />
                                </BrowserGroup>
                            )
                        }
                    </BrowserList>
                )}
            </BrowserResults>
            {shouldShowLockedPreview ? (
                <LockedResults
                    columnCount={resolvedColumnCount}
                    layoutMode={layoutMode}
                    totalItemCount={totalItemCount}
                />
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
            <BackToTopButton />
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
