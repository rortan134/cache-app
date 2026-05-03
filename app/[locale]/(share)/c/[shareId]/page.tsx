import { PageShell } from "@/components/ui/page-shell";
import { getPublicCollectionShareById } from "@/lib/collections/sharing/service";
import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";
import { FALLBACK_URL, ITEM_KIND_NOTE } from "@/lib/common/constants";
import { normalizeURL } from "@/lib/common/url";
import { getNoteExcerpt } from "@/lib/integrations/notes/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React, { cache } from "react";
import { PublicShareGrid, type PublicShareGridItem } from "./public-share-grid";

interface CollectionSharePageProps {
    params: Promise<{
        shareId: string;
    }>;
}

const getCachedPublicCollectionShare = cache(async (shareId: string) => {
    "use cache";
    return getPublicCollectionShareById(shareId);
});

function getSharedItemTitle(item: {
    caption: string | null;
    kind: string;
    noteContentText: string | null;
    url: string;
}): string {
    if (item.kind === ITEM_KIND_NOTE) {
        return getNoteExcerpt(item.noteContentText, 80) || "Untitled note";
    }

    const caption = item.caption?.trim();
    return caption && caption.length > 0 ? caption : normalizeURL(item.url);
}

function getSharedItemHref(item: { kind: string; url: string }): string | null {
    const href = normalizeURL(item.url);
    return item.kind === ITEM_KIND_NOTE || href === FALLBACK_URL ? null : href;
}

function getSharedItemPreviewImageUrl(
    item: {
        preview: {
            staticImageUrl: string | null;
        } | null;
    },
    href: string | null
): string | null {
    const staticImageUrl = toUsableStaticPreviewUrl(
        item.preview?.staticImageUrl
    );
    if (staticImageUrl) {
        return staticImageUrl;
    }

    if (!href) {
        return null;
    }

    return `/api/preview?url=${encodeURIComponent(href)}`;
}

export async function generateMetadata(
    props: CollectionSharePageProps
): Promise<Metadata> {
    const { shareId } = await props.params;
    const collection = await getCachedPublicCollectionShare(shareId);

    return {
        description:
            collection?.description ??
            (collection
                ? `A read-only collection shared by ${collection.ownerName} on Cache.`
                : "A shared collection on Cache."),
        robots: {
            follow: false,
            index: false,
        },
        title: collection
            ? `${collection.name} shared collection`
            : "Shared collection",
    };
}

async function PageComp(props: CollectionSharePageProps) {
    const { shareId } = await props.params;
    const collection = await getCachedPublicCollectionShare(shareId);

    if (!collection) {
        notFound();
    }

    const items: PublicShareGridItem[] = collection.items.map((item) => {
        const href = getSharedItemHref(item);

        return {
            href,
            id: item.id,
            kind: item.kind === "note" ? "note" : "bookmark",
            noteExcerpt:
                item.kind === "note"
                    ? (getNoteExcerpt(item.noteContentText, 320) ??
                      "Untitled note")
                    : null,
            previewImageUrl: getSharedItemPreviewImageUrl(item, href),
            title: getSharedItemTitle(item),
        };
    });

    return (
        <PageShell>
            <div className="flex w-full flex-1 px-2 py-2 sm:px-4 sm:py-4">
                <PublicShareGrid items={items} />
            </div>
        </PageShell>
    );
}

export default function CollectionSharePage(props: CollectionSharePageProps) {
    return (
        <React.Suspense>
            <PageComp {...props} />
        </React.Suspense>
    );
}
