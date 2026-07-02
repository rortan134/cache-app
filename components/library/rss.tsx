"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    addFeed,
    listFeeds,
    removeFeed,
    type AddFeedResult,
    type ListFeedsResult,
} from "@/lib/integrations/rss/actions";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Rss, Trash2 } from "lucide-react";
import * as React from "react";
import { createStore } from "stan-js";

const log = createLogger("library:rss:manage-dialog");

export const rssManageStore = createStore({
    isOpen: false,
});
export const { useStore: useRssManageStore } = rssManageStore;

interface Feed {
    createdAt: Date;
    description: string | null;
    feedUrl: string;
    id: string;
    lastError: string | null;
    lastFetchedAt: Date | null;
    siteUrl: string | null;
    title: string | null;
    updatedAt: Date;
}

function FeedRow({
    feed,
    onRemove,
    isRemoving,
}: {
    feed: Feed;
    onRemove: () => void;
    isRemoving: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Rss className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                    {feed.title ?? feed.feedUrl}
                </p>
                {feed.title ? (
                    <p className="truncate text-muted-foreground">
                        {feed.feedUrl}
                    </p>
                ) : null}
                {feed.lastError ? (
                    <p className="text-destructive text-xs">{feed.lastError}</p>
                ) : null}
            </div>
            <Button
                loading={isRemoving}
                onClick={onRemove}
                size="icon"
                variant="ghost"
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

function AddFeedForm({ onFeedAdded }: { onFeedAdded: () => void }) {
    const [url, setUrl] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [isPending, startTransition] = React.useTransition();

    const handleSubmit = useStableCallback((event: React.FormEvent) => {
        event.preventDefault();
        if (isPending) {
            return;
        }

        setError(null);
        startTransition(async () => {
            const result: AddFeedResult = await addFeed({ feedUrl: url });
            if (result.status !== "SUCCESS") {
                setError(result.message);
                return;
            }
            setUrl("");
            onFeedAdded();
        });
    });

    return (
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <div className="flex gap-2">
                <Input
                    aria-describedby={error ? "add-feed-error" : undefined}
                    aria-invalid={error ? true : undefined}
                    autoFocus
                    className="flex-1"
                    onChange={(event) => {
                        setUrl(event.currentTarget.value);
                        setError(null);
                    }}
                    placeholder="Paste feed URL"
                    required
                    type="url"
                    value={url}
                />
                <Button loading={isPending} size="sm" type="submit">
                    Add
                </Button>
            </div>
            {error ? (
                <p
                    className="text-destructive text-xs"
                    id="add-feed-error"
                    role="alert"
                >
                    {error}
                </p>
            ) : null}
        </form>
    );
}

export function RssManageDialog() {
    const { isOpen, setIsOpen } = useRssManageStore();
    const [feeds, setFeeds] = React.useState<Feed[]>([]);
    const [removingFeedIds, setRemovingFeedIds] = React.useState<Set<string>>(
        new Set()
    );
    const [isInitialLoading, startInitialLoad] = React.useTransition();

    const loadFeeds = useStableCallback(() => {
        startInitialLoad(async () => {
            const result: ListFeedsResult = await listFeeds();
            if (result.status === "SUCCESS") {
                setFeeds(result.feeds);
            }
        });
    });

    React.useEffect(() => {
        if (isOpen) {
            loadFeeds();
        }
    }, [isOpen, loadFeeds]);

    const handleRemove = useStableCallback((feedId: string) => {
        setRemovingFeedIds((prev) => new Set(prev).add(feedId));
        startInitialLoad(async () => {
            try {
                const result = await removeFeed({ feedId });
                if (result.status === "SUCCESS") {
                    setFeeds((prev) => prev.filter((f) => f.id !== feedId));
                } else {
                    log.error("Remove feed failed", result);
                }
            } finally {
                setRemovingFeedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(feedId);
                    return next;
                });
            }
        });
    });

    const handleOpenChange = useStableCallback((open: boolean) => {
        setIsOpen(open);
    });

    return (
        <Dialog onOpenChange={handleOpenChange} open={isOpen}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Manage RSS feeds</DialogTitle>
                    <DialogDescription>
                        Add or remove RSS feeds to import entries into your
                        library.
                    </DialogDescription>
                </DialogHeader>
                <DialogPanel className="flex flex-col gap-4">
                    <AddFeedForm onFeedAdded={loadFeeds} />
                    {isInitialLoading ? (
                        <p className="text-muted-foreground text-sm">
                            Loading feeds...
                        </p>
                    ) : null}
                    {!isInitialLoading && feeds.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No feeds added yet. Paste a feed URL above to get
                            started.
                        </p>
                    ) : null}
                    {!isInitialLoading && feeds.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {feeds.map((feed) => (
                                <FeedRow
                                    feed={feed}
                                    isRemoving={removingFeedIds.has(feed.id)}
                                    key={feed.id}
                                    onRemove={() => handleRemove(feed.id)}
                                />
                            ))}
                        </div>
                    ) : null}
                </DialogPanel>
                <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>
                        Done
                    </DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
