"use client";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import * as React from "react";

const PREVIEW_CELL_COUNT = 4;

export function CollectionThumbnailGrid({ urls }: { urls: string[] }) {
    const cells = Array.from(
        { length: PREVIEW_CELL_COUNT },
        (_, index) => urls[index] ?? null
    );

    return (
        <div className="grid h-40 w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted/40">
            {cells.map((url, index) => (
                <CollectionThumbnailCell key={index} url={url} />
            ))}
        </div>
    );
}

function CollectionThumbnailCell({ url }: { url: string | null }) {
    const [didFail, setDidFail] = React.useState(false);
    const canRenderImage = Boolean(url) && !didFail;

    if (!canRenderImage) {
        return <MediaPlaceholder className="size-full rounded-none" />;
    }

    return (
        <img
            alt=""
            className="size-full object-cover"
            draggable={false}
            height={160}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={url ?? undefined}
            width={160}
        />
    );
}
