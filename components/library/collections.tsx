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
import { CtrlKbd, Kbd, KbdGroup } from "@/components/ui/kbd";
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuSeparator,
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
import { cn } from "@/lib/cn";
import { getHexColorFromName } from "@/lib/colors";
import { getSourceLabel } from "@/lib/integrations/support";
import type { LibraryCollectionSummary } from "@/lib/types";
import type { CollectionPriority } from "@/prisma/client/enums";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import { Toolbar } from "@base-ui/react/toolbar";
import {
    ArchiveIcon,
    Clock,
    Component,
    CopyIcon,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Forward,
    ListFilter,
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

const COLLECTION_ITEM_PREVIEW_CLOSE_DELAY_MS = 20;
const COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS = 600;

const { useStore: useCollectionsListStateStore } = createStore({
    isCollectionsListOpen: storage(false),
});

export function useCollectionsListOpenState() {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListStateStore();

    return {
        isCollectionsListOpen,
        setIsCollectionsListOpen,
    };
}

export function CollectionsList({
    onOpenChange,
    open,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListOpenState();
    const isControlled = open !== undefined;

    useHotkeys(
        "mod+c",
        () => setIsCollectionsListOpen(!isCollectionsListOpen),
        {
            preventDefault: true,
        },
        [isCollectionsListOpen, setIsCollectionsListOpen]
    );

    return (
        <Collapsible
            onOpenChange={(nextOpen, eventDetails) => {
                if (!isControlled) {
                    setIsCollectionsListOpen(nextOpen);
                }
                onOpenChange?.(nextOpen, eventDetails);
            }}
            open={isControlled ? open : isCollectionsListOpen}
            {...props}
        />
    );
}

export function CollectionsListTrigger({
    className,
    collectionLabels,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
    collectionLabels: string[];
}) {
    const { isCollectionsListOpen } = useCollectionsListOpenState();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        className={cn(
                            "flex select-none items-center gap-3 rounded-full bg-muted/94 py-2.5 pr-3 pl-4 text-left text-foreground hover:bg-input/50 active:bg-input/30",
                            className
                        )}
                        title={
                            isCollectionsListOpen
                                ? "Collapse group"
                                : "Expand group"
                        }
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
                positionerClassname={cn({
                    "pointer-events-none! hidden!": isCollectionsListOpen,
                })}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="wrap-break-word w-full whitespace-normal font-medium leading-tight">
                    {collectionLabels.join(", ")}
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
            className={cn(
                "rounded-full bg-muted/94 hover:bg-input/50",
                className
            )}
            size="icon-xl"
            variant="secondary"
            {...props}
        />
    );
}

/** @internal */
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
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Ignore
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

export function CollectionsListItemPreview({
    onSelect,
    thumbnails,
    ...props
}: React.ComponentProps<typeof PreviewCardTrigger> & {
    onSelect: () => void;
    thumbnails: string[];
}) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);

    React.useEffect(() => {
        if (!(isOpen && thumbnails.length > 1)) {
            setActivePreviewIndex(0);
            return;
        }

        const interval = window.setInterval(() => {
            setActivePreviewIndex(
                (currentIndex) => (currentIndex + 1) % thumbnails.length
            );
        }, COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
        };
    }, [isOpen, thumbnails.length]);

    const activePreviewSrc = thumbnails[activePreviewIndex];

    return (
        <PreviewCard onOpenChange={setIsOpen}>
            <PreviewCardTrigger
                closeDelay={COLLECTION_ITEM_PREVIEW_CLOSE_DELAY_MS}
                render={
                    <Button
                        className="w-full min-w-0 flex-1 justify-start rounded-full border-(--focus-ring-color)/7 bg-(--collection-background) px-7.5 text-left focus-visible:ring-(--focus-ring-color) focus-visible:ring-1"
                        onClick={onSelect}
                        type="button"
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
                    src={activePreviewSrc}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

export function CollectionsListItemValue() {
    const { collection } = useCollectionsListItemContext();

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span className="max-w-full shrink-0 truncate font-medium text-sm">
                {collection.name}
            </span>
            {collection.sources.length > 0 && (
                <span className="max-w-full flex-1 truncate text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-80">
                    {collection.sources.map(getSourceLabel).join(", ")}
                </span>
            )}
        </div>
    );
}

interface PriorityOption {
    icon: React.ElementType;
    label: string;
    value: CollectionPriority;
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

/** @internal */
function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_OPTION_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY_OPTION;
}

export function CollectionsListItemPriorityCombobox({
    open: openProp,
    onOpenChange,
    onUpdatePriority,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onUpdatePriority: (priority: CollectionPriority) => void;
}) {
    const { collection, isHovered } = useCollectionsListItemContext();
    const [isOpenInternal, setIsOpenInternal] = React.useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;
    const selectedOption = getPriorityOption(collection.priority);

    useHotkeys(
        "p",
        () => {
            setIsOpen(true);
        },
        {
            enabled: isHovered && !isOpen,
            preventDefault: true,
        },
        [isHovered, isOpen, setIsOpen]
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
                        {(priorityOption) => (
                            <ComboboxItem
                                key={priorityOption.value}
                                showIndicatorLast
                                value={priorityOption.value}
                            >
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
                                        <priorityOption.icon className="size-4 text-muted-foreground" />
                                        <span className="truncate">
                                            {priorityOption.label}
                                        </span>
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

export function getCollectionsListItemStyle(name: string, isSelected: boolean) {
    const assignedColor = getHexColorFromName(name);
    const backgroundOpacity = isSelected ? 20 : 7;

    return {
        "--collection-background": `color-mix(in srgb, ${assignedColor} ${backgroundOpacity}%, transparent)`,
        "--focus-ring-color": `color-mix(in srgb, ${assignedColor}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${assignedColor} 16%, black 18%)`,
    } as React.CSSProperties;
}

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isHovered: boolean;
}

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
}

export function CollectionsListItem({
    children,
    collection,
    isSelected,
}: {
    children: React.ReactNode;
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}) {
    const [isHovered, setIsHovered] = React.useState(false);

    const style = React.useMemo(
        () => getCollectionsListItemStyle(collection.name, isSelected),
        [collection.name, isSelected]
    );

    return (
        <CollectionsListItemContext value={{ collection, isHovered }}>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover tracking for keyboard shortcut scoping */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Same as above */}
            <div
                className="group relative flex select-none items-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={style}
            >
                {children}
            </div>
        </CollectionsListItemContext>
    );
}

export function CollectionsListItemMeta({
    onCopyLinks,
    onDelete,
    onExportCsv,
    onOpenLinks,
    onRename,
}: {
    onCopyLinks: () => void;
    onDelete: () => void;
    onExportCsv: () => void;
    onOpenLinks: () => void;
    onRename: () => void;
}) {
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums transition-opacity focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {collection.itemCount}
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
                        <MenuItem closeOnClick onClick={onRename}>
                            <PencilIcon className="size-4 text-muted-foreground" />
                            Rename
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem closeOnClick disabled>
                            <UserRoundPlus className="size-4 text-muted-foreground" />
                            Share
                        </MenuItem>
                        <MenuSub>
                            <MenuSubTrigger disabled={!hasItems}>
                                <Forward className="inline-block size-4 text-muted-foreground" />
                                Export
                            </MenuSubTrigger>
                            <MenuSubPopup>
                                <MenuItem closeOnClick onClick={onCopyLinks}>
                                    <CopyIcon className="size-4 text-muted-foreground" />
                                    Copy all links
                                </MenuItem>
                                <MenuItem closeOnClick onClick={onOpenLinks}>
                                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                                    Open all links
                                </MenuItem>
                                <MenuItem closeOnClick onClick={onExportCsv}>
                                    <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                                    Export to CSV
                                </MenuItem>
                                <MenuItem>
                                    <NotionIcon />
                                    Send to Notion
                                </MenuItem>
                            </MenuSubPopup>
                        </MenuSub>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem
                            closeOnClick
                            onClick={onDelete}
                            variant="destructive"
                        >
                            <Trash2Icon className="size-4" />
                            Delete
                        </MenuItem>
                    </MenuGroup>
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
        <p
            className={cn(
                "rounded-xl border border-border/30 border-dashed px-4 py-6 text-center text-muted-foreground text-xs",
                className
            )}
            {...props}
        >
            Create your first collection to start grouping saved items.
        </p>
    );
}

export function CollectionsListToolbar({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            className={cn("mt-4 flex items-center justify-between", className)}
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

type CollectionSortField = "count" | "created" | "priority" | "updated";

interface SortingOption {
    icon: React.ElementType;
    label: string;
    value: CollectionSortField;
}

const DEFAULT_SORT_FIELD: CollectionSortField = "priority";

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

export const { useStore: useCollectionsSortStore } = createStore({
    collectionSortField: storage<CollectionSortField>(DEFAULT_SORT_FIELD),
});

export const NAME_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

export const COLLECTION_PRIORITY_ORDER: Record<CollectionPriority, number> = {
    archive: 3,
    none: 4,
    peripheral: 2,
    relevant: 1,
    very_relevant: 0,
};

export function sortCollections<
    T extends Pick<LibraryCollectionSummary, "name" | "priority">,
>(collections: T[]): T[] {
    return [...collections].sort((a, b) => {
        const priorityDifference =
            COLLECTION_PRIORITY_ORDER[a.priority] -
            COLLECTION_PRIORITY_ORDER[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return NAME_COLLATOR.compare(a.name, b.name);
    });
}

export function sortCollectionSummaries<
    T extends Pick<
        LibraryCollectionSummary,
        "createdAt" | "itemCount" | "name" | "priority" | "updatedAt"
    >,
>(collections: T[], sortField: CollectionSortField): T[] {
    if (sortField === "priority") {
        return sortCollections(collections);
    }

    return [...collections].sort((a, b) => {
        switch (sortField) {
            case "created":
                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );
            case "updated":
                return (
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                );
            case "count":
                return b.itemCount - a.itemCount;
            default:
                return NAME_COLLATOR.compare(a.name, b.name);
        }
    });
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
                render={
                    <Button
                        aria-label="Sort and organize collections"
                        size="icon-xs"
                        variant="ghost"
                    />
                }
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
                        {(sortOption) => (
                            <ComboboxItem
                                key={sortOption.value}
                                showIndicatorLast
                                value={sortOption.value}
                            >
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
                                        <sortOption.icon className="size-4 text-muted-foreground" />
                                        <span className="truncate">
                                            {sortOption.label}
                                        </span>
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
