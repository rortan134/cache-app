"use client";

import type {
    CommandPaletteGroup,
    CommandPaletteItem,
} from "@/components/library/browser";
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
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { cn } from "@/lib/common/cn";
import {
    Toolbar,
    type AutocompleteRootChangeEventDetails,
} from "@base-ui/react";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Calligraph } from "calligraph";
import { CircleFadingPlus, Grid2x2, Grid2x2X, SquarePen } from "lucide-react";
import * as React from "react";

const COMMAND_MATCH_WORD_SEPARATOR_PATTERN = /[\s:./_-]+/;

export interface PaletteStackEntry {
    chip: React.ReactNode;
    key: string;
    onRemove: () => void;
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
    children,
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    const childrenArray = React.Children.toArray(children);
    const toolbarChildren: React.ReactNode[] = [];
    let suggestionsChild: React.ReactNode = null;

    for (const child of childrenArray) {
        if (React.isValidElement(child) && child.type === ComposerSuggestions) {
            suggestionsChild = child;
        } else {
            toolbarChildren.push(child);
        }
    }

    return (
        <>
            <Toolbar.Root
                {...props}
                className={cn(
                    "w-full max-w-2xl rounded-t-4xl rounded-b-2xl bg-muted/80",
                    className
                )}
            >
                {toolbarChildren}
            </Toolbar.Root>
            {suggestionsChild}
        </>
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
                            endAddon={
                                <ComposerInputEndAddon
                                    stackEntries={stackEntries}
                                />
                            }
                            onKeyDown={onKeyDown}
                            placeholder={placeholder}
                            ref={ref}
                            size="lg"
                        />
                    }
                />
                <CommandPopup className="max-w-2xl">
                    <CommandEmpty>No matching commands found.</CommandEmpty>
                    <CommandStatus />
                    <CommandList className="max-w-2xl">
                        {filteredGroups.map((group) => (
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
                        ))}
                    </CommandList>
                </CommandPopup>
            </CommandPanel>
        </Command>
    );
}

export function ComposerSuggestions({
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
            <CollapsiblePanel
                render={<div className={cn("px-3", className)} {...props} />}
            >
                <ScrollArea className="max-w-full whitespace-nowrap" scrollFade>
                    <div className="flex w-max flex-nowrap items-center gap-1.5">
                        {suggestions.map((suggestion, index) => (
                            <React.Fragment key={suggestion.label}>
                                {children(suggestion, index)}
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
        <ActionButton onClick={onCreateNote}>
            <SquarePen className="inline-block size-3.5 shrink-0" />
            &nbsp;New
        </ActionButton>
    );
}

export function ComposerActionClear() {
    const {
        canClear,
        onClearPalette,
        resultsSummary,
        groupBy,
        sectionsLength,
    } = useComposerActionsContext();

    return (
        <ActionButton onClick={onClearPalette} title="Reset browser">
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
        </ActionButton>
    );
}

export function ComposerActionNewCollection() {
    const { canCreateCollectionFromResults, onCreateResultsDialogOpen } =
        useComposerActionsContext();

    const handleCreateCollection = useStableCallback(() =>
        onCreateResultsDialogOpen(true)
    );

    if (!canCreateCollectionFromResults) {
        return null;
    }

    return (
        <ActionButton onClick={handleCreateCollection}>
            <CircleFadingPlus className="inline-block size-3.5 shrink-0" />
            &nbsp;Collection with results
        </ActionButton>
    );
}

export function ComposerActionOnboarding() {
    const {
        canCreateCollectionFromResults,
        connectedIntegrationCount,
        onCreateCollection,
        onCreateNote,
        onOpenCommandFromOnboarding,
    } = useComposerActionsContext();

    if (canCreateCollectionFromResults) {
        return null;
    }

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
    canCreateCollectionFromResults: boolean;
    children: React.ReactNode;
    className?: string;
    connectedIntegrationCount: number;
    groupBy: string;
    onClearPalette: () => void;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onCreateResultsDialogOpen: (open: boolean) => void;
    onOpenCommandFromOnboarding: () => void;
    resultsSummary: string;
    sectionsLength: number;
}

interface ComposerSuggestionsProps
    extends Omit<React.ComponentProps<"div">, "children"> {
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
            index++;
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
            <TruncateAfter
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
            </TruncateAfter>
        </>
    );
}

function ComposerInputShortcuts() {
    return (
        <>
            <Kbd className="border-none text-muted-foreground opacity-50 group-data-popup-open/input:opacity-0">
                <CmdKbd />G
            </Kbd>
            <span className="absolute right-3 flex items-center gap-0.5 text-nowrap opacity-0 group-data-popup-open/input:opacity-100">
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
    return (
        <CommandItem
            className={cn(
                isHorizontal &&
                    "group relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
            )}
            disabled={item.disabled}
            key={item.value}
            onClick={item.onSelect}
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

function ActionButton({
    onClick,
    title,
    children,
}: {
    onClick: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <Toolbar.Button
            render={
                <Button
                    className="rounded-full"
                    onClick={onClick}
                    size="xs"
                    title={title}
                    variant="ghost"
                >
                    {children}
                </Button>
            }
        />
    );
}
