"use client";

import type {
    AutocompleteRootChangeEventDetails,
    BaseUIEvent,
} from "@base-ui/react";
import { Toolbar } from "@base-ui/react/toolbar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Calligraph } from "calligraph";
import { T } from "gt-next";
import { CopyX, Grid2x2, Grid2x2X, SquarePen } from "lucide-react";
import * as React from "react";
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
    DataListGroup,
    DataListHeader,
    DataListItem,
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
import { formatSharePercent } from "@/lib/common/number";

const MATCH_WORD_SEPARATOR_PATTERN = /[\s:./_-]+/;

export interface ComposerPaletteStackEntry {
    chip: React.ReactNode;
    key: string;
    onRemove: () => void;
}

export interface ComposerPaletteItem {
    description?: string;
    disabled?: boolean;
    isActive?: boolean;
    label: string;
    onSelect: (
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void | Promise<void>;
    render?: (item: ComposerPaletteItem) => React.ReactNode;
    shortcut?: string;
    value: string;
}

export interface ComposerPaletteGroup {
    items: ComposerPaletteItem[];
    label: string;
    layout?: "horizontal" | "vertical";
}

export interface ComposerSuggestion {
    icon?: React.ReactNode;
    label: string;
    onSelect: () => void;
}

interface ComposerItemRank {
    index: number;
    score: number;
}

interface ComposerItemSearchFields {
    lowerDescription: string;
    lowerLabel: string;
    lowerValue: string;
    words: string[];
}

interface RankedComposerItem {
    item: ComposerPaletteItem;
    rank: ComposerItemRank;
}

interface ComposerActions {
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

interface ComposerActionsContext extends ComposerActions {
    metrics: LibraryMetricsSnapshot;
}

const log = createLogger("library:composer");

const ComposerActionsContext =
    React.createContext<ComposerActionsContext | null>(null);

function useComposerActionsContext(): ComposerActionsContext {
    const context = React.use(ComposerActionsContext);
    if (!context) {
        throw new Error(
            "Composer action components must be used inside <ComposerActionsList>."
        );
    }
    return context;
}

interface UseVisibleItemGroupsProps {
    groups: ComposerPaletteGroup[];
    isOpen: boolean;
    query: string;
}

function useVisibleItemGroups({
    groups,
    isOpen,
    query,
}: UseVisibleItemGroupsProps): ComposerPaletteGroup[] {
    const filter = useCommandFilter();

    const normalizedQuery = query.trim();
    if (!isOpen || normalizedQuery.length === 0) {
        return groups;
    }

    const lowerQuery = normalizedQuery.toLowerCase();
    const visibleGroups: ComposerPaletteGroup[] = [];

    for (const group of groups) {
        const rankedItems: RankedComposerItem[] = [];

        for (const [index, item] of group.items.entries()) {
            const score = getComposerItemScore(filter, item, lowerQuery);
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

function getComposerItemSearchFields(
    item: ComposerPaletteItem
): ComposerItemSearchFields {
    const lowerLabel = item.label.trim().toLowerCase();
    return {
        lowerDescription: (item.description ?? "").toLowerCase(),
        lowerLabel,
        lowerValue: item.value.toLowerCase(),
        words: lowerLabel.split(MATCH_WORD_SEPARATOR_PATTERN),
    };
}

function getComposerItemScore(
    filter: ReturnType<typeof useCommandFilter>,
    item: ComposerPaletteItem,
    lowerQuery: string
): number | null {
    const { lowerDescription, lowerLabel, lowerValue, words } =
        getComposerItemSearchFields(item);

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

export function Composer({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            {...props}
            className={cn(
                "squircle sticky top-1 z-50 w-full max-w-2xl overflow-clip rounded-t-3xl rounded-b-3xl bg-muted",
                className
            )}
        />
    );
}

interface ComposerInputProps extends React.ComponentProps<typeof CommandInput> {
    containerRef: React.RefObject<HTMLDivElement | null>;
    groups: ComposerPaletteGroup[];
    isOpen: boolean;
    onOpenChange: (
        nextOpen: boolean,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    onValueChange: (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    query: string;
    stackEntries: ComposerPaletteStackEntry[];
}

export function ComposerInput({
    query,
    isOpen,
    onValueChange,
    onOpenChange,
    groups,
    containerRef,
    stackEntries,
    ...props
}: ComposerInputProps) {
    const filteredItemGroups = useVisibleItemGroups({ groups, isOpen, query });

    return (
        <Command
            filteredItems={filteredItemGroups}
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
                            {...props}
                            autoCapitalize="sentences"
                            autoCorrect="on"
                            className="squircle"
                            endAddon={
                                <ComposerInputEndAddon
                                    stackEntries={stackEntries}
                                />
                            }
                            inputMode="text"
                            size="lg"
                            spellCheck="true"
                            translate="no"
                        />
                    }
                />
                <CommandPopup className="max-w-2xl" positionMethod="fixed">
                    <CommandEmpty>
                        <T>No matching commands</T>
                    </CommandEmpty>
                    <CommandStatus />
                    <CommandList className="max-w-2xl">
                        {(group: ComposerPaletteGroup) => {
                            const isHorizontal = group.layout === "horizontal";
                            const items = (
                                <CommandCollection>
                                    {(item: ComposerPaletteItem) => (
                                        <ComposerItem
                                            isHorizontal={isHorizontal}
                                            item={item}
                                            key={item.value}
                                        />
                                    )}
                                </CommandCollection>
                            );

                            return (
                                <CommandGroup
                                    items={group.items}
                                    key={group.label}
                                >
                                    <CommandGroupLabel>
                                        {group.label}
                                    </CommandGroupLabel>
                                    {isHorizontal ? (
                                        <CommandRow className="grid grid-cols-2 gap-2 pt-1 pr-2 pb-4 md:grid-cols-3 lg:grid-cols-4">
                                            {items}
                                        </CommandRow>
                                    ) : (
                                        items
                                    )}
                                </CommandGroup>
                            );
                        }}
                    </CommandList>
                </CommandPopup>
            </CommandPanel>
        </Command>
    );
}

interface ComposerInputEndAddonProps {
    stackEntries: ComposerPaletteStackEntry[];
}

function ComposerInputEndAddon({ stackEntries }: ComposerInputEndAddonProps) {
    return (
        <>
            {stackEntries.length === 0 ? (
                <ComposerInputEndAddonShortcut />
            ) : null}
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

function ComposerInputEndAddonShortcut() {
    return (
        <>
            <Kbd className="border-none text-muted-foreground opacity-50 group-data-popup-open/input:opacity-0">
                <CmdKbd />G
            </Kbd>
            <span className="absolute right-3.5 flex items-center gap-0.5 text-nowrap opacity-0 group-data-popup-open/input:opacity-100 dark:gap-1">
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

interface ComposerActionsListProps
    extends React.ComponentProps<typeof Toolbar.Group>,
        ComposerActions {
    metrics: LibraryMetricsSnapshot;
}

export function ComposerActionsList({
    className,
    canClear,
    duplicatesFilterEnabled,
    groupBy,
    metrics,
    onClearPalette,
    onCreateNote,
    onRemoveDuplicates,
    removableDuplicateCount,
    resultsSummary,
    sectionsLength,
    ...props
}: ComposerActionsListProps) {
    const contextValue: ComposerActionsContext = {
        canClear,
        duplicatesFilterEnabled,
        groupBy,
        metrics,
        onClearPalette,
        onCreateNote,
        onRemoveDuplicates,
        removableDuplicateCount,
        resultsSummary,
        sectionsLength,
    };

    return (
        <ComposerActionsContext value={contextValue}>
            <ScrollArea className="h-fit" shouldScrollFade>
                <Toolbar.Group
                    {...props}
                    className={cn(
                        "flex items-center gap-2.5 text-nowrap px-3 py-2",
                        className
                    )}
                />
            </ScrollArea>
        </ComposerActionsContext>
    );
}

export function ComposerActionNew() {
    const { onCreateNote } = useComposerActionsContext();

    return (
        <ComposerActionTrigger onClick={onCreateNote} title="Add new">
            <SquarePen className="inline-block size-3.5 shrink-0" />
            &nbsp;Add new
        </ComposerActionTrigger>
    );
}

export function ComposerActionMetrics() {
    return (
        <Popover>
            <PopoverTrigger openOnHover render={<ComposerMetricsTrigger />} />
            <PopoverPopup align="start" side="top">
                <ComposerMetricsPopoverPanel />
            </PopoverPopup>
        </Popover>
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
        <ComposerActionTrigger
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
        </ComposerActionTrigger>
    );
}

interface ComposerItemProps {
    isHorizontal?: boolean;
    item: ComposerPaletteItem;
}

function ComposerItem({ item, isHorizontal = false }: ComposerItemProps) {
    const onSelect = item.onSelect;

    const handleSelect = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent>) => {
            const result = onSelect(event);
            if (result) {
                result.catch((error: unknown) => {
                    log.error("ComposerItem selection failed", error, {
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
                    "group squircle relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
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

function ComposerMetricsTrigger(props: React.ComponentProps<typeof Button>) {
    const { canClear, groupBy, resultsSummary, sectionsLength } =
        useComposerActionsContext();

    return (
        <ComposerActionTrigger {...props}>
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
        </ComposerActionTrigger>
    );
}

function ComposerMetricsPopoverPanel() {
    const { canClear, metrics, onClearPalette } = useComposerActionsContext();

    const {
        duplicateCount,
        favoriteCount,
        inCollectionCount,
        itemCount,
        noteCount,
        sourceSegments,
        uncollectedCount,
        unreachableCount,
    } = metrics;

    const additionalRows = [
        {
            key: "uncollected",
            label: "Not in Collections",
            value: uncollectedCount,
        },
        {
            key: "duplicates",
            label: "Duplicates",
            value: duplicateCount,
        },
        {
            key: "unreachable",
            label: "Unreachable",
            value: unreachableCount,
        },
    ].filter((row) => row.value > 0);

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
                <DataListGroup>
                    {sourceSegments.map((segment) => (
                        <DataListItem
                            color={segment.color}
                            key={segment.key}
                            label={segment.label}
                            value={formatShareValue(segment.value, itemCount)}
                        />
                    ))}
                </DataListGroup>
            </DataListSection>
            <DataListSection>
                <DataListGroup>
                    <DataListItem
                        label="Favorites"
                        value={formatShareValue(favoriteCount, itemCount)}
                    />
                    <DataListItem
                        label="Notes"
                        value={formatShareValue(noteCount, itemCount)}
                    />
                </DataListGroup>
                <DataListGroup>
                    <DataListItem
                        label="In Collections"
                        value={formatShareValue(inCollectionCount, itemCount)}
                    />
                    {additionalRows.map((row) => (
                        <DataListItem
                            key={row.key}
                            label={row.label}
                            value={formatShareValue(row.value, itemCount)}
                        />
                    ))}
                </DataListGroup>
            </DataListSection>
        </DataList>
    );
}

function ComposerActionTrigger({
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

interface ComposerSuggestionsListProps
    extends Omit<React.ComponentProps<typeof CollapsiblePanel>, "children"> {
    children: (
        suggestion: ComposerSuggestion,
        index: number
    ) => React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    suggestions: ComposerSuggestion[];
}

export function ComposerSuggestionsList({
    children,
    suggestions,
    className,
    isOpen: isOpenProp,
    onOpenChange: onOpenChangeProp,
    ...props
}: ComposerSuggestionsListProps) {
    const [internalOpen, setInternalOpen] = React.useState(true);
    const isOpen = isOpenProp ?? internalOpen;
    const setIsOpen = useStableCallback((open: boolean) => {
        onOpenChangeProp?.(open);
        if (isOpenProp === undefined) {
            setInternalOpen(open);
        }
    });

    const handleDismiss = useStableCallback(() => setIsOpen(false));

    const dismissSuggestion: ComposerSuggestion = {
        label: "Dismiss",
        onSelect: handleDismiss,
    };

    if (!suggestions.length) {
        return null;
    }

    return (
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
            <CollapsiblePanel
                {...props}
                className={cn("px-3", className)}
                render={<ScrollArea shouldScrollFade />}
            >
                <div className="flex w-max select-none flex-nowrap items-center gap-1.5 text-nowrap">
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
            </CollapsiblePanel>
        </Collapsible>
    );
}
