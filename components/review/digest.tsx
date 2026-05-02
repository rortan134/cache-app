"use client";

import {
    CollectionComboboxPicker,
    PreviewMedia,
} from "@/components/library/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    deleteLibraryItem,
    updateLibraryItemCollections,
} from "@/lib/collections/items";
import { markLibraryItemAsReviewed } from "@/lib/review/actions";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";
import { parseDisplayUrl, toValidUrl } from "@/lib/common/url";
import { LibraryItemSource } from "@/prisma/client/enums";
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
import * as React from "react";

function itemDomain(url: string): string {
    return parseDisplayUrl(url) || "Other";
}

function itemStaticPreviewUrl(item: LibraryItemWithCollections): string | null {
    const staticImageUrl = toUsableStaticPreviewUrl(
        item.preview?.staticImageUrl
    );
    if (staticImageUrl) {
        return staticImageUrl;
    }

    if (item.kind !== "bookmark") {
        return null;
    }

    const href = toValidUrl(item.url);
    if (href === "about:blank") {
        return null;
    }

    return `/api/preview?url=${encodeURIComponent(href)}`;
}

function canResolveCobaltPreview(item: LibraryItemWithCollections): boolean {
    if (item.kind !== "bookmark" || toValidUrl(item.url) === "about:blank") {
        return false;
    }

    switch (item.source) {
        case LibraryItemSource.google_photos:
        case LibraryItemSource.instagram:
        case LibraryItemSource.other:
        case LibraryItemSource.pinterest:
        case LibraryItemSource.tiktok:
        case LibraryItemSource.x_bookmarks:
        case LibraryItemSource.youtube_watch_later:
            return true;
        default:
            return false;
    }
}

function sourceLabel(source: LibraryItemSource): string {
    if (source === LibraryItemSource.cache_note) {
        return "Notes";
    }
    if (source === LibraryItemSource.chrome_bookmarks) {
        return "Chrome";
    }
    if (source === LibraryItemSource.github_starred_repositories) {
        return "GitHub";
    }
    if (source === LibraryItemSource.google_photos) {
        return "Google Photos";
    }
    if (source === LibraryItemSource.instagram) {
        return "Instagram";
    }
    if (source === LibraryItemSource.pinterest) {
        return "Pinterest";
    }
    if (source === LibraryItemSource.tiktok) {
        return "TikTok";
    }
    if (source === LibraryItemSource.x_bookmarks) {
        return "X";
    }
    if (source === LibraryItemSource.youtube_watch_later) {
        return "YouTube";
    }
    return "Other";
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

    // Keep the ref in sync so keyboard shortcuts always target the live item.
    currentItemRef.current = queue[currentIndex] ?? null;

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

    const handlePrev = React.useCallback(() => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    }, []);

    const handleNext = React.useCallback(() => {
        setCurrentIndex((i) => Math.min(queue.length - 1, i + 1));
    }, [queue.length]);

    const removeItem = React.useCallback((itemId: string) => {
        setQueue((prev) => prev.filter((item) => item.id !== itemId));
    }, []);

    const handleUpdateItemCollections = React.useCallback(
        async (itemId: string, collectionIds: string[]) => {
            const [result] = await Promise.all([
                updateLibraryItemCollections({
                    collectionIds,
                    itemId,
                }),
                markLibraryItemAsReviewed(itemId).catch(() => undefined),
            ]);
            if (result.status === "UPDATED") {
                removeItem(itemId);
            }
            return result;
        },
        [removeItem]
    );

    React.useEffect(() => {
        const isTextEntryTarget = (target: EventTarget | null): boolean =>
            target instanceof HTMLElement &&
            (target.isContentEditable ||
                Boolean(
                    target.closest('input, textarea, select, [role="textbox"]')
                ));

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                isTextEntryTarget(event.target)
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
            if (event.key.toLowerCase() === "k") {
                event.preventDefault();
                markLibraryItemAsReviewed(liveItem.id)
                    .then((result) => {
                        if (result.status !== "REVIEWED") {
                            setActionError(result.message);
                            return;
                        }
                        setActionError(null);
                        removeItem(liveItem.id);
                    })
                    .catch(() => {
                        setActionError(
                            "We couldn't mark this item as reviewed right now."
                        );
                    });
            }
            if (event.key.toLowerCase() === "d") {
                event.preventDefault();
                if (deletingItemIds.has(liveItem.id)) {
                    return;
                }
                setDeletingItemIds((prev) => {
                    const next = new Set(prev);
                    next.add(liveItem.id);
                    return next;
                });
                deleteLibraryItem(liveItem.id)
                    .then((result) => {
                        if (result.status === "DELETED") {
                            removeItem(liveItem.id);
                        }
                    })
                    .finally(() => {
                        setDeletingItemIds((prev) => {
                            const next = new Set(prev);
                            next.delete(liveItem.id);
                            return next;
                        });
                    });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [deletingItemIds, handleNext, handlePrev, removeItem]);

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
                    {queue.map((item, index) => {
                        const isActive = index === currentIndex;
                        const isNote = item.kind === "note";
                        const isDeleting = deletingItemIds.has(item.id);
                        const staticPreview = itemStaticPreviewUrl(item);
                        const videoPreview =
                            item.preview?.videoPreviewUrl ?? null;
                        const hasImmediatePreview =
                            staticPreview !== null || videoPreview !== null;
                        const alt = (item.caption ?? "").trim() || "Saved item";
                        const domain = itemDomain(item.url);
                        const noteTitle =
                            item.noteContentText?.trim() || "Untitled note";
                        const displayTitle = isNote
                            ? noteTitle
                            : item.caption || domain;

                        // Per-item action handlers avoid stale closures.
                        const onKeep = async () => {
                            const result = await markLibraryItemAsReviewed(
                                item.id
                            );
                            if (result.status !== "REVIEWED") {
                                setActionError(result.message);
                                return;
                            }
                            setActionError(null);
                            removeItem(item.id);
                        };
                        const onDelete = async () => {
                            if (isDeleting) {
                                return;
                            }
                            setDeletingItemIds((prev) => {
                                const next = new Set(prev);
                                next.add(item.id);
                                return next;
                            });
                            try {
                                const result = await deleteLibraryItem(item.id);
                                if (result.status === "DELETED") {
                                    removeItem(item.id);
                                }
                            } finally {
                                setDeletingItemIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(item.id);
                                    return next;
                                });
                            }
                        };

                        return (
                            <div
                                aria-hidden={!isActive}
                                className="flex h-full w-full flex-none flex-col items-center justify-center px-4 pb-4"
                                key={item.id}
                            >
                                <div className="relative flex h-full max-h-[min(90vh,52rem)] w-full max-w-lg flex-col gap-4">
                                    {/* Media / Note body */}
                                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-border/50">
                                        {isNote ? (
                                            <div className="flex h-full flex-col overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-5 text-foreground">
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                                                <div className="relative flex flex-1 flex-col overflow-hidden">
                                                    <p className="line-clamp-[12] whitespace-pre-wrap text-sm leading-relaxed opacity-90">
                                                        {noteTitle}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {hasImmediatePreview ||
                                                canResolveCobaltPreview(
                                                    item
                                                ) ? null : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                                                        <Globe className="size-10 opacity-40" />
                                                        <span className="text-sm opacity-60">
                                                            {domain}
                                                        </span>
                                                    </div>
                                                )}
                                                <PreviewMedia
                                                    alt={alt}
                                                    canResolveCobaltPreview={canResolveCobaltPreview(
                                                        item
                                                    )}
                                                    itemId={item.id}
                                                    src={staticPreview}
                                                    videoPreviewUrl={
                                                        videoPreview
                                                    }
                                                />
                                            </>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex flex-col gap-2 px-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">
                                                {sourceLabel(item.source)}
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
                                            onUpdateItemCollections={
                                                handleUpdateItemCollections
                                            }
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
                    })}
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

import { UpgradeButton } from "@/components/billing/upgrade-button";
import { useParams } from "next/navigation";

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
