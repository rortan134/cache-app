"use client";

import { Masonry, MasonryItem } from "@/components/ui/masonry";
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
        return (
            <div className="flex size-full items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                No preview
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

    const content = isNote ? (
        <div className="relative flex aspect-3/4 min-h-72 w-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
            <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed opacity-90">
                    {noteExcerpt}
                </p>
            </div>
        </div>
    ) : (
        <>
            <div className="relative aspect-3/4 w-full overflow-hidden">
                <PreviewMedia alt={item.title} src={item.previewImageUrl} />
            </div>
            <div className="overflow-fade-top absolute inset-x-0 bottom-0 flex items-center overflow-hidden bg-black/35 px-2 pt-2 pb-1 backdrop-blur-[2.5px]">
                <span
                    className="block min-w-0 truncate font-medium text-white text-xs leading-none mix-blend-difference"
                    title={item.title}
                >
                    {item.title}
                </span>
            </div>
        </>
    );

    return (
        <article className="relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50">
            {item.href ? (
                <a
                    className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    href={item.href}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {content}
                </a>
            ) : (
                content
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
            <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
                No saved items yet.
            </div>
        );
    }

    return (
        <Masonry gap={4} instrumentationLabel="public-share-grid" linear>
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
