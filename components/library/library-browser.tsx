"use client";

import {
    createNote,
    deleteLibraryItem,
    updateNote,
    type CreateCollectionFromItemsResult,
    type DeleteLibraryItemResult,
    type NoteMutationResult,
} from "@/app/[locale]/library/actions";
import {
    ExtensionLibraryEmptyMasonryPeek,
    ExtensionLibraryGrid,
    ExtensionLibrarySection,
} from "@/components/library/library-grid";
import { LibraryNoteDrawer } from "@/components/library/entry/library-note-drawer";
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
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UnprivilegedOnly } from "@/components/ui/privilege";
import { InlinePromotionBanner } from "@/components/ui/promotion-banner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    ChevronRight,
    SearchIcon,
    SparklesIcon,
    SquarePen,
    WandSparkles,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    ReactNode,
} from "react";
import {
    useEffect,
    useId,
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
type PaletteSection = "search" | "filter" | "group" | "sort" | "layout";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
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
    mode: "added" | "created" = "added",
): Date {
    const value =
        mode === "created"
            ? (item.postedAt ?? item.scrapedAt ?? item.createdAt)
            : (item.scrapedAt ?? item.createdAt);
    return value instanceof Date ? value : new Date(value);
}

function itemTimestamp(
    item: LibraryItem,
    mode: "added" | "created" = "added",
): number {
    return itemDate(item, mode).getTime();
}

function itemMonthKey(
    item: LibraryItem,
    mode: "added" | "created" = "added",
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

const PALETTE_SOURCE_OPTIONS = [
    { label: "All sources", value: "all" as const },
    ...FILTERABLE_LIBRARY_SOURCES.map((source) => ({
        label: sourceLabel(source),
        value: source,
    })),
    { label: sourceLabel(LibraryItemSource.other), value: "other" as const },
];

function buildResultsCollectionName(searchTerms: readonly string[]): string {
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
    sortMode: SortMode,
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
    if (sortMode === "source") {
        return (
            TEXT_COLLATOR.compare(
                sourceLabel(a.source),
                sourceLabel(b.source),
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
    sortMode: SortMode,
): number {
    if (groupBy === "month-added" || groupBy === "month-created") {
        const isOldest =
            sortMode === "added-oldest" || sortMode === "created-oldest";
        return isOldest ? a.localeCompare(b) : b.localeCompare(a);
    }
    if (groupBy === "source") {
        return TEXT_COLLATOR.compare(
            formatGroupHeading(groupBy, a),
            formatGroupHeading(groupBy, b),
        );
    }
    return TEXT_COLLATOR.compare(a, b);
}

function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

function appendUniqueSearchTerm(
    values: readonly string[],
    next: string,
): string[] {
    const normalized = next.trim();
    if (!normalized) {
        return [...values];
    }
    return values.some(
        (value) => value.toLowerCase() === normalized.toLowerCase(),
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
        (field) => field?.toLowerCase().includes(normalizedQuery),
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
    event: ReactKeyboardEvent<HTMLInputElement>,
): boolean {
    const key = event.key.toLowerCase();
    return SEARCH_CANCEL_KEYS.includes(
        key as (typeof SEARCH_CANCEL_KEYS)[number],
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

function collectionMembershipFilterLabel(
    filter: CollectionMembershipFilter,
): string {
    if (filter === "in-collections") {
        return "In collections";
    }
    if (filter === "not-in-collections") {
        return "Not in collections";
    }
    return "All items";
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
        collectionIds: string[],
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
        ),
    );
}

function buildSearchPaletteGroups({
    clearLibraryPalette,
    draft,
    hasAnyRefinements,
    navigationItems,
    onRequestLogout,
    searchTerms,
    setCommandListOpen,
    setPaletteInput,
    setSearchTerms,
}: {
    readonly clearLibraryPalette: () => void;
    readonly draft: string;
    readonly hasAnyRefinements: boolean;
    readonly navigationItems: CommandPaletteItem[];
    readonly onRequestLogout: () => void;
    readonly searchTerms: string[];
    readonly setCommandListOpen: (value: boolean) => void;
    readonly setPaletteInput: (value: string) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
}): CommandPaletteGroup[] {
    const groups: CommandPaletteGroup[] = [];
    const draftAlreadyIncluded = searchTerms.some(
        (term) => term.toLowerCase() === draft.toLowerCase(),
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
                            appendUniqueSearchTerm(current, draft),
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
                onSelect: onRequestLogout,
                shortcut: "⇧L",
                value: "account logout",
            },
        ],
        label: "Account",
    });

    return groups;
}

interface BuildLibraryPaletteGroupsInput {
    readonly clearLibraryPalette: () => void;
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly columnCountMode: ColumnCountMode;
    readonly domainFilters: readonly string[];
    readonly domainOptions: readonly {
        readonly label: string;
        readonly value: string;
    }[];
    readonly groupBy: GroupByMode;
    readonly handleRequestLogout: () => void;
    readonly openPaletteSection: (
        section: Exclude<PaletteSection, "search">,
    ) => void;
    readonly paletteInput: string;
    readonly paletteSection: PaletteSection;
    readonly returnToSearchSection: () => void;
    readonly searchTerms: readonly string[];
    readonly selectedCollectionIdsLength: number;
    readonly setCollectionMembershipFilter: (
        value: CollectionMembershipFilter,
    ) => void;
    readonly setColumnCountMode: (value: ColumnCountMode) => void;
    readonly setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean),
    ) => void;
    readonly setDomainFilters: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setGroupBy: (value: GroupByMode) => void;
    readonly setPaletteInput: (value: string) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setSortMode: (value: SortMode) => void;
    readonly setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[]),
    ) => void;
    readonly sortMode: SortMode;
    readonly sourceFilters: readonly SourceFilterValue[];
}

function buildDomainPaletteOptions(
    items: readonly LibraryItem[],
): { label: string; value: string }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const domain = itemDomain(item.url);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    const dynamicDomains = Array.from(counts.entries())
        .sort(
            ([aDomain, aCount], [bDomain, bCount]) =>
                bCount - aCount || TEXT_COLLATOR.compare(aDomain, bDomain),
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

function buildLibraryPaletteGroups(
    input: BuildLibraryPaletteGroupsInput,
): CommandPaletteGroup[] {
    const {
        clearLibraryPalette,
        columnCountMode,
        collectionMembershipFilter,
        domainFilters,
        domainOptions,
        groupBy,
        handleRequestLogout,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIdsLength,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
        setPaletteInput,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    } = input;

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
        selectedCollectionIdsLength > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

    if (paletteSection === "search") {
        return buildSearchPaletteGroups({
            clearLibraryPalette,
            draft,
            hasAnyRefinements,
            navigationItems,
            onRequestLogout: handleRequestLogout,
            searchTerms: [...searchTerms],
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
                    (option) => option.value !== "all",
                ).map((option) => ({
                    active: sourceFilters.includes(
                        option.value as SourceFilterValue,
                    ),
                    description: "Toggle this source in the filter stack",
                    label: `Source: ${option.label}`,
                    onSelect: applyAndStay(() =>
                        setSourceFilters((current) =>
                            toggleValue(
                                current,
                                option.value as SourceFilterValue,
                            ),
                        ),
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
                            DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                        ),
                    ),
                    value: "filter collections all",
                },
                {
                    active: collectionMembershipFilter === "in-collections",
                    description:
                        "Show only items that belong to at least one collection",
                    label: "Collections: In collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("in-collections"),
                    ),
                    value: "filter collections in",
                },
                {
                    active: collectionMembershipFilter === "not-in-collections",
                    description:
                        "Show only items that do not belong to any collection",
                    label: "Collections: Not in collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("not-in-collections"),
                    ),
                    value: "filter collections not-in",
                },
            ],
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
                              toggleValue(current, option.value),
                          ),
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
                        setGroupBy(option.value as GroupByMode),
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
                        setSortMode(option.value as SortMode),
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
            items: PALETTE_COLUMN_OPTIONS.map((option) => ({
                active: columnCountMode === option.value,
                description:
                    option.value === "auto"
                        ? "Let the masonry adapt to the available width"
                        : "Force a specific number of columns",
                label: option.label,
                onSelect: applyAndReturn(() =>
                    setColumnCountMode(option.value as ColumnCountMode),
                ),
                value: `columns ${option.value}`,
            })),
            label: "Layout",
        },
    ];
}

function filterLibraryBrowserItems(
    items: readonly LibraryItemWithCollections[],
    input: {
        readonly collectionMembershipFilter: CollectionMembershipFilter;
        readonly domainFilters: readonly string[];
        readonly searchTerms: readonly string[];
        readonly selectedCollectionIds: readonly string[];
        readonly sourceFilters: readonly SourceFilterValue[];
    },
): LibraryItemWithCollections[] {
    let list = [...items];
    const normalizedSearchTerms = input.searchTerms.map((term) =>
        term.trim().toLowerCase(),
    );

    if (input.selectedCollectionIds.length > 0) {
        list = list.filter((item) =>
            item.collections.some((collection) =>
                input.selectedCollectionIds.includes(collection.id),
            ),
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
                    url.includes(term),
            );
        });
    }

    if (input.sourceFilters.length > 0) {
        list = list.filter((item) => input.sourceFilters.includes(item.source));
    }

    if (input.domainFilters.length > 0) {
        list = list.filter((item) =>
            input.domainFilters.includes(itemDomain(item.url)),
        );
    }

    return list;
}

function sortLibraryBrowserItems(
    filteredItems: readonly LibraryItemWithCollections[],
    sortMode: SortMode,
): LibraryItemWithCollections[] {
    const itemSortMode =
        sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
    return [...filteredItems].sort((a, b) => compareItems(a, b, itemSortMode));
}

function buildLibraryBrowserSections(
    sortedItems: readonly LibraryItemWithCollections[],
    groupBy: GroupByMode,
    sortMode: SortMode,
): LibraryBrowserSection[] {
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
    readonly activeNote: LibraryItemWithCollections | null;
    readonly draft: {
        readonly contentHtml: string;
        readonly title: string;
    };
}): Promise<NoteMutationResult> {
    try {
        return activeNote
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
        return {
            message: activeNote
                ? "We couldn't save this note right now."
                : "We couldn't create this note right now.",
            status: "ERROR",
        };
    }
}

function gateLibraryBrowserSections(
    sections: readonly LibraryBrowserSection[],
    shouldGate: boolean,
): LibraryBrowserSection[] {
    if (!shouldGate) {
        return sections as LibraryBrowserSection[];
    }

    let remainingPreviewItems = FREE_LIBRARY_PREVIEW_ITEMS;
    let shouldShowPaywallBanner = true;

    return sections.map((section) => {
        const paywallPreviewCount = Math.min(
            section.items.length,
            remainingPreviewItems,
        );
        const hasLockedItems = paywallPreviewCount < section.items.length;

        remainingPreviewItems = Math.max(
            0,
            remainingPreviewItems - paywallPreviewCount,
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
}

function getVisibleSectionItems(
    section: LibraryBrowserSection,
): LibraryItemWithCollections[] {
    const resolvedPreviewCount = Math.max(
        0,
        Math.min(
            section.paywallPreviewCount ?? section.items.length,
            section.items.length,
        ),
    );

    return section.items.slice(0, resolvedPreviewCount);
}

function libraryBrowserHasActiveFilters(input: {
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly domainFilters: readonly string[];
    readonly searchTerms: readonly string[];
    readonly selectedCollectionIds: readonly string[];
    readonly sourceFilters: readonly SourceFilterValue[];
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
    paletteGroups: readonly CommandPaletteGroup[],
    paletteInput: string,
    systemControlKey: string,
): CommandPaletteGroup[] {
    const filtered = paletteGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                matchesCommandPaletteItem(item, paletteInput),
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
}

function libraryBrowserStickySectionStyle(
    commandPanelShellHeight: number,
): CSSProperties {
    return {
        "--library-section-sticky-top": `${commandPanelShellHeight + LIBRARY_COMMAND_PANEL_TOP_PX + LIBRARY_SECTION_STICKY_GAP_PX}px`,
    } as CSSProperties;
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
        [],
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
                current.length === 0 ? current : [],
            );
        }
    }, [enableSectionCollapse]);

    const toggleSection = (key: string) => {
        setCollapsedSectionKeys((current) =>
            current.includes(key)
                ? current.filter((entry) => entry !== key)
                : [...current, key],
        );
        setLayoutRefreshToken((current) => current + 1);
    };

    const collapseAllSections = () => {
        setCollapsedSectionKeys(sections.map((section) => section.key));
        setLayoutRefreshToken((current) => current + 1);
    };

    const expandAllSections = () => {
        setCollapsedSectionKeys([]);
        setLayoutRefreshToken((current) => current + 1);
    };

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
    clearLibraryPalette,
    collectionMembershipFilter,
    columnCountMode,
    domainFilters,
    groupBy,
    paletteInput,
    searchTerms,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setDomainFilters,
    setGroupBy,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: {
    readonly clearLibraryPalette: () => void;
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly columnCountMode: ColumnCountMode;
    readonly domainFilters: string[];
    readonly groupBy: GroupByMode;
    readonly paletteInput: string;
    readonly searchTerms: string[];
    readonly setCollectionMembershipFilter: (
        value: CollectionMembershipFilter,
    ) => void;
    readonly setColumnCountMode: (value: ColumnCountMode) => void;
    readonly setDomainFilters: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setGroupBy: (value: GroupByMode) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setSortMode: (value: SortMode) => void;
    readonly setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[]),
    ) => void;
    readonly sortMode: SortMode;
    readonly sourceFilters: SourceFilterValue[];
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
            />,
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
            />,
        );
    }

    for (const domainFilter of domainFilters) {
        chips.push(
            <PaletteChip
                key={`domain-${domainFilter}`}
                label={`Domain: ${truncateLabel(domainFilter)}`}
                onRemove={() =>
                    setDomainFilters((current) =>
                        removeValue(current, domainFilter),
                    )
                }
            />,
        );
    }

    if (collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER) {
        chips.push(
            <PaletteChip
                key="collection-membership"
                label={`Collections: ${collectionMembershipFilterLabel(collectionMembershipFilter)}`}
                onRemove={() =>
                    setCollectionMembershipFilter(
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                    )
                }
            />,
        );
    }

    if (groupBy !== "none") {
        chips.push(
            <PaletteChip
                key="group"
                label={`Group: ${groupByLabel(groupBy)}`}
                onRemove={() => setGroupBy("none")}
            />,
        );
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
        chips.push(
            <PaletteChip
                key="sort"
                label={`Sort: ${sortModeLabel(sortMode)}`}
                onRemove={() => setSortMode(DEFAULT_SORT_MODE)}
            />,
        );
    }

    if (columnCountMode !== DEFAULT_COLUMN_COUNT_MODE) {
        chips.push(
            <PaletteChip
                key="columns"
                label={`Layout: ${columnCountLabel(columnCountMode)}`}
                onRemove={() => setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE)}
            />,
        );
    }

    const canReset = chips.length > 0 || paletteInput.trim().length > 0;

    return (
        <>
            <TruncateAfter after={2}>{chips}</TruncateAfter>
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
    readonly onCreateCollectionFromResults: (input: {
        description?: string;
        itemIds: string[];
        name: string;
    }) => Promise<CreateCollectionFromItemsResult>;
    readonly onItemsChange: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[],
              ) => LibraryItemWithCollections[]),
    ) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
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
                  current: LibraryActionFeedback | null,
              ) => LibraryActionFeedback | null),
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
                  current: LibraryItemWithCollections[],
              ) => LibraryItemWithCollections[]),
    ) => void,
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

    const handleOpenInNewTab = (item: LibraryItem) => {
        setActionFeedback(null);
        openSavedItemInNewTab(normalizeURL(item.url));
    };

    const handleOpenHere = (item: LibraryItem) => {
        setActionFeedback(null);
        window.location.assign(normalizeURL(item.url));
    };

    const handleCopyLink = (item: LibraryItem) => {
        copyToClipboard(normalizeURL(item.url));
    };

    const handleRequestDelete = (item: LibraryItem) => {
        setActionFeedback(null);
        setPendingDeleteItem(item);
    };

    const handleDeleteDialogOpenChange = (open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDeleteItem(null);
        }
    };

    const handleConfirmDelete = () => {
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
                    current.filter((item) => item.id !== result.itemId),
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
    };

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
    onCreateCollectionFromResults,
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
    const [domainFilters, setDomainFilters] = useState<string[]>([]);
    const [collectionMembershipFilter, setCollectionMembershipFilter] =
        useState<CollectionMembershipFilter>(
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
        );
    const [groupBy, setGroupBy] = useState<GroupByMode>("none");
    const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
    const [columnCountMode, setColumnCountMode] = useState<ColumnCountMode>(
        DEFAULT_COLUMN_COUNT_MODE,
    );
    const [paletteSection, setPaletteSection] =
        useState<PaletteSection>("search");
    const [activeNote, setActiveNote] =
        useState<LibraryItemWithCollections | null>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
    const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] =
        useState(false);
    const [createResultsNameDraft, setCreateResultsNameDraft] = useState("");
    const [createResultsDescriptionDraft, setCreateResultsDescriptionDraft] =
        useState("");
    const [createResultsError, setCreateResultsError] = useState<string | null>(
        null,
    );
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [commandListOpen, setCommandListOpen] = useState(false);
    const [isPaletteFocused, setIsPaletteFocused] = useState(false);
    const [commandPanelShellHeight, setCommandPanelShellHeight] = useState(0);
    const commandPanelContainerRef = useRef<HTMLDivElement>(null);
    const paletteInputRef = useRef<HTMLInputElement>(null);
    const createResultsNameInputId = useId();
    const createResultsDescriptionId = useId();
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
    const [
        isCreatingResultsCollection,
        startCreateResultsCollectionTransition,
    ] = useTransition();

    const domainOptions = buildDomainPaletteOptions(items);

    const focusPaletteInput = (select = false) => {
        setCommandListOpen(true);
        queueMicrotask(() => {
            paletteInputRef.current?.focus();
            if (select) {
                paletteInputRef.current?.select();
            }
        });
    };

    const focusPaletteInputRef = useRef(focusPaletteInput);
    focusPaletteInputRef.current = focusPaletteInput;

    const handleCommandOpenChange = (
        nextOpen: boolean,
        eventDetails?: { readonly reason?: string },
    ) => {
        setCommandListOpen(() => {
            if (!nextOpen && suppressNextCommandCloseRef.current) {
                suppressNextCommandCloseRef.current = false;
                return true;
            }

            if (!nextOpen) {
                const shell = commandPanelContainerRef.current;
                const active = document.activeElement;
                const focusInsidePalette =
                    shell && active instanceof Node && shell.contains(active);
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

    const handlePaletteShellPointerDownCapture = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
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
    };

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
                current === nextHeight ? current : nextHeight,
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
                            'input, textarea, select, button, [role="textbox"]',
                        ),
                    ));

            if (isSearchHotkey(event)) {
                event.preventDefault();
                focusPaletteInputRef.current(true);
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
                focusPaletteInputRef.current();
            }
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, []);

    const returnToSearchSection = () => {
        setPaletteSection("search");
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const openPaletteSection = (section: Exclude<PaletteSection, "search">) => {
        suppressNextCommandCloseRef.current = true;
        setPaletteSection(section);
        setPaletteInput("");
        focusPaletteInput();
    };

    const handleCommandInputChange = (next: string) => {
        setPaletteInput(next);
        setCommandListOpen(true);
    };

    const clearLibraryPalette = () => {
        setPaletteInput("");
        setSearchTerms([]);
        setSourceFilters([]);
        setDomainFilters([]);
        setCollectionMembershipFilter(DEFAULT_COLLECTION_MEMBERSHIP_FILTER);
        onClearCollectionFilters();
        setGroupBy("none");
        setSortMode(DEFAULT_SORT_MODE);
        setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        setPaletteSection("search");
        setCommandListOpen(false);
    };

    const handlePaletteInputKeyDown = (
        event: ReactKeyboardEvent<HTMLInputElement>,
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
    };

    const handleRequestLogout = () => {
        setCommandListOpen(false);
        setIsLogoutDialogOpen(true);
    };

    const handleConfirmLogout = () => {
        window.location.assign(`/${locale}/logout`);
    };

    const paletteGroups = buildLibraryPaletteGroups({
        clearLibraryPalette,
        collectionMembershipFilter,
        columnCountMode,
        domainFilters,
        domainOptions,
        groupBy,
        handleRequestLogout,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIdsLength: selectedCollectionIds.length,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
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
        systemControlKey ?? "",
    );

    const visiblePaletteGroupsRef = useRef(visiblePaletteGroups);
    visiblePaletteGroupsRef.current = visiblePaletteGroups;

    useHotkeys(
        "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
        (event) => {
            const digit = Number(event.key);
            if (Number.isNaN(digit)) {
                return;
            }
            const index = digit - 1;
            const flatItems = visiblePaletteGroupsRef.current.flatMap(
                (g) => g.items,
            );
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
        [commandListOpen],
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
    if (isPaletteFocused) {
        inputPlaceholder = "What are you looking for?";
    }

    const filteredItems = useMemo(
        () =>
            filterLibraryBrowserItems(items, {
                collectionMembershipFilter,
                domainFilters,
                searchTerms,
                selectedCollectionIds,
                sourceFilters,
            }),
        [
            collectionMembershipFilter,
            domainFilters,
            items,
            searchTerms,
            selectedCollectionIds,
            sourceFilters,
        ],
    );

    const sortedItems = useMemo(
        () => sortLibraryBrowserItems(filteredItems, sortMode),
        [filteredItems, sortMode],
    );

    const sections = useMemo(
        () => buildLibraryBrowserSections(sortedItems, groupBy, sortMode),
        [groupBy, sortMode, sortedItems],
    );

    const shouldGateResults =
        !(isAccessLoading || hasAccess) &&
        filteredItems.length > FREE_LIBRARY_PREVIEW_ITEMS;

    const gatedSections = useMemo(
        () => gateLibraryBrowserSections(sections, shouldGateResults),
        [sections, shouldGateResults],
    );

    const hasActiveFilters = useMemo(
        () =>
            libraryBrowserHasActiveFilters({
                collectionMembershipFilter,
                domainFilters,
                searchTerms,
                selectedCollectionIds,
                sourceFilters,
            }),
        [
            collectionMembershipFilter,
            domainFilters,
            searchTerms,
            selectedCollectionIds,
            sourceFilters,
        ],
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
    const visibleResultItems = useMemo(
        () =>
            gatedSections.flatMap((section) => getVisibleSectionItems(section)),
        [gatedSections],
    );
    const canCreateCollectionFromResults =
        searchTerms.length > 0 && visibleResultItems.length > 0;
    const resultCollectionItemIds = useMemo(
        () => visibleResultItems.map((item) => item.id),
        [visibleResultItems],
    );

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
            let result: CreateCollectionFromItemsResult;

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

    const handleOpenNote = (item: LibraryItemWithCollections) => {
        setActionFeedback(null);
        setActiveNote(item);
        setIsNoteDrawerOpen(true);
    };

    const handleSaveNote = async (draft: {
        contentHtml: string;
        title: string;
    }) => {
        return await new Promise<boolean>((resolve) => {
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
                        (item) => item.id === result.item.id,
                    );

                    if (existingIndex === -1) {
                        return [result.item, ...current];
                    }

                    return current.map((item) =>
                        item.id === result.item.id ? result.item : item,
                    );
                });
                setActiveNote(result.item);
                setActionFeedback({
                    message: activeNote
                        ? "Note saved."
                        : "Note created in your library.",
                    tone: "success",
                });
                resolve(true);
            });
        });
    };

    const libraryBrowserStyle = useMemo(
        () => libraryBrowserStickySectionStyle(commandPanelShellHeight),
        [commandPanelShellHeight],
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
            <Dialog
                onOpenChange={handleCreateResultsDialogOpenChange}
                open={isCreateResultsDialogOpen}
            >
                <DialogPopup showCloseButton>
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
                                            event.currentTarget.value,
                                        );
                                        if (createResultsError) {
                                            setCreateResultsError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    required
                                    size="lg"
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
                                            event.currentTarget.value,
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
            <Dialog
                onOpenChange={setIsLogoutDialogOpen}
                open={isLogoutDialogOpen}
            >
                <DialogPopup>
                    <DialogHeader>
                        <DialogTitle>Log out?</DialogTitle>
                        <DialogDescription>
                            You will need to sign in again to access your
                            library.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter variant="default">
                        <DialogClose
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <DialogClose
                            onClick={handleConfirmLogout}
                            render={<Button size="sm" />}
                        >
                            Log out
                        </DialogClose>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
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
                <CommandPanel
                    unstyled
                    onPointerDownCapture={handlePaletteShellPointerDownCapture}
                    ref={commandPanelContainerRef}
                >
                    <CommandInput
                        onKeyDown={handlePaletteInputKeyDown}
                        placeholder={inputPlaceholder}
                        ref={paletteInputRef}
                        startAddon={
                            isPaletteFocused ? <SparklesIcon /> : <SearchIcon />
                        }
                        trailing={
                            <LibraryPaletteTrailing
                                clearLibraryPalette={clearLibraryPalette}
                                collectionMembershipFilter={
                                    collectionMembershipFilter
                                }
                                columnCountMode={columnCountMode}
                                domainFilters={domainFilters}
                                groupBy={groupBy}
                                paletteInput={paletteInput}
                                searchTerms={searchTerms}
                                setCollectionMembershipFilter={
                                    setCollectionMembershipFilter
                                }
                                setColumnCountMode={setColumnCountMode}
                                setDomainFilters={setDomainFilters}
                                setGroupBy={setGroupBy}
                                setSearchTerms={setSearchTerms}
                                setSortMode={setSortMode}
                                setSourceFilters={setSourceFilters}
                                sortMode={sortMode}
                                sourceFilters={sourceFilters}
                            />
                        }
                    />
                    <div
                        className={cn(
                            !commandListOpen && "hidden",
                            "absolute top-full left-0 z-50 mt-2 max-h-[min(26rem,70vh)] w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground",
                        )}
                    >
                        <CommandEmpty>No matching commands found.</CommandEmpty>
                        <CommandList>
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
                </CommandPanel>
            </Command>
            {actionFeedback ? (
                <div
                    className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium",
                        actionFeedback.tone === "success"
                            ? "border-emerald-500/25 bg-emerald-500/8 text-foreground"
                            : "border-destructive/25 bg-destructive/6 text-foreground",
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
                {canCreateCollectionFromResults ? (
                    <Button
                        className="rounded-full"
                        onClick={() =>
                            handleCreateResultsDialogOpenChange(true)
                        }
                        size="xs"
                        variant="outline"
                    >
                        <WandSparkles className="inline-block size-4 shrink-0" />
                        &nbsp;Create collection with results
                    </Button>
                ) : null}
                {groupBy === "none" ? null : (
                    <Badge className="sm:text-xs" size="lg" variant="outline">
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
