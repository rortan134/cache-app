"use client";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import type { CollectionPreview } from "@/lib/collections/service";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const PREVIEW_CELL_KEYS = ["tl", "tr", "bl", "br"] as const;

export function CollectionsGrid({
    collections,
}: {
    collections: CollectionPreview[];
}) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((collection) => (
                <CollectionCard collection={collection} key={collection.id} />
            ))}
        </div>
    );
}

function CollectionCard({ collection }: { collection: CollectionPreview }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <CollectionThumbnailGrid urls={collection.previewImageUrls} />
            <div className="flex flex-col gap-1 p-3">
                <h3
                    className="truncate font-medium text-foreground text-sm"
                    title={collection.name}
                >
                    {collection.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                </p>
            </div>
        </div>
    );
}

function CollectionThumbnailGrid({ urls }: { urls: string[] }) {
    return (
        <div className="grid h-40 w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted/40">
            {PREVIEW_CELL_KEYS.map((cellKey, slot) => (
                <CollectionThumbnailCell
                    key={cellKey}
                    url={urls[slot] ?? null}
                />
            ))}
        </div>
    );
}

function CollectionThumbnailCell({ url }: { url: string | null }) {
    const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

    const handleError = useStableCallback(() => {
        if (url) {
            setFailedUrl(url);
        }
    });

    if (!url || failedUrl === url) {
        return <MediaPlaceholder className="size-full rounded-none" />;
    }

    return (
        <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            height={160}
            loading="lazy"
            onError={handleError}
            src={url}
            width={160}
        />
    );
}
