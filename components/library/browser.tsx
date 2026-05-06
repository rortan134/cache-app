"use client";

import {
    BlockPaywallBanner,
    InlinePaywallBanner,
} from "@/components/billing/paywall-banner";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { Note } from "@/components/library/notes";
import {
    PeekDrawer,
    PeekDrawerContent,
    PeekDrawerTrigger,
} from "@/components/library/peek";
import { NAME_COLLATOR, useWorkspace } from "@/components/library/workspace";
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
import { AutocompletePopup } from "@/components/ui/autocomplete";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientOnlyValue } from "@/components/ui/client-only";
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
    Command,
    CommandCollection,
    CommandEmpty,
    CommandFooter,
    CommandGroup,
    CommandGroupLabel,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPanel,
    CommandShortcut,
} from "@/components/ui/command";
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
import { CtrlKbd, Kbd, KbdGroup } from "@/components/ui/kbd";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Ticker } from "@/components/ui/ticker";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { CollectionCreateFromItemsResult } from "@/lib/collections/actions";
import {
    SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT,
    SECTION_DESCRIPTION_DOMAIN_MAX_LENGTH,
    SECTION_DESCRIPTION_TEXT_MAX_LENGTH,
    SECTION_DESCRIPTION_TITLE_MAX_LENGTH,
    SECTION_DESCRIPTION_URL_MAX_LENGTH,
    type SectionDescriptionContextItem,
} from "@/lib/collections/intelligence/summary";
import {
    deleteLibraryItem,
    type LibraryItemCollectionsUpdateResult,
    type LibraryItemDeleteResult,
    type LibraryItemsCollectionsUpdateResult,
} from "@/lib/collections/items";
import { downloadMedia } from "@/lib/collections/media";
import {
    itemPreviewImageUrl,
    itemPreviewVideoUrl,
    type LibraryCollectionSummary,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { isAbortError } from "@/lib/common/abort";
import { cn } from "@/lib/common/cn";
import { getColorGradientFromName } from "@/lib/common/colors";
import { FALLBACK_URL, ITEM_KIND_NOTE } from "@/lib/common/constants";
import { parseDate } from "@/lib/common/dates";
import { getOwnerWindow } from "@/lib/common/dom";
import { getSystemControlKey } from "@/lib/common/environment";
import {
    createFileAttachment,
    fileOpen,
    revokeFileAttachmentObjectUrl,
} from "@/lib/common/file";
import { filterValidImageUrls } from "@/lib/common/image";
import { getImageColors } from "@/lib/common/image-colors";
import { createLogger } from "@/lib/common/logs/console/logger";
import { normalizeWhitespace } from "@/lib/common/strings";

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
import { getNoteExcerpt } from "@/lib/integrations/notes/utils";
import { LibraryItemSource } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    Toolbar,
    type AutocompleteRootChangeEventDetails,
    type BaseUIEvent,
} from "@base-ui/react";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import {
    ArrowDownIcon,
    ArrowDownWideNarrow,
    ArrowUpIcon,
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
    CornerDownLeftIcon,
    DownloadIcon,
    ExternalLinkIcon,
    FilePenLineIcon,
    FolderOpen,
    Funnel,
    Globe,
    Grid2x2,
    Grid2x2X,
    Info,
    KanbanIcon,
    Layers3,
    LinkIcon,
    ListChevronsUpDown,
    MessageCircleQuestionMark,
    NotebookPenIcon,
    Plus,
    RotateCcw,
    SearchX,
    Sparkles,
    SquarePen,
    Tags,
    Trash2Icon,
    Volume2Icon,
    VolumeXIcon,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import useSWR from "swr";

const log = createLogger("library:browser");

const SECTION_DESCRIPTION_FALLBACK_TEXT =
    "Description is unavailable right now.";

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
    items: LibraryItemWithCollections[];
    layoutMode: LayoutMode;
    onClearCollectionFilters: () => void;
    onCreateCollection: () => void;
    onToggleCollectionSelection: (id: string) => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setPaletteInput: (value: string) => void;
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
    sortMode,
    setCollectionMembershipFilter,
    setDomainFilters,
    setGroupBy,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    setPaletteInput,
    setCommandListOpen,
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
        setPaletteInput("");
        setCommandListOpen(false);
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

    if (!hasAnyRefinements) {
        addSuggestion(buildCollectionSuggestion());
        addSuggestion(buildSourceSuggestion());
        addSuggestion(buildGroupingSuggestion());
        addSuggestion(buildDomainSuggestion());
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
    }

    return suggestions;
}

interface SectionDescriptionResponse {
    summary: string;
}

type SectionDescriptionSWRKey = [endpoint: string, requestBody: string];

async function fetchSectionDescription([
    endpoint,
    requestBody,
]: SectionDescriptionSWRKey): Promise<SectionDescriptionResponse> {
    const response = await fetch(endpoint, {
        body: requestBody,
        headers: {
            "content-type": "application/json",
        },
        method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: string;
    };

    if (!response.ok) {
        throw new Error(
            payload.error ?? "Unable to generate a section description."
        );
    }

    const summary = payload.summary?.trim();
    if (!summary) {
        throw new Error("Section description response was empty.");
    }

    return { summary };
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
const ALL_DOMAIN_FILTER = "__all_domains__";

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
const SEARCH_CANCEL_KEYS = ["esc", "tab"] as const;

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
type LayoutMode = "masonry" | "board";
type PaletteSection = "search" | "filter" | "group" | "sort" | "layout";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_LAYOUT_MODE: LayoutMode = "masonry";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
const UNASSIGNED_COLLECTION_COLUMN_ID = "__unassigned__";
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
    { label: "Added: Newest first", value: "added-newest" as const },
    { label: "Added: Oldest first", value: "added-oldest" as const },
    { label: "Created: Newest first", value: "created-newest" as const },
    { label: "Created: Oldest first", value: "created-oldest" as const },
    { label: "Count: Most items first", value: "count-desc" as const },
    { label: "Source", value: "source" as const },
    { label: "Domain", value: "domain" as const },
];

const PALETTE_GROUP_OPTIONS = [
    { label: "No grouping", value: "none" as const },
    { label: "Source", value: "source" as const },
    { label: "Domain", value: "domain" as const },
    { label: "Month Added", value: "month-added" as const },
    { label: "Month Created", value: "month-created" as const },
];

const PALETTE_COLUMN_OPTIONS = [
    { label: "Auto columns", value: "auto" as const },
    { label: "2 columns", value: "2" as const },
    { label: "3 columns", value: "3" as const },
    { label: "4 columns", value: "4" as const },
    { label: "5 columns", value: "5" as const },
    { label: "6 columns", value: "6" as const },
];

const PALETTE_LAYOUT_MODE_OPTIONS = [
    { label: "Masonry", value: "masonry" as const },
    { label: "Board", value: "board" as const },
];

interface CommandPaletteItem {
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

interface CommandPaletteGroup {
    items: CommandPaletteItem[];
    label: string;
    layout?: "horizontal" | "vertical";
}

interface BrowserSection {
    items: LibraryItemWithCollections[];
    key: string;
    title: string | null;
}
interface LibraryCommandAttachment
    extends ReturnType<typeof createFileAttachment> {
    id: string;
}

function itemDomain(url: string): string {
    return parseDisplayUrl(url) || "Other";
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
    if (source === LibraryItemSource.cache_note) {
        return "Notes";
    }
    if (source === LibraryItemSource.chrome_bookmarks) {
        return "Chrome";
    }
    if (source === LibraryItemSource.github_starred_repositories) {
        return "GitHub";
    }
    if (source === LibraryItemSource.google_photos) {
        return "Google Photos";
    }
    if (source === LibraryItemSource.instagram) {
        return "Instagram";
    }
    if (source === LibraryItemSource.pinterest) {
        return "Pinterest";
    }
    if (source === LibraryItemSource.tiktok) {
        return "TikTok";
    }
    if (source === LibraryItemSource.x_bookmarks) {
        return "X";
    }
    if (source === LibraryItemSource.youtube_watch_later) {
        return "YouTube";
    }
    return "Other";
}

const PALETTE_SOURCE_OPTIONS = [
    { label: "All sources", value: "all" as const },
    ...FILTERABLE_LIBRARY_SOURCES.map((source) => ({
        label: sourceLabel(source),
        value: source,
    })),
    { label: sourceLabel(LibraryItemSource.other), value: "other" as const },
];

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
        return sourceLabel(key as LibraryItemSource);
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

function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
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

function matchesCommandPaletteItem(
    item: CommandPaletteItem,
    query: string
): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    return [item.label, item.description, item.value].some((field) =>
        field?.toLowerCase().includes(normalizedQuery)
    );
}

function removeValue<T>(values: T[], value: T): T[] {
    return values.filter((entry) => entry !== value);
}

function toggleValue<T>(values: T[], next: T): T[] {
    return values.includes(next)
        ? values.filter((entry) => entry !== next)
        : [...values, next];
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
    const key = event.key.toLowerCase();
    return SEARCH_CANCEL_KEYS.includes(
        key as (typeof SEARCH_CANCEL_KEYS)[number]
    );
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
    return mode === "board" ? "Board" : "Masonry";
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
        : `Toggle this collection in the filter stack. ${details.join(". ")}`;
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
        <span className="palette-chip-enter inline-flex max-w-[min(100%,12rem)] items-center gap-0.5 rounded-full border border-border/60 bg-background/90 py-0.5 ps-2 pe-0.5 font-medium text-foreground text-xs shadow-xs/5">
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
                            className="palette-chip-enter max-w-[min(100%,12rem)] rounded-full border-border/60 bg-background/90 py-0.5 ps-1 pe-0.5 text-xs shadow-xs/5"
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
                                    alt={label}
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
            "Library grid cards must be used inside <LibraryGridCardProvider>."
        );
    }
    return context;
}

interface LibraryResultsProps {
    clearLibraryPalette: () => void;
    collapsedSectionKeys: Set<string>;
    collections: LibraryCollectionSummary[];
    columnCount?: number;
    enableSectionCollapse: boolean;
    layoutMode: LayoutMode;
    onCollapseAllSections?: () => void;
    onCopyLink: (item: LibraryItem) => void;
    onDelete: (item: LibraryItem) => void;
    onExpandAllSections?: () => void;
    onOpenInNewTab: (item: LibraryItem) => void;
    onOpenNote: (item: LibraryItem) => void;
    onSetActionFeedback: (feedback: LibraryActionFeedback | null) => void;
    onToggleSection: (key: string) => void;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    pendingDeleteItemId: string | null;
    sections: BrowserSection[];
    showEmptyLibraryPeek: boolean;
    showNoFilteredResults: boolean;
}

function renderLibraryGridBody({
    collapsedSectionKeys,
    collections,
    clearLibraryPalette,
    columnCount,
    layoutMode,
    enableSectionCollapse,
    onCollapseAllSections,
    onCopyLink,
    onDelete,
    onExpandAllSections,
    onOpenNote,
    onOpenInNewTab,
    onSetActionFeedback,
    onUpdateItemCollections,
    onToggleSection,
    pendingDeleteItemId,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: LibraryResultsProps) {
    if (showEmptyLibraryPeek) {
        return <Empty />;
    }

    if (showNoFilteredResults) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 border-dashed bg-card/30 px-6 py-14 text-center">
                <p className="max-w-md text-balance text-muted-foreground text-sm">
                    No saved items match the current search and filters.
                </p>
                <Button
                    onClick={clearLibraryPalette}
                    size="sm"
                    variant="outline"
                >
                    Reset browser
                </Button>
            </div>
        );
    }

    return sections.map((section) =>
        enableSectionCollapse ? (
            <BrowserSection
                accentKey={section.key}
                collapsed={collapsedSectionKeys.has(section.key)}
                collapsible
                collections={collections}
                columnCount={columnCount}
                emptyHint="No saved items in this section."
                items={section.items}
                key={section.key}
                layoutMode={layoutMode}
                onCollapseAll={onCollapseAllSections}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onExpandAll={onExpandAllSections}
                onOpenInNewTab={onOpenInNewTab}
                onOpenNote={onOpenNote}
                onSetActionFeedback={onSetActionFeedback}
                onToggle={() => onToggleSection(section.key)}
                onUpdateItemCollections={onUpdateItemCollections}
                pendingDeleteItemId={pendingDeleteItemId}
                title={section.title ?? "Results"}
            />
        ) : (
            <section className="flex w-full flex-col gap-3" key={section.key}>
                {section.title ? (
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-foreground text-sm">
                            {section.title}
                        </h2>
                        <span className="font-medium text-foreground text-xs tabular-nums">
                            {section.items.length}
                        </span>
                    </div>
                ) : null}
                <LibraryGridCardContext
                    value={{
                        collections,
                        onCopyLink,
                        onDelete,
                        onOpenInNewTab,
                        onOpenNote,
                        onSetActionFeedback,
                        onUpdateItemCollections,
                        pendingDeleteItemId,
                    }}
                >
                    {layoutMode === "board" ? (
                        <BoardLayout items={section.items} />
                    ) : (
                        <MasonryLayout
                            columnCount={columnCount}
                            items={section.items}
                        />
                    )}
                </LibraryGridCardContext>
            </section>
        )
    );
}

const LibraryResults = React.memo(function LibraryResults(
    props: LibraryResultsProps
) {
    return renderLibraryGridBody(props);
});

function ValidCategoryThumbnail({ urls }: { urls: string[] }) {
    const [validUrls, setValidUrls] = React.useState<string[]>([]);

    React.useEffect(() => {
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

    if (validUrls.length === 0 || !src) {
        return null;
    }

    return (
        <img
            alt=""
            className="absolute top-10 left-3 z-10 h-full w-auto rounded-sm object-cover transition-transform group-data-highlighted:-translate-y-1"
            fetchPriority="high"
            height={104}
            loading="eager"
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
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    searchTerms,
    setCommandListOpen,
    setPaletteInput,
    setSearchTerms,
}: {
    collections: LibraryCollectionSummary[];
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    clearLibraryPalette: () => void;
    draft: string;
    hasAnyRefinements: boolean;
    navigationItems: CommandPaletteItem[];
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    searchTerms: string[];
    setCommandListOpen: (value: boolean) => void;
    setPaletteInput: (value: string) => void;
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
        setPaletteInput("");
        setCommandListOpen(true);
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
                        setPaletteInput("");
                        setCommandListOpen(true);
                    },
                    shortcut: "Enter",
                    value: `add search ${draft}`,
                },
                {
                    description: "AI Search",
                    disabled: true,
                    label: "Ask Cache",
                    // biome-ignore lint/suspicious/noEmptyBlockStatements: TODO: intentionally disabled for now
                    onSelect: () => {},
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
                        setCommandListOpen(true);
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
                                        <ValidCategoryThumbnail
                                            urls={thumbnails}
                                        />
                                    )}
                                    <span className="z-30 truncate p-1 font-medium">
                                        {collection.name}
                                    </span>
                                </div>
                            ),
                            value: `filter collection ${collection.id}`,
                        };
                    }),
                label: "Categories",
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

interface BuildLibraryPaletteGroupsInput {
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
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    openPaletteSection: (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void;
    paletteInput: string;
    paletteSection: PaletteSection;
    returnToSearchSection: () => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setPaletteInput: (value: string) => void;
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

function buildLibraryPaletteGroups({
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
    onToggleCollectionSelection,
    openPaletteSection,
    paletteInput,
    paletteSection,
    returnToSearchSection,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setCommandListOpen,
    setDomainFilters,
    setGroupBy,
    setLayoutMode,
    setPaletteInput,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: BuildLibraryPaletteGroupsInput): CommandPaletteGroup[] {
    const draft = paletteInput.trim();
    const groups: CommandPaletteGroup[] = [];

    const applyAndReturn = (fn: () => void | Promise<void>) => async () => {
        await fn();
        returnToSearchSection();
    };
    const applyAndStay = (fn: () => void) => () => {
        fn();
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const navigationItems: CommandPaletteItem[] = [
        {
            description: "Source and domain filters",
            label: "Filter by…",
            onSelect: (event) => openPaletteSection("filter", event),
            shortcut: "F",
            value: "navigate filters",
        },
        {
            description: `Current: ${groupByLabel(groupBy)}`,
            label: "Group by…",
            onSelect: (event) => openPaletteSection("group", event),
            shortcut: "G",
            value: "navigate grouping",
        },
        {
            description: `Current: ${sortModeLabel(sortMode)}`,
            label: "Sort by…",
            onSelect: (event) => openPaletteSection("sort", event),
            shortcut: "S",
            value: "navigate sorting",
        },
        {
            description: `Current: ${layoutModeLabel(layoutMode)}`,
            label: "Layout…",
            onSelect: (event) => openPaletteSection("layout", event),
            shortcut: "L",
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
            onClearCollectionFilters,
            onToggleCollectionSelection,
            searchTerms: [...searchTerms],
            selectedCollectionIds: [...selectedCollectionIds],
            setCommandListOpen,
            setPaletteInput,
            setSearchTerms,
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
                ...PALETTE_SOURCE_OPTIONS.filter(
                    (option) => option.value !== "all"
                ).map((option) => ({
                    active: sourceFilters.includes(
                        option.value as SourceFilterValue
                    ),
                    description: "Toggle this source in the filter stack",
                    label: `Source: ${option.label}`,
                    onSelect: applyAndStay(() =>
                        setSourceFilters((current) =>
                            toggleValue(
                                current,
                                option.value as SourceFilterValue
                            )
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
                    onSelect: applyAndReturn(() =>
                        setGroupBy(option.value as GroupByMode)
                    ),
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
                    onSelect: applyAndReturn(() =>
                        setSortMode(option.value as SortMode)
                    ),
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
                              setColumnCountMode(
                                  option.value as ColumnCountMode
                              )
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
                description:
                    option.value === "board"
                        ? "Group entries by collections in columns"
                        : "Display saved items in a visual grid",
                label: option.label,
                onSelect: applyAndReturn(() =>
                    setLayoutMode(option.value as LayoutMode)
                ),
                value: `layout ${option.value}`,
            })),
            label: "Layout",
        },
    ];
}

function filterLibraryBrowserItems(
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

function sortLibraryBrowserItems(
    filteredItems: LibraryItemWithCollections[],
    sortMode: SortMode
): LibraryItemWithCollections[] {
    const itemSortMode =
        sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
    return [...filteredItems].sort((a, b) => compareItems(a, b, itemSortMode));
}

function buildLibraryBrowserSections(
    sortedItems: LibraryItemWithCollections[],
    groupBy: GroupByMode,
    sortMode: SortMode
): BrowserSection[] {
    if (groupBy === "none") {
        return [
            {
                items: sortedItems as LibraryItemWithCollections[],
                key: "all",
                title: null as string | null,
            },
        ];
    }

    const buckets = new Map<string, LibraryItemWithCollections[]>();
    for (const item of sortedItems) {
        let key = "Other";
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

function libraryBrowserHasActiveFilters(input: {
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

function applyVisiblePaletteShortcuts(
    paletteGroups: CommandPaletteGroup[],
    paletteInput: string,
    systemControlKey: string
): CommandPaletteGroup[] {
    const filtered = paletteGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                matchesCommandPaletteItem(item, paletteInput)
            ),
        }))
        .filter((group) => group.items.length > 0);

    let globalIndex = 0;
    return filtered.map((group) => ({
        ...group,
        items: group.items.map((item) => {
            globalIndex++;
            if (globalIndex <= 9 && !item.shortcut) {
                return {
                    ...item,
                    shortcut: systemControlKey
                        ? `${systemControlKey}${globalIndex}`
                        : item.shortcut,
                };
            }
            return item;
        }),
    }));
}

function useSectionCollapseState({
    groupBy,
    hasActiveFilters,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: {
    groupBy: GroupByMode;
    hasActiveFilters: boolean;
    sections: BrowserSection[];
    showEmptyLibraryPeek: boolean;
    showNoFilteredResults: boolean;
}) {
    const [collapsedSectionKeys, setCollapsedSectionKeys] = React.useState<
        string[]
    >([]);

    const enableSectionCollapse =
        !(showEmptyLibraryPeek || showNoFilteredResults) &&
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

function LibraryPaletteTrailing({
    entries,
    isCommandInputFocused,
    onAttachFiles,
}: {
    entries: PaletteStackEntry[];
    isCommandInputFocused: boolean;
    onAttachFiles: () => void | Promise<void>;
}) {
    return (
        <>
            {entries.length === 0 && !isCommandInputFocused && (
                <Kbd className="border-none text-muted-foreground opacity-50">
                    <CtrlKbd />G
                </Kbd>
            )}
            <TruncateAfter
                badgeRender={
                    <Badge
                        className="palette-chip-enter inline-flex h-7! cursor-pointer rounded-full text-xs tabular-nums"
                        render={<button type="button" />}
                        variant="secondary"
                    />
                }
                className="justify-end"
                maxVisible={1}
            >
                {entries.map((entry) => entry.chip)}
            </TruncateAfter>
            <Toolbar.Button
                render={
                    <Button
                        className="rounded-full"
                        onClick={(event) => {
                            event.stopPropagation();
                            onAttachFiles();
                            event.preventDefault();
                        }}
                        size="icon-sm"
                        title="Add photos & files context"
                        variant="ghost"
                    >
                        <Plus className="size-4 shrink-0" />
                    </Button>
                }
            />
        </>
    );
}

interface LibraryProps {
    lockedItemCount: number;
    totalItemCount: number;
}

interface LibraryActionFeedback {
    message: string;
    tone: "error" | "success";
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
    const [actionFeedback, setActionFeedback] =
        React.useState<LibraryActionFeedback | null>(null);
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const { copyToClipboard } = useCopyToClipboard({
        onCopy: () => {
            setActionFeedback({
                message: "Saved link copied to the clipboard.",
                tone: "success",
            });
        },
    });

    const handleOpenInNewTab = useStableCallback((item: LibraryItem) => {
        setActionFeedback(null);
        openExternal(normalizeURL(item.url));
    });

    const handleCopyLink = useStableCallback(async (item: LibraryItem) => {
        await copyToClipboard(normalizeURL(item.url));
    });

    const handleRequestDelete = useStableCallback((item: LibraryItem) => {
        setActionFeedback(null);
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
                setActionFeedback({
                    message: "Saved item deleted from Cache.",
                    tone: "success",
                });
                return;
            }

            setActionFeedback({
                message: result.message,
                tone: "error",
            });
        });
    });

    return {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    };
}

interface GridProps {
    collections: LibraryCollectionSummary[];
    columnCount?: number;
    items: LibraryItemWithCollections[];
    layoutMode: LayoutMode;
    onCopyLink?: (item: LibraryItemWithCollections) => void;
    onDelete?: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    onOpenNote?: (item: LibraryItemWithCollections) => void;
    onSetActionFeedback: (feedback: LibraryActionFeedback | null) => void;
    onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
    pendingDeleteItemId?: string | null;
}

interface SectionProps extends GridProps {
    accentKey?: string;
    collapsed?: boolean;
    collapsible?: boolean;
    emptyHint: string;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    onToggle?: () => void;
    title: string;
}

interface BoardColumnItem {
    item: LibraryItemWithCollections;
    value: string;
}

interface PreviewMediaProps {
    alt: string;
    isHovered?: boolean;
    src: string | null;
    videoSrc?: string | null;
}

export function PreviewMedia({
    alt,
    isHovered = false,
    src,
    videoSrc,
}: PreviewMediaProps) {
    const imageSrc = src ?? undefined;
    const canRenderImage = Boolean(imageSrc);
    const [hasVideoFailed, setHasVideoFailed] = React.useState(false);
    const canRenderVideo = Boolean(videoSrc) && !hasVideoFailed;
    const [isSoundEnabled, setIsSoundEnabled] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    React.useEffect(() => {
        const video = videoRef.current;
        if (!(video && canRenderVideo)) {
            return;
        }

        if (isHovered) {
            video.play().catch((error: unknown) => {
                log.debug("Failed to play hover preview", { error });
            });
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isHovered, canRenderVideo]);

    const handleSoundToggle = useStableCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setIsSoundEnabled((wasSoundEnabled) => !wasSoundEnabled);
    });

    const handleVideoError = useStableCallback(() => {
        setHasVideoFailed(true);
    });

    const SoundIcon = isSoundEnabled ? Volume2Icon : VolumeXIcon;

    return (
        <div className="relative size-full">
            {canRenderImage ? (
                <img
                    alt={alt}
                    className={cn(
                        "size-full object-cover transition-opacity duration-150",
                        {
                            "opacity-0": canRenderVideo && isHovered,
                        }
                    )}
                    height={400}
                    loading="lazy"
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
                                "opacity-0": !isHovered,
                                "opacity-100": isHovered,
                            }
                        )}
                        loop
                        muted={!isSoundEnabled}
                        onError={handleVideoError}
                        playsInline
                        preload="metadata"
                        ref={videoRef}
                        src={videoSrc ?? undefined}
                    />
                    <Button
                        aria-label={
                            isSoundEnabled
                                ? "Mute video preview"
                                : "Enable video preview sound"
                        }
                        aria-pressed={isSoundEnabled}
                        className={cn(
                            "pointer-events-auto absolute top-2 right-2 z-10 rounded-full border-white/15 bg-black/45 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/60 focus-visible:opacity-100 focus-visible:ring-white/70",
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
        </div>
    );
}

type LibraryGridCardContextValue = Pick<
    GridProps,
    | "collections"
    | "onCopyLink"
    | "onDelete"
    | "onOpenInNewTab"
    | "onOpenNote"
    | "onSetActionFeedback"
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
    item: LibraryItemWithCollections;
    kind: "context" | "menu";
    onDownload: () => void;
    previewDescription: string;
    previewImageUrl: string | null;
    previewTitle: string;
}

interface LibraryGridLayoutProps {
    items: LibraryItemWithCollections[];
}

interface LibraryMasonryLayoutProps extends LibraryGridLayoutProps {
    columnCount?: number;
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

export function CollectionComboboxPicker({
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
                        className="rounded-full mix-blend-difference invert hover:brightness-125"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
                {...props}
            >
                {children ??
                    (selectedCount > 0 ? (
                        <CircleDot className="size-4.5" />
                    ) : (
                        <CircleDashed className="size-4.5" />
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
        onCopyLink,
        onDelete,
        onOpenInNewTab,
        onOpenNote,
        pendingDeleteItemId,
    } = useLibraryGridCardContext();
    const Item = kind === "context" ? ContextMenuItem : MenuItem;
    const ItemSeparator =
        kind === "context" ? ContextMenuSeparator : MenuSeparator;
    const isNote = item.kind === ITEM_KIND_NOTE;
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
                        className="group/card relative flex w-full flex-col overflow-hidden rounded-lg border border-border/40 bg-card text-start shadow-xs/5 transition-colors hover:bg-muted/30"
                        render={<button type="button" />}
                    />
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
                        Copy URL link
                    </Item>
                    <Item disabled={isDownloading} onClick={onDownload}>
                        <DownloadIcon className="size-4.5 text-muted-foreground" />
                        {isDownloading ? "Downloading..." : "Download media"}
                    </Item>
                    <ItemSeparator />
                </>
            )}
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
    const { onOpenInNewTab, onOpenNote, onSetActionFeedback } =
        useLibraryGridCardContext();
    const isNote = item.kind === "note";
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] =
        React.useState(false);
    const [isCardHovered, setIsCardHovered] = React.useState(false);
    const href = normalizeURL(item.url);
    const alt = (item.caption ?? "").trim() || "Saved item";
    const domain = itemDomain(item.url);
    const previewImageUrl = itemPreviewImageUrl(item);
    const previewVideoUrl = itemPreviewVideoUrl(item);
    const previewTitle = alt === "Saved item" ? "Preview" : alt;
    const previewDescription = domain === "Other" ? item.url : domain;
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

    const reportDownloadFailure = useStableCallback(
        (message: string, error?: unknown) => {
            log.error("Failed to prepare media download", error, {
                itemId: item.id,
                url: item.url,
            });
            onSetActionFeedback?.({
                message,
                tone: "error",
            });
        }
    );

    const handleDownload = async () => {
        onSetActionFeedback?.(null);
        setIsDownloading(true);
        try {
            const result = await downloadMedia(item.url);
            if (result.status === "SUCCESS") {
                // Use a hidden anchor to trigger download if possible, or just open in new tab
                const link = document.createElement("a");
                link.href = result.downloadUrl;
                link.download = ""; // Cobalt usually provides a good filename or direct link
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                reportDownloadFailure(result.message);
            }
        } catch (error) {
            reportDownloadFailure(
                "We couldn't download this media right now.",
                error
            );
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
            <ContextMenuTrigger render={<div className="contents" />}>
                {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: TEMP */}
                <article
                    className="group relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    onKeyDown={handleCardKeyDown}
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
                            <div className="relative flex aspect-3/4 h-auto min-h-72 w-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                                <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                                    <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed opacity-90">
                                        {noteExcerpt ||
                                            "Tap to start writing in this note"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative aspect-3/4 w-full overflow-hidden">
                                <PreviewMedia
                                    alt={alt}
                                    isHovered={isCardHovered}
                                    src={previewImageUrl}
                                    videoSrc={previewVideoUrl}
                                />
                            </div>
                        )}
                    </a>
                    <div
                        className={cn(
                            "overflow-fade-top absolute inset-x-0 bottom-0 flex items-center gap-1 overflow-hidden bg-black/35 px-1.5 pt-2 pb-1 backdrop-blur-[2.5px]",
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
                                    previewDescription={previewDescription}
                                    previewImageUrl={previewImageUrl}
                                    previewTitle={previewTitle}
                                />
                            </MenuPopup>
                        </Menu>
                    </div>
                </article>
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
                    previewDescription={previewDescription}
                    previewImageUrl={previewImageUrl}
                    previewTitle={previewTitle}
                />
            </ContextMenuPopup>
        </ContextMenu>
    );
}

function MasonryLayout({ columnCount, items }: LibraryMasonryLayoutProps) {
    return (
        <Masonry columnCount={columnCount} gap={4} linear>
            {items.map((item) => (
                <MasonryItem key={item.id}>
                    <Card item={item} />
                </MasonryItem>
            ))}
        </Masonry>
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
            <Kanban getItemValue={(entry) => entry.value} value={boardColumns}>
                <KanbanBoard className="min-w-max items-start gap-3">
                    {columnIds.map((columnId) => {
                        const columnName =
                            columnId === UNASSIGNED_COLLECTION_COLUMN_ID
                                ? "No collection"
                                : (collections.find(
                                      (item) => item.id === columnId
                                  )?.name ?? "Collection");
                        const columnItems = boardColumns[columnId] ?? [];

                        return (
                            <KanbanColumn
                                className="w-76"
                                key={columnId}
                                value={columnId}
                            >
                                <div className="mb-2 flex items-center gap-3">
                                    <h3 className="truncate font-medium text-sm">
                                        {columnName}
                                    </h3>
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
                                            <KanbanItem
                                                key={columnItem.value}
                                                value={columnItem.value}
                                            >
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
                <div className="relative min-h-72 bg-linear-to-br from-amber-50 via-background to-stone-100 p-4">
                    <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />
                    <div className="relative flex h-full flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-500/20 bg-white/70 px-2.5 py-1 font-medium text-[11px] text-stone-700">
                            <NotebookPenIcon className="size-3.5" />
                            Locked note
                        </span>
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
                        <Badge
                            className="w-fit bg-background/80"
                            size="sm"
                            variant="secondary"
                        >
                            Locked preview
                        </Badge>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-[88%]" />
                            <Skeleton className="h-3 w-[62%]" />
                        </div>
                    </div>
                </div>
            )}
            <div className="border-border/30 border-t bg-background/75 px-3 py-2">
                <p className="text-muted-foreground text-xs">
                    Upgrade to reveal this item.
                </p>
            </div>
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
    return (
        <div className="relative isolate flex flex-col gap-8">
            <BlockPaywallBanner length={totalItemCount} />
            <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
            <div className="select-none opacity-70 blur-[1.5px] saturate-75">
                {layoutMode === "board" ? (
                    <div className="grid gap-3 md:grid-cols-3">
                        {["Locked", "Preview", "Upgrade"].map(
                            (label, index) => (
                                <div
                                    className="rounded-2xl border border-border/50 bg-card/35 p-3"
                                    key={label}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h3 className="font-medium text-sm">
                                            {label}
                                        </h3>
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
                            )
                        )}
                    </div>
                ) : (
                    <Masonry columnCount={columnCount} gap={4} linear>
                        {LOCKED_LIBRARY_PREVIEW_PLACEHOLDERS.map(
                            (placeholder) => (
                                <MasonryItem key={placeholder.id}>
                                    <LockedPreviewCard
                                        placeholder={placeholder}
                                    />
                                </MasonryItem>
                            )
                        )}
                    </Masonry>
                )}
            </div>
        </div>
    );
}

function Empty() {
    return (
        <>
            <div className="mx-4 flex flex-col gap-1 px-1">
                <h3 className="font-medium text-foreground text-sm">
                    Welcome to Cache
                </h3>
                <p className="text-muted-foreground text-xs leading-tight">
                    Everything you save, unified and searchable. Cache is
                    purpose-built to organize what matters into collections and
                    find it when you need it.
                </p>
            </div>
            <Masonry columnCount={5} gap={4} linear>
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

function SectionSummaryContent({
    items,
    title,
}: {
    items: LibraryItemWithCollections[];
    title: string;
}) {
    const requestBody = JSON.stringify({
        items: items
            .slice(0, SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT)
            .map(buildSectionDescriptionContextItem),
        sectionTitle: title,
    });
    const deferredRequestBody = React.useDeferredValue(requestBody);

    const { data, error, isLoading } = useSWR<SectionDescriptionResponse>(
        items.length > 0
            ? (["/api/summary", deferredRequestBody] as const)
            : null,
        fetchSectionDescription,
        {
            dedupingInterval: 60_000,
            keepPreviousData: true,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    if (isLoading && !data && !error) {
        return (
            <div className="block w-full text-xs leading-snug">
                <Skeleton className="my-0.5 h-4 w-full" />
                <Skeleton className="my-0.5 h-4 w-48" />
            </div>
        );
    }

    const summary = data?.summary?.trim();
    return (
        <span className="fade-in-0 block w-full animate-in text-xs leading-snug motion-reduce:animate-none">
            {summary && summary.length > 0
                ? summary
                : SECTION_DESCRIPTION_FALLBACK_TEXT}{" "}
            <Button
                className="h-fit! text-xs leading-snug sm:text-xs"
                size="xs"
                variant="link"
            >
                Expand&nbsp;
                <ListChevronsUpDown className="mb-px inline-block size-3.5 shrink-0" />
            </Button>
            or
            <Button
                className="h-fit! text-xs leading-snug sm:text-xs"
                size="xs"
                variant="link"
            >
                Ask anything&nbsp;
                <MessageCircleQuestionMark className="mb-px inline-block size-3.5 shrink-0" />
            </Button>
        </span>
    );
}

function BrowserSection({
    accentKey,
    collapsed = false,
    collapsible = false,
    collections,
    columnCount,
    emptyHint,
    items,
    layoutMode,
    onSetActionFeedback,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggle,
    onCollapseAll,
    onExpandAll,
    pendingDeleteItemId,
    title,
}: SectionProps) {
    const canToggle = collapsible && onToggle;
    const headerGradient = collapsible
        ? getColorGradientFromName(accentKey ?? title)
        : undefined;
    let body: React.ReactElement | null;

    const shouldRequestDescription = canToggle && title === "Results";

    if (collapsed) {
        body = null;
    } else if (items.length === 0) {
        body = <p className="text-muted-foreground text-sm">{emptyHint}</p>;
    } else {
        body = (
            <>
                {shouldRequestDescription ? (
                    <div className="flex items-start gap-2">
                        <AvatarGroup>
                            <Avatar className="size-7 bg-muted">
                                <Sparkles className="size-4" />
                            </Avatar>
                            <Avatar className="border-2 border-white bg-muted">
                                <Info className="size-4" />
                            </Avatar>
                        </AvatarGroup>
                        <div className="flex w-full flex-1 flex-col gap-1">
                            <GradientWaveText
                                ariaLabel="Description"
                                className="-ml-px font-medium text-muted-foreground text-xs opacity-80"
                            >
                                Description
                            </GradientWaveText>
                            <SectionSummaryContent
                                items={items}
                                title={title}
                            />
                        </div>
                    </div>
                ) : null}
                <LibraryGridCardContext
                    value={{
                        collections,
                        onCopyLink,
                        onDelete,
                        onOpenInNewTab,
                        onOpenNote,
                        onSetActionFeedback,
                        onUpdateItemCollections,
                        pendingDeleteItemId,
                    }}
                >
                    {layoutMode === "board" ? (
                        <BoardLayout items={items} />
                    ) : (
                        <MasonryLayout
                            columnCount={columnCount}
                            items={items}
                        />
                    )}
                </LibraryGridCardContext>
            </>
        );
    }

    return (
        <section className="flex w-full flex-col gap-3">
            <ContextMenu>
                <ContextMenuTrigger render={<div className="contents" />}>
                    <div
                        className={cn(
                            "flex items-center justify-between gap-3 py-1 pr-5",
                            collapsible &&
                                "sticky z-10 rounded-xl bg-muted/92 backdrop-blur-sm supports-backdrop-filter:bg-muted/50"
                        )}
                        style={
                            collapsible
                                ? ({
                                      background: headerGradient,
                                      top: "var(--library-section-sticky-top)",
                                  } as React.CSSProperties)
                                : undefined
                        }
                    >
                        {canToggle ? (
                            <Button
                                className="group min-w-0 flex-1 justify-start rounded-xl"
                                onClick={onToggle}
                                size="lg"
                                title={
                                    collapsed
                                        ? "Expand group"
                                        : "Collapse group"
                                }
                                variant="ghost"
                                {...(collapsed
                                    ? {}
                                    : { "data-panel-open": true })}
                            >
                                <ChevronDownFilledIcon />
                                <span className="ml-1 truncate font-medium">
                                    {title}
                                </span>
                            </Button>
                        ) : (
                            <h2 className="font-medium text-lg">{title}</h2>
                        )}
                        <span className="font-medium text-foreground text-xs tabular-nums">
                            {items.length}
                        </span>
                    </div>
                </ContextMenuTrigger>
                {collapsible && (
                    <ContextMenuPopup>
                        <ContextMenuItem
                            disabled={!collapsed}
                            onClick={onToggle}
                        >
                            <ChevronDown className="size-4.5 text-muted-foreground" />
                            Expand
                        </ContextMenuItem>
                        <ContextMenuItem
                            disabled={collapsed}
                            onClick={onToggle}
                        >
                            <ChevronUp className="size-4.5 text-muted-foreground" />
                            Collapse
                        </ContextMenuItem>
                        {(onExpandAll || onCollapseAll) && (
                            <>
                                <ContextMenuSeparator />
                                {onExpandAll && (
                                    <ContextMenuItem onClick={onExpandAll}>
                                        <ChevronsDown className="size-4.5 text-muted-foreground" />
                                        Expand all
                                    </ContextMenuItem>
                                )}
                                {onCollapseAll && (
                                    <ContextMenuItem onClick={onCollapseAll}>
                                        <ChevronsUp className="size-4.5 text-muted-foreground" />
                                        Collapse all
                                    </ContextMenuItem>
                                )}
                            </>
                        )}
                    </ContextMenuPopup>
                )}
            </ContextMenu>
            {body}
        </section>
    );
}

export function Browser({ lockedItemCount, totalItemCount }: LibraryProps) {
    const {
        collectionPreviewThumbnailUrlsById,
        collectionSummaries: collections,
        hasAccess,
        items,
        onClearCollectionFilters,
        onCreateCollectionFromResults,
        onDeleteItemSuccess,
        onSelectCollection: onRemoveCollectionFilter,
        onUpdateItemCollections,
        onUpdateItemsCollections,
        requestCreate,
        selectedCollectionIds,
        setItems: onItemsChange,
    } = useWorkspace();
    const router = useRouter();
    const systemControlKey = useClientOnlyValue(getSystemControlKey());
    const [searchTerms, setSearchTerms] = React.useState<string[]>([]);
    const [paletteInput, setPaletteInput] = React.useState("");
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
    const [activeNote, setActiveNote] =
        React.useState<LibraryItemWithCollections | null>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = React.useState(false);
    const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] =
        React.useState(false);
    const [createResultsNameDraft, setCreateResultsNameDraft] =
        React.useState("");
    const [createResultsDescriptionDraft, setCreateResultsDescriptionDraft] =
        React.useState("");
    const [createResultsError, setCreateResultsError] = React.useState<
        string | null
    >(null);
    const [commandListOpen, setCommandListOpen] = React.useState(false);
    const [isPaletteFocused, setIsPaletteFocused] = React.useState(false);
    const [isCommandInputFocused, setIsCommandInputFocused] =
        React.useState(false);
    const paletteFocusOutTimeout = useTimeout();

    const commandPanelContainerRef = React.useRef<HTMLDivElement>(null);
    const paletteInputRef = React.useRef<HTMLInputElement>(null);
    const commandAttachmentsRef = React.useRef<LibraryCommandAttachment[]>([]);
    commandAttachmentsRef.current = commandAttachments;
    const createResultsNameInputId = React.useId();
    const createResultsDescriptionId = React.useId();
    /** Skips one combobox-driven close right after entering a drill-down section. */
    const suppressNextCommandCloseRef = React.useRef(false);
    const collectionUpdateFeedbackVersionByItemIdRef = React.useRef(
        new Map<string, number>()
    );
    const {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
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

    const domainOptions = buildDomainPaletteOptions(items);

    const focusPaletteInput = useStableCallback((select = false) => {
        setCommandListOpen(true);
        queueMicrotask(() => {
            paletteInputRef.current?.focus();
            if (select) {
                paletteInputRef.current?.select();
            }
        });
    });

    const handleCommandOpenChange = (
        nextOpen: boolean,
        eventDetails?: { reason?: string }
    ) => {
        setCommandListOpen(() => {
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
                const reason = eventDetails?.reason;

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
    };

    useIsoLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }
        const ownerWindow = el.ownerDocument.defaultView;
        if (!ownerWindow) {
            return;
        }

        const handleFocusIn = (event: FocusEvent) => {
            setIsPaletteFocused(true);
            if (event.target instanceof ownerWindow.HTMLInputElement) {
                setCommandListOpen(true);
            }
        };

        const handleFocusOut = (event: FocusEvent) => {
            const { relatedTarget } = event;
            if (
                relatedTarget instanceof ownerWindow.Node &&
                el.contains(relatedTarget)
            ) {
                return;
            }
            const closeIfLeft = () => {
                const active = el.ownerDocument.activeElement;
                if (
                    !(active instanceof ownerWindow.Node && el.contains(active))
                ) {
                    setIsPaletteFocused(false);
                    setCommandListOpen(false);
                }
            };
            queueMicrotask(closeIfLeft);
            paletteFocusOutTimeout.start(0, closeIfLeft);
        };

        el.addEventListener("focusin", handleFocusIn);
        el.addEventListener("focusout", handleFocusOut);
        return () => {
            paletteFocusOutTimeout.clear();
            el.removeEventListener("focusin", handleFocusIn);
            el.removeEventListener("focusout", handleFocusOut);
        };
    }, [paletteFocusOutTimeout]);

    React.useEffect(() => {
        const handleWindowKeyDown = (event: KeyboardEvent) => {
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
            setPaletteInput((current) => `${current}${event.key}`);
            focusPaletteInput();
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, [focusPaletteInput]);

    React.useEffect(
        () => () => {
            for (const attachment of commandAttachmentsRef.current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
        },
        []
    );

    const returnToSearchSection = () => {
        setPaletteSection("search");
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const openPaletteSection = (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => {
        event.preventDefault();
        suppressNextCommandCloseRef.current = true;
        setPaletteSection(section);
        setPaletteInput("");
    };

    const handleCommandInputChange = (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => {
        if (
            paletteGroups
                .flatMap((group) => group.items)
                .some((value) => value.value === next)
        ) {
            eventDetails.cancel();
            return;
        }

        setPaletteInput(next);
    };

    const removeCommandAttachment = (id: string) => {
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
    };

    const clearCommandAttachments = () => {
        setCommandAttachments((current) => {
            for (const attachment of current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
            return [];
        });
    };

    const handleAttachCommandFiles = async () => {
        try {
            const selectedFiles = await fileOpen({
                description: "Files",
                multiple: true,
            });
            const files = Array.isArray(selectedFiles)
                ? selectedFiles
                : [selectedFiles];

            if (files.length === 0) {
                return;
            }

            const nextAttachments = files.map((file) => ({
                ...createFileAttachment(file),
                id: crypto.randomUUID(),
            }));

            setCommandAttachments((current) => [
                ...current,
                ...nextAttachments,
            ]);
            focusPaletteInput();
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }
            setActionFeedback({
                message: "We couldn't attach those files right now.",
                tone: "error",
            });
        }
    };

    const clearLibraryPalette = useStableCallback(() => {
        setPaletteInput("");
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
        setCommandListOpen(false);
    });

    const handlePaletteInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Escape") {
            event.preventDefault();
            if (paletteInput.trim() !== "") {
                setPaletteInput("");
                setCommandListOpen(true);
                return;
            }
            if (paletteSection !== "search") {
                returnToSearchSection();
                return;
            }
            setCommandListOpen(false);
            event.currentTarget.blur();
            return;
        }

        if (isSearchCancelKey(event)) {
            setCommandListOpen(false);
            return;
        }

        if (event.key === "Backspace" && paletteInput.trim() === "") {
            event.preventDefault();
            if (paletteSection !== "search") {
                returnToSearchSection();
                return;
            }
            removeLastPaletteStackEntry(
                buildPaletteStackEntries({
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
                })
            );
            return;
        }

        if (event.key === "ArrowDown" && !commandListOpen) {
            setCommandListOpen(true);
        }
    };

    const paletteGroups = buildLibraryPaletteGroups({
        clearLibraryPalette,
        collectionMembershipFilter,
        collectionPreviewThumbnailUrlsById,
        collections,
        columnCountMode,
        domainFilters,
        domainOptions,
        groupBy,
        layoutMode,
        onClearCollectionFilters,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
        setLayoutMode,
        setPaletteInput,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    const visiblePaletteGroups = applyVisiblePaletteShortcuts(
        paletteGroups,
        paletteInput,
        systemControlKey ?? "Ctrl"
    );

    let inputPlaceholder = "Search, filter, group, sort, and more…";
    if (paletteSection === "search") {
        inputPlaceholder = "Search, filter, group, sort, and more…";
        if (isPaletteFocused) {
            inputPlaceholder = "What are you looking for?";
        }
    } else if (paletteSection === "filter") {
        inputPlaceholder = "Filter the library…";
    } else if (paletteSection === "group") {
        inputPlaceholder = "Group results…";
    } else if (paletteSection === "sort") {
        inputPlaceholder = "Sort results…";
    } else if (paletteSection === "layout") {
        inputPlaceholder = "Change the layout…";
    }

    const filteredItems = filterLibraryBrowserItems(items, {
        collectionMembershipFilter,
        domainFilters,
        searchTerms,
        selectedCollectionIds,
        sourceFilters,
    });

    const sortedItems = sortLibraryBrowserItems(filteredItems, sortMode);

    const sections = buildLibraryBrowserSections(
        sortedItems,
        groupBy,
        sortMode
    );

    const hasActiveFilters = libraryBrowserHasActiveFilters({
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
        layoutMode !== DEFAULT_LAYOUT_MODE;

    const showEmptyLibraryPeek =
        items.length === 0 && filteredItems.length === 0 && !hasActiveFilters;

    const showNoFilteredResults =
        filteredItems.length === 0 && !showEmptyLibraryPeek;

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
        showEmptyLibraryPeek,
        showNoFilteredResults,
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
                ? `${items.length} preview item${items.length === 1 ? "" : "s"} of ${totalItemCount}`
                : `${filteredItems.length} preview result${filteredItems.length === 1 ? "" : "s"} from ${items.length} visible`;
    }

    const visibleResultItems = sections.flatMap((section) => section.items);

    const canCreateCollectionFromResults =
        (searchTerms.length > 0 || hasNonDefaultView) &&
        visibleResultItems.length > 0;

    const showLockedPreview =
        isPreviewOnly && !hasActiveFilters && groupBy === "none";

    const canClear =
        (hasActiveFilters || hasNonDefaultView) && !showEmptyLibraryPeek;

    const commandSuggestions = buildCommandSuggestions({
        clearLibraryPalette,
        collectionMembershipFilter,
        collections,
        domainFilters,
        groupBy,
        items: filteredItems,
        layoutMode,
        onClearCollectionFilters,
        onCreateCollection: requestCreate,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
        setLayoutMode,
        setPaletteInput,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    useHotkeys(
        "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
        (event) => {
            const digit = Number(event.key);
            if (Number.isNaN(digit)) {
                return;
            }
            const index = digit - 1;

            if (index < commandSuggestions.length) {
                commandSuggestions[index]?.onSelect?.();
                return;
            }

            const paletteIndex = index - commandSuggestions.length;
            const flatItems = visiblePaletteGroups.flatMap((g) => g.items);
            const item = flatItems[paletteIndex];
            if (item) {
                item.onSelect(event);
            }
        },
        {
            enabled: commandListOpen,
            enableOnFormTags: true,
            eventListenerOptions: { capture: true },
            preventDefault: true,
        },
        [commandListOpen, commandSuggestions, visiblePaletteGroups]
    );

    const resultCollectionItemIds = visibleResultItems.map((item) => item.id);

    const handleCreateNote = () => {
        setActionFeedback(null);
        setActiveNote(null);
        setIsNoteDrawerOpen(true);
    };

    const handleCreateResultsDialogOpenChange = (open: boolean) => {
        if (open) {
            setActionFeedback(null);
            setCreateResultsError(null);
            setCreateResultsNameDraft(buildResultsCollectionName(searchTerms));
            setCreateResultsDescriptionDraft("");
            setIsCreateResultsDialogOpen(true);
            return;
        }

        if (!isCreatingResultsCollection) {
            setIsCreateResultsDialogOpen(false);
            setCreateResultsError(null);
        }
    };

    const handleCreateCollectionFromResultsSubmit = () => {
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
            setActionFeedback({
                message: `${result.collection.name} created with ${result.assignedItemIds.length} result${result.assignedItemIds.length === 1 ? "" : "s"}.`,
                tone: "success",
            });
        });
    };

    const handleOpenNote = useStableCallback(
        (item: LibraryItemWithCollections) => {
            setActionFeedback(null);
            setActiveNote(item);
            setIsNoteDrawerOpen(true);
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

            if (result.status === "UPDATED") {
                setActionFeedback(null);
            } else {
                setActionFeedback({
                    message: result.message,
                    tone: "error",
                });
            }
            return result;
        }
    );

    const handleUpdateItemsCollectionsWithFeedback = useStableCallback(
        async (input: {
            itemIds: string[];
            nextSharedCollectionIds: string[];
            previousSharedCollectionIds: string[];
        }): Promise<LibraryItemsCollectionsUpdateResult> => {
            const result = await onUpdateItemsCollections(input);

            if (result.status === "UPDATED") {
                setActionFeedback(null);
            } else {
                setActionFeedback({
                    message: result.message,
                    tone: "error",
                });
            }

            return result;
        }
    );

    const handleSaveNote = async (draft: {
        contentHtml: string;
        contentState: unknown | null;
    }) =>
        await new Promise<boolean>((resolve) => {
            startSavingNoteTransition(async () => {
                const result = await saveLibraryNoteDraft({
                    activeNote,
                    draft,
                });

                if (result.status !== "SUCCESS") {
                    setActionFeedback({
                        message: result.message,
                        tone: "error",
                    });
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
                setActionFeedback({
                    message: activeNote
                        ? "Note saved."
                        : "Note created in your library.",
                    tone: "success",
                });
                if (!hasAccess) {
                    router.refresh();
                }
                resolve(true);
            });
        });

    const handlePasteUrlIntoLibrary = async (url: string) =>
        await new Promise<void>((resolve) => {
            startSavingPastedUrlTransition(async () => {
                setActionFeedback(null);

                const result = await createLibraryBookmarkFromPastedUrl({
                    url,
                });

                if (result.status !== "SUCCESS") {
                    setActionFeedback({
                        message: result.message,
                        tone: "error",
                    });
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

                let message =
                    "Existing bookmark refreshed from the pasted link.";
                if (result.outcome === "CREATED") {
                    message = "Link saved to your library.";
                } else if (result.outcome === "MERGED") {
                    message =
                        "Link matched an existing bookmark in your library.";
                }

                setActionFeedback({
                    message,
                    tone: "success",
                });
                if (!hasAccess) {
                    router.refresh();
                }
                resolve();
            });
        });

    const containerRef = React.useRef<HTMLDivElement>(null);

    return (
        <div
            className="flex w-full max-w-[1024px] items-center gap-12 p-8 2xl:mx-auto"
            ref={containerRef}
        >
            <div
                className="relative z-0 flex w-full flex-col gap-4"
                style={
                    {
                        "--library-section-sticky-top": "8px",
                    } as React.CSSProperties
                }
            >
                <Toolbar.Root className="max-w-xl rounded-t-4xl rounded-b-2xl bg-muted/80">
                    <Command
                        filter={null}
                        filteredItems={visiblePaletteGroups.map((group) => ({
                            items: group.items,
                        }))}
                        items={paletteGroups.map((group) => ({
                            items: group.items,
                        }))}
                        onOpenChange={handleCommandOpenChange}
                        onValueChange={handleCommandInputChange}
                        open={commandListOpen}
                        value={paletteInput}
                    >
                        <CommandPanel ref={commandPanelContainerRef}>
                            <Toolbar.Input
                                render={
                                    <CommandInput
                                        endAddon={
                                            <LibraryPaletteTrailing
                                                entries={buildPaletteStackEntries(
                                                    {
                                                        collectionMembershipFilter,
                                                        collections,
                                                        columnCountMode,
                                                        commandAttachments,
                                                        domainFilters,
                                                        groupBy,
                                                        layoutMode,
                                                        onRemoveCollectionFilter,
                                                        onRemoveCommandAttachment:
                                                            removeCommandAttachment,
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
                                                    }
                                                )}
                                                isCommandInputFocused={
                                                    isCommandInputFocused
                                                }
                                                onAttachFiles={
                                                    handleAttachCommandFiles
                                                }
                                            />
                                        }
                                        onBlur={() =>
                                            setIsCommandInputFocused(false)
                                        }
                                        onFocus={() =>
                                            setIsCommandInputFocused(true)
                                        }
                                        onKeyDown={handlePaletteInputKeyDown}
                                        placeholder={inputPlaceholder}
                                        ref={paletteInputRef}
                                        size="lg"
                                    />
                                }
                            />
                            <AutocompletePopup>
                                <CommandEmpty>
                                    No matching commands found.
                                </CommandEmpty>
                                <CommandList>
                                    {visiblePaletteGroups.map((group) => (
                                        <CommandGroup
                                            items={group.items}
                                            key={group.label}
                                        >
                                            <CommandGroupLabel>
                                                {group.label}
                                            </CommandGroupLabel>
                                            <div
                                                className={
                                                    group.layout ===
                                                    "horizontal"
                                                        ? "flex gap-2 pt-1 pr-2 pb-4"
                                                        : ""
                                                }
                                            >
                                                <CommandCollection>
                                                    {(
                                                        item: CommandPaletteItem
                                                    ) => (
                                                        <CommandItem
                                                            className={
                                                                group.layout ===
                                                                "horizontal"
                                                                    ? "group relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
                                                                    : undefined
                                                            }
                                                            disabled={
                                                                item.disabled
                                                            }
                                                            key={item.value}
                                                            onClick={
                                                                item.onSelect
                                                            }
                                                            value={item.value}
                                                        >
                                                            {item.render ? (
                                                                item.render(
                                                                    item
                                                                )
                                                            ) : (
                                                                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                                    <div className="truncate">
                                                                        {
                                                                            item.label
                                                                        }
                                                                    </div>
                                                                    {item.description ? (
                                                                        <span className="max-w-xs truncate text-muted-foreground/80 text-xs">
                                                                            {
                                                                                item.description
                                                                            }
                                                                        </span>
                                                                    ) : null}
                                                                    {item.active ? (
                                                                        <Badge variant="secondary">
                                                                            Active
                                                                        </Badge>
                                                                    ) : null}
                                                                    {item.shortcut ? (
                                                                        <CommandShortcut>
                                                                            {
                                                                                item.shortcut
                                                                            }
                                                                        </CommandShortcut>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </CommandItem>
                                                    )}
                                                </CommandCollection>
                                            </div>
                                        </CommandGroup>
                                    ))}
                                </CommandList>
                                <CommandFooter>
                                    {canClear ? (
                                        <div className="mr-auto flex items-center gap-1.5">
                                            <span className="font-medium">
                                                Close
                                            </span>
                                            <Kbd>Esc</Kbd>
                                        </div>
                                    ) : null}
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium">
                                            Navigate
                                        </span>
                                        <KbdGroup>
                                            <Kbd>
                                                <ArrowUpIcon />
                                            </Kbd>
                                            <Kbd>
                                                <ArrowDownIcon />
                                            </Kbd>
                                        </KbdGroup>
                                    </div>
                                    <Separator orientation="vertical" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium">
                                            Open Command
                                        </span>
                                        <Kbd>
                                            <CornerDownLeftIcon />
                                        </Kbd>
                                    </div>
                                </CommandFooter>
                            </AutocompletePopup>
                        </CommandPanel>
                    </Command>
                    <Toolbar.Group className="flex items-center gap-2 px-3 py-2">
                        <Toolbar.Button
                            render={
                                <Button
                                    className="rounded-full"
                                    onClick={handleCreateNote}
                                    size="xs"
                                    variant="ghost"
                                >
                                    <SquarePen className="inline-block size-3.5 shrink-0" />
                                    &nbsp;New
                                </Button>
                            }
                        />
                        <Toolbar.Button
                            render={
                                <FeedbackWidget
                                    render={
                                        <Button
                                            className="hidden rounded-full md:flex"
                                            size="xs"
                                            variant="ghost"
                                        />
                                    }
                                >
                                    <Globe className="inline-block size-3.5 shrink-0" />
                                    &nbsp;Feedback
                                    <ChevronDown className="inline-block size-3.5 shrink-0" />
                                </FeedbackWidget>
                            }
                        />
                        <Toolbar.Button
                            render={
                                <Button
                                    className="rounded-full"
                                    onClick={() => {
                                        clearLibraryPalette();
                                    }}
                                    size="xs"
                                    title="Reset browser"
                                    variant="ghost"
                                >
                                    {canClear ? (
                                        <Grid2x2X className="inline-block size-3.5 shrink-0" />
                                    ) : (
                                        <Grid2x2 className="inline-block size-3.5 shrink-0" />
                                    )}
                                    &nbsp;Showing {resultsSummary}
                                    {groupBy === "none" ? null : (
                                        <>
                                            , {sections.length} group
                                            {sections.length === 1 ? "" : "s"}
                                        </>
                                    )}
                                </Button>
                            }
                        />
                        {canCreateCollectionFromResults ? (
                            <Toolbar.Button
                                render={
                                    <Button
                                        className="rounded-full"
                                        onClick={() =>
                                            handleCreateResultsDialogOpenChange(
                                                true
                                            )
                                        }
                                        size="xs"
                                        variant="ghost"
                                    >
                                        <CircleFadingPlus className="inline-block size-4 shrink-0" />
                                        &nbsp;Collection with results
                                    </Button>
                                }
                            />
                        ) : null}
                    </Toolbar.Group>
                </Toolbar.Root>
                {actionFeedback || commandSuggestions.length === 0 ? null : (
                    <div className="relative -mt-1 px-3">
                        <ScrollArea
                            className="max-w-full whitespace-nowrap"
                            scrollFade
                        >
                            <div className="flex w-max flex-nowrap items-center gap-1.5">
                                {commandSuggestions.map((suggestion, index) => (
                                    <React.Fragment key={suggestion.label}>
                                        <Button
                                            className="rounded-full text-muted-foreground"
                                            onClick={suggestion.onSelect}
                                            size="xs"
                                            variant="ghost"
                                        >
                                            {suggestion.icon}
                                            &nbsp;
                                            {suggestion.label}
                                            <Kbd className="bg-transparent px-0 text-[11px] opacity-50">
                                                <CtrlKbd />
                                                {index + 1}
                                            </Kbd>
                                        </Button>
                                        <span className="font-medium text-muted-foreground text-xs last:hidden">
                                            ·
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                            <ScrollBar
                                className="hidden"
                                orientation="horizontal"
                            />
                        </ScrollArea>
                    </div>
                )}
                {actionFeedback ? (
                    <div
                        className={cn(
                            "rounded-xl border px-4 py-2 font-medium text-sm",
                            actionFeedback.tone === "success"
                                ? "border-emerald-500/25 bg-emerald-500/8 text-foreground"
                                : "border-destructive/25 bg-destructive/6 text-foreground"
                        )}
                    >
                        {actionFeedback.message}
                    </div>
                ) : null}
                {isPreviewOnly ? <InlinePaywallBanner /> : null}
                <LibraryResults
                    clearLibraryPalette={clearLibraryPalette}
                    collapsedSectionKeys={collapsedSectionKeySet}
                    collections={collections}
                    columnCount={resolvedColumnCount}
                    enableSectionCollapse={enableSectionCollapse}
                    layoutMode={layoutMode}
                    onCollapseAllSections={collapseAllSections}
                    onCopyLink={handleCopyLink}
                    onDelete={handleRequestDelete}
                    onExpandAllSections={expandAllSections}
                    onOpenInNewTab={handleOpenInNewTab}
                    onOpenNote={handleOpenNote}
                    onSetActionFeedback={setActionFeedback}
                    onToggleSection={toggleSection}
                    onUpdateItemCollections={
                        handleUpdateItemCollectionsWithFeedback
                    }
                    pendingDeleteItemId={pendingDeleteItem?.id ?? null}
                    sections={sections}
                    showEmptyLibraryPeek={showEmptyLibraryPeek}
                    showNoFilteredResults={showNoFilteredResults}
                />
                {showLockedPreview ? (
                    <LockedResults
                        columnCount={resolvedColumnCount}
                        layoutMode={layoutMode}
                        totalItemCount={totalItemCount}
                    />
                ) : null}
            </div>
            <Note.Root
                note={activeNote}
                onOpenChange={setIsNoteDrawerOpen}
                onSave={handleSaveNote}
                onUrlPaste={handlePasteUrlIntoLibrary}
                open={isNoteDrawerOpen}
                saving={isSavingNote || isSavingPastedUrl}
            >
                <Drawer
                    onOpenChange={setIsNoteDrawerOpen}
                    open={isNoteDrawerOpen}
                    position="right"
                    swipeDirection="right"
                >
                    <DrawerViewport
                        portalProps={{
                            container: containerRef,
                        }}
                    >
                        <DrawerPopup className="max-w-2xl" variant="straight">
                            <DrawerHeader
                                allowSelection
                                className="flex-row items-center justify-between"
                            >
                                <DrawerTitle className="sr-only">
                                    <Note.Title />
                                </DrawerTitle>
                                <Note.Header />
                            </DrawerHeader>
                            <DrawerPanel
                                allowSelection
                                className="flex min-h-0 flex-1 flex-col gap-4"
                            >
                                <Note.Editor />
                                <Note.Metrics />
                            </DrawerPanel>
                        </DrawerPopup>
                    </DrawerViewport>
                </Drawer>
            </Note.Root>
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
                                    placeholder="Add description..."
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
                                    handleUpdateItemsCollectionsWithFeedback
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
