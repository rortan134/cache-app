"use client";

import { OnboardingMenu } from "@/components/library/onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    CommandPopup,
    CommandRow,
    CommandShortcut,
    CommandStatus,
} from "@/components/ui/command";
import { CmdKbd, Kbd, KbdGroup } from "@/components/ui/kbd";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { cn } from "@/lib/common/cn";
import {
    Toolbar,
    type AutocompleteRootChangeEventDetails,
    type BaseUIEvent,
} from "@base-ui/react";
import { Calligraph } from "calligraph";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CircleFadingPlus,
    CornerDownLeftIcon,
    Grid2x2,
    Grid2x2X,
    SquarePen,
} from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";

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

interface PaletteStackEntry {
    chip: ReactNode;
    key: string;
    onRemove: () => void;
}

interface CommandSuggestion {
    icon: ReactNode;
    label: string;
    onSelect: () => void;
}

interface ComposerInputProps {
    canClear: boolean;
    commandListOpen: boolean;
    commandPanelContainerRef: React.RefObject<HTMLDivElement | null>;
    inputPlaceholder: string;
    onCommandInputChange: (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    onCommandOpenChange: (
        nextOpen: boolean,
        eventDetails: AutocompleteRootChangeEventDetails
    ) => void;
    onPaletteInputKeyDown: (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => void;
    paletteGroups: CommandPaletteGroup[];
    paletteInput: string;
    paletteInputRef: React.RefObject<HTMLInputElement | null>;
    paletteStackEntries: PaletteStackEntry[];
    visiblePaletteGroups: CommandPaletteGroup[];
}

export function ComposerInput({
    paletteInput,
    commandListOpen,
    onCommandInputChange,
    onCommandOpenChange,
    onPaletteInputKeyDown,
    inputPlaceholder,
    paletteGroups,
    visiblePaletteGroups,
    commandPanelContainerRef,
    paletteInputRef,
    paletteStackEntries,
    canClear,
}: ComposerInputProps) {
    return (
        <Command
            filter={null}
            filteredItems={visiblePaletteGroups.map((group) => ({
                items: group.items,
            }))}
            items={paletteGroups.map((group) => ({
                items: group.items,
            }))}
            onOpenChange={onCommandOpenChange}
            onValueChange={onCommandInputChange}
            open={commandListOpen}
            value={paletteInput}
        >
            <CommandPanel ref={commandPanelContainerRef}>
                <Toolbar.Input
                    render={
                        <CommandInput
                            endAddon={
                                <>
                                    {paletteStackEntries.length === 0 ? (
                                        <Kbd className="border-none text-muted-foreground opacity-50">
                                            <CmdKbd />G
                                        </Kbd>
                                    ) : (
                                        <span className="mr-1 flex items-center gap-0.5">
                                            <Kbd className="border-none text-muted-foreground opacity-50">
                                                Tab
                                            </Kbd>
                                            <span className="text-muted-foreground text-xs opacity-50">
                                                Ask Cache
                                            </span>
                                        </span>
                                    )}
                                    <TruncateAfter
                                        badgeRender={
                                            <Badge
                                                className="inline-flex h-7! cursor-pointer rounded-full text-xs tabular-nums"
                                                render={
                                                    <button type="button" />
                                                }
                                                variant="secondary"
                                            />
                                        }
                                        className="justify-end"
                                        maxVisible={1}
                                    >
                                        {paletteStackEntries.map(
                                            (entry) => entry.chip
                                        )}
                                    </TruncateAfter>
                                </>
                            }
                            onKeyDown={onPaletteInputKeyDown}
                            placeholder={inputPlaceholder}
                            ref={paletteInputRef}
                            size="lg"
                        />
                    }
                />
                <CommandPopup>
                    <CommandEmpty>No matching commands found.</CommandEmpty>
                    <CommandStatus />
                    <CommandList>
                        {visiblePaletteGroups.map((group) => (
                            <CommandGroup items={group.items} key={group.label}>
                                <CommandGroupLabel>
                                    {group.label}
                                </CommandGroupLabel>
                                {group.layout === "horizontal" ? (
                                    <CommandRow className="gap-2 pt-1 pr-2 pb-4">
                                        <CommandCollection>
                                            {(item: CommandPaletteItem) => (
                                                <CommandItem
                                                    className="group relative flex-1 overflow-hidden rounded-xl bg-accent text-accent-foreground shadow-xs"
                                                    disabled={item.disabled}
                                                    key={item.value}
                                                    onClick={item.onSelect}
                                                    value={item.value}
                                                >
                                                    {item.render ? (
                                                        item.render(item)
                                                    ) : (
                                                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                            <div className="truncate">
                                                                {item.label}
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
                                    </CommandRow>
                                ) : (
                                    <CommandCollection>
                                        {(item: CommandPaletteItem) => (
                                            <CommandItem
                                                disabled={item.disabled}
                                                key={item.value}
                                                onClick={item.onSelect}
                                                value={item.value}
                                            >
                                                {item.render ? (
                                                    item.render(item)
                                                ) : (
                                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                        <div className="truncate">
                                                            {item.label}
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
                                                                {item.shortcut}
                                                            </CommandShortcut>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </CommandItem>
                                        )}
                                    </CommandCollection>
                                )}
                            </CommandGroup>
                        ))}
                    </CommandList>
                    <CommandFooter>
                        {canClear ? (
                            <div className="mr-auto flex items-center gap-1.5">
                                <span className="font-medium">Back</span>
                                <Kbd>Esc</Kbd>
                            </div>
                        ) : null}
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium">Navigate</span>
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
                            <span className="font-medium">Open Command</span>
                            <Kbd>
                                <CornerDownLeftIcon />
                            </Kbd>
                        </div>
                    </CommandFooter>
                </CommandPopup>
            </CommandPanel>
        </Command>
    );
}

interface ComposerActionsContextValue {
    canClear: boolean;
    canCreateCollectionFromResults: boolean;
    connectedIntegrationCount: number;
    groupBy: string;
    isNewUser: boolean;
    onClearPalette: () => void;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onCreateResultsDialogOpen: (open: boolean) => void;
    onOpenCommandFromOnboarding: () => void;
    resultsSummary: string;
    sectionsLength: number;
}

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

interface ComposerActionsProps {
    canClear: boolean;
    canCreateCollectionFromResults: boolean;
    children: ReactNode;
    connectedIntegrationCount: number;
    groupBy: string;
    isNewUser: boolean;
    onClearPalette: () => void;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onCreateResultsDialogOpen: (open: boolean) => void;
    onOpenCommandFromOnboarding: () => void;
    resultsSummary: string;
    sectionsLength: number;
}

export function ComposerActions({ children, ...value }: ComposerActionsProps) {
    return (
        <ComposerActionsContext.Provider value={value}>
            <Toolbar.Group className="flex items-center gap-2 px-3 py-2">
                {children}
            </Toolbar.Group>
        </ComposerActionsContext.Provider>
    );
}

export function ComposerActionNew() {
    const { onCreateNote } = useComposerActionsContext();
    return (
        <Toolbar.Button
            render={
                <Button
                    className="rounded-full"
                    onClick={onCreateNote}
                    size="xs"
                    variant="ghost"
                >
                    <SquarePen className="inline-block size-3.5 shrink-0" />
                    &nbsp;New
                </Button>
            }
        />
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
        <Toolbar.Button
            render={
                <Button
                    className="rounded-full"
                    onClick={onClearPalette}
                    size="xs"
                    title="Reset browser"
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
                                , <Calligraph>{sectionsLength}</Calligraph>{" "}
                                group
                                {sectionsLength === 1 ? "" : "s"}
                            </>
                        )}
                    </span>
                </Button>
            }
        />
    );
}

export function ComposerActionNewCollection() {
    const { canCreateCollectionFromResults, onCreateResultsDialogOpen } =
        useComposerActionsContext();

    if (!canCreateCollectionFromResults) {
        return null;
    }

    return (
        <Toolbar.Button
            render={
                <Button
                    className="rounded-full"
                    onClick={() => onCreateResultsDialogOpen(true)}
                    size="xs"
                    variant="ghost"
                >
                    <CircleFadingPlus className="inline-block size-4 shrink-0" />
                    &nbsp;Collection with results
                </Button>
            }
        />
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

interface ComposerSuggestionsProps
    extends Omit<React.ComponentProps<"div">, "children"> {
    children: (suggestion: CommandSuggestion, index: number) => ReactNode;
    suggestions: CommandSuggestion[];
}

export function ComposerSuggestions({
    children,
    suggestions,
    className,
    ...props
}: ComposerSuggestionsProps) {
    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className={cn("relative -mt-1 px-3", className)} {...props}>
            <ScrollArea className="max-w-full whitespace-nowrap" scrollFade>
                <div className="flex w-max flex-nowrap items-center gap-1.5">
                    {suggestions.map((suggestion, index) => (
                        <React.Fragment key={suggestion.label}>
                            {children(suggestion, index)}
                            <span className="mr-0.5 -ml-0.5 font-medium text-muted-foreground text-xs last:hidden">
                                ·
                            </span>
                        </React.Fragment>
                    ))}
                </div>
                <ScrollBar className="hidden" orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

export function Composer({
    children,
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    const childrenArray = React.Children.toArray(children);

    const toolbarChildren: ReactNode[] = [];
    let suggestionsChild: ReactNode = null;

    // Enforce structure
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
                className={cn(
                    "max-w-xl rounded-t-4xl rounded-b-2xl bg-muted/80",
                    className
                )}
                {...props}
            >
                {toolbarChildren}
            </Toolbar.Root>
            {suggestionsChild}
        </>
    );
}
