"use client";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const PREVIEW_CELL_KEYS = ["tl", "tr", "bl", "br"] as const;

export function CollectionThumbnailGrid({ urls }: { urls: string[] }) {
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
