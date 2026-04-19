"use client";

import { Avatar, AvatarGroup } from "@/components/ui/avatar";
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
import { Kbd } from "@/components/ui/kbd";
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
import type { LibraryCollectionSummary } from "@/lib/library/types";
import type { CollectionPriority } from "@/prisma/client/enums";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";
import {
    ArchiveIcon,
    Component,
    CopyIcon,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Forward,
    Group,
    Info,
    type LucideIcon,
    PencilIcon,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Sparkles,
    Trash2Icon,
    UserRoundPlus,
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

export function CollectionsList(
    props: React.ComponentProps<typeof Collapsible>
) {
    const { isCollectionsListOpen, setIsCollectionsListOpen } =
        useCollectionsListOpenState();
    const { onOpenChange, open, ...restProps } = props;
    const isControlled = open !== undefined;

    return (
        <Collapsible
            defaultOpen={isControlled ? undefined : isCollectionsListOpen}
            onOpenChange={(nextOpen, eventDetails) => {
                if (!isControlled) {
                    setIsCollectionsListOpen(nextOpen);
                }
                onOpenChange?.(nextOpen, eventDetails);
            }}
            open={isControlled ? open : isCollectionsListOpen}
            {...restProps}
        />
    );
}

export function CollectionsListTrigger({
    className,
    collectionLabels,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
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
                        type="button"
                        {...props}
                    >
                        <div className="relative">
                            <Component
                                aria-hidden
                                className="inline-block size-5 shrink-0"
                                focusable="false"
                            />
                            {collectionLabels.length > 0 ? (
                                <span className="absolute -bottom-[6px] left-[16.2px] text-nowrap text-[10px] tabular-nums opacity-80">
                                    {collectionLabels.length}
                                </span>
                            ) : null}
                        </div>
                        <span className="min-w-0 flex-1 font-medium text-sm leading-tight">
                            Collections
                        </span>
                        <ChevronDownFilledIcon />
                    </CollapsibleTrigger>
                }
            />
            <PopoverPopup
                align="start"
                className={cn({
                    "pointer-events-none! hidden!": isCollectionsListOpen,
                })}
                positionMethod="fixed"
                tooltipStyle
            >
                <span className="font-medium">
                    {collectionLabels.join(", ")}
                </span>
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
    const canRenderImage = Boolean(src) && !didFail;

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
    }, [isOpen, thumbnails]);

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
    icon: LucideIcon;
    label: string;
    value: CollectionPriority;
}

const DEFAULT_PRIORITY_OPTION: PriorityOption = {
    icon: PriorityNoneIcon as LucideIcon,
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
    const option = PRIORITY_OPTION_BY_VALUE.get(priority);
    if (option) {
        return option;
    }
    return DEFAULT_PRIORITY_OPTION;
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

function getCollectionsListItemStyle(name: string, isSelected: boolean) {
    const assignedColor = getHexColorFromName(name);
    const backgroundOpacity = isSelected ? 20 : 7;

    return {
        "--collection-background": `color-mix(in srgb, ${assignedColor} ${backgroundOpacity}%, transparent)`,
        "--focus-ring-color": `color-mix(in srgb, ${assignedColor}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${assignedColor} 16%, black 18%)`,
    } as React.CSSProperties;
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
    const contextValue = React.useMemo<CollectionsListItemContextValue>(
        () => ({ collection, isHovered }),
        [collection, isHovered]
    );

    return (
        <CollectionsListItemContext value={contextValue}>
            {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: Ignore */}
            {/** biome-ignore lint/a11y/noStaticElementInteractions: Ignore */}
            <div
                className="group relative flex select-none items-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={getCollectionsListItemStyle(collection.name, isSelected)}
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
    onDismiss,
    tone,
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
                        : "text-muted-foreground"
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
    onClear,
}: {
    isVisible: boolean;
    onClear: () => void;
}) {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-2 pr-1 pl-3.5">
            <p className="text-muted-foreground text-xs">
                Filtering by any selected collection
            </p>
            <Button onClick={onClear} size="xs" variant="ghost">
                Clear
            </Button>
        </div>
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

export function CollectionsNoticeCallout() {
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Collapsible className="mt-2.5" onOpenChange={setIsOpen} open={isOpen}>
            <CollapsiblePanel className="items-center justify-center">
                <AvatarGroup>
                    <Avatar className="size-7 bg-muted/90">
                        <Sparkles className="inline-block size-4 shrink-0" />
                    </Avatar>
                    <Avatar className="border-2 border-white bg-muted">
                        <Info className="inline-block size-4.5 shrink-0" />
                    </Avatar>
                    <Avatar className="-z-1 size-7 bg-muted/90">
                        <Group className="inline-block size-4 shrink-0" />
                    </Avatar>
                </AvatarGroup>
                <div className="flex items-center justify-center gap-1">
                    <span aria-live="polite" className="sr-only" role="alert">
                        Smart collections is active
                    </span>
                    <span className="not-sr-only font-medium text-xs">
                        <Popover>
                            <PopoverTrigger
                                className="flex cursor-pointer items-center whitespace-nowrap text-nowrap"
                                openOnHover
                            >
                                <GradientWaveText
                                    ariaLabel="Smart Collections"
                                    className="underline decoration-muted-foreground/20 decoration-dotted underline-offset-2"
                                    speed={2.2}
                                >
                                    Smart Collections
                                </GradientWaveText>
                                &nbsp;is active
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
                                        As you add new entries, Cache AI groups
                                        your related saves into contextual
                                        collections intuitively. Cache also
                                        learns your preferences with time.
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
                    </span>
                    <Button
                        onClick={() => setIsOpen(false)}
                        size="xs"
                        type="button"
                        variant="ghost"
                    >
                        Dismiss
                    </Button>
                </div>
            </CollapsiblePanel>
        </Collapsible>
    );
}
