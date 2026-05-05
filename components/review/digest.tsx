"use client";

import { UpgradeButton } from "@/components/billing/upgrade-button";
import {
    CollectionComboboxPicker,
    PreviewMedia,
} from "@/components/library/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    deleteLibraryItem,
    type LibraryItemCollectionsUpdateResult,
    updateLibraryItemCollections,
} from "@/lib/collections/items";
import {
    itemPreviewImageUrl,
    type LibraryCollectionSummary,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { getOwnerWindow } from "@/lib/common/dom";
import { parseDisplayUrl } from "@/lib/common/url";
import { markLibraryItemAsReviewed } from "@/lib/review/actions";
import { LibraryItemSource } from "@/prisma/client/enums";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Compass,
    FolderPlus,
    Globe,
    Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

const SOURCE_LABELS: Record<LibraryItemSource, string> = {
    [LibraryItemSource.cache_note]: "Notes",
    [LibraryItemSource.chrome_bookmarks]: "Chrome",
    [LibraryItemSource.github_starred_repositories]: "GitHub",
    [LibraryItemSource.google_photos]: "Google Photos",
    [LibraryItemSource.instagram]: "Instagram",
    [LibraryItemSource.pinterest]: "Pinterest",
    [LibraryItemSource.tiktok]: "TikTok",
    [LibraryItemSource.x_bookmarks]: "X",
    [LibraryItemSource.other]: "Other",
    [LibraryItemSource.youtube_watch_later]: "YouTube",
};

function getSourceLabel(source: LibraryItemSource): string {
    return SOURCE_LABELS[source] ?? "Other";
}

function getItemDomain(url: string): string {
    return parseDisplayUrl(url) || "Other";
}

function isTextEntryTarget(
    target: EventTarget | null,
    ownerWindow: Window & typeof globalThis
): boolean {
    return (
        target instanceof ownerWindow.HTMLElement &&
        (target.isContentEditable ||
            Boolean(
                target.closest('input, textarea, select, [role="textbox"]')
            ))
    );
}

interface ReviewDigestProps {
    collections: LibraryCollectionSummary[];
    hasAccess: boolean;
    initialItems: LibraryItemWithCollections[];
}

export function ReviewDigest({
    collections,
    hasAccess,
    initialItems,
}: ReviewDigestProps) {
    if (!hasAccess) {
        return <ReviewPaywall itemCount={initialItems.length} />;
    }

    if (initialItems.length === 0) {
        return <ReviewEmptyState />;
    }

    return (
        <ReviewSession collections={collections} initialItems={initialItems} />
    );
}

interface ReviewItemCardProps {
    collections: LibraryCollectionSummary[];
    isActive: boolean;
    isDeleting: boolean;
    item: LibraryItemWithCollections;
    onDelete: () => void;
    onKeep: () => void;
    onUpdateCollections: (
        itemId: string,
        collectionIds: string[]
    ) => Promise<LibraryItemCollectionsUpdateResult>;
}

function ReviewItemCard({
    collections,
    isActive,
    isDeleting,
    item,
    onDelete,
    onKeep,
    onUpdateCollections,
}: ReviewItemCardProps) {
    const isNote = item.kind === "note";
    const previewUrl = itemPreviewImageUrl(item);
    const hasPreview = previewUrl !== null;
    const domain = getItemDomain(item.url);
    const noteTitle = item.noteContentText?.trim() || "Untitled note";
    const displayTitle = isNote ? noteTitle : item.caption || domain;
    const alt = (item.caption ?? "").trim() || "Saved item";

    return (
        <div
            aria-hidden={!isActive}
            className="flex h-full w-full flex-none flex-col items-center justify-center px-4 pb-4"
        >
            <div className="relative flex h-full max-h-[min(90vh,52rem)] w-full max-w-lg flex-col gap-4">
                {/* Media / Note body */}
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-border/50">
                    {isNote ? (
                        <div className="flex h-full flex-col overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-5 text-foreground">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                            <div className="relative flex flex-1 flex-col overflow-hidden">
                                <p className="line-clamp-12 whitespace-pre-wrap text-sm leading-relaxed opacity-90">
                                    {noteTitle}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {hasPreview ? null : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                                    <Globe className="size-10 opacity-40" />
                                    <span className="text-sm opacity-60">
                                        {domain}
                                    </span>
                                </div>
                            )}
                            <PreviewMedia alt={alt} src={previewUrl} />
                        </>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 px-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            {getSourceLabel(item.source)}
                        </Badge>
                        {isNote ? null : (
                            <span className="text-muted-foreground text-xs">
                                {domain}
                            </span>
                        )}
                    </div>
                    <h3 className="line-clamp-2 font-medium text-lg leading-snug">
                        {displayTitle}
                    </h3>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3 px-1">
                    <Button
                        className="rounded-xl"
                        onClick={onKeep}
                        variant="outline"
                    >
                        <Check className="mr-1.5 size-4" />
                        Keep
                    </Button>
                    <CollectionComboboxPicker
                        collections={collections}
                        items={[item]}
                        onUpdateItemCollections={onUpdateCollections}
                        render={
                            <Button
                                className="w-full rounded-xl"
                                size="default"
                                variant="default"
                            />
                        }
                    >
                        <FolderPlus className="mr-1.5 size-4" />
                        Collect
                    </CollectionComboboxPicker>
                    <Button
                        className="rounded-xl"
                        disabled={isDeleting}
                        onClick={onDelete}
                        variant="destructive"
                    >
                        <Trash2Icon className="mr-1.5 size-4" />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ReviewSession({
    collections,
    initialItems,
}: {
    collections: LibraryCollectionSummary[];
    initialItems: LibraryItemWithCollections[];
}) {
    const [queue, setQueue] =
        React.useState<LibraryItemWithCollections[]>(initialItems);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [deletingItemIds, setDeletingItemIds] = React.useState<Set<string>>(
        new Set()
    );
    const [actionError, setActionError] = React.useState<string | null>(null);
    const currentItemRef = React.useRef<LibraryItemWithCollections | null>(
        null
    );
    const deletingItemIdsRef = React.useRef(deletingItemIds);

    // Keep refs in sync so keyboard shortcuts always target live state.
    currentItemRef.current = queue[currentIndex] ?? null;
    deletingItemIdsRef.current = deletingItemIds;

    // Clamp current index whenever the queue shrinks.
    React.useEffect(() => {
        setCurrentIndex((ci) => {
            if (queue.length === 0) {
                return 0;
            }
            if (ci >= queue.length) {
                return queue.length - 1;
            }
            return ci;
        });
    }, [queue.length]);

    const handlePrev = useStableCallback(() => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    });

    const handleNext = useStableCallback(() => {
        setCurrentIndex((i) => Math.min(queue.length - 1, i + 1));
    });

    function removeItem(itemId: string) {
        setQueue((prev) => prev.filter((item) => item.id !== itemId));
    }

    const keepItem = useStableCallback(async (itemId: string) => {
        try {
            const result = await markLibraryItemAsReviewed({ itemId });
            if (result.status !== "REVIEWED") {
                setActionError(result.message);
                return;
            }
            setActionError(null);
            removeItem(itemId);
        } catch {
            setActionError("We couldn't mark this item as reviewed right now.");
        }
    });

    const deleteItem = useStableCallback(async (itemId: string) => {
        if (deletingItemIdsRef.current.has(itemId)) {
            return;
        }
        setDeletingItemIds((prev) => {
            const next = new Set(prev);
            next.add(itemId);
            return next;
        });
        try {
            const result = await deleteLibraryItem(itemId);
            if (result.status === "DELETED") {
                removeItem(itemId);
            }
        } finally {
            setDeletingItemIds((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    });

    const handleUpdateItemCollections = useStableCallback(
        async (itemId: string, collectionIds: string[]) => {
            const [result] = await Promise.all([
                updateLibraryItemCollections({
                    collectionIds,
                    itemId,
                }),
                markLibraryItemAsReviewed({ itemId }).catch(() => undefined),
            ]);
            if (result.status === "UPDATED") {
                removeItem(itemId);
            }
            return result;
        }
    );

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                isTextEntryTarget(event.target, getOwnerWindow())
            ) {
                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                handlePrev();
                return;
            }
            if (event.key === "ArrowRight") {
                event.preventDefault();
                handleNext();
                return;
            }

            const liveItem = currentItemRef.current;
            if (!liveItem) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === "k") {
                event.preventDefault();
                keepItem(liveItem.id);
                return;
            }
            if (key === "d") {
                event.preventDefault();
                deleteItem(liveItem.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleNext, handlePrev, keepItem, deleteItem]);

    if (queue.length === 0) {
        return <ReviewCompletionState />;
    }

    const reviewedCount = initialItems.length - queue.length;

    return (
        <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* Progress header */}
            <div className="flex items-center justify-between px-6 py-4">
                <span className="text-muted-foreground text-sm">
                    {currentIndex + 1} / {queue.length}
                </span>
                {reviewedCount > 0 ? (
                    <span className="text-muted-foreground text-sm">
                        {reviewedCount} reviewed
                    </span>
                ) : null}
            </div>
            {actionError ? (
                <div className="mx-6 rounded-xl border border-destructive/25 bg-destructive/6 px-4 py-2 text-foreground text-sm">
                    {actionError}
                </div>
            ) : null}

            {/* Horizontal carousel */}
            <div className="relative flex-1 overflow-hidden">
                <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{
                        transform: `translateX(calc(-100% * ${currentIndex}))`,
                    }}
                >
                    {queue.map((item, index) => (
                        <ReviewItemCard
                            collections={collections}
                            isActive={index === currentIndex}
                            isDeleting={deletingItemIds.has(item.id)}
                            item={item}
                            key={item.id}
                            onDelete={() => deleteItem(item.id)}
                            onKeep={() => keepItem(item.id)}
                            onUpdateCollections={handleUpdateItemCollections}
                        />
                    ))}
                </div>

                {/* Side navigation */}
                {currentIndex > 0 ? (
                    <button
                        aria-label="Previous item"
                        className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition hover:bg-background"
                        onClick={handlePrev}
                        type="button"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                ) : null}
                {currentIndex < queue.length - 1 ? (
                    <button
                        aria-label="Next item"
                        className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition hover:bg-background"
                        onClick={handleNext}
                        type="button"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function ReviewEmptyState() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Compass className="size-6" />
            </div>
            <div className="flex max-w-sm flex-col gap-2">
                <h2 className="font-semibold text-lg">Nothing to review</h2>
                <p className="text-muted-foreground text-sm">
                    All your saved items are already organized into collections.
                </p>
            </div>
            <Button render={<Link href="/library" />}>Back to library</Button>
        </div>
    );
}

function ReviewCompletionState() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check className="size-8" />
            </div>
            <div className="flex max-w-sm flex-col gap-2">
                <h2 className="font-semibold text-2xl">
                    You&apos;re all caught up.
                </h2>
                <p className="text-muted-foreground text-sm">
                    Every uncollected item has been reviewed.
                </p>
            </div>
            <div className="flex gap-3">
                <Button render={<Link href="/library" />} variant="outline">
                    Back to library
                </Button>
                <Button
                    onClick={() => {
                        window.location.reload();
                    }}
                    variant="default"
                >
                    Continue reviewing
                </Button>
            </div>
        </div>
    );
}

function ReviewPaywall({ itemCount }: { itemCount: number }) {
    const params = useParams<{ locale?: string }>();
    const locale = Array.isArray(params.locale)
        ? params.locale[0]
        : (params.locale ?? "en");

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Compass className="size-8" />
            </div>
            <div className="flex max-w-md flex-col gap-3">
                <h2 className="font-semibold text-2xl">Unlock Review</h2>
                <p className="text-muted-foreground text-sm">
                    You have {itemCount} uncollected{" "}
                    {itemCount === 1 ? "item" : "items"} waiting to be
                    organized. Upgrade to Pro to access the review feature.
                </p>
            </div>
            <UpgradeButton locale={locale}>Get Pro</UpgradeButton>
        </div>
    );
}
