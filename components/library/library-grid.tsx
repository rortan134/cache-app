"use client";

import { downloadMedia } from "@/app/[locale]/library/actions";
import { Button } from "@/components/ui/button";
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
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Kbd } from "@/components/ui/kbd";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import {
    PreviewDrawer,
    PreviewDrawerContent,
} from "@/components/ui/preview-drawer";
import { BlockPromotionBanner } from "@/components/ui/promotion-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticker } from "@/components/ui/ticker";
import { getSubtleColorGradientFromName } from "@/lib/colors";
import { getNoteExcerpt } from "@/lib/library/notes";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { normalizeURL } from "@/lib/url";
import { cn } from "@/lib/utils";
import { LibraryItemSource } from "@/prisma/client/enums";
import fscreen from "fscreen";
import {
    ArrowUpRightIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    CircleDashed,
    CircleDot,
    DownloadIcon,
    ExternalLinkIcon,
    EyeIcon,
    FilePenLineIcon,
    LinkIcon,
    MaximizeIcon,
    NotebookPenIcon,
    Trash2Icon,
} from "lucide-react";
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

/** Stable placeholders for empty-library masonry sneak peek (opacity fades by order). */
const EMPTY_LIBRARY_PEEK_PLACEHOLDERS = [
    { aspect: "aspect-[3/4]", id: "library-empty-peek-0" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-1" },
    { aspect: "aspect-square", id: "library-empty-peek-2" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-3" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-4" },
    { aspect: "aspect-square", id: "library-empty-peek-5" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-6" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-7" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-8" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-9" },
] as const;
const WWW_PREFIX_RE = /^www\./;

interface GridProps {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly columnCount?: number;
    readonly items: LibraryItemWithCollections[];
    readonly layoutToken?: number;
    readonly onCopyLink?: (item: LibraryItemWithCollections) => void;
    readonly onDelete?: (item: LibraryItemWithCollections) => void;
    readonly onOpenHere?: (item: LibraryItemWithCollections) => void;
    readonly onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    readonly onOpenNote?: (item: LibraryItemWithCollections) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => void;
    readonly paywallPreviewCount?: number;
    readonly paywallTotalCount?: number;
    readonly pendingCollectionItemIds: readonly string[];
    readonly pendingDeleteItemId?: string | null;
    readonly showPaywallBanner?: boolean;
}

interface SectionProps extends GridProps {
    readonly accentKey?: string;
    readonly collapsed?: boolean;
    readonly collapsible?: boolean;
    readonly emptyHint: string;
    readonly onToggle?: () => void;
    readonly title: string;
}

interface LibraryGridCardProps {
    readonly addedLabel: string;
    readonly alt: string;
    readonly collections: readonly LibraryCollectionSummary[];
    readonly createdLabel: string;
    readonly domain: string;
    readonly hasBothDates: boolean;
    readonly href: string;
    readonly item: LibraryItemWithCollections;
    readonly onCopyLink?: (item: LibraryItemWithCollections) => void;
    readonly onDelete?: (item: LibraryItemWithCollections) => void;
    readonly onOpenHere?: (item: LibraryItemWithCollections) => void;
    readonly onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    readonly onOpenNote?: (item: LibraryItemWithCollections) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => void;
    readonly pendingCollectionItemIds: readonly string[];
    readonly pendingDeleteItemId?: string | null;
    readonly postedLabel: string;
    readonly previewDescription?: string;
    readonly previewTitle: string;
}

interface LockedLibraryGridCardProps {
    readonly alt: string;
    readonly item: LibraryItemWithCollections;
}

interface PreviewMediaProps {
    readonly alt: string;
    readonly fallbackLabel?: string;
    readonly src: string | null;
}

function itemDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(WWW_PREFIX_RE, "") || "Other";
    } catch {
        return "Other";
    }
}

function itemDateLabel(dateValue: Date | string | null | undefined): string {
    if (!dateValue) {
        return "";
    }
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function fallbackGridStyle(columnCount?: number): CSSProperties | undefined {
    if (!columnCount) {
        return undefined;
    }
    return {
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
    };
}

function itemTitle(item: LibraryItemWithCollections): string {
    const caption = item.caption?.trim();
    if (caption) {
        return caption;
    }

    if (item.kind === "note") {
        return "Untitled note";
    }

    return item.url;
}

function opengraphPreviewUrl(item: LibraryItemWithCollections): string | null {
    if (item.thumbnailUrl) {
        return item.thumbnailUrl;
    }

    if (item.source !== LibraryItemSource.chrome_bookmarks) {
        return null;
    }

    const href = normalizeURL(item.url);
    if (href === "about:blank") {
        return null;
    }

    return `/api/library/opengraph-image?url=${encodeURIComponent(href)}`;
}

function PreviewMedia({
    alt,
    fallbackLabel = "No preview",
    src,
}: PreviewMediaProps): ReactElement {
    const [didFail, setDidFail] = useState(false);
    const imageSrc = src ?? undefined;
    const canRenderImage = Boolean(imageSrc) && !didFail;

    if (!canRenderImage) {
        return (
            <div className="flex size-full items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                {fallbackLabel}
            </div>
        );
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: image load failures drive the visual fallback state
        <img
            alt={alt}
            className="size-full object-cover"
            height={400}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={imageSrc}
            width={300}
        />
    );
}

function CollectionComboboxPicker({
    collections,
    item,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    open: openProp,
    onOpenChange,
}: {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly item: LibraryItemWithCollections;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[]
    ) => void;
    readonly pendingCollectionItemIds: readonly string[];
    readonly open?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
}): ReactElement {
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;

    const inputRef = useRef<HTMLInputElement>(null);
    const selectedCollectionIds = item.collections.map(
        (collection) => collection.id
    );
    const isPending = pendingCollectionItemIds.includes(item.id);
    const selectedCount = selectedCollectionIds.length;

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
            items={collections}
            multiple
            onOpenChange={setIsOpen}
            onValueChange={(nextIds) => {
                onUpdateItemCollections(item.id, [...nextIds]);
            }}
            open={isOpen}
            value={selectedCollectionIds}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={
                            selectedCount > 0
                                ? `Edit collections (${selectedCount} selected)`
                                : "Add to collections"
                        }
                        className="rounded-full mix-blend-difference invert hover:brightness-125"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                {selectedCount > 0 ? (
                    <CircleDot className="size-4.5" />
                ) : (
                    <CircleDashed className="size-4.5" />
                )}
            </ComboboxTrigger>
            <ComboboxPopup>
                <div className="border-b">
                    <ComboboxInput
                        className="border-none! ring-0!"
                        endAddon={<Kbd>S</Kbd>}
                        placeholder="Assign collections..."
                        ref={inputRef}
                        showTrigger={false}
                    />
                </div>
                <ComboboxEmpty>No matching collections</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(collection) => (
                            <ComboboxItem
                                key={collection.id}
                                value={collection.id}
                            >
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <span className="min-w-0 truncate text-foreground text-sm">
                                        {collection.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                                        {collection.itemCount}
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

function LibraryGridCard({
    addedLabel,
    alt,
    collections,
    createdLabel,
    domain,
    hasBothDates,
    href,
    item,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    postedLabel,
    previewDescription,
    previewTitle,
}: LibraryGridCardProps): ReactElement {
    const isNote = item.kind === "note";
    const isDeletePending = pendingDeleteItemId === item.id;
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
    const previewImageUrl = opengraphPreviewUrl(item);

    const cardRef = useRef<HTMLDivElement>(null);
    const canPreview = !isNote && href !== "about:blank";
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const displayTitle = itemTitle(item);

    useHotkeys("s", () => setIsCollectionPickerOpen(true), {
        enabled: isHovered && !isCollectionPickerOpen,
        preventDefault: true,
    });

    const handlePrimaryClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isNote) {
            onOpenNote?.(item);
            return;
        }
        onOpenInNewTab?.(item);
    };

    const handleFullscreen = () => {
        if (cardRef.current && fscreen.fullscreenEnabled) {
            fscreen.requestFullscreen(cardRef.current);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const result = await downloadMedia(item.url);
            if (result.status === "SUCCESS") {
                // Use a hidden anchor to trigger download if possible, or just open in new tab
                const link = document.createElement("a");
                link.href = result.downloadUrl;
                link.download = ""; // Cobalt usually provides a good filename or direct link
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // alert(result.message);
                console.error(result.message);
            }
        } catch (error) {
            // alert("An unexpected error occurred while starting the download.");
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const renderCardMenuMeta = () => (
        <>
            <div className="relative mx-auto flex max-w-56 items-center gap-2 pt-2 pb-1.5 pl-2.5 opacity-50">
                <span className="block truncate text-xs">
                    {isNote ? displayTitle : item.url}
                </span>
            </div>
            <div className="px-2.5 pb-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-3 py-0.5">
                    <span>Created</span>
                    <span className="text-foreground tabular-nums">
                        {createdLabel}
                    </span>
                </div>
                {postedLabel ? (
                    <div className="flex items-center justify-between gap-3 py-0.5">
                        <span>Posted</span>
                        <span className="text-foreground tabular-nums">
                            {postedLabel}
                        </span>
                    </div>
                ) : null}
            </div>
        </>
    );

    const renderPrimaryMenuItems = (
        Item: typeof ContextMenuItem | typeof MenuItem,
        Separator: typeof ContextMenuSeparator | typeof MenuSeparator
    ) => (
        <>
            {isNote ? (
                <Item closeOnClick onClick={() => onOpenNote?.(item)}>
                    <FilePenLineIcon className="size-4.5 text-muted-foreground" />
                    Edit note
                </Item>
            ) : null}
            {canPreview ? (
                <>
                    <Item
                        closeOnClick={false}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsPreviewOpen(true);
                        }}
                    >
                        <EyeIcon className="size-4.5 text-muted-foreground" />
                        Open preview
                    </Item>
                    <PreviewDrawer
                        description={previewDescription}
                        onOpenChange={setIsPreviewOpen}
                        open={isPreviewOpen}
                        title={previewTitle}
                        url={href}
                    >
                        <PreviewDrawerContent />
                    </PreviewDrawer>
                </>
            ) : null}
            {isNote ? null : (
                <>
                    <Item closeOnClick onClick={() => onOpenInNewTab?.(item)}>
                        <ExternalLinkIcon className="size-4.5 text-muted-foreground" />
                        Open in new tab
                    </Item>
                    <Item closeOnClick onClick={() => onOpenHere?.(item)}>
                        <ArrowUpRightIcon className="size-4.5 text-muted-foreground" />
                        Open here
                    </Item>
                    <Item closeOnClick onClick={() => onCopyLink?.(item)}>
                        <LinkIcon className="size-4.5 text-muted-foreground" />
                        Copy link
                    </Item>
                    <Item closeOnClick onClick={handleFullscreen}>
                        <MaximizeIcon className="size-4.5 text-muted-foreground" />
                        View fullscreen
                    </Item>
                    <Item
                        closeOnClick
                        disabled={isDownloading}
                        onClick={handleDownload}
                    >
                        <DownloadIcon className="size-4.5 text-muted-foreground" />
                        {isDownloading ? "Downloading..." : "Download media"}
                    </Item>
                    <Separator />
                </>
            )}
        </>
    );

    const renderDeleteMenuItem = (menuKind: "context" | "menu") => {
        if (menuKind === "context") {
            return (
                <ContextMenuItem
                    className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                    closeOnClick
                    disabled={isDeletePending}
                    onClick={() => onDelete?.(item)}
                >
                    <Trash2Icon className="size-4.5" />
                    {isDeletePending ? "Deleting..." : "Delete"}
                </ContextMenuItem>
            );
        }

        return (
            <MenuItem
                closeOnClick
                disabled={isDeletePending}
                onClick={() => onDelete?.(item)}
                variant="destructive"
            >
                <Trash2Icon className="size-4.5" />
                {isDeletePending ? "Deleting..." : "Delete"}
            </MenuItem>
        );
    };

    const renderCardMenuContent = (menuKind: "context" | "menu") => {
        const Separator =
            menuKind === "context" ? ContextMenuSeparator : MenuSeparator;
        const Item = menuKind === "context" ? ContextMenuItem : MenuItem;

        return (
            <>
                {renderCardMenuMeta()}
                <Separator />
                {renderPrimaryMenuItems(Item, Separator)}
                {renderDeleteMenuItem(menuKind)}
            </>
        );
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger render={<div className="contents" />}>
                {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: TEMP */}
                <article
                    className="group relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    ref={cardRef}
                >
                    <a
                        className="flex flex-col focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        href={href}
                        onClick={handlePrimaryClick}
                        rel="noopener noreferrer"
                        target={isNote ? undefined : "_blank"}
                    >
                        {isNote ? (
                            <div className="relative flex aspect-3/4 h-auto min-h-72 w-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                                <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                                    <h3 className="line-clamp-3 font-semibold text-base text-foreground leading-tight">
                                        {displayTitle}
                                    </h3>
                                    <p className="whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed opacity-90">
                                        {noteExcerpt ||
                                            "Tap to start writing in this note"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative aspect-3/4 w-full overflow-hidden">
                                <PreviewMedia
                                    alt={alt}
                                    key={previewImageUrl ?? `empty-${item.id}`}
                                    src={previewImageUrl}
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-8 px-3 py-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className="rounded-full border border-border/50 bg-white/90 px-2 py-0.5 font-medium text-black backdrop-blur-xs">
                                            {domain}
                                        </span>
                                        {hasBothDates ? (
                                            <>
                                                <span className="rounded-full border border-border/50 bg-white/90 px-2 py-0.5 font-medium text-black backdrop-blur-xs">
                                                    Posted: {postedLabel}
                                                </span>
                                                <span className="rounded-full border border-border/50 bg-white/90 px-2 py-0.5 font-medium text-black backdrop-blur-xs">
                                                    Added: {addedLabel}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="rounded-full border border-border/50 bg-white/90 px-2 py-0.5 font-medium text-black backdrop-blur-xs">
                                                {postedLabel || addedLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </a>
                    <div className="overflow-fade-top absolute inset-x-0 bottom-0 flex items-center gap-1 overflow-hidden bg-black/35 px-1.5 pt-2 pb-1 backdrop-blur-[2.5px]">
                        <CollectionComboboxPicker
                            collections={collections}
                            item={item}
                            onOpenChange={setIsCollectionPickerOpen}
                            onUpdateItemCollections={onUpdateItemCollections}
                            open={isCollectionPickerOpen}
                            pendingCollectionItemIds={pendingCollectionItemIds}
                        />
                        <Menu>
                            <MenuTrigger
                                render={
                                    <button
                                        className="min-w-0 flex-1 truncate rounded-sm py-px text-left font-medium text-white text-xs leading-none mix-blend-difference outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                        title={displayTitle}
                                        type="button"
                                    />
                                }
                            >
                                <Ticker>
                                    {isNote
                                        ? displayTitle
                                        : item.caption?.trim() || item.url}
                                </Ticker>
                            </MenuTrigger>
                            <MenuPopup>
                                {renderCardMenuContent("menu")}
                            </MenuPopup>
                        </Menu>
                    </div>
                </article>
            </ContextMenuTrigger>
            <ContextMenuPopup>
                {renderCardMenuContent("context")}
            </ContextMenuPopup>
        </ContextMenu>
    );
}

function LockedLibraryGridCard({
    alt,
    item,
}: LockedLibraryGridCardProps): ReactElement {
    const isNote = item.kind === "note";
    const previewImageUrl = opengraphPreviewUrl(item);

    return (
        <div className="relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/30">
            {isNote ? (
                <div className="relative min-h-72 bg-linear-to-br from-amber-50 via-background to-stone-100 px-4 py-4">
                    <div className="absolute inset-0 bg-background/45 backdrop-blur-md" />
                    <div className="relative flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-500/20 bg-white/70 px-2.5 py-1 font-medium text-[11px] text-stone-700">
                            <NotebookPenIcon className="size-3.5" />
                            Note
                        </span>
                        <p className="line-clamp-3 font-semibold text-base text-foreground">
                            {itemTitle(item)}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="relative aspect-3/4 w-full overflow-hidden bg-muted/30">
                    <PreviewMedia
                        alt={alt}
                        fallbackLabel="Locked preview"
                        key={previewImageUrl ?? `locked-empty-${item.id}`}
                        src={previewImageUrl}
                    />
                    <div className="absolute inset-0 bg-background/35 backdrop-blur-md" />
                </div>
            )}
            <div className="relative flex flex-col gap-2 bg-background/75 px-3 py-2">
                <p className="line-clamp-2 truncate text-foreground text-xs leading-tight">
                    {itemTitle(item)}
                </p>
            </div>
        </div>
    );
}

function renderLibraryMasonry({
    collections,
    columnCount,
    items,
    layoutToken,
    locked = false,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    pendingDeleteItemId,
}: GridProps & { readonly locked?: boolean }): ReactElement {
    return (
        <Masonry
            columnCount={columnCount}
            deps={[
                collections,
                layoutToken,
                items,
                locked,
                pendingCollectionItemIds,
                pendingDeleteItemId,
            ]}
            fallback={
                <div
                    className={cn(
                        "grid gap-2",
                        !columnCount &&
                            "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    )}
                    style={fallbackGridStyle(columnCount)}
                >
                    {items.map((item) => (
                        <Skeleton key={item.id} />
                    ))}
                </div>
            }
            gap={5}
            linear
        >
            {items.map((item) => {
                const href = normalizeURL(item.url);
                const alt = (item.caption ?? "").trim() || "Saved item";
                const domain = itemDomain(item.url);
                const previewTitle = alt === "Saved item" ? "Preview" : alt;
                const previewDescription =
                    domain === "Other" ? item.url : domain;
                const createdLabel = itemDateLabel(item.createdAt);
                const addedLabel = itemDateLabel(
                    item.scrapedAt ?? item.createdAt
                );
                const postedLabel = itemDateLabel(item.postedAt);
                const hasBothDates =
                    !!postedLabel && !!addedLabel && postedLabel !== addedLabel;

                return (
                    <MasonryItem key={item.id}>
                        {locked ? (
                            <LockedLibraryGridCard alt={alt} item={item} />
                        ) : (
                            <LibraryGridCard
                                addedLabel={addedLabel}
                                alt={alt}
                                collections={collections}
                                createdLabel={createdLabel}
                                domain={domain}
                                hasBothDates={hasBothDates}
                                href={href}
                                item={item}
                                onCopyLink={onCopyLink}
                                onDelete={onDelete}
                                onOpenHere={onOpenHere}
                                onOpenInNewTab={onOpenInNewTab}
                                onOpenNote={onOpenNote}
                                onUpdateItemCollections={
                                    onUpdateItemCollections
                                }
                                pendingCollectionItemIds={
                                    pendingCollectionItemIds
                                }
                                pendingDeleteItemId={pendingDeleteItemId}
                                postedLabel={postedLabel}
                                previewDescription={previewDescription}
                                previewTitle={previewTitle}
                            />
                        )}
                    </MasonryItem>
                );
            })}
        </Masonry>
    );
}

export function ExtensionLibraryEmptyMasonryPeek(): ReactElement {
    const fallback = (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {EMPTY_LIBRARY_PEEK_PLACEHOLDERS.map(({ aspect, id }, index) => {
                const opacity = Math.max(0.06, 1 - index * 0.095);
                return (
                    <div
                        className="flex flex-col overflow-hidden rounded-xl bg-card/40 transition-opacity"
                        key={id}
                        style={{ opacity }}
                    >
                        <Skeleton
                            className={cn("w-full rounded-none", aspect)}
                        />
                        <div className="flex min-h-14 flex-col gap-1.5 p-3">
                            <Skeleton className="h-2.5 w-[92%]" />
                            <Skeleton className="h-2.5 w-[72%]" />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Masonry columnCount={5} fallback={fallback} gap={5} linear>
            {EMPTY_LIBRARY_PEEK_PLACEHOLDERS.map(({ aspect, id }, index) => {
                const opacity = Math.max(0.06, 1 - index * 0.095);

                return (
                    <MasonryItem
                        className="group flex flex-col overflow-hidden rounded-lg bg-card/40"
                        key={id}
                        style={{ opacity }}
                    >
                        <Skeleton
                            className={cn("w-full rounded-none", aspect)}
                        />
                        <div className="flex min-h-14 flex-col gap-1.5 p-3">
                            <Skeleton className="h-2.5 w-[92%]" />
                            <Skeleton className="h-2.5 w-[72%]" />
                        </div>
                    </MasonryItem>
                );
            })}
        </Masonry>
    );
}

export function ExtensionLibraryGrid({
    collections,
    columnCount,
    items,
    layoutToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    paywallPreviewCount,
    paywallTotalCount,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    showPaywallBanner,
}: GridProps): ReactElement | null {
    if (items.length === 0) {
        return null;
    }

    const resolvedPreviewCount = Math.max(
        0,
        Math.min(paywallPreviewCount ?? items.length, items.length)
    );
    const showPaywall = resolvedPreviewCount < items.length;
    const previewItems = showPaywall
        ? items.slice(0, resolvedPreviewCount)
        : items;
    const lockedItems = showPaywall ? items.slice(resolvedPreviewCount) : [];

    if (!showPaywall) {
        return renderLibraryMasonry({
            collections,
            columnCount,
            items,
            layoutToken,
            onCopyLink,
            onDelete,
            onOpenHere,
            onOpenInNewTab,
            onOpenNote,
            onUpdateItemCollections,
            pendingCollectionItemIds,
            pendingDeleteItemId,
        });
    }

    return (
        <div className="flex flex-col gap-8">
            {previewItems.length > 0
                ? renderLibraryMasonry({
                      collections,
                      columnCount,
                      items: previewItems,
                      layoutToken,
                      onCopyLink,
                      onDelete,
                      onOpenHere,
                      onOpenInNewTab,
                      onOpenNote,
                      onUpdateItemCollections,
                      pendingCollectionItemIds,
                      pendingDeleteItemId,
                  })
                : null}
            {lockedItems.length > 0 ? (
                <div className="relative isolate">
                    {showPaywallBanner ? (
                        <BlockPromotionBanner
                            length={paywallTotalCount ?? items.length}
                        />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
                    <div className="select-none opacity-60 blur-[1.5px] saturate-75">
                        {renderLibraryMasonry({
                            collections,
                            columnCount,
                            items: lockedItems,
                            layoutToken,
                            locked: true,
                            onCopyLink,
                            onDelete,
                            onOpenHere,
                            onOpenInNewTab,
                            onOpenNote,
                            onUpdateItemCollections,
                            pendingCollectionItemIds,
                            pendingDeleteItemId,
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function ExtensionLibrarySection({
    accentKey,
    collapsed = false,
    collapsible = false,
    collections,
    columnCount,
    emptyHint,
    items,
    layoutToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggle,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    title,
}: SectionProps): ReactElement {
    const canToggle = collapsible && onToggle;
    const stickyHeader = collapsible;
    const headerGradient = stickyHeader
        ? getSubtleColorGradientFromName(accentKey ?? title)
        : undefined;
    let body: ReactElement | null;

    if (collapsed) {
        body = null;
    } else if (items.length === 0) {
        body = <p className="text-muted-foreground text-sm">{emptyHint}</p>;
    } else {
        body = (
            <ExtensionLibraryGrid
                collections={collections}
                columnCount={columnCount}
                items={items}
                layoutToken={layoutToken}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onOpenHere={onOpenHere}
                onOpenInNewTab={onOpenInNewTab}
                onOpenNote={onOpenNote}
                onUpdateItemCollections={onUpdateItemCollections}
                pendingCollectionItemIds={pendingCollectionItemIds}
                pendingDeleteItemId={pendingDeleteItemId}
            />
        );
    }

    return (
        <section className="flex w-full flex-col gap-3">
            <div
                className={cn(
                    "flex items-center justify-between gap-3 py-1 pr-5",
                    stickyHeader &&
                        "sticky z-10 rounded-xl bg-muted/92 backdrop-blur-sm supports-backdrop-filter:bg-muted/50"
                )}
                style={
                    stickyHeader
                        ? ({
                              background: headerGradient,
                              top: "var(--library-section-sticky-top)",
                          } as CSSProperties)
                        : undefined
                }
            >
                {canToggle ? (
                    <Button
                        className="min-w-0 flex-1 justify-start rounded-xl px-4"
                        onClick={onToggle}
                        size="lg"
                        variant="ghost"
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="size-4" />
                        ) : (
                            <ChevronDownIcon className="size-4" />
                        )}
                        <span className="ml-1 truncate font-medium">
                            {title}
                        </span>
                    </Button>
                ) : (
                    <h2 className="font-medium text-lg">{title}</h2>
                )}
                <span className="font-medium text-foreground text-xs tabular-nums">
                    {items.length}
                </span>
            </div>
            {body}
        </section>
    );
}
