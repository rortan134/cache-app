"use client";

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
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import {
    ChevronDownFilledIcon,
    NotionIcon,
    PriorityNoneIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { CtrlKbd, Kbd, KbdGroup } from "@/components/ui/kbd";
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuShortcut,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    Popover,
    PopoverClose,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { useListPanelOpenState } from "@/hooks/use-list-panel-open-state";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import type { LibraryCollectionSummary } from "@/lib/common/types";
import { dayjs } from "@/lib/dayjs";
import { getSourceLabel } from "@/lib/integrations/support";
import type { CollectionPriority } from "@/prisma/client/enums";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import { Toolbar } from "@base-ui/react/toolbar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    ArchiveIcon,
    Clock,
    Component,
    CopyIcon,
    CopyPlus,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Forward,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Trash2Icon,
    UserRoundPlus,
    X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS = 600;

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    notation: "compact",
});

const { useStore: useCollectionsListStateStore } = createStore({
    isCollectionsListOpen: storage(false),
});

export const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>("priority"),
});

export const NAME_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

interface PriorityOption {
    icon: React.ElementType;
    label: string;
    value: CollectionPriority;
}

type CollectionSortField = "count" | "created" | "priority" | "updated";

interface SortingOption {
    icon: React.ElementType;
    label: string;
    value: CollectionSortField;
}

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isHovered: boolean;
}

interface CollectionsListItemMetaProps {
    isSharePending: boolean;
    onCopyLinks: () => void;
    onCopyShareLink: () => void;
    onCopyTitle: () => void;
    onDelete: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
    onRename: () => void;
    shareUrl: string | null;
}

interface CollectionsListSharePopoverProps {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    shareUrl: string | null;
}

interface CollectionsListExportMenuProps {
    hasItems: boolean;
    onCopyLinks: () => void;
    onCopyTitle: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
}

const DEFAULT_PRIORITY_OPTION: PriorityOption = {
    icon: PriorityNoneIcon,
    label: "No priority",
    value: "none",
};

const PRIORITY_OPTIONS = [
    DEFAULT_PRIORITY_OPTION,
    {
        icon: Sparkle,
        label: "Very relevant",
        value: "very_relevant",
    },
    {
        icon: SignalHigh,
        label: "Relevant",
        value: "relevant",
    },
    {
        icon: SignalMedium,
        label: "Background",
        value: "peripheral",
    },
    {
        icon: ArchiveIcon,
        label: "Archive",
        value: "archive",
    },
] satisfies PriorityOption[];

const PRIORITY_OPTION_BY_VALUE = new Map(
    PRIORITY_OPTIONS.map((option) => [option.value, option])
);

const SORTING_OPTIONS = [
    {
        icon: SignalHigh,
        label: "Priority",
        value: "priority",
    },
    {
        icon: Sparkle,
        label: "Created",
        value: "created",
    },
    {
        icon: Clock,
        label: "Updated",
        value: "updated",
    },
    {
        icon: Component,
        label: "Count",
        value: "count",
    },
] satisfies SortingOption[];

const COLLECTION_PRIORITY_ORDER: Record<CollectionPriority, number> = {
    archive: 3,
    none: 4,
    peripheral: 2,
    relevant: 1,
    very_relevant: 0,
};

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

function useCollectionsListOpenState() {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListStateStore();

    return {
        isOpen: isCollectionsListOpen,
        setIsOpen: setIsCollectionsListOpen,
    };
}

function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
}

function useCollectionItemHotkey(
    keys: Parameters<typeof useHotkeys>[0],
    onTrigger: () => void,
    enabled = true
) {
    const { isHovered } = useCollectionsListItemContext();

    useHotkeys(
        keys,
        () => {
            onTrigger();
        },
        {
            enabled: isHovered && enabled,
            preventDefault: true,
        },
        [enabled, isHovered, onTrigger]
    );
}

function useControllableOpenState(
    open: boolean | undefined,
    onOpenChange?: (open: boolean) => void
) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : uncontrolledOpen;

    const setOpen = React.useCallback(
        (nextOpen: boolean) => {
            if (!isControlled) {
                setUncontrolledOpen(nextOpen);
            }

            onOpenChange?.(nextOpen);
        },
        [isControlled, onOpenChange]
    );

    return [resolvedOpen, setOpen] as const;
}

function useCollectionItemPreviewIndex(
    isOpen: boolean,
    thumbnailCount: number
) {
    const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
    const hasMultipleThumbnails = thumbnailCount > 1;

    React.useEffect(() => {
        if (!(isOpen && hasMultipleThumbnails)) {
            setActivePreviewIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setActivePreviewIndex(
                (currentIndex) => (currentIndex + 1) % thumbnailCount
            );
        }, COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [hasMultipleThumbnails, isOpen, thumbnailCount]);

    return activePreviewIndex;
}

function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_OPTION_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY_OPTION;
}

function getCollectionsListItemStyle(name: string, isSelected: boolean) {
    const assignedColor = getHexColorFromName(name);
    const backgroundOpacity = isSelected ? 25 : 5;

    return {
        "--collection-background": `color-mix(in srgb, ${assignedColor} ${backgroundOpacity}%, transparent)`,
        "--focus-ring-color": `color-mix(in srgb, ${assignedColor}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${assignedColor} 16%, black 18%)`,
    } as React.CSSProperties;
}

function compareCollectionNames<
    T extends Pick<LibraryCollectionSummary, "name">,
>(a: T, b: T) {
    return NAME_COLLATOR.compare(a.name, b.name);
}

function compareCollectionPriorities<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(a: T, b: T) {
    const priorityDifference =
        COLLECTION_PRIORITY_ORDER[a.priority] -
        COLLECTION_PRIORITY_ORDER[b.priority];

    if (priorityDifference !== 0) {
        return priorityDifference;
    }

    return compareCollectionNames(a, b);
}

function compareCollectionCreatedAt<
    T extends Pick<LibraryCollectionSummary, "createdAt">,
>(a: T, b: T) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareCollectionUpdatedAt<
    T extends Pick<LibraryCollectionSummary, "updatedAt">,
>(a: T, b: T) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function compareCollectionItemCount<
    T extends Pick<LibraryCollectionSummary, "itemCount">,
>(a: T, b: T) {
    return b.itemCount - a.itemCount;
}

const COLLECTION_SUMMARY_SORTERS = {
    count: compareCollectionItemCount,
    created: compareCollectionCreatedAt,
    priority: compareCollectionPriorities,
    updated: compareCollectionUpdatedAt,
} satisfies Record<
    CollectionSortField,
    (
        a: Pick<
            LibraryCollectionSummary,
            "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
        >,
        b: Pick<
            LibraryCollectionSummary,
            "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
        >
    ) => number
>;

function sortCollectionList<T>(
    collections: T[],
    compare: (a: T, b: T) => number
) {
    return [...collections].sort(compare);
}

function CollectionComboboxOptionRow({
    icon: Icon,
    label,
}: {
    icon: React.ElementType;
    label: string;
}) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
                <Icon className="size-4 text-muted-foreground" />
                <span className="truncate">{label}</span>
            </span>
        </div>
    );
}

function CollectionsListItemPreviewImage({
    alt,
    src,
}: {
    alt: string;
    src?: string;
}) {
    const [didFail, setDidFail] = React.useState(false);
    const canRenderImage = !!src && !didFail;

    if (!canRenderImage) {
        return (
            <div className="flex size-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
                No preview image
            </div>
        );
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Fallback swaps in when the browser cannot render the image.
        <img
            alt={alt}
            className="size-full object-cover"
            height={192}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={src}
            width={288}
        />
    );
}

function CollectionsListSharePopover({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    onEnableShare,
    shareUrl,
}: CollectionsListSharePopoverProps) {
    const shareInputId = React.useId();
    const isShared = Boolean(collection.shareId);

    return (
        <MenuSub>
            <MenuSubTrigger>
                <UserRoundPlus className="size-4 text-muted-foreground" />
                Share
            </MenuSubTrigger>
            <MenuSubPopup>
                <div className="max-w-xs p-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h3 className="font-medium text-sm">
                                Share collection
                            </h3>
                            <p className="text-muted-foreground text-xs leading-snug">
                                Anyone with the link can view this collection.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border bg-muted/40 p-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-xs/5">
                                {isShared ? (
                                    <LinkIcon className="size-4" />
                                ) : (
                                    <LockKeyhole className="size-4" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">
                                    {isShared
                                        ? "Anyone with the link"
                                        : "Only you"}
                                </p>
                                <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                                    {isShared
                                        ? "Shared publicly as a read-only page."
                                        : "Create a short, unlisted read-only link for this collection."}
                                </p>
                            </div>
                        </div>
                    </div>
                    {isShared ? (
                        <div className="mt-4 space-y-3">
                            <div className="space-y-1">
                                <label
                                    className="font-medium text-muted-foreground text-xs"
                                    htmlFor={shareInputId}
                                >
                                    Public link
                                </label>
                                <Input
                                    id={shareInputId}
                                    readOnly
                                    size="sm"
                                    value={shareUrl ?? ""}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-muted-foreground text-xs">
                                    Shared{" "}
                                    {collection.sharedAt
                                        ? dayjs(collection.sharedAt).fromNow()
                                        : "just now"}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        loading={isSharePending}
                                        onClick={onDisableShare}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        Disable
                                    </Button>
                                    <Button
                                        disabled={!shareUrl || isSharePending}
                                        onClick={onCopyShareLink}
                                        size="sm"
                                    >
                                        <CopyIcon className="size-4" />
                                        Copy link
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                Public links stay simple and read-only so your
                                collection can be browsed without signing in.
                            </p>
                            <Button
                                loading={isSharePending}
                                onClick={onEnableShare}
                                size="sm"
                            >
                                Create link
                            </Button>
                        </div>
                    )}
                </div>
            </MenuSubPopup>
        </MenuSub>
    );
}

function CollectionsListExportMenu({
    hasItems,
    onCopyLinks,
    onCopyTitle,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
}: CollectionsListExportMenuProps) {
    return (
        <MenuSub>
            <MenuSubTrigger>
                <Forward className="inline-block size-4 text-muted-foreground" />
                Export
            </MenuSubTrigger>
            <MenuSubPopup>
                <MenuItem onClick={onCopyTitle}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy title
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onCopyLinks}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onOpenLinks}>
                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                    Open all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onExportCsv}>
                    <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                    Export to CSV
                </MenuItem>
                <MenuItem onClick={onMakeCopy}>
                    <CopyPlus className="size-4 text-muted-foreground" />
                    Make a copy
                </MenuItem>
                <MenuItem disabled={!hasItems}>
                    <NotionIcon />
                    Send to Notion
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

export function CollectionsList({
    onOpenChange,
    open,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const state = useCollectionsListOpenState();
    const [isOpen, handleOpenChange] = useListPanelOpenState({
        hotkey: "mod+c",
        onOpenChange,
        open,
        state,
    });

    return (
        <Collapsible onOpenChange={handleOpenChange} open={isOpen} {...props} />
    );
}

export function CollectionsListTrigger({
    className,
    collectionLabels,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
    collectionLabels: string[];
}) {
    const { isOpen } = useCollectionsListOpenState();
    const collectionLabelsText =
        collectionLabels.length > 0
            ? collectionLabels.join(", ")
            : "No collections yet";

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        className={cn(
                            "flex select-none items-center gap-3 rounded-full bg-muted py-2.5 pr-3 pl-4 text-left text-foreground hover:bg-input/50 active:bg-input/30",
                            className
                        )}
                        title={isOpen ? "Collapse group" : "Expand group"}
                        {...props}
                    >
                        <div className="relative">
                            <Component
                                aria-hidden
                                className="inline-block size-5 shrink-0"
                                focusable="false"
                            />
                            <span className="absolute -bottom-[6px] left-[16.2px] text-nowrap text-[10px] tabular-nums opacity-80">
                                {collectionLabels.length}
                            </span>
                        </div>
                        <span className="min-w-0 flex-1 font-medium text-sm leading-tight">
                            Collections
                        </span>
                        <div className="ml-auto flex items-center justify-end gap-0.5">
                            <KbdGroup className="opacity-0 group-hover:opacity-100 group-data-open:opacity-0!">
                                <Kbd>
                                    <CtrlKbd />C
                                </Kbd>
                            </KbdGroup>
                            <ChevronDownFilledIcon />
                        </div>
                    </CollapsibleTrigger>
                }
            />
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="wrap-break-word w-full whitespace-normal font-medium leading-tight">
                    {collectionLabelsText}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

export function CollectionsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

export function CollectionsListActionButton({
    className,
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Button
            className={cn("rounded-full bg-muted hover:bg-input/50", className)}
            size="icon-xl"
            variant="secondary"
            {...props}
        />
    );
}

export function CollectionsListItemPreview({
    onClick: onClickProp,
    thumbnails,
    ...props
}: React.ComponentProps<typeof PreviewCardTrigger> & {
    thumbnails: string[];
}) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const activePreviewIndex = useCollectionItemPreviewIndex(
        isOpen,
        thumbnails.length
    );
    const onClick = useStableCallback(onClickProp);

    return (
        <PreviewCard onOpenChange={setIsOpen}>
            <PreviewCardTrigger
                closeDelay={0}
                onClick={(event) => {
                    onClick?.(event);
                    setIsOpen(false);
                }}
                render={
                    <Button
                        className="w-full min-w-0 flex-1 justify-start rounded-full border-(--focus-ring-color)/7 bg-(--collection-background) px-7.5 text-left focus-visible:ring-(--focus-ring-color) focus-visible:ring-1"
                        variant="ghost"
                    />
                }
                {...props}
            />
            <PreviewCardPopup
                className="pointer-events-none aspect-3/2 p-0"
                positionMethod="fixed"
                side="right"
            >
                <CollectionsListItemPreviewImage
                    alt={`${collection.name} preview`}
                    src={thumbnails[activePreviewIndex]}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

export function CollectionsListItemValue() {
    const { collection } = useCollectionsListItemContext();
    const sourceLabels =
        collection.sources.length > 0
            ? collection.sources.map(getSourceLabel).join(", ")
            : null;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span
                className="max-w-full shrink-0 truncate font-medium text-sm"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {sourceLabels ? (
                <span className="max-w-full flex-1 truncate text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-80">
                    {sourceLabels}
                </span>
            ) : null}
        </div>
    );
}

export function CollectionsListItemPriorityCombobox({
    open,
    onOpenChange,
    onUpdatePriority,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onUpdatePriority: (priority: CollectionPriority) => void;
}) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = useControllableOpenState(open, onOpenChange);
    const selectedOption = getPriorityOption(collection.priority);

    useCollectionItemHotkey(
        "p",
        () => {
            setIsOpen(true);
        },
        !isOpen
    );

    return (
        <Combobox
            autoHighlight
            items={PRIORITY_OPTIONS}
            onOpenChange={setIsOpen}
            onValueChange={(nextPriority) => {
                if (!nextPriority || nextPriority === collection.priority) {
                    return;
                }

                onUpdatePriority(nextPriority);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Change priority for ${collection.name}`}
                        className="absolute top-1/2 left-0.5 z-10 -translate-y-1/2 rounded-full opacity-80 group-hover:opacity-100"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                <selectedOption.icon className="size-4" />
            </ComboboxTrigger>
            <ComboboxPopup positionMethod="fixed">
                <ComboboxInput
                    endAddon={<Kbd>P</Kbd>}
                    placeholder={
                        collection.priority === "none"
                            ? "Set priority to..."
                            : "Change priority to..."
                    }
                />
                <ComboboxEmpty>No matching priorities</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(priorityOption: PriorityOption) => (
                            <ComboboxItem
                                key={priorityOption.value}
                                showIndicatorLast
                                value={priorityOption.value}
                            >
                                <CollectionComboboxOptionRow
                                    icon={priorityOption.icon}
                                    label={priorityOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

export function CollectionsListItem({
    collection,
    isSelected,
    ...props
}: React.ComponentProps<"div"> & {
    children: React.ReactNode;
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}) {
    const [isHovered, setIsHovered] = React.useState(false);
    const style = getCollectionsListItemStyle(collection.name, isSelected);

    return (
        <CollectionsListItemContext value={{ collection, isHovered }}>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover tracking scopes collection-level keyboard shortcuts. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Same as above. */}
            <div
                className="group relative flex select-none items-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ ...style, ...props.style }}
                {...props}
            />
        </CollectionsListItemContext>
    );
}

export function CollectionsListItemMeta({
    isSharePending,
    onCopyLinks,
    onCopyShareLink,
    onCopyTitle,
    onDelete,
    onDisableShare,
    onEnableShare,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
    onRename,
    shareUrl,
}: CollectionsListItemMetaProps) {
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    useCollectionItemHotkey("e", onRename);
    useCollectionItemHotkey(["delete", "backspace"], onDelete);
    useCollectionItemHotkey(
        "c",
        () => {
            if (hasItems) {
                onCopyLinks();
            }
        },
        hasItems
    );

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums transition-opacity focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {COMPACT_NUMBER_FORMATTER.format(collection.itemCount)}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            className="absolute rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
                            size="icon-sm"
                            title={`Collection actions for ${collection.name}`}
                            variant="ghost"
                        />
                    }
                >
                    <EllipsisIcon className="size-4.5" />
                </MenuTrigger>
                <MenuPopup align="start" side="right">
                    <MenuGroup>
                        <MenuGroupLabel>Collection</MenuGroupLabel>
                        <MenuItem onClick={onRename}>
                            <PencilIcon className="size-4 text-muted-foreground" />
                            Rename
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionsListSharePopover
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            onEnableShare={onEnableShare}
                            shareUrl={shareUrl}
                        />
                        <CollectionsListExportMenu
                            hasItems={hasItems}
                            onCopyLinks={onCopyLinks}
                            onCopyTitle={onCopyTitle}
                            onExportCsv={onExportCsv}
                            onMakeCopy={onMakeCopy}
                            onOpenLinks={onOpenLinks}
                        />
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem onClick={onDelete} variant="destructive">
                            <Trash2Icon className="size-4" />
                            Delete
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <p className="text-nowrap p-2 text-[10px] text-muted-foreground leading-none">
                        Last updated {dayjs(collection.updatedAt).fromNow()}
                    </p>
                </MenuPopup>
            </Menu>
        </div>
    );
}

export function CollectionsListStatus({
    className,
    onDismiss,
    tone = "success",
    ...props
}: React.ComponentProps<"p"> & {
    onDismiss: () => void;
    tone?: "error" | "success";
}) {
    if (!props.children) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-2 pt-1 pr-1 pl-3.5">
            <p
                aria-live="polite"
                className={cn(
                    "text-xs leading-tight",
                    tone === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    className
                )}
                role={tone === "error" ? "alert" : "status"}
                {...props}
            />
            <Button onClick={onDismiss} size="xs" variant="ghost">
                Dismiss
            </Button>
        </div>
    );
}

export function CollectionsListFilterClear({
    isVisible,
    ...props
}: React.ComponentProps<typeof Button> & {
    isVisible: boolean;
}) {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-2 pr-1 pl-3.5">
            <p className="text-muted-foreground text-xs">
                Filtering by selected collection
            </p>
            <Button
                aria-label="Clear selected collections"
                size="xs"
                variant="ghost"
                {...props}
            >
                Clear
            </Button>
        </div>
    );
}

export function CollectionsListFilterClearIcon({
    isVisible,
    ...props
}: React.ComponentProps<typeof Button> & {
    isVisible: boolean;
}) {
    if (!isVisible) {
        return null;
    }

    return (
        <Button
            aria-label="Clear selected collections"
            size="icon-xs"
            variant="ghost"
            {...props}
        >
            <X className="size-3" />
        </Button>
    );
}

export function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <p
                className={cn(
                    "font-medium text-foreground text-sm leading-tight",
                    className
                )}
                {...props}
            />
        </div>
    );
}

export function CollectionsListToolbar({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            className={cn(
                "mt-4 mb-1 flex items-center justify-between",
                className
            )}
            {...props}
        />
    );
}

export function CollectionsListToolbarGroup({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Group>) {
    return (
        <Toolbar.Group
            className={cn("flex items-center justify-end gap-1", className)}
            {...props}
        />
    );
}

export function CollectionsListToolbarButton(
    props: React.ComponentProps<typeof Toolbar.Button>
) {
    return <Toolbar.Button {...props} />;
}

export function CollectionsListNoticeCallout() {
    return (
        <div className="flex items-center justify-center gap-1">
            <span aria-live="polite" className="sr-only" role="status">
                Smart Collections is active
            </span>
            <Popover>
                <PopoverTrigger
                    className="group not-sr-only flex cursor-pointer items-center text-nowrap font-medium text-[11px]"
                    openOnHover
                >
                    <GradientWaveText
                        ariaLabel="Smart Collections"
                        className="underline decoration-muted-foreground/20 decoration-dotted underline-offset-2"
                        speed={2.2}
                    >
                        Smart Collections
                    </GradientWaveText>
                    &nbsp;is active{" "}
                    <ChevronDownFilledIcon className="mb-px size-4 rotate-90 group-data-popup-open:opacity-10!" />
                </PopoverTrigger>
                <PopoverPopup align="start" positionMethod="fixed">
                    <Image
                        alt=""
                        aria-hidden
                        className="-mx-(--viewport-inline-padding) -mt-4 aspect-32/9 h-auto max-h-24 w-(--positioner-width) min-w-0 max-w-(--positioner-width) rounded-t-lg"
                        loading="eager"
                        priority
                        src={SmartCollectionsBackgroundImg}
                    />
                    <div className="mt-4 flex max-w-64 flex-col gap-2">
                        <PopoverTitle className="font-medium text-sm">
                            Let Cache do the organizing
                        </PopoverTitle>
                        <PopoverDescription className="text-foreground text-xs">
                            As you add new entries, Cache AI groups your related
                            saves into contextual collections intuitively. Cache
                            also learns your preferences with time.
                        </PopoverDescription>
                        <PopoverClose
                            render={
                                <Button
                                    className="ml-auto"
                                    size="xs"
                                    variant="destructive-outline"
                                />
                            }
                        >
                            Disable
                        </PopoverClose>
                    </div>
                </PopoverPopup>
            </Popover>
        </div>
    );
}

export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: T[]): T[] {
    return sortCollectionList(collections, compareCollectionPriorities);
}

export function sortCollectionSummaries<
    T extends Pick<
        LibraryCollectionSummary,
        "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
    >,
>(collections: T[], sortField: CollectionSortField): T[] {
    return sortCollectionList(
        collections,
        COLLECTION_SUMMARY_SORTERS[sortField] ?? compareCollectionNames
    );
}

export function CollectionsListSortingCombobox(
    props: React.ComponentProps<typeof ComboboxTrigger>
) {
    const { collectionSortField, setCollectionSortField } =
        useCollectionsSortStore();
    const [isOpen, setIsOpen] = React.useState(false);

    useHotkeys(
        "mod+f",
        (event) => {
            event.preventDefault();
            setIsOpen(true);
        },
        {
            enabled: !isOpen,
        },
        [isOpen]
    );

    return (
        <Combobox
            autoHighlight
            items={SORTING_OPTIONS}
            onOpenChange={setIsOpen}
            onValueChange={(nextField) => {
                if (!nextField || nextField === collectionSortField) {
                    return;
                }

                setCollectionSortField(nextField);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collectionSortField}
        >
            <ComboboxTrigger
                render={<Button size="icon-xs" variant="ghost" />}
                title="Sort and organize collections"
                {...props}
            >
                <ListFilter className="size-3" />
            </ComboboxTrigger>
            <ComboboxPopup align="end" positionMethod="fixed">
                <ComboboxInput
                    endAddon={
                        <Kbd>
                            <CtrlKbd />F
                        </Kbd>
                    }
                    placeholder="Sort by..."
                />
                <ComboboxEmpty>No matching sort options</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(sortOption: SortingOption) => (
                            <ComboboxItem
                                key={sortOption.value}
                                showIndicatorLast
                                value={sortOption.value}
                            >
                                <CollectionComboboxOptionRow
                                    icon={sortOption.icon}
                                    label={sortOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}
