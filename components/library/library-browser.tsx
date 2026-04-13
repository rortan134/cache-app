"use client";

import {
    createNote,
    deleteLibraryItem,
    updateNote,
    type DeleteLibraryItemResult,
    type NoteMutationResult,
} from "@/app/[locale]/library/actions";
import {
    ExtensionLibraryEmptyMasonryPeek,
    ExtensionLibraryGrid,
    ExtensionLibrarySection,
} from "@/components/library/library-grid";
import { LibraryNoteDrawer } from "@/components/library/library-note-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientOnlyValue } from "@/components/ui/client-only";
import {
    Command,
    CommandCollection,
    CommandEmpty,
    CommandGroup,
    CommandGroupLabel,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPanel,
    CommandShortcut,
} from "@/components/ui/command";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { UnprivilegedOnly } from "@/components/ui/privilege";
import { InlinePromotionBanner } from "@/components/ui/promotion-banner";
import { Separator } from "@/components/ui/separator";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { useAccess } from "@/hooks/use-access";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { normalizeURL } from "@/lib/url";
import { cn } from "@/lib/utils";
import { LibraryItemSource } from "@/prisma/client/enums";
import { SearchIcon, SparklesIcon, SquarePen, XIcon } from "lucide-react";
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    ReactNode,
} from "react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

/** Base UI combobox close reason when an item is activated (inline mode still emits this). */
const COMBOBOX_ITEM_PRESS_REASON = "item-press";
const ALL_DOMAIN_FILTER = "__all_domains__";
const TEXT_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});
const WWW_PREFIX_RE = /^www\./;
const IS_MAC =
    typeof window !== "undefined" && navigator.userAgent.includes("Mac");
const SEARCH_HOTKEYS = [
    "cmd+k",
    "ctrl+k",
    "Meta+k",
    "cmd+p",
    "ctrl+p",
    "Meta+p",
    "/",
    "cmd+f",
    "ctrl+f",
    "Meta+f",
] as const;
const SEARCH_CANCEL_KEYS = ["esc", "tab"] as const;
const LIBRARY_COMMAND_PANEL_TOP_PX = 12;
const LIBRARY_SECTION_STICKY_GAP_PX = 8;
const FREE_LIBRARY_PREVIEW_ITEMS = 12;
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
    | "caption-asc"
    | "caption-desc"
    | "source"
    | "domain";
type SourceFilterValue = LibraryItemSource;
type ThumbnailFilterValue = "with" | "without";
type CaptionFilterValue = "with" | "without";
type ColumnCountMode = "auto" | "2" | "3" | "4" | "5" | "6";
type PaletteSection = "search" | "filter" | "group" | "sort" | "layout";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const FILTERABLE_LIBRARY_SOURCES = [
    LibraryItemSource.cache_note,
    LibraryItemSource.chrome_bookmarks,
    LibraryItemSource.google_photos,
    LibraryItemSource.instagram,
    LibraryItemSource.pinterest,
    LibraryItemSource.tiktok,
    LibraryItemSource.x_bookmarks,
    LibraryItemSource.youtube_watch_later,
] as const satisfies readonly LibraryItemSource[];

const getSystemControlKey = () => (IS_MAC ? "⌘" : "Ctrl");

interface CommandPaletteItem {
    readonly active?: boolean;
    readonly description?: string;
    readonly label: string;
    readonly onSelect: () => void | Promise<void>;
    readonly shortcut?: string;
    readonly value: string;
}

interface CommandPaletteGroup {
    readonly items: CommandPaletteItem[];
    readonly label: string;
}

interface LibraryBrowserSection {
    readonly items: LibraryItemWithCollections[];
    readonly key: string;
    readonly paywallPreviewCount?: number;
    readonly showPaywallBanner?: boolean;
    readonly title: string | null;
}

interface SectionCollapseState {
    readonly collapseAllSections: () => void;
    readonly collapsedSectionKeys: string[];
    readonly enableSectionCollapse: boolean;
    readonly expandAllSections: () => void;
    readonly layoutRefreshToken: number;
    readonly toggleSection: (key: string) => void;
}

function itemDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(WWW_PREFIX_RE, "") || "Other";
    } catch {
        return "Other";
    }
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
        return (
            item.noteContentText?.trim() ||
            item.caption?.trim() ||
            "Untitled note"
        );
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
            TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "added-oldest") {
        return (
            itemTimestamp(a, "added") - itemTimestamp(b, "added") ||
            TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-newest") {
        return (
            itemTimestamp(b, "created") - itemTimestamp(a, "created") ||
            TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-oldest") {
        return (
            itemTimestamp(a, "created") - itemTimestamp(b, "created") ||
            TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "caption-asc") {
        return (
            TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b)) ||
            itemTimestamp(b, "added") - itemTimestamp(a, "added")
        );
    }
    if (sortMode === "caption-desc") {
        return (
            TEXT_COLLATOR.compare(itemPrimaryText(b), itemPrimaryText(a)) ||
            itemTimestamp(b, "added") - itemTimestamp(a, "added")
        );
    }
    if (sortMode === "source") {
        return (
            TEXT_COLLATOR.compare(
                sourceLabel(a.source),
                sourceLabel(b.source)
            ) || TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    return (
        TEXT_COLLATOR.compare(itemDomain(a.url), itemDomain(b.url)) ||
        TEXT_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
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
        return TEXT_COLLATOR.compare(
            formatGroupHeading(groupBy, a),
            formatGroupHeading(groupBy, b)
        );
    }
    return TEXT_COLLATOR.compare(a, b);
}

function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

function appendUniqueSearchTerm(
    values: readonly string[],
    next: string
): string[] {
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

function matchesCommandPaletteItem(item: unknown, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    if (!item || typeof item !== "object") {
        return false;
    }

    const candidate = item as Partial<CommandPaletteItem>;

    return [candidate.label, candidate.description, candidate.value].some(
        (field) => field?.toLowerCase().includes(normalizedQuery)
    );
}

function removeValue<T>(values: readonly T[], value: T): T[] {
    return values.filter((entry) => entry !== value);
}

function toggleValue<T>(values: readonly T[], next: T): T[] {
    return values.includes(next)
        ? values.filter((entry) => entry !== next)
        : [...values, next];
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

function isSearchCancelKey(
    event: ReactKeyboardEvent<HTMLInputElement>
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
    if (mode === "caption-asc") {
        return "Caption A-Z";
    }
    if (mode === "caption-desc") {
        return "Caption Z-A";
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

function thumbnailFilterLabel(filter: ThumbnailFilterValue): string {
    if (filter === "with") {
        return "With preview";
    }
    return "Without preview";
}

function captionFilterLabel(filter: CaptionFilterValue): string {
    if (filter === "with") {
        return "With caption";
    }
    return "Without caption";
}

function columnCountLabel(mode: ColumnCountMode): string {
    return mode === "auto" ? "Auto columns" : `${mode} columns`;
}

function PaletteChip({
    label,
    onRemove,
}: {
    readonly label: string;
    readonly onRemove: () => void;
}) {
    return (
        <span className="palette-chip-enter inline-flex max-w-[min(100%,12rem)] items-center gap-0.5 rounded-full border border-border/60 bg-background/90 py-0.5 ps-2 pe-0.5 font-medium text-foreground text-xs shadow-xs/5 dark:bg-background/40">
            <span className="min-w-0 truncate">{label}</span>
            <button
                aria-label={`Remove ${label}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-muted/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                }}
                type="button"
            >
                <XIcon className="size-3.5 shrink-0" />
            </button>
        </span>
    );
}

function renderLibraryGridBody({
    collapsedSectionKeys,
    collections,
    clearLibraryPalette,
    columnCount,
    enableSectionCollapse,
    layoutRefreshToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggleSection,
    paywallTotalCount,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: {
    readonly collapsedSectionKeys: ReadonlySet<string>;
    readonly collections: readonly LibraryCollectionSummary[];
    readonly clearLibraryPalette: () => void;
    readonly columnCount?: number;
    readonly enableSectionCollapse: boolean;
    readonly layoutRefreshToken: number;
    readonly onCopyLink: (item: LibraryItem) => void;
    readonly onDelete: (item: LibraryItem) => void;
    readonly onOpenNote: (item: LibraryItem) => void;
    readonly onOpenHere: (item: LibraryItem) => void;
    readonly onOpenInNewTab: (item: LibraryItem) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => void;
    readonly onToggleSection: (key: string) => void;
    readonly paywallTotalCount?: number;
    readonly pendingCollectionItemIds: readonly string[];
    readonly pendingDeleteItemId: string | null;
    readonly sections: readonly LibraryBrowserSection[];
    readonly showEmptyLibraryPeek: boolean;
    readonly showNoFilteredResults: boolean;
}): ReactNode {
    if (showEmptyLibraryPeek) {
        return <ExtensionLibraryEmptyMasonryPeek />;
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
            <ExtensionLibrarySection
                accentKey={section.key}
                collapsed={collapsedSectionKeys.has(section.key)}
                collapsible
                collections={collections}
                columnCount={columnCount}
                emptyHint="No saved items in this section."
                items={section.items}
                key={section.key}
                layoutToken={layoutRefreshToken}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onOpenHere={onOpenHere}
                onOpenInNewTab={onOpenInNewTab}
                onOpenNote={onOpenNote}
                onToggle={() => onToggleSection(section.key)}
                onUpdateItemCollections={onUpdateItemCollections}
                paywallPreviewCount={section.paywallPreviewCount}
                paywallTotalCount={paywallTotalCount}
                pendingCollectionItemIds={pendingCollectionItemIds}
                pendingDeleteItemId={pendingDeleteItemId}
                showPaywallBanner={section.showPaywallBanner}
                title={section.title ?? "Results"}
            />
        ) : (
            <section className="flex w-full flex-col gap-3" key={section.key}>
                {section.title ? (
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-foreground text-sm">
                            {section.title}
                        </h2>
                        <span className="text-muted-foreground text-xs tabular-nums">
                            {section.items.length} item
                            {section.items.length === 1 ? "" : "s"}
                        </span>
                    </div>
                ) : null}
                <ExtensionLibraryGrid
                    collections={collections}
                    columnCount={columnCount}
                    items={section.items}
                    layoutToken={layoutRefreshToken}
                    onCopyLink={onCopyLink}
                    onDelete={onDelete}
                    onOpenHere={onOpenHere}
                    onOpenInNewTab={onOpenInNewTab}
                    onOpenNote={onOpenNote}
                    onUpdateItemCollections={onUpdateItemCollections}
                    paywallPreviewCount={section.paywallPreviewCount}
                    paywallTotalCount={paywallTotalCount}
                    pendingCollectionItemIds={pendingCollectionItemIds}
                    pendingDeleteItemId={pendingDeleteItemId}
                    showPaywallBanner={section.showPaywallBanner}
                />
            </section>
        )
    );
}

function buildSearchPaletteGroups({
    clearLibraryPalette,
    draft,
    hasAnyRefinements,
    locale,
    navigationItems,
    searchTerms,
    setCommandListOpen,
    setPaletteInput,
    setSearchTerms,
}: {
    readonly clearLibraryPalette: () => void;
    readonly draft: string;
    readonly hasAnyRefinements: boolean;
    readonly locale: string;
    readonly navigationItems: CommandPaletteItem[];
    readonly searchTerms: string[];
    readonly setCommandListOpen: (value: boolean) => void;
    readonly setPaletteInput: (value: string) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
}): CommandPaletteGroup[] {
    const groups: CommandPaletteGroup[] = [];
    const draftAlreadyIncluded = searchTerms.some(
        (term) => term.toLowerCase() === draft.toLowerCase()
    );

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

    groups.push({
        items: [
            {
                description: "Get in touch with the team",
                label: "Contact support",
                onSelect: () => {
                    window.location.href = "mailto:support@cache.inc";
                },
                shortcut: "?",
                value: "help support",
            },
            {
                description: "Tell us what you think",
                label: "Send feedback",
                onSelect: () => {
                    // Try to trigger the FeedbackWidget toggle if possible,
                    // otherwise fall back to mailto.
                    window.location.href = "mailto:feedback@cache.inc";
                },
                shortcut: "F",
                value: "help feedback",
            },
        ],
        label: "Help",
    });

    groups.push({
        items: [
            {
                description: "End your session securely",
                label: "Log out",
                onSelect: () => {
                    window.location.assign(`/${locale}/logout`);
                },
                shortcut: "⇧L",
                value: "account logout",
            },
        ],
        label: "Account",
    });

    return groups;
}

function useSectionCollapseState({
    groupBy,
    hasActiveFilters,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: {
    readonly groupBy: GroupByMode;
    readonly hasActiveFilters: boolean;
    readonly sections: readonly LibraryBrowserSection[];
    readonly showEmptyLibraryPeek: boolean;
    readonly showNoFilteredResults: boolean;
}): SectionCollapseState {
    const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<string[]>(
        []
    );
    const [layoutRefreshToken, setLayoutRefreshToken] = useState(0);

    const enableSectionCollapse =
        !(showEmptyLibraryPeek || showNoFilteredResults) &&
        (hasActiveFilters || groupBy !== "none");

    useEffect(() => {
        const validKeys = new Set(sections.map((section) => section.key));
        setCollapsedSectionKeys((current) => {
            const next = current.filter((key) => validKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [sections]);

    useEffect(() => {
        if (!enableSectionCollapse) {
            setCollapsedSectionKeys((current) =>
                current.length === 0 ? current : []
            );
        }
    }, [enableSectionCollapse]);

    const toggleSection = useCallback((key: string) => {
        setCollapsedSectionKeys((current) =>
            current.includes(key)
                ? current.filter((entry) => entry !== key)
                : [...current, key]
        );
        setLayoutRefreshToken((current) => current + 1);
    }, []);

    const collapseAllSections = useCallback(() => {
        setCollapsedSectionKeys(sections.map((section) => section.key));
        setLayoutRefreshToken((current) => current + 1);
    }, [sections]);

    const expandAllSections = useCallback(() => {
        setCollapsedSectionKeys([]);
        setLayoutRefreshToken((current) => current + 1);
    }, []);

    return {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        layoutRefreshToken,
        toggleSection,
    };
}

function LibraryPaletteTrailing({
    captionFilters,
    clearLibraryPalette,
    columnCountMode,
    domainFilters,
    groupBy,
    hasActiveSearchFilterGroupOrSort,
    isPaletteFocused,
    paletteInput,
    searchTerms,
    setCaptionFilters,
    setColumnCountMode,
    setDomainFilters,
    setGroupBy,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    setThumbFilters,
    sortMode,
    sourceFilters,
    thumbFilters,
}: {
    readonly captionFilters: CaptionFilterValue[];
    readonly clearLibraryPalette: () => void;
    readonly columnCountMode: ColumnCountMode;
    readonly domainFilters: string[];
    readonly groupBy: GroupByMode;
    readonly hasActiveSearchFilterGroupOrSort: boolean;
    readonly isPaletteFocused: boolean;
    readonly paletteInput: string;
    readonly searchTerms: string[];
    readonly setCaptionFilters: (
        value:
            | CaptionFilterValue[]
            | ((value: CaptionFilterValue[]) => CaptionFilterValue[])
    ) => void;
    readonly setColumnCountMode: (value: ColumnCountMode) => void;
    readonly setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    readonly setGroupBy: (value: GroupByMode) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    readonly setSortMode: (value: SortMode) => void;
    readonly setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    readonly setThumbFilters: (
        value:
            | ThumbnailFilterValue[]
            | ((value: ThumbnailFilterValue[]) => ThumbnailFilterValue[])
    ) => void;
    readonly sortMode: SortMode;
    readonly sourceFilters: SourceFilterValue[];
    readonly thumbFilters: ThumbnailFilterValue[];
}) {
    const chips: ReactNode[] = [];
    for (const term of searchTerms) {
        chips.push(
            <PaletteChip
                key={`search-${term}`}
                label={`Search: ${truncateLabel(term)}`}
                onRemove={() =>
                    setSearchTerms((current) => removeValue(current, term))
                }
            />
        );
    }

    for (const source of sourceFilters) {
        chips.push(
            <PaletteChip
                key={`source-${source}`}
                label={`Source: ${sourceLabel(source)}`}
                onRemove={() =>
                    setSourceFilters((current) => removeValue(current, source))
                }
            />
        );
    }

    for (const thumbFilter of thumbFilters) {
        chips.push(
            <PaletteChip
                key={`thumb-${thumbFilter}`}
                label={thumbnailFilterLabel(thumbFilter)}
                onRemove={() =>
                    setThumbFilters((current) =>
                        removeValue(current, thumbFilter)
                    )
                }
            />
        );
    }

    for (const captionFilter of captionFilters) {
        chips.push(
            <PaletteChip
                key={`caption-${captionFilter}`}
                label={captionFilterLabel(captionFilter)}
                onRemove={() =>
                    setCaptionFilters((current) =>
                        removeValue(current, captionFilter)
                    )
                }
            />
        );
    }

    for (const domainFilter of domainFilters) {
        chips.push(
            <PaletteChip
                key={`domain-${domainFilter}`}
                label={`Domain: ${truncateLabel(domainFilter)}`}
                onRemove={() =>
                    setDomainFilters((current) =>
                        removeValue(current, domainFilter)
                    )
                }
            />
        );
    }

    if (groupBy !== "none") {
        chips.push(
            <PaletteChip
                key="group"
                label={`Group: ${groupByLabel(groupBy)}`}
                onRemove={() => setGroupBy("none")}
            />
        );
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
        chips.push(
            <PaletteChip
                key="sort"
                label={`Sort: ${sortModeLabel(sortMode)}`}
                onRemove={() => setSortMode(DEFAULT_SORT_MODE)}
            />
        );
    }

    if (columnCountMode !== DEFAULT_COLUMN_COUNT_MODE) {
        chips.push(
            <PaletteChip
                key="columns"
                label={`Layout: ${columnCountLabel(columnCountMode)}`}
                onRemove={() => setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE)}
            />
        );
    }

    const canReset = chips.length > 0 || paletteInput.trim().length > 0;

    const systemControlKey = useClientOnlyValue(getSystemControlKey());

    return (
        <>
            <TruncateAfter after={2}>{chips}</TruncateAfter>
            {isPaletteFocused || hasActiveSearchFilterGroupOrSort ? null : (
                <KbdGroup>
                    <Kbd>{systemControlKey}</Kbd>
                    <Kbd>K</Kbd>
                </KbdGroup>
            )}
            {canReset ? (
                <Button
                    aria-label="Clear search, filters, grouping, sorting, layout, and command input"
                    className="size-8 shrink-0 rounded-full text-muted-foreground sm:size-7"
                    onClick={clearLibraryPalette}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                >
                    <XIcon className="size-4 opacity-80 sm:size-3.5" />
                </Button>
            ) : null}
        </>
    );
}

interface Props {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly items: LibraryItemWithCollections[];
    readonly locale: string;
    readonly onClearCollectionFilters: () => void;
    readonly onItemsChange: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => void;
    readonly pendingCollectionItemIds: readonly string[];
    readonly selectedCollectionIds: readonly string[];
}

interface LibraryActionFeedback {
    readonly message: string;
    readonly tone: "error" | "success";
}

interface UseLibraryItemActionsResult {
    readonly actionFeedback: LibraryActionFeedback | null;
    readonly handleConfirmDelete: () => void;
    readonly handleCopyLink: (item: LibraryItem) => void;
    readonly handleDeleteDialogOpenChange: (open: boolean) => void;
    readonly handleOpenHere: (item: LibraryItem) => void;
    readonly handleOpenInNewTab: (item: LibraryItem) => void;
    readonly handleRequestDelete: (item: LibraryItem) => void;
    readonly isDeletePending: boolean;
    readonly pendingDeleteItem: LibraryItem | null;
    readonly setActionFeedback: (
        value:
            | LibraryActionFeedback
            | null
            | ((
                  current: LibraryActionFeedback | null
              ) => LibraryActionFeedback | null)
    ) => void;
}

function openSavedItemInNewTab(url: string) {
    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to a regular browser tab when the desktop bridge is unavailable.
    }

    window.open(url, "_blank", "noopener,noreferrer");
}

function useLibraryItemActions(
    setVisibleItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void
): UseLibraryItemActionsResult {
    const [pendingDeleteItem, setPendingDeleteItem] =
        useState<LibraryItem | null>(null);
    const [actionFeedback, setActionFeedback] =
        useState<LibraryActionFeedback | null>(null);
    const [isDeletePending, startDeleteTransition] = useTransition();
    const { copyToClipboard } = useCopyToClipboard({
        onCopy: () => {
            setActionFeedback({
                message: "Saved link copied to the clipboard.",
                tone: "success",
            });
        },
    });

    const handleOpenInNewTab = useCallback((item: LibraryItem) => {
        setActionFeedback(null);
        openSavedItemInNewTab(normalizeURL(item.url));
    }, []);

    const handleOpenHere = useCallback((item: LibraryItem) => {
        setActionFeedback(null);
        window.location.assign(normalizeURL(item.url));
    }, []);

    const handleCopyLink = useCallback(
        (item: LibraryItem) => {
            copyToClipboard(normalizeURL(item.url));
        },
        [copyToClipboard]
    );

    const handleRequestDelete = useCallback((item: LibraryItem) => {
        setActionFeedback(null);
        setPendingDeleteItem(item);
    }, []);

    const handleDeleteDialogOpenChange = useCallback(
        (open: boolean) => {
            if (!(open || isDeletePending)) {
                setPendingDeleteItem(null);
            }
        },
        [isDeletePending]
    );

    const handleConfirmDelete = useCallback(() => {
        const targetItem = pendingDeleteItem;
        if (!targetItem) {
            return;
        }

        startDeleteTransition(async () => {
            let result: DeleteLibraryItemResult;

            try {
                result = await deleteLibraryItem(targetItem.id);
            } catch {
                result = {
                    message: "We couldn't delete this saved item right now.",
                    status: "ERROR",
                };
            }

            if (result.status === "DELETED") {
                setVisibleItems((current) =>
                    current.filter((item) => item.id !== result.itemId)
                );
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
    }, [pendingDeleteItem, setVisibleItems]);

    return {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenHere,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this client entry intentionally coordinates search, filters, grouping, layout, and item actions together.
export function LibraryBrowser({
    collections,
    items,
    locale,
    onClearCollectionFilters,
    onItemsChange,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    selectedCollectionIds,
}: Props) {
    const { hasAccess, isLoading: isAccessLoading } = useAccess();
    const systemControlKey = useClientOnlyValue(getSystemControlKey());
    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [paletteInput, setPaletteInput] = useState("");
    const [sourceFilters, setSourceFilters] = useState<SourceFilterValue[]>([]);
    const [thumbFilters, setThumbFilters] = useState<ThumbnailFilterValue[]>(
        []
    );
    const [captionFilters, setCaptionFilters] = useState<CaptionFilterValue[]>(
        []
    );
    const [domainFilters, setDomainFilters] = useState<string[]>([]);
    const [groupBy, setGroupBy] = useState<GroupByMode>("none");
    const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
    const [columnCountMode, setColumnCountMode] = useState<ColumnCountMode>(
        DEFAULT_COLUMN_COUNT_MODE
    );
    const [paletteSection, setPaletteSection] =
        useState<PaletteSection>("search");
    const [activeNote, setActiveNote] =
        useState<LibraryItemWithCollections | null>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
    const [commandListOpen, setCommandListOpen] = useState(false);
    const [isPaletteFocused, setIsPaletteFocused] = useState(false);
    const [commandPanelShellHeight, setCommandPanelShellHeight] = useState(0);
    const commandPanelContainerRef = useRef<HTMLDivElement>(null);
    const paletteInputRef = useRef<HTMLInputElement>(null);
    /** Skips one combobox-driven close right after entering a drill-down section. */
    const suppressNextCommandCloseRef = useRef(false);
    const {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenHere,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    } = useLibraryItemActions(onItemsChange);
    const [isSavingNote, startSavingNoteTransition] = useTransition();

    const sourceOptions = useMemo(
        () => [
            { label: "All sources", value: "all" },
            ...FILTERABLE_LIBRARY_SOURCES.map((source) => ({
                label: sourceLabel(source),
                value: source,
            })),
            { label: sourceLabel(LibraryItemSource.other), value: "other" },
        ],
        []
    );

    const captionOptions = useMemo(
        () => [
            { label: "Any caption", value: "any" },
            { label: "With caption", value: "with" },
            { label: "Without caption", value: "without" },
        ],
        []
    );

    const sortOptions = useMemo(
        () => [
            { label: "Added: Newest first", value: "added-newest" },
            { label: "Added: Oldest first", value: "added-oldest" },
            { label: "Created: Newest first", value: "created-newest" },
            { label: "Created: Oldest first", value: "created-oldest" },
            { label: "Count: Most items first", value: "count-desc" },
            { label: "Caption A-Z", value: "caption-asc" },
            { label: "Caption Z-A", value: "caption-desc" },
            { label: "Source", value: "source" },
            { label: "Domain", value: "domain" },
        ],
        []
    );

    const groupOptions = useMemo(
        () => [
            { label: "No grouping", value: "none" },
            { label: "Source", value: "source" },
            { label: "Domain", value: "domain" },
            { label: "Month Added", value: "month-added" },
            { label: "Month Created", value: "month-created" },
        ],
        []
    );

    const columnOptions = useMemo(
        () => [
            { label: "Auto columns", value: "auto" },
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
            { label: "5 columns", value: "5" },
            { label: "6 columns", value: "6" },
        ],
        []
    );

    const domainOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const item of items) {
            const domain = itemDomain(item.url);
            counts.set(domain, (counts.get(domain) ?? 0) + 1);
        }

        const dynamicDomains = Array.from(counts.entries())
            .sort(
                ([aDomain, aCount], [bDomain, bCount]) =>
                    bCount - aCount || TEXT_COLLATOR.compare(aDomain, bDomain)
            )
            .map(([domain, count]) => ({
                label: `${domain} (${count})`,
                value: domain,
            }));

        return [
            { label: "All domains", value: ALL_DOMAIN_FILTER },
            ...dynamicDomains,
        ];
    }, [items]);

    const focusPaletteInput = useCallback((select = false) => {
        setCommandListOpen(true);
        queueMicrotask(() => {
            paletteInputRef.current?.focus();
            if (select) {
                paletteInputRef.current?.select();
            }
        });
    }, []);

    const handleCommandOpenChange = useCallback(
        (nextOpen: boolean, eventDetails?: { readonly reason?: string }) => {
            setCommandListOpen(() => {
                if (!nextOpen && suppressNextCommandCloseRef.current) {
                    suppressNextCommandCloseRef.current = false;
                    return true;
                }

                if (!nextOpen) {
                    const shell = commandPanelContainerRef.current;
                    const active = document.activeElement;
                    const focusInsidePalette =
                        shell &&
                        active instanceof Node &&
                        shell.contains(active);
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
        },
        []
    );

    const handlePaletteShellPointerDownCapture = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (!target.closest("[data-library-command-field]")) {
                return;
            }
            if (target.closest("[data-library-palette-trailing]")) {
                return;
            }
            setCommandListOpen(true);
        },
        []
    );

    useLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }

        const handleFocusIn = (event: globalThis.FocusEvent) => {
            setIsPaletteFocused(true);
            if (event.target instanceof HTMLInputElement) {
                setCommandListOpen(true);
            }
        };

        const handleFocusOut = (event: globalThis.FocusEvent) => {
            const { relatedTarget } = event;
            if (relatedTarget instanceof Node && el.contains(relatedTarget)) {
                return;
            }
            const closeIfLeft = () => {
                if (!el.contains(document.activeElement)) {
                    setIsPaletteFocused(false);
                    setCommandListOpen(false);
                }
            };
            queueMicrotask(closeIfLeft);
            window.setTimeout(closeIfLeft, 0);
        };

        el.addEventListener("focusin", handleFocusIn);
        el.addEventListener("focusout", handleFocusOut);
        return () => {
            el.removeEventListener("focusin", handleFocusIn);
            el.removeEventListener("focusout", handleFocusOut);
        };
    }, []);

    useLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }

        const updateHeight = () => {
            const nextHeight = Math.ceil(el.getBoundingClientRect().height);
            setCommandPanelShellHeight((current) =>
                current === nextHeight ? current : nextHeight
            );
        };

        updateHeight();

        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(el);
        window.addEventListener("resize", updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    useEffect(() => {
        const handleWindowKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            const isEditable =
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    Boolean(
                        target.closest(
                            'input, textarea, select, button, [role="textbox"]'
                        )
                    ));

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
                !isEditable
            ) {
                event.preventDefault();
                focusPaletteInput();
            }
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, [focusPaletteInput]);

    const returnToSearchSection = useCallback(() => {
        setPaletteSection("search");
        setPaletteInput("");
        setCommandListOpen(true);
    }, []);

    const openPaletteSection = useCallback(
        (section: Exclude<PaletteSection, "search">) => {
            suppressNextCommandCloseRef.current = true;
            setPaletteSection(section);
            setPaletteInput("");
            focusPaletteInput();
        },
        [focusPaletteInput]
    );

    const handlePaletteInputChange = useCallback((next: string) => {
        setPaletteInput(next);
        setCommandListOpen(true);
    }, []);

    const clearLibraryPalette = useCallback(() => {
        setPaletteInput("");
        setSearchTerms([]);
        setSourceFilters([]);
        setThumbFilters([]);
        setCaptionFilters([]);
        setDomainFilters([]);
        onClearCollectionFilters();
        setGroupBy("none");
        setSortMode(DEFAULT_SORT_MODE);
        setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        setPaletteSection("search");
        setCommandListOpen(false);
    }, [onClearCollectionFilters]);

    const handlePaletteInputKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLInputElement>) => {
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

            if (
                event.key === "Backspace" &&
                paletteSection !== "search" &&
                paletteInput.trim() === ""
            ) {
                event.preventDefault();
                returnToSearchSection();
                return;
            }

            if (event.key === "ArrowDown" && !commandListOpen) {
                setCommandListOpen(true);
            }
        },
        [commandListOpen, paletteInput, paletteSection, returnToSearchSection]
    );

    const paletteGroups = useMemo<CommandPaletteGroup[]>(() => {
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
                description: "Source, preview, caption, and domain filters",
                label: "Filter by…",
                onSelect: () => openPaletteSection("filter"),
                shortcut: "F",
                value: "navigate filters",
            },
            {
                description: `Current: ${groupByLabel(groupBy)}`,
                label: "Group by…",
                onSelect: () => openPaletteSection("group"),
                shortcut: "G",
                value: "navigate grouping",
            },
            {
                description: `Current: ${sortModeLabel(sortMode)}`,
                label: "Sort by…",
                onSelect: () => openPaletteSection("sort"),
                shortcut: "S",
                value: "navigate sorting",
            },
            {
                description: `Current: ${columnCountLabel(columnCountMode)}`,
                label: "Layout…",
                onSelect: () => openPaletteSection("layout"),
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
            thumbFilters.length > 0 ||
            captionFilters.length > 0 ||
            domainFilters.length > 0 ||
            groupBy !== "none" ||
            sortMode !== DEFAULT_SORT_MODE ||
            columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

        if (paletteSection === "search") {
            return buildSearchPaletteGroups({
                clearLibraryPalette,
                draft,
                hasAnyRefinements,
                locale,
                navigationItems,
                searchTerms,
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
                    ...sourceOptions
                        .filter((option) => option.value !== "all")
                        .map((option) => ({
                            active: sourceFilters.includes(
                                option.value as SourceFilterValue
                            ),
                            description:
                                "Toggle this source in the filter stack",
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
                    {
                        active: thumbFilters.length === 0,
                        description: "Allow items with or without previews",
                        label: "Preview: Any preview",
                        onSelect: applyAndStay(() => setThumbFilters([])),
                        value: "filter preview any",
                    },
                    {
                        active: captionFilters.length === 0,
                        description: "Allow items with or without captions",
                        label: "Caption: Any caption",
                        onSelect: applyAndStay(() => setCaptionFilters([])),
                        value: "filter caption any",
                    },
                    ...captionOptions
                        .filter((option) => option.value !== "any")
                        .map((option) => ({
                            active: captionFilters.includes(
                                option.value as CaptionFilterValue
                            ),
                            description:
                                "Toggle this caption condition in the stack",
                            label: `Caption: ${option.label}`,
                            onSelect: applyAndStay(() =>
                                setCaptionFilters((current) =>
                                    toggleValue(
                                        current,
                                        option.value as CaptionFilterValue
                                    )
                                )
                            ),
                            value: `filter caption ${option.value}`,
                        })),
                ],
                label: "Conditions",
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
                    items: groupOptions.map((option) => ({
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
                    items: sortOptions.map((option) => ({
                        active: sortMode === option.value,
                        description:
                            "Change the ordering within the current view",
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
            {
                items: columnOptions.map((option) => ({
                    active: columnCountMode === option.value,
                    description:
                        option.value === "auto"
                            ? "Let the masonry adapt to the available width"
                            : "Force a specific number of columns",
                    label: option.label,
                    onSelect: applyAndReturn(() =>
                        setColumnCountMode(option.value as ColumnCountMode)
                    ),
                    value: `columns ${option.value}`,
                })),
                label: "Layout",
            },
        ];
    }, [
        clearLibraryPalette,
        columnCountMode,
        columnOptions,
        domainFilters,
        domainOptions,
        groupBy,
        groupOptions,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        sortMode,
        sortOptions,
        sourceFilters,
        sourceOptions,
        thumbFilters,
        captionFilters,
        captionOptions,
        locale,
        selectedCollectionIds.length,
    ]);

    const visiblePaletteGroups = useMemo(() => {
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
                if (globalIndex <= 9) {
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
    }, [paletteGroups, paletteInput, systemControlKey]);

    useHotkeys(
        "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
        (event) => {
            const digit = Number(event.key);
            if (Number.isNaN(digit)) {
                return;
            }
            const index = digit - 1;
            const flatItems = visiblePaletteGroups.flatMap((g) => g.items);
            const item = flatItems[index];
            if (item) {
                item.onSelect();
            }
        },
        {
            enabled: commandListOpen,
            enableOnFormTags: true,
            preventDefault: true,
        },
        [visiblePaletteGroups, commandListOpen]
    );

    let inputPlaceholder = "Change the layout…";
    if (paletteSection === "search") {
        inputPlaceholder = "Search, filter, group, sort, and more…";
    } else if (paletteSection === "filter") {
        inputPlaceholder = "Filter the library…";
    } else if (paletteSection === "group") {
        inputPlaceholder = "Group results…";
    } else if (paletteSection === "sort") {
        inputPlaceholder = "Sort results…";
    }

    const filteredItems = useMemo(() => {
        let list = items;
        const normalizedSearchTerms = searchTerms.map((term) =>
            term.trim().toLowerCase()
        );

        if (selectedCollectionIds.length > 0) {
            list = list.filter((item) =>
                item.collections.some((collection) =>
                    selectedCollectionIds.includes(collection.id)
                )
            );
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

        if (sourceFilters.length > 0) {
            list = list.filter((item) => sourceFilters.includes(item.source));
        }

        if (thumbFilters.length === 1) {
            list = list.filter((item) =>
                thumbFilters[0] === "with"
                    ? Boolean(item.thumbnailUrl)
                    : !item.thumbnailUrl
            );
        }

        if (captionFilters.length === 1) {
            list = list.filter((item) =>
                captionFilters[0] === "with"
                    ? Boolean(item.caption?.trim())
                    : !item.caption?.trim()
            );
        }

        if (domainFilters.length > 0) {
            list = list.filter((item) =>
                domainFilters.includes(itemDomain(item.url))
            );
        }

        return list;
    }, [
        captionFilters,
        domainFilters,
        searchTerms,
        sourceFilters,
        thumbFilters,
        items,
        selectedCollectionIds,
    ]);

    const sortedItems = useMemo(() => {
        const itemSortMode =
            sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
        return [...filteredItems].sort((a, b) =>
            compareItems(a, b, itemSortMode)
        );
    }, [filteredItems, sortMode]);

    const sections = useMemo(() => {
        if (groupBy === "none") {
            return [
                {
                    items: sortedItems,
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
    }, [groupBy, sortMode, sortedItems]);
    const shouldGateResults =
        !(isAccessLoading || hasAccess) &&
        filteredItems.length > FREE_LIBRARY_PREVIEW_ITEMS;
    const gatedSections = useMemo(() => {
        if (!shouldGateResults) {
            return sections;
        }

        let remainingPreviewItems = FREE_LIBRARY_PREVIEW_ITEMS;
        let shouldShowPaywallBanner = true;

        return sections.map((section) => {
            const paywallPreviewCount = Math.min(
                section.items.length,
                remainingPreviewItems
            );
            const hasLockedItems = paywallPreviewCount < section.items.length;

            remainingPreviewItems = Math.max(
                0,
                remainingPreviewItems - paywallPreviewCount
            );

            if (hasLockedItems && shouldShowPaywallBanner) {
                shouldShowPaywallBanner = false;

                return {
                    ...section,
                    paywallPreviewCount,
                    showPaywallBanner: true,
                };
            }

            return {
                ...section,
                paywallPreviewCount,
            };
        });
    }, [sections, shouldGateResults]);

    const hasActiveFilters = useMemo(
        () =>
            searchTerms.length > 0 ||
            selectedCollectionIds.length > 0 ||
            sourceFilters.length > 0 ||
            thumbFilters.length > 0 ||
            captionFilters.length > 0 ||
            domainFilters.length > 0,
        [
            captionFilters,
            domainFilters,
            selectedCollectionIds,
            searchTerms,
            sourceFilters,
            thumbFilters,
        ]
    );

    const hasNonDefaultView =
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

    const showEmptyLibraryPeek =
        items.length === 0 && filteredItems.length === 0 && !hasActiveFilters;

    const showNoFilteredResults =
        filteredItems.length === 0 && !showEmptyLibraryPeek;

    const {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        layoutRefreshToken,
        toggleSection,
    } = useSectionCollapseState({
        groupBy,
        hasActiveFilters,
        sections: gatedSections,
        showEmptyLibraryPeek,
        showNoFilteredResults,
    });

    const resolvedColumnCount =
        columnCountMode === "auto" ? undefined : Number(columnCountMode);

    const resultsSummary =
        filteredItems.length === items.length
            ? `${items.length} item${items.length === 1 ? "" : "s"}`
            : `${filteredItems.length} of ${items.length} items`;

    const handleCreateNote = useCallback(() => {
        setActionFeedback(null);
        setActiveNote(null);
        setIsNoteDrawerOpen(true);
    }, [setActionFeedback]);

    const handleOpenNote = useCallback(
        (item: LibraryItemWithCollections) => {
            setActionFeedback(null);
            setActiveNote(item);
            setIsNoteDrawerOpen(true);
        },
        [setActionFeedback]
    );

    const handleSaveNote = useCallback(
        (draft: { contentHtml: string; title: string }) => {
            startSavingNoteTransition(async () => {
                let result: NoteMutationResult;

                try {
                    result = activeNote
                        ? await updateNote({
                              contentHtml: draft.contentHtml,
                              itemId: activeNote.id,
                              title: draft.title,
                          })
                        : await createNote({
                              contentHtml: draft.contentHtml,
                              title: draft.title,
                          });
                } catch {
                    result = {
                        message: activeNote
                            ? "We couldn't save this note right now."
                            : "We couldn't create this note right now.",
                        status: "ERROR",
                    };
                }

                if (result.status !== "SUCCESS") {
                    setActionFeedback({
                        message: result.message,
                        tone: "error",
                    });
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
                setIsNoteDrawerOpen(false);
                setActionFeedback({
                    message: activeNote
                        ? "Note saved."
                        : "Note created in your library.",
                    tone: "success",
                });
            });
        },
        [activeNote, onItemsChange, setActionFeedback]
    );

    const libraryBrowserStyle = useMemo(
        () =>
            ({
                "--library-section-sticky-top": `${commandPanelShellHeight + LIBRARY_COMMAND_PANEL_TOP_PX + LIBRARY_SECTION_STICKY_GAP_PX}px`,
            }) as CSSProperties,
        [commandPanelShellHeight]
    );

    const libraryGridBody = renderLibraryGridBody({
        clearLibraryPalette,
        collapsedSectionKeys: new Set(collapsedSectionKeys),
        collections,
        columnCount: resolvedColumnCount,
        enableSectionCollapse,
        layoutRefreshToken,
        onCopyLink: handleCopyLink,
        onDelete: handleRequestDelete,
        onOpenHere: handleOpenHere,
        onOpenInNewTab: handleOpenInNewTab,
        onOpenNote: handleOpenNote,
        onToggleSection: toggleSection,
        onUpdateItemCollections,
        paywallTotalCount: filteredItems.length,
        pendingCollectionItemIds,
        pendingDeleteItemId: pendingDeleteItem?.id ?? null,
        sections: gatedSections,
        showEmptyLibraryPeek,
        showNoFilteredResults,
    });

    return (
        <div
            className="relative z-0 flex w-full flex-col gap-6"
            style={libraryBrowserStyle}
        >
            <Dialog
                onOpenChange={handleDeleteDialogOpenChange}
                open={pendingDeleteItem !== null}
            >
                <DialogPopup>
                    <DialogHeader>
                        <DialogTitle>Delete saved item?</DialogTitle>
                        <DialogDescription>
                            Remove{" "}
                            {pendingDeleteItem?.caption?.trim() ||
                                pendingDeleteItem?.url ||
                                "this saved item"}{" "}
                            from Cache. This only deletes it from your library,
                            not from the original platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter variant="default">
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDelete}
                            size="sm"
                            variant="destructive"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
            <div
                className="sticky top-3 z-20 w-full max-w-md"
                onPointerDownCapture={handlePaletteShellPointerDownCapture}
                ref={commandPanelContainerRef}
            >
                <CommandPanel className="w-full" unstyled>
                    <Command
                        filter={null}
                        filteredItems={visiblePaletteGroups.map((group) => ({
                            items: group.items,
                        }))}
                        items={paletteGroups.map((group) => ({
                            items: group.items,
                        }))}
                        onOpenChange={handleCommandOpenChange}
                        onValueChange={handlePaletteInputChange}
                        open={commandListOpen}
                        value={paletteInput}
                    >
                        <CommandInput
                            autoFocus={false}
                            className="rounded-none border-0 bg-transparent! shadow-none outline-none ring-0 before:hidden has-focus-visible:border-transparent has-focus-visible:ring-0 has-focus-visible:ring-offset-0"
                            onKeyDown={handlePaletteInputKeyDown}
                            placeholder={inputPlaceholder}
                            ref={paletteInputRef}
                            startAddon={
                                isPaletteFocused ? (
                                    <SparklesIcon />
                                ) : (
                                    <SearchIcon />
                                )
                            }
                            trailing={
                                <LibraryPaletteTrailing
                                    captionFilters={captionFilters}
                                    clearLibraryPalette={clearLibraryPalette}
                                    columnCountMode={columnCountMode}
                                    domainFilters={domainFilters}
                                    groupBy={groupBy}
                                    hasActiveSearchFilterGroupOrSort={
                                        hasActiveFilters ||
                                        groupBy !== "none" ||
                                        sortMode !== DEFAULT_SORT_MODE
                                    }
                                    isPaletteFocused={isPaletteFocused}
                                    paletteInput={paletteInput}
                                    searchTerms={searchTerms}
                                    setCaptionFilters={setCaptionFilters}
                                    setColumnCountMode={setColumnCountMode}
                                    setDomainFilters={setDomainFilters}
                                    setGroupBy={setGroupBy}
                                    setSearchTerms={setSearchTerms}
                                    setSortMode={setSortMode}
                                    setSourceFilters={setSourceFilters}
                                    setThumbFilters={setThumbFilters}
                                    sortMode={sortMode}
                                    sourceFilters={sourceFilters}
                                    thumbFilters={thumbFilters}
                                />
                            }
                            wrapperClassName="min-h-11 w-full max-w-md rounded-full bg-muted/94 backdrop-blur-xs px-2 py-1.5 ring-1 ring-border/40 shadow-[0_0_0_rgba(15,23,42,0)] transition-[box-shadow,background-color] duration-200 has-focus-within:bg-background/96 has-focus-within:shadow-[0_10px_30px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.24)_inset] dark:ring-border/50 dark:shadow-[0_0_0_rgba(0,0,0,0)] dark:has-focus-within:shadow-[0_12px_32px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.05)_inset]"
                        />
                        <p className="sr-only">
                            Press {`${systemControlKey}K`},{" "}
                            {`${systemControlKey}P`}, or slash to focus search.
                            Use arrow keys to navigate results and Escape to
                            clear, go back, or close the command list.
                        </p>
                        <div
                            className={cn(
                                !commandListOpen && "hidden",
                                "absolute top-full left-0 z-50 mt-2 max-h-[min(26rem,70vh)] w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground"
                            )}
                        >
                            <CommandEmpty>
                                No matching commands found.
                            </CommandEmpty>
                            <CommandList className="max-h-[min(26rem,70vh)] overflow-y-auto">
                                {visiblePaletteGroups.map((group) => (
                                    <CommandGroup
                                        items={group.items}
                                        key={group.label}
                                    >
                                        <CommandGroupLabel>
                                            {group.label}
                                        </CommandGroupLabel>
                                        <CommandCollection>
                                            {(item: CommandPaletteItem) => (
                                                <CommandItem
                                                    key={item.value}
                                                    onClick={item.onSelect}
                                                    value={item.value}
                                                >
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate">
                                                                {item.label}
                                                            </div>
                                                            {item.description ? (
                                                                <p className="truncate text-muted-foreground text-xs">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        {item.active ? (
                                                            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-medium text-[11px] text-accent-foreground">
                                                                Active
                                                            </span>
                                                        ) : null}
                                                        {item.shortcut ? (
                                                            <CommandShortcut>
                                                                {item.shortcut}
                                                            </CommandShortcut>
                                                        ) : null}
                                                    </div>
                                                </CommandItem>
                                            )}
                                        </CommandCollection>
                                    </CommandGroup>
                                ))}
                            </CommandList>
                        </div>
                    </Command>
                </CommandPanel>
            </div>
            <div className="flex flex-col gap-2">
                {actionFeedback ? (
                    <div
                        className={cn(
                            "rounded-2xl border px-4 py-3 text-sm",
                            actionFeedback.tone === "success"
                                ? "border-emerald-500/25 bg-emerald-500/8 text-foreground"
                                : "border-destructive/25 bg-destructive/6 text-foreground"
                        )}
                    >
                        {actionFeedback.message}
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        className="rounded-full"
                        onClick={handleCreateNote}
                        size="xs"
                        variant="outline"
                    >
                        <SquarePen className="inline-block size-4 shrink-0" />
                        &nbsp;New entry
                    </Button>
                    <Separator className="mx-1 h-5" orientation="vertical" />
                    <Badge className="sm:text-xs" size="lg" variant="outline">
                        Showing {resultsSummary}
                    </Badge>
                    {groupBy === "none" ? null : (
                        <Badge
                            className="sm:text-xs"
                            size="lg"
                            variant="outline"
                        >
                            {sections.length} group
                            {sections.length === 1 ? "" : "s"}
                        </Badge>
                    )}
                    {(hasActiveFilters || hasNonDefaultView) &&
                    !showEmptyLibraryPeek ? (
                        <Button
                            onClick={() => {
                                clearLibraryPalette();
                            }}
                            size="xs"
                            variant="ghost"
                        >
                            Reset browser
                        </Button>
                    ) : null}
                    {enableSectionCollapse ? (
                        <>
                            <Button
                                onClick={expandAllSections}
                                size="xs"
                                variant="ghost"
                            >
                                Expand all
                            </Button>
                            <Button
                                onClick={collapseAllSections}
                                size="xs"
                                variant="ghost"
                            >
                                Collapse all
                            </Button>
                        </>
                    ) : null}
                </div>
            </div>
            <UnprivilegedOnly>
                <InlinePromotionBanner />
            </UnprivilegedOnly>
            {libraryGridBody}
            <LibraryNoteDrawer
                note={activeNote}
                onOpenChange={setIsNoteDrawerOpen}
                onSave={handleSaveNote}
                open={isNoteDrawerOpen}
                saving={isSavingNote}
            />
        </div>
    );
}
