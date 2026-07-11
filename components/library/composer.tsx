"use client";

import { OnboardingMenu } from "@/components/library/onboarding";
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
import { DisclosureListHorizontal } from "@/components/ui/disclosure-list";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    MetricsDataList,
    MetricsDataListItem,
    MetricsPanel,
    MetricsPanelChart,
    MetricsPanelHeader,
    MetricsPanelTitle,
} from "@/components/ui/metrics-panel";
import {
    Popover,
    PopoverClose,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { LibraryMetricsSnapshot } from "@/lib/collections/metrics";
import { cn } from "@/lib/common/cn";
import { formatPercent } from "@/lib/common/numbers";
import {
    Toolbar,
    type AutocompleteRootChangeEventDetails,
    type BaseUIEvent,
} from "@base-ui/react";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Calligraph } from "calligraph";
import { ChevronDown, Grid2x2, Grid2x2X, SquarePen } from "lucide-react";
import * as React from "react";

const COMMAND_MATCH_WORD_SEPARATOR_PATTERN = /[\s:./_-]+/;

export interface PaletteStackEntry {
    chip: React.ReactNode;
    key: string;
    onRemove: () => void;
}

export interface CommandPaletteItem {
    active?: boolean;
    description?: string;
    disabled?: boolean;
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

type ComposerActionsContextValue = Omit<
    ComposerActionsProps,
    "children" | "className"
>;

const ComposerActionsContext =
    React.createContext<ComposerActionsContextValue | null>(null);

function useComposerActionsContext(): ComposerActionsContextValue {
    const context = React.use(ComposerActionsContext);
    if (!context) {
        throw new Error(
            "ComposerActions sub-components must be used inside <ComposerActions>."
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
                "w-full max-w-2xl rounded-t-4xl rounded-b-2xl bg-muted/80",
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
    const filteredGroups = useGetVisibleGroups({ groups, query });

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
                <CommandPopup className="max-w-2xl">
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
                                                />
                                            )}
                                        </CommandCollection>
                                    </CommandRow>
                                ) : (
                                    <CommandCollection>
                                        {(item: CommandPaletteItem) => (
                                            <CommandPaletteItemComponent
                                                isHorizontal={false}
                                                item={item}
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

export function ComposerSuggestionsList({
    children,
    suggestions,
    className,
    open: openProp,
    onOpenChange: onOpenChangeProp,
    ...props
}: ComposerSuggestionsProps) {
    const [internalOpen, setInternalOpen] = React.useState(true);
    const open = openProp ?? internalOpen;
    const setOpen = onOpenChangeProp ?? setInternalOpen;

    const handleDismiss = useStableCallback(() => setOpen(false));

    if (suggestions.length === 0) {
        return null;
    }

    const dismissSuggestion: CommandSuggestion = {
        label: "Dismiss",
        onSelect: handleDismiss,
    };

    return (
        <Collapsible
            className="relative -mt-1"
            onOpenChange={setOpen}
            open={open}
        >
            <CollapsiblePanel {...props} className={cn("px-3", className)}>
                <ScrollArea
                    className="max-w-full whitespace-nowrap"
                    shouldScrollFade
                >
                    <div className="flex w-max flex-nowrap items-center gap-1.5">
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
                    <ScrollBar className="hidden" orientation="horizontal" />
                </ScrollArea>
            </CollapsiblePanel>
        </Collapsible>
    );
}

export function ComposerActions({
    children,
    className,
    ...value
}: ComposerActionsProps) {
    return (
        <ComposerActionsContext value={value}>
            <Toolbar.Group
                className={cn("flex items-center gap-2.5 px-3 py-2", className)}
            >
                {children}
            </Toolbar.Group>
        </ComposerActionsContext>
    );
}

export function ComposerActionNew() {
    const { onCreateNote } = useComposerActionsContext();

    return (
        <ActionButton onClick={onCreateNote} title="New">
            <SquarePen className="inline-block size-3.5 shrink-0" />
            &nbsp;New
        </ActionButton>
    );
}

export function ComposerActionSummary({
    className,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { canClear, groupBy, resultsSummary, sectionsLength } =
        useComposerActionsContext();

    return (
        <Button
            {...props}
            className={cn("rounded-full", className)}
            size="xs"
            variant="ghost"
        >
            {canClear ? (
                <Grid2x2X className="inline-block size-3.5 shrink-0" />
            ) : (
                <Grid2x2 className="inline-block size-3.5 shrink-0" />
            )}
            <span className="tabular-nums">
                &nbsp;Showing <Calligraph>{resultsSummary}</Calligraph>
                {groupBy === "none" ? null : (
                    <>
                        , <Calligraph>{sectionsLength}</Calligraph> section
                        {sectionsLength === 1 ? "" : "s"}
                    </>
                )}
            </span>
            <ChevronDown className="inline-block size-3.5 shrink-0" />
        </Button>
    );
}

export function ComposerActionMetrics() {
    const { canClear, metrics, onClearPalette } = useComposerActionsContext();

    return (
        <Popover>
            <Toolbar.Button
                render={
                    <PopoverTrigger
                        openOnHover
                        render={<ComposerActionSummary />}
                    />
                }
            />
            <PopoverPopup align="start" positionMethod="fixed" side="top">
                <ComposerLibraryMetricsPanel
                    canClear={canClear}
                    metrics={metrics}
                    onClearPalette={onClearPalette}
                />
            </PopoverPopup>
        </Popover>
    );
}

export function ComposerActionOnboarding() {
    const {
        connectedIntegrationCount,
        onCreateCollection,
        onCreateNote,
        onOpenCommandFromOnboarding,
    } = useComposerActionsContext();

    return (
        <OnboardingMenu
            connectedIntegrationCount={connectedIntegrationCount}
            onCreateCollection={onCreateCollection}
            onCreateNote={onCreateNote}
            onOpenCommand={onOpenCommandFromOnboarding}
        />
    );
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

interface ComposerActionsProps {
    canClear: boolean;
    children: React.ReactNode;
    className?: string;
    connectedIntegrationCount: number;
    groupBy: string;
    metrics: LibraryMetricsSnapshot;
    onClearPalette: () => void;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onOpenCommandFromOnboarding: () => void;
    resultsSummary: string;
    sectionsLength: number;
}

interface ComposerSuggestionsProps
    extends Omit<React.ComponentProps<typeof CollapsiblePanel>, "children"> {
    children: (suggestion: CommandSuggestion, index: number) => React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    suggestions: CommandSuggestion[];
}

function useGetVisibleGroups({
    groups,
    query,
}: {
    groups: CommandPaletteGroup[];
    query: string;
}): CommandPaletteGroup[] {
    const filter = useCommandFilter();

    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 0) {
        return groups;
    }

    const lowerQuery = normalizedQuery.toLowerCase();
    const visibleGroups: CommandPaletteGroup[] = [];

    for (const group of groups) {
        const rankedItems: RankedCommandPaletteItem[] = [];

        let index = 0;
        for (const item of group.items) {
            const score = getCommandItemScore(
                filter,
                item,
                normalizedQuery,
                lowerQuery
            );
            if (score !== null) {
                rankedItems.push({
                    item,
                    rank: { index, score },
                });
            }
            index += 1;
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

function getCommandItemScore(
    filter: ReturnType<typeof useCommandFilter>,
    item: CommandPaletteItem,
    query: string,
    lowerQuery: string
): number | null {
    const label = item.label;
    const value = item.value;
    const description = item.description ?? "";

    if (label.trim().toLowerCase() === lowerQuery) {
        return 0;
    }
    if (filter.startsWith(label, query)) {
        return 1;
    }
    for (const word of label.split(COMMAND_MATCH_WORD_SEPARATOR_PATTERN)) {
        if (filter.startsWith(word, query)) {
            return 2;
        }
    }
    if (filter.contains(label, query)) {
        return 3;
    }
    if (filter.startsWith(value, query)) {
        return 4;
    }
    if (filter.contains(value, query)) {
        return 5;
    }
    if (description !== "" && filter.contains(description, query)) {
        return 6;
    }

    return null;
}

function ComposerInputEndAddon({
    stackEntries,
}: {
    stackEntries: PaletteStackEntry[];
}) {
    return (
        <>
            {stackEntries.length === 0 ? <ComposerInputShortcuts /> : null}
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

function ComposerInputShortcuts() {
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
    isHorizontal,
}: {
    item: CommandPaletteItem;
    isHorizontal: boolean;
}) {
    const onSelect = useStableCallback(item.onSelect);

    return (
        <CommandItem
            className={cn(
                isHorizontal &&
                    "group relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
            )}
            disabled={item.disabled}
            key={item.value}
            onClick={onSelect}
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
                    {item.active ? (
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

function ComposerLibraryMetricsPanel({
    canClear,
    metrics,
    onClearPalette,
}: {
    canClear: boolean;
    metrics: LibraryMetricsSnapshot;
    onClearPalette: () => void;
}) {
    const sourceTotal = metrics.sourceSegments.reduce(
        (sum, segment) => sum + segment.value,
        0
    );

    return (
        <MetricsPanel>
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
            <MetricsPanelHeader>
                <MetricsPanelTitle render={<PopoverTitle />}>
                    Display Breakdown
                </MetricsPanelTitle>
            </MetricsPanelHeader>
            <MetricsPanelChart segments={metrics.sourceSegments} />
            {metrics.sourceSegments.length > 0 ? (
                <MetricsDataList>
                    {metrics.sourceSegments.map((segment) => (
                        <MetricsDataListItem
                            color={segment.color}
                            key={segment.key}
                            label={segment.label}
                            value={formatSegmentValue(
                                segment.value,
                                sourceTotal
                            )}
                        />
                    ))}
                </MetricsDataList>
            ) : null}
            <MetricsDataList>
                <MetricsDataListItem
                    label="Favorites"
                    value={metrics.favoriteCount}
                />
                <MetricsDataListItem
                    label="Not in collections"
                    value={metrics.uncollectedCount}
                />
                <MetricsDataListItem
                    label="In collections"
                    value={metrics.inCollectionCount}
                />
                <MetricsDataListItem label="Notes" value={metrics.noteCount} />
            </MetricsDataList>
        </MetricsPanel>
    );
}

function formatSegmentValue(value: number, total: number): string {
    if (total <= 0) {
        return String(value);
    }
    const percent = (value / total) * 100;
    return `${value} · ${formatPercent(percent)}`;
}

function ActionButton({
    className,
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Toolbar.Button
            render={
                <Button
                    {...props}
                    className={cn("rounded-full", className)}
                    size="xs"
                    variant="ghost"
                />
            }
        />
    );
}
