"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel } from "@/components/ui/collapsible";
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
    CommandPopup,
    CommandRow,
    CommandShortcut,
    CommandStatus,
    useCommandFilter,
} from "@/components/ui/command";
import {
    DataList,
    DataListChart,
    DataListHeader,
    DataListItem,
    DataListItems,
    DataListSection,
    DataListTitle,
} from "@/components/ui/data-list";
import { DisclosureListHorizontal } from "@/components/ui/disclosure-list";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    Popover,
    PopoverClose,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LibraryMetricsSnapshot } from "@/lib/collections/metrics";
import { cn } from "@/lib/common/cn";
import { createLogger } from "@/lib/common/logs/console/logger";
import { formatSharePercent } from "@/lib/common/numbers";
import type {
    AutocompleteRootChangeEventDetails,
    BaseUIEvent,
} from "@base-ui/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Calligraph } from "calligraph";
import { ChevronDown, CopyX, Grid2x2, Grid2x2X, SquarePen } from "lucide-react";
import * as React from "react";

const COMMAND_MATCH_WORD_SEPARATOR_PATTERN = /[\s:./_-]+/;

const NORMALIZED_PALETTE_ITEM_CACHE_LIMIT = 2000;

const log = createLogger("library:composer");

export interface PaletteStackEntry {
    chip: React.ReactNode;
    key: string;
    onRemove: () => void;
}

export interface CommandPaletteItem {
    description?: string;
    disabled?: boolean;
    isActive?: boolean;
    label: string;
    onSelect: (
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void | Promise<void>;
    render?: (item: CommandPaletteItem) => React.ReactNode;
    shortcut?: string;
    value: string;
}

export interface CommandPaletteGroup {
    items: CommandPaletteItem[];
    label: string;
    layout?: "horizontal" | "vertical";
}

export interface CommandSuggestion {
    icon?: React.ReactNode;
    label: string;
    onSelect: () => void;
}

interface CommandItemRank {
    index: number;
    score: number;
}

interface RankedCommandPaletteItem {
    item: CommandPaletteItem;
    rank: CommandItemRank;
}

interface NormalizedPaletteItem {
    lowerDescription: string;
    lowerLabel: string;
    lowerValue: string;
    words: string[];
}

interface ComposerActionsProps {
    canClear: boolean;
    duplicatesFilterEnabled: boolean;
    groupBy: string;
    onClearPalette: () => void;
    onCreateNote: () => void;
    onRemoveDuplicates: () => void;
    removableDuplicateCount: number;
    resultsSummary: string;
    sectionsLength: number;
}

interface ComposerInputProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    groups: CommandPaletteGroup[];
    isOpen: boolean;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onOpenChange: (
        nextOpen: boolean,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    onValueChange: (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    placeholder: string;
    query: string;
    ref: React.RefObject<HTMLInputElement | null>;
    stackEntries: PaletteStackEntry[];
}

interface ComposerInputEndAddonProps {
    stackEntries: PaletteStackEntry[];
}

interface CommandPaletteItemComponentProps {
    isHorizontal?: boolean;
    item: CommandPaletteItem;
}

interface ComposerActionsListProps
    extends React.ComponentProps<typeof Toolbar.Group> {
    actions: ComposerActionsProps;
    children: React.ReactNode;
    metrics: LibraryMetricsSnapshot;
}

interface ComposerSuggestionsListProps
    extends Omit<React.ComponentProps<typeof CollapsiblePanel>, "children"> {
    children: (suggestion: CommandSuggestion, index: number) => React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    suggestions: CommandSuggestion[];
}

interface ComposerActionMetricsPanelProps {
    canClear: boolean;
    metrics: LibraryMetricsSnapshot;
    onClearPalette: () => void;
}

const normalizedPaletteItemCache = new Map<string, NormalizedPaletteItem>();

function useVisibleGroups({
    groups,
    isOpen,
    query,
}: {
    groups: CommandPaletteGroup[];
    isOpen: boolean;
    query: string;
}): CommandPaletteGroup[] {
    const filter = useCommandFilter();

    const normalizedQuery = query.trim();
    if (!isOpen || normalizedQuery.length === 0) {
        return groups;
    }

    const lowerQuery = normalizedQuery.toLowerCase();
    const visibleGroups: CommandPaletteGroup[] = [];

    for (const group of groups) {
        const rankedItems: RankedCommandPaletteItem[] = [];

        for (const [index, item] of group.items.entries()) {
            const score = getCommandItemScore(filter, item, lowerQuery);
            if (score !== null) {
                rankedItems.push({
                    item,
                    rank: { index, score },
                });
            }
        }

        if (rankedItems.length === 0) {
            continue;
        }

        rankedItems.sort(
            (first, second) =>
                first.rank.score - second.rank.score ||
                first.rank.index - second.rank.index
        );

        visibleGroups.push({
            ...group,
            items: rankedItems.map(({ item }) => item),
        });
    }

    return visibleGroups;
}

function getNormalizedPaletteItem(
    item: CommandPaletteItem
): NormalizedPaletteItem {
    const key = `${item.label}\u0000${item.value}\u0000${item.description ?? ""}`;
    const cached = normalizedPaletteItemCache.get(key);
    if (cached) {
        return cached;
    }

    const lowerLabel = item.label.trim().toLowerCase();
    const normalized: NormalizedPaletteItem = {
        lowerDescription: (item.description ?? "").toLowerCase(),
        lowerLabel,
        lowerValue: item.value.toLowerCase(),
        words: lowerLabel.split(COMMAND_MATCH_WORD_SEPARATOR_PATTERN),
    };

    if (
        normalizedPaletteItemCache.size >= NORMALIZED_PALETTE_ITEM_CACHE_LIMIT
    ) {
        normalizedPaletteItemCache.clear();
    }
    normalizedPaletteItemCache.set(key, normalized);
    return normalized;
}

function getCommandItemScore(
    filter: ReturnType<typeof useCommandFilter>,
    item: CommandPaletteItem,
    lowerQuery: string
): number | null {
    const { lowerDescription, lowerLabel, lowerValue, words } =
        getNormalizedPaletteItem(item);

    if (lowerLabel === lowerQuery) {
        return 0;
    }
    if (filter.startsWith(lowerLabel, lowerQuery)) {
        return 1;
    }
    if (filter.contains(lowerLabel, lowerQuery)) {
        for (const word of words) {
            if (filter.startsWith(word, lowerQuery)) {
                return 2;
            }
        }
        return 3;
    }
    if (filter.startsWith(lowerValue, lowerQuery)) {
        return 4;
    }
    if (filter.contains(lowerValue, lowerQuery)) {
        return 5;
    }
    if (
        lowerDescription !== "" &&
        filter.contains(lowerDescription, lowerQuery)
    ) {
        return 6;
    }

    return null;
}

function formatShareValue(value: number, total: number): React.ReactNode {
    if (total <= 0) {
        return value;
    }
    return (
        <>
            {value}
            <span className="text-muted-foreground/50">
                {" "}
                · {formatSharePercent(value, total)}
            </span>
        </>
    );
}

const ComposerActionsContext = React.createContext<ComposerActionsProps | null>(
    null
);

function useComposerActionsContext(): ComposerActionsProps {
    const context = React.use(ComposerActionsContext);
    if (!context) {
        throw new Error(
            "ComposerActions sub-components must be used inside <ComposerActions>."
        );
    }
    return context;
}

const ComposerMetricsContext =
    React.createContext<LibraryMetricsSnapshot | null>(null);

function useComposerMetricsContext(): LibraryMetricsSnapshot {
    const context = React.use(ComposerMetricsContext);
    if (!context) {
        throw new Error(
            "ComposerActionMetrics sub-components must be used inside <ComposerActionMetrics>."
        );
    }
    return context;
}

export function Composer({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            {...props}
            className={cn(
                "sticky top-1 z-50 w-full max-w-2xl overflow-clip rounded-t-3xl rounded-b-3xl bg-muted",
                className
            )}
        />
    );
}

export function ComposerInput({
    query,
    isOpen,
    onValueChange,
    onOpenChange,
    onKeyDown,
    placeholder,
    groups,
    containerRef,
    ref,
    stackEntries,
}: ComposerInputProps) {
    const filteredGroups = useVisibleGroups({ groups, isOpen, query });

    return (
        <Command
            filteredItems={filteredGroups}
            items={groups}
            onOpenChange={onOpenChange}
            onValueChange={onValueChange}
            open={isOpen}
            value={query}
        >
            <CommandPanel ref={containerRef}>
                <Toolbar.Input
                    render={
                        <CommandInput
                            autoCapitalize="sentences"
                            autoCorrect="on"
                            endAddon={
                                <ComposerInputEndAddon
                                    stackEntries={stackEntries}
                                />
                            }
                            inputMode="text"
                            onKeyDown={onKeyDown}
                            placeholder={placeholder}
                            ref={ref}
                            size="lg"
                            spellCheck="true"
                            translate="no"
                        />
                    }
                />
                <CommandPopup className="max-w-2xl" positionMethod="fixed">
                    <CommandEmpty>No matching commands</CommandEmpty>
                    <CommandStatus />
                    <CommandList className="max-w-2xl">
                        {(group: CommandPaletteGroup) => (
                            <CommandGroup items={group.items} key={group.label}>
                                <CommandGroupLabel>
                                    {group.label}
                                </CommandGroupLabel>
                                {group.layout === "horizontal" ? (
                                    <CommandRow className="grid grid-cols-2 gap-2 pt-1 pr-2 pb-4 md:grid-cols-3 lg:grid-cols-4">
                                        <CommandCollection>
                                            {(item: CommandPaletteItem) => (
                                                <CommandPaletteItemComponent
                                                    isHorizontal
                                                    item={item}
                                                    key={item.value}
                                                />
                                            )}
                                        </CommandCollection>
                                    </CommandRow>
                                ) : (
                                    <CommandCollection>
                                        {(item: CommandPaletteItem) => (
                                            <CommandPaletteItemComponent
                                                item={item}
                                                key={item.value}
                                            />
                                        )}
                                    </CommandCollection>
                                )}
                            </CommandGroup>
                        )}
                    </CommandList>
                </CommandPopup>
            </CommandPanel>
        </Command>
    );
}

function ComposerInputEndAddon({ stackEntries }: ComposerInputEndAddonProps) {
    return (
        <>
            {stackEntries.length === 0 ? <ComposerInputShortcut /> : null}
            <DisclosureListHorizontal
                badgeRender={
                    <Badge
                        className="inline-flex h-7! cursor-pointer rounded-full text-xs tabular-nums"
                        render={<button type="button" />}
                        variant="secondary"
                    />
                }
                className="justify-end"
                maxVisible={1}
            >
                {stackEntries.map((entry) => (
                    <React.Fragment key={entry.key}>
                        {entry.chip}
                    </React.Fragment>
                ))}
            </DisclosureListHorizontal>
        </>
    );
}

function ComposerInputShortcut() {
    return (
        <>
            <Kbd className="border-none text-muted-foreground opacity-50 group-data-popup-open/input:opacity-0">
                <CmdKbd />G
            </Kbd>
            <span className="absolute right-3.5 flex items-center gap-0.5 text-nowrap opacity-0 group-data-popup-open/input:opacity-100">
                <Kbd className="border-none text-muted-foreground opacity-50">
                    Tab
                </Kbd>
                <span className="text-muted-foreground text-xs opacity-50">
                    Ask AI
                </span>
            </span>
        </>
    );
}

function CommandPaletteItemComponent({
    item,
    isHorizontal = false,
}: CommandPaletteItemComponentProps) {
    const onSelect = item.onSelect;
    const handleSelect = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent>) => {
            const result = onSelect(event);
            if (result) {
                result.catch((error: unknown) => {
                    log.error("Command palette item failed", error, {
                        value: item.value,
                    });
                });
            }
        }
    );

    return (
        <CommandItem
            className={cn(
                isHorizontal &&
                    "group relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
            )}
            disabled={item.disabled}
            onClick={handleSelect}
            value={item.value}
        >
            {item.render ? (
                item.render(item)
            ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="truncate">{item.label}</div>
                    {item.description ? (
                        <span className="max-w-xs truncate text-muted-foreground/80 text-xs">
                            {item.description}
                        </span>
                    ) : null}
                    {item.isActive ? (
                        <Badge variant="secondary">Active</Badge>
                    ) : null}
                    {item.shortcut ? (
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                    ) : null}
                </div>
            )}
        </CommandItem>
    );
}

export function ComposerSuggestionsList({
    children,
    suggestions,
    className,
    open: openProp,
    onOpenChange: onOpenChangeProp,
    ...props
}: ComposerSuggestionsListProps) {
    const [isInternalOpen, setInternalOpen] = React.useState(true);
    const isOpen = openProp === undefined ? isInternalOpen : openProp;

    const setIsOpen = useStableCallback((next: boolean) => {
        setInternalOpen(next);
        onOpenChangeProp?.(next);
    });

    const handleDismiss = useStableCallback(() => setIsOpen(false));

    if (!suggestions.length) {
        return null;
    }

    const dismissSuggestion: CommandSuggestion = {
        label: "Dismiss",
        onSelect: handleDismiss,
    };

    return (
        <Collapsible
            className="relative -mt-1"
            onOpenChange={setIsOpen}
            open={isOpen}
        >
            <CollapsiblePanel {...props} className={cn("px-3", className)}>
                <ScrollArea shouldScrollFade>
                    <div className="flex w-max flex-nowrap items-center gap-1.5 text-nowrap">
                        {suggestions.map((suggestion, i) => (
                            <React.Fragment key={suggestion.label}>
                                {children(suggestion, i)}
                                <span className="mr-0.5 -ml-0.5 font-medium text-muted-foreground text-xs">
                                    ·
                                </span>
                            </React.Fragment>
                        ))}
                        {children(dismissSuggestion, suggestions.length)}
                    </div>
                </ScrollArea>
            </CollapsiblePanel>
        </Collapsible>
    );
}

export function ComposerActionsList({
    className,
    actions,
    metrics,
    ...props
}: ComposerActionsListProps) {
    return (
        <ComposerActionsContext value={actions}>
            <ComposerMetricsContext value={metrics}>
                <ScrollArea className="h-fit" shouldScrollFade>
                    <Toolbar.Group
                        {...props}
                        className={cn(
                            "flex items-center gap-2.5 overflow-clip text-nowrap px-3 py-2",
                            className
                        )}
                    />
                </ScrollArea>
            </ComposerMetricsContext>
        </ComposerActionsContext>
    );
}

export function ComposerActionNew() {
    const { onCreateNote } = useComposerActionsContext();

    return (
        <ComposerActionButton onClick={onCreateNote} title="Add new">
            <SquarePen className="inline-block size-3.5 shrink-0" />
            &nbsp;Add new
        </ComposerActionButton>
    );
}

export function ComposerActionMetrics() {
    const { canClear, onClearPalette } = useComposerActionsContext();
    const metrics = useComposerMetricsContext();

    return (
        <Popover>
            <Toolbar.Button
                render={
                    <PopoverTrigger
                        openOnHover
                        render={<ComposerActionMetricsTrigger />}
                    />
                }
            />
            <PopoverPopup align="start" side="top">
                <ComposerActionMetricsPanel
                    canClear={canClear}
                    metrics={metrics}
                    onClearPalette={onClearPalette}
                />
            </PopoverPopup>
        </Popover>
    );
}

function ComposerActionMetricsTrigger(
    props: React.ComponentProps<typeof Button>
) {
    const { canClear, groupBy, resultsSummary, sectionsLength } =
        useComposerActionsContext();

    return (
        <ComposerActionButton {...props}>
            {canClear ? (
                <Grid2x2X className="inline-block size-3.5 shrink-0" />
            ) : (
                <Grid2x2 className="inline-block size-3.5 shrink-0" />
            )}
            <span className="min-w-0 tabular-nums">
                &nbsp;Showing <Calligraph>{resultsSummary}</Calligraph>
                {groupBy === "none" ? null : (
                    <>
                        , <Calligraph>{sectionsLength}</Calligraph> group
                        {sectionsLength === 1 ? "" : "s"}
                    </>
                )}
            </span>
            <ChevronDown className="inline-block size-3.5 shrink-0" />
        </ComposerActionButton>
    );
}

function ComposerActionMetricsPanel({
    canClear,
    metrics,
    onClearPalette,
}: ComposerActionMetricsPanelProps) {
    const {
        duplicateCount,
        itemCount,
        sourceSegments,
        uncollectedCount,
        unreachableCount,
    } = metrics;

    const gapRows: {
        key: string;
        label: string;
        value: React.ReactNode;
    }[] = [];
    if (uncollectedCount > 0) {
        gapRows.push({
            key: "uncollected",
            label: "Not in Collections",
            value: formatShareValue(uncollectedCount, itemCount),
        });
    }
    if (duplicateCount > 0) {
        gapRows.push({
            key: "duplicates",
            label: "Duplicates",
            value: formatShareValue(duplicateCount, itemCount),
        });
    }
    if (unreachableCount > 0) {
        gapRows.push({
            key: "unreachable",
            label: "Unreachable",
            value: formatShareValue(unreachableCount, itemCount),
        });
    }

    return (
        <DataList>
            {canClear ? (
                <PopoverClose
                    render={
                        <Button
                            className="w-full"
                            onClick={onClearPalette}
                            size="sm"
                            variant="secondary"
                        />
                    }
                >
                    Reset filters
                </PopoverClose>
            ) : null}
            <DataListHeader>
                <DataListTitle render={<PopoverTitle />}>
                    Library Breakdown
                </DataListTitle>
            </DataListHeader>
            <DataListSection>
                <DataListChart segments={sourceSegments} />
                <DataListItems>
                    {sourceSegments.map((segment) => (
                        <DataListItem
                            color={segment.color}
                            key={segment.key}
                            label={segment.label}
                            value={formatShareValue(segment.value, itemCount)}
                        />
                    ))}
                </DataListItems>
            </DataListSection>
            <DataListSection>
                <DataListItems>
                    <DataListItem
                        label="Favorites"
                        value={formatShareValue(
                            metrics.favoriteCount,
                            itemCount
                        )}
                    />
                    <DataListItem
                        label="Notes"
                        value={formatShareValue(metrics.noteCount, itemCount)}
                    />
                </DataListItems>
                <DataListItems>
                    <DataListItem
                        label="In Collections"
                        value={formatShareValue(
                            metrics.inCollectionCount,
                            itemCount
                        )}
                    />
                    {gapRows.map((row) => (
                        <DataListItem
                            key={row.key}
                            label={row.label}
                            value={row.value}
                        />
                    ))}
                </DataListItems>
            </DataListSection>
        </DataList>
    );
}

export function ComposerActionRemoveDuplicates() {
    const {
        duplicatesFilterEnabled,
        onRemoveDuplicates,
        removableDuplicateCount,
    } = useComposerActionsContext();

    const canRemove = removableDuplicateCount > 0;

    if (!duplicatesFilterEnabled) {
        return null;
    }

    return (
        <ComposerActionButton
            disabled={!canRemove}
            onClick={onRemoveDuplicates}
            title={
                canRemove
                    ? "Remove duplicate bookmarks"
                    : "No duplicates to remove"
            }
        >
            <CopyX className="inline-block size-3.5 shrink-0" />
            &nbsp;Remove duplicates
        </ComposerActionButton>
    );
}

function ComposerActionButton({
    render,
    ...props
}: React.ComponentProps<typeof Toolbar.Button>) {
    return (
        <Toolbar.Button
            {...props}
            render={render ?? <Button size="xs" variant="ghost" />}
        />
    );
}
