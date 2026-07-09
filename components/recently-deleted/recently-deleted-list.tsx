"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { purgeLibraryItem, restoreLibraryItem } from "@/lib/collections/items";
import { ACTION_STATUS, ITEM_KIND_NOTE } from "@/lib/common/constants";
import { cn } from "@/lib/common/cn";
import { parseDisplayUrl } from "@/lib/common/url";
import { getSourceIcon } from "@/lib/integrations/support";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, Var } from "gt-next";
import { RotateCcw, Trash } from "lucide-react";
import * as React from "react";
import type {
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/collections/utils";

const RECENTLY_DELETED_EXPIRES_SOON_DAYS = 7;

interface RecentlyDeletedItemMeta {
    daysRemaining: number;
    deletedAt: string;
}

interface RecentlyDeletedListProps {
    itemDaysRemainingById: Record<string, RecentlyDeletedItemMeta>;
    items: LibraryItemWithCollections[];
}

interface PendingAction {
    item: LibraryItemWithCollections;
    kind: "purge" | "restore";
}

export function RecentlyDeletedList({
    itemDaysRemainingById,
    items,
}: RecentlyDeletedListProps) {
    const [isPending, startTransition] = React.useTransition();
    const [pendingAction, setPendingAction] =
        React.useState<PendingAction | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [hiddenItemIds, setHiddenItemIds] = React.useState<Set<string>>(
        () => new Set()
    );

    const visibleItems = items.filter((item) => !hiddenItemIds.has(item.id));

    const handleRequestAction = useStableCallback(
        (item: LibraryItemWithCollections, kind: PendingAction["kind"]) => {
            setErrorMessage(null);
            setPendingAction({ item, kind });
        }
    );

    const handleDialogOpenChange = useStableCallback((open: boolean) => {
        if (!(open || isPending)) {
            setPendingAction(null);
            setErrorMessage(null);
        }
    });

    const handleConfirmAction = useStableCallback(() => {
        const target = pendingAction;
        if (!target) {
            return;
        }

        startTransition(async () => {
            const removeFromList = () => {
                setHiddenItemIds((current) =>
                    new Set(current).add(target.item.id)
                );
                setPendingAction(null);
                setErrorMessage(null);
            };

            try {
                if (target.kind === "restore") {
                    const response = await restoreLibraryItem(target.item.id);
                    if (response.status === ACTION_STATUS.RESTORED) {
                        removeFromList();
                        return;
                    }
                    setErrorMessage(
                        "message" in response
                            ? response.message
                            : "We couldn't restore this saved item right now."
                    );
                    return;
                }

                const response = await purgeLibraryItem(target.item.id);
                if (response.status === ACTION_STATUS.DELETED) {
                    removeFromList();
                    return;
                }
                setErrorMessage(
                    "message" in response
                        ? response.message
                        : "We couldn't permanently delete this saved item right now."
                );
            } catch {
                setErrorMessage(
                    target.kind === "restore"
                        ? "We couldn't restore this saved item right now."
                        : "We couldn't permanently delete this saved item right now."
                );
            }
        });
    });

    if (visibleItems.length === 0) {
        return (
            <div className="flex flex-col items-center gap-6 py-24 text-center">
                <MediaPlaceholder className="flex h-32 w-full max-w-md flex-col items-center justify-center rounded-2xl">
                    <Trash
                        aria-hidden
                        className="size-8 text-muted-foreground"
                        focusable="false"
                    />
                </MediaPlaceholder>
                <div className="space-y-2">
                    <p className="font-medium text-foreground text-sm">
                        <T>Nothing to restore right now</T>
                    </p>
                    <p className="mx-auto max-w-sm text-muted-foreground text-xs">
                        <T>
                            Items you remove from your library stay here for 30
                            days before being deleted forever.
                        </T>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {visibleItems.map((item) => {
                const meta = itemDaysRemainingById[item.id];
                return (
                    <RecentlyDeletedRow
                        item={item}
                        key={item.id}
                        meta={meta}
                        onRequestAction={handleRequestAction}
                    />
                );
            })}
            <Dialog
                onOpenChange={handleDialogOpenChange}
                open={pendingAction !== null}
            >
                <DialogPopup>
                    {pendingAction ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {pendingAction.kind === "restore" ? (
                                        <T>Restore this saved item?</T>
                                    ) : (
                                        <T>Delete forever?</T>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    {pendingAction.kind === "restore" ? (
                                        <T>
                                            Move{" "}
                                            <Var>
                                                {displayTitle(
                                                    pendingAction.item
                                                )}
                                            </Var>{" "}
                                            back to your library. Collections
                                            and previews come back intact.
                                        </T>
                                    ) : (
                                        <T>
                                            Permanently delete{" "}
                                            <Var>
                                                {displayTitle(
                                                    pendingAction.item
                                                )}
                                            </Var>{" "}
                                            from Cache. This cannot be undone.
                                        </T>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose
                                    disabled={isPending}
                                    render={<Button variant="ghost" />}
                                >
                                    <T>Cancel</T>
                                </DialogClose>
                                <Button
                                    isLoading={isPending}
                                    onClick={handleConfirmAction}
                                    variant={
                                        pendingAction.kind === "purge"
                                            ? "destructive"
                                            : "default"
                                    }
                                >
                                    {pendingAction.kind === "restore" ? (
                                        <T>Restore</T>
                                    ) : (
                                        <T>Delete forever</T>
                                    )}
                                </Button>
                            </DialogFooter>
                            {errorMessage ? (
                                <p
                                    className="text-destructive text-xs"
                                    role="alert"
                                >
                                    {errorMessage}
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </DialogPopup>
            </Dialog>
        </div>
    );
}

interface RecentlyDeletedRowProps {
    item: LibraryItemWithCollections;
    meta?: RecentlyDeletedItemMeta;
    onRequestAction: (
        item: LibraryItemWithCollections,
        kind: PendingAction["kind"]
    ) => void;
}

function RecentlyDeletedRow({
    item,
    meta,
    onRequestAction,
}: RecentlyDeletedRowProps) {
    const SourceIcon = getSourceIcon(item.source) ?? Trash;
    const isExpiresSoon = meta
        ? meta.daysRemaining <= RECENTLY_DELETED_EXPIRES_SOON_DAYS
        : false;
    const countdownCopy = formatCountdownCopy(meta?.daysRemaining);

    const handleRestore = useStableCallback(() =>
        onRequestAction(item, "restore")
    );
    const handlePurge = useStableCallback(() => onRequestAction(item, "purge"));

    return (
        <div
            className={cn(
                "flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            )}
        >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <SourceIcon aria-hidden className="size-5" focusable="false" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-medium text-foreground text-sm">
                    {displayTitle(item)}
                </p>
                <p className="truncate text-muted-foreground text-xs">
                    {parseDisplayUrl(item.url)}
                </p>
                <div className="flex items-center gap-2 text-xs">
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 font-medium",
                            isExpiresSoon
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {countdownCopy}
                    </span>
                    <CollectionsList collections={item.collections} />
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Button onClick={handleRestore} size="sm" variant="outline">
                    <RotateCcw
                        aria-hidden
                        className="size-4"
                        focusable="false"
                    />
                    <T>Restore</T>
                </Button>
                <Button onClick={handlePurge} size="sm" variant="destructive">
                    <Trash aria-hidden className="size-4" focusable="false" />
                    <T>Delete forever</T>
                </Button>
            </div>
        </div>
    );
}

function CollectionsList({
    collections,
}: {
    collections: LibraryCollectionTag[];
}) {
    if (collections.length === 0) {
        return null;
    }
    return (
        <span className="truncate text-muted-foreground text-xs">
            <T>
                <Var>
                    {collections.length === 1
                        ? "1 collection"
                        : `${collections.length} collections`}
                </Var>
            </T>
        </span>
    );
}

function displayTitle(item: LibraryItemWithCollections): string {
    if (item.kind === ITEM_KIND_NOTE) {
        return item.noteContentText?.trim() || "Untitled note";
    }
    return item.caption?.trim() || parseDisplayUrl(item.url);
}

function formatCountdownCopy(
    daysRemaining: number | undefined
): React.ReactNode {
    if (daysRemaining === undefined) {
        return "";
    }
    if (daysRemaining === 0) {
        return <T>Deletes today</T>;
    }
    if (daysRemaining === 1) {
        return (
            <T>
                Deletes in <Var>1</Var> day
            </T>
        );
    }
    return (
        <T>
            Deletes in <Var>{daysRemaining}</Var> days
        </T>
    );
}
