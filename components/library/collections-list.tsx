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
    PriorityNoneIcon,
} from "@/components/ui/integration-icons";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { getColorFromName } from "@/lib/colors";
import { getSourceLabel } from "@/lib/integrations/supports";
import type { LibraryCollectionSummary } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import type { CollectionPriority } from "@/prisma/client/enums";
import {
    ArchiveIcon,
    Component,
    CopyIcon,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Group,
    Info,
    type LucideIcon,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Sparkles,
    Trash2Icon,
} from "lucide-react";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

const COLLECTIONS_PREVIEW_OPEN_DELAY_MS = 450;
const COLLECTION_ITEM_PREVIEW_CLOSE_DELAY_MS = 20;
const COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS = 600;

interface CollectionPriorityOption {
    readonly icon: LucideIcon;
    readonly label: string;
    readonly value: CollectionPriority;
}

function getCollectionButtonStyle(
    name: string,
    isSelected: boolean,
): CSSProperties {
    const assignedColor = getColorFromName(name);
    const backgroundOpacity = isSelected ? 20 : 7;

    return {
        "--focus-ring-color": `color-mix(in srgb, ${assignedColor}, black 20%)`,
        backgroundColor: `color-mix(in srgb, ${assignedColor} ${backgroundOpacity}%, transparent)`,
    } as CSSProperties;
}

export function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>): ReactElement {
    return <Collapsible className={cn("gap-3", className)} {...props} />;
}

export function CollectionsListTrigger({
    className,
    collectionLabels,
    isPreviewEnabled = true,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
    collectionLabels: string[];
    isPreviewEnabled?: boolean;
}): ReactElement {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isTriggerHovered, setIsTriggerHovered] = useState(false);
    const hoverOpenTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (hoverOpenTimeoutRef.current) {
            clearTimeout(hoverOpenTimeoutRef.current);
            hoverOpenTimeoutRef.current = null;
        }

        if (!(isPreviewEnabled && isTriggerHovered)) {
            setIsPreviewOpen(false);
            return;
        }

        hoverOpenTimeoutRef.current = window.setTimeout(() => {
            setIsPreviewOpen(true);
            hoverOpenTimeoutRef.current = null;
        }, COLLECTIONS_PREVIEW_OPEN_DELAY_MS);

        return () => {
            if (hoverOpenTimeoutRef.current) {
                clearTimeout(hoverOpenTimeoutRef.current);
                hoverOpenTimeoutRef.current = null;
            }
        };
    }, [isPreviewEnabled, isTriggerHovered]);

    return (
        <Popover open={isPreviewOpen}>
            <PopoverTrigger
                render={
                    <CollapsibleTrigger
                        className={cn(
                            "flex select-none items-center gap-3 rounded-full bg-muted/94 px-3 py-2.5 text-left text-foreground hover:bg-input/50",
                            className,
                        )}
                        onMouseEnter={(event) => {
                            onMouseEnter?.(event);
                            setIsTriggerHovered(true);
                        }}
                        onMouseLeave={(event) => {
                            onMouseLeave?.(event);
                            setIsTriggerHovered(false);
                        }}
                        onPointerDown={(event) => {
                            onPointerDown?.(event);
                            if (hoverOpenTimeoutRef.current) {
                                clearTimeout(hoverOpenTimeoutRef.current);
                                hoverOpenTimeoutRef.current = null;
                            }
                            setIsPreviewOpen(false);
                        }}
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
                                <span className="absolute -bottom-[6px] left-[17px] text-nowrap text-[10px] tabular-nums opacity-80 transition-opacity group-data-panel-open:opacity-100">
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
            <PopoverPopup align="start" tooltipStyle>
                <span className="font-medium">
                    {collectionLabels.join(", ")}
                </span>
            </PopoverPopup>
        </Popover>
    );
}

export function CollectionsListAction({
    className,
    ...props
}: React.ComponentProps<typeof Button>): ReactElement {
    return (
        <Button
            className={cn(
                "rounded-full bg-muted/94 hover:bg-input/50",
                className,
            )}
            size="icon-xl"
            variant="secondary"
            {...props}
        />
    );
}

export function CollectionsListContent({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePanel>): ReactElement {
    return <CollapsiblePanel className={cn(className)} {...props} />;
}

const DEFAULT_COLLECTION_PRIORITY_OPTION: CollectionPriorityOption = {
    icon: PriorityNoneIcon as LucideIcon,
    label: "No priority",
    value: "none",
};

const COLLECTION_PRIORITY_OPTIONS = [
    DEFAULT_COLLECTION_PRIORITY_OPTION,
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
] satisfies readonly CollectionPriorityOption[];

const COLLECTION_PRIORITY_OPTION_BY_VALUE = new Map(
    COLLECTION_PRIORITY_OPTIONS.map((option) => [option.value, option]),
);

function getCollectionPriorityOption(
    priority: CollectionPriority,
): CollectionPriorityOption {
    const option = COLLECTION_PRIORITY_OPTION_BY_VALUE.get(priority);
    if (option) {
        return option;
    }
    return DEFAULT_COLLECTION_PRIORITY_OPTION;
}

function CollectionPreviewImage({
    alt,
    src,
}: {
    readonly alt: string;
    readonly src?: string;
}): ReactElement {
    const [didFail, setDidFail] = useState(false);
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

function CollectionsListItemHoverPreview({
    collection,
    isSelected,
    onSelect,
    previewThumbnailUrls,
}: {
    readonly collection: LibraryCollectionSummary;
    readonly isSelected: boolean;
    readonly onSelect: () => void;
    readonly previewThumbnailUrls: readonly string[];
}): ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);

    useEffect(() => {
        if (!(isOpen && previewThumbnailUrls.length > 1)) {
            setActivePreviewIndex(0);
            return;
        }

        const interval = window.setInterval(() => {
            setActivePreviewIndex((currentIndex) => {
                return (currentIndex + 1) % previewThumbnailUrls.length;
            });
        }, COLLECTION_ITEM_PREVIEW_SLIDESHOW_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
        };
    }, [isOpen, previewThumbnailUrls]);

    const activePreviewSrc = previewThumbnailUrls[activePreviewIndex];

    return (
        <PreviewCard onOpenChange={setIsOpen}>
            <PreviewCardTrigger
                closeDelay={COLLECTION_ITEM_PREVIEW_CLOSE_DELAY_MS}
                render={
                    <Button
                        className={cn(
                            "w-full min-w-0 flex-1 justify-start rounded-full border-[var(--focus-ring-color)]/7 px-8 text-left focus-visible:ring-1 focus-visible:ring-[var(--focus-ring-color)]",
                        )}
                        onClick={onSelect}
                        style={getCollectionButtonStyle(
                            collection.name,
                            isSelected,
                        )}
                        type="button"
                        variant="ghost"
                    />
                }
            >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="truncate font-medium text-sm leading-tight">
                        {collection.name}
                    </span>
                    {collection.sources.length > 0 && (
                        <span className="truncate text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            {collection.sources.map(getSourceLabel).join(", ")}
                        </span>
                    )}
                </div>
            </PreviewCardTrigger>
            <PreviewCardPopup
                className="pointer-events-none aspect-3/2 p-0"
                positionMethod="fixed"
                side="right"
            >
                <CollectionPreviewImage
                    alt={`${collection.name} preview`}
                    src={activePreviewSrc}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

/** @internal */
function CollectionItemPriorityComboboxPicker({
    collection,
    isPending = false,
    onUpdatePriority,
    open: openProp,
    onOpenChange,
}: {
    readonly collection: Pick<
        LibraryCollectionSummary,
        "id" | "name" | "priority"
    >;
    readonly isPending?: boolean;
    readonly onUpdatePriority: (
        collectionId: string,
        priority: CollectionPriority,
    ) => void;
    readonly open?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
}): ReactElement {
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedOption = getCollectionPriorityOption(collection.priority);

    useEffect(() => {
        if (!isOpen || isPending) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [isOpen, isPending]);

    return (
        <Combobox
            autoHighlight
            items={COLLECTION_PRIORITY_OPTIONS}
            onOpenChange={setIsOpen}
            onValueChange={(nextPriority) => {
                if (!nextPriority || nextPriority === collection.priority) {
                    return;
                }

                onUpdatePriority(collection.id, nextPriority);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Set priority for ${collection.name}`}
                        className="absolute top-1/2 left-1 z-10 -translate-y-1/2 rounded-full opacity-80 group-hover:opacity-100"
                        disabled={isPending}
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                <selectedOption.icon className="size-4" />
            </ComboboxTrigger>
            <ComboboxPopup positionMethod="fixed">
                <div className="border-b">
                    <ComboboxInput
                        className="border-none! ring-0!"
                        placeholder="Set priority..."
                        ref={inputRef}
                        showTrigger={false}
                    />
                </div>
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

export function CollectionsListItem({
    collection,
    isSelected,
    isUpdatePriorityPending = false,
    previewThumbnailUrls = [],
    onCopyLinks,
    onDelete,
    onExportCsv,
    onOpenLinks,
    onSelect,
    onUpdatePriority,
}: {
    readonly collection: LibraryCollectionSummary;
    readonly isSelected: boolean;
    readonly isUpdatePriorityPending?: boolean;
    readonly previewThumbnailUrls?: readonly string[];
    readonly onCopyLinks: () => void;
    readonly onDelete: () => void;
    readonly onExportCsv: () => void;
    readonly onOpenLinks: () => void;
    readonly onSelect: () => void;
    readonly onUpdatePriority: (priority: CollectionPriority) => void;
}): ReactElement {
    const hasItems = collection.itemCount > 0;

    return (
        <div className="group relative flex select-none items-center">
            <CollectionItemPriorityComboboxPicker
                collection={collection}
                isPending={isUpdatePriorityPending}
                onUpdatePriority={(_, priority) => onUpdatePriority(priority)}
            />
            <div className="min-w-0 flex-1">
                <CollectionsListItemHoverPreview
                    collection={collection}
                    isSelected={isSelected}
                    onSelect={onSelect}
                    previewThumbnailUrls={previewThumbnailUrls}
                />
            </div>
            <div className="absolute top-1/2 right-0.5 flex size-8 -translate-y-1/2 items-center justify-center">
                <span className="pointer-events-none text-nowrap text-muted-foreground text-xs tabular-nums transition-opacity focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                    {collection.itemCount}
                </span>
                <Menu>
                    <MenuTrigger
                        render={
                            <Button
                                aria-label={`Collection actions for ${collection.name}`}
                                className="absolute rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
                                size="icon-sm"
                                variant="ghost"
                            />
                        }
                    >
                        <EllipsisIcon className="size-4.5" />
                    </MenuTrigger>
                    <MenuPopup className="min-w-48">
                        <MenuSub>
                            <MenuSubTrigger disabled={!hasItems}>
                                Export to...
                            </MenuSubTrigger>
                            <MenuSubPopup className="min-w-48">
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
                                <MenuItem disabled>Send to Notion</MenuItem>
                            </MenuSubPopup>
                        </MenuSub>
                        <MenuSeparator />
                        <MenuItem
                            closeOnClick
                            onClick={onDelete}
                            variant="destructive"
                        >
                            <Trash2Icon className="size-4" />
                            Delete
                        </MenuItem>
                    </MenuPopup>
                </Menu>
            </div>
        </div>
    );
}

export function CollectionsListFeedback({
    message,
    onDismiss,
    tone,
}: {
    readonly message?: string;
    readonly onDismiss: () => void;
    readonly tone?: "error" | "success";
}): ReactElement | null {
    if (!message) {
        return null;
    }

    return (
        <div className="flex items-center justify-between gap-2 pt-1 pr-1 pl-3.5">
            <p
                className={cn(
                    "text-xs",
                    tone === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                )}
            >
                {message}
            </p>
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
    readonly isVisible: boolean;
    readonly onClear: () => void;
}): ReactElement | null {
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

export function CollectionsListEmpty(): ReactElement {
    return (
        <p className="rounded-xl border border-border/60 border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
            Create your first collection to start grouping saved items.
        </p>
    );
}

export function SmartCollectionsCallout(): ReactElement {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
            <CollapsiblePanel className="items-center justify-center p-2">
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
                    <span className="font-medium text-xs">
                        <Popover>
                            <PopoverTrigger
                                className="underline decoration-1 decoration-dotted underline-offset-2"
                                openOnHover
                            >
                                <GradientWaveText
                                    ariaLabel="Smart Collections"
                                    speed={2.2}
                                >
                                    Smart Collections
                                </GradientWaveText>
                            </PopoverTrigger>
                            <PopoverPopup align="start" tooltipStyle>
                                <div className="flex gap-2">
                                    <Info className="mt-0.5 inline-block size-4 shrink-0" />
                                    <div className="flex flex-col gap-2">
                                        <p className="text-foreground">
                                            Let Cache do the organizing: AI now
                                            groups your related saves into
                                            focused, contextual collections.
                                        </p>
                                        <Button
                                            className="ml-auto"
                                            size="xs"
                                            variant="destructive-outline"
                                        >
                                            Disable
                                        </Button>
                                    </div>
                                </div>
                            </PopoverPopup>
                        </Popover>{" "}
                        is active
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
