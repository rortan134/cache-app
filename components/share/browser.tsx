"use client";

import { Masonry, MasonryItem } from "@/components/ui/masonry";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { Ticker } from "@/components/ui/ticker";
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
            onError={() => setDidFail(true)}
            src={src ?? undefined}
            width={300}
        />
    );
}

function PublicShareGridCard({
    item,
}: {
    item: PublicShareGridItem;
}): React.ReactElement {
    const isNote = item.kind === "note";
    const noteExcerpt = item.noteExcerpt ?? "Untitled note";

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
            <PreviewMedia alt={item.title} src={item.previewImageUrl} />
        </div>
    );

    return (
        <article className="squircle relative flex flex-col overflow-clip ring-1 ring-border/50">
            {item.href ? (
                <a
                    className="flex flex-col focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    href={item.href}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {preview}
                </a>
            ) : (
                preview
            )}
            {isNote ? null : (
                <div className="flex items-center py-1 pr-3">
                    <span
                        className="min-w-0 flex-1 truncate rounded-sm font-normal text-[11px] text-foreground leading-none outline-none"
                        title={item.title}
                    >
                        <Ticker>{item.title}</Ticker>
                    </span>
                </div>
            )}
        </article>
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
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 border-dashed bg-card/30 px-6 py-14 text-center">
                    <p className="max-w-md text-balance text-muted-foreground text-sm">
                        This shared collection is empty.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Masonry gap={16}>
            {items.map((item) => (
                <MasonryItem key={item.id}>
                    <PublicShareGridCard item={item} />
                </MasonryItem>
            ))}
        </Masonry>
    );
}

export { PublicShareGrid };
export type { PublicShareGridItem };
