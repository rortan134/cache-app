"use client";

import { Masonry } from "@/components/ui/masonry";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { Ticker } from "@/components/ui/ticker";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

interface PublicShareGridItem {
    href: string | null;
    id: string;
    kind: "bookmark" | "note";
    noteExcerpt: string | null;
    previewImageUrl: string | null;
    title: string;
}

function PreviewMedia({
    alt,
    src,
}: {
    alt: string;
    src: string | null;
}): React.ReactElement {
    const [didFail, setDidFail] = React.useState(false);
    const canRenderImage = Boolean(src) && !didFail;

    const handleError = useStableCallback(() => setDidFail(true));

    if (!canRenderImage) {
        return <MediaPlaceholder className="min-h-32" />;
    }

    return (
        <img
            alt={alt}
            className="size-full object-cover"
            draggable="false"
            fetchPriority="auto"
            height={400}
            loading="lazy"
            onError={handleError}
            src={src ?? undefined}
            width={300}
        />
    );
}

function PublicShareGridCard({
    data,
}: {
    data: PublicShareGridItem;
}): React.ReactElement {
    const isNote = data.kind === "note";
    const noteExcerpt = data.noteExcerpt ?? "Untitled note";
    const displayTitle = data.title;

    const preview = isNote ? (
        <div className="relative flex h-auto min-h-56 w-full flex-col justify-between bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
            <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                <p className="whitespace-pre-wrap text-[11px] text-foreground leading-relaxed opacity-90">
                    {noteExcerpt}
                </p>
            </div>
        </div>
    ) : (
        <div className="relative aspect-3/4 w-full overflow-hidden">
            <PreviewMedia alt={data.title} src={data.previewImageUrl} />
        </div>
    );

    const titleElement = isNote ? null : (
        <div className="flex items-center p-1.5">
            <span
                className="block w-full min-w-0 truncate text-left text-[11px] text-foreground"
                title={displayTitle}
            >
                <Ticker>{displayTitle}</Ticker>
            </span>
        </div>
    );

    return (
        <div className="group relative flex shrink-0 flex-col before:absolute before:-inset-x-2 before:-top-2 before:bottom-0 before:-z-10 before:rounded-xl before:bg-muted/50 before:opacity-0 before:transition-transform hover:before:opacity-100 active:before:scale-x-[0.99] active:before:scale-y-[0.97] active:before:opacity-80!">
            {data.href ? (
                <a
                    className="squircle flex flex-col overflow-clip rounded-xl focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    href={data.href}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                >
                    {preview}
                    {titleElement}
                </a>
            ) : (
                <div className="squircle flex flex-col overflow-clip rounded-xl focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                    {preview}
                    {titleElement}
                </div>
            )}
        </div>
    );
}

function PublicShareGrid({
    items,
}: {
    items: PublicShareGridItem[];
}): React.ReactElement {
    if (items.length === 0) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 border-dashed px-6 py-14 text-center">
                    <p className="max-w-md text-balance text-muted-foreground text-sm">
                        This collection is empty.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Masonry
            columnGutter={16}
            itemAs="article"
            itemStyle={{ contain: "layout style" }}
            items={items}
            maxColumnCount={7}
            render={PublicShareGridCard}
            rowGutter={16}
            tabIndex={-1}
        />
    );
}

export { PublicShareGrid };
export type { PublicShareGridItem };
