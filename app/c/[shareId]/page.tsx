import { PageShell } from "@/components/ui/page-shell";
import { getPublicCollectionShareById } from "@/lib/collection-sharing/service";
import { getSourceLabel } from "@/lib/integrations/support";
import { getNoteExcerpt } from "@/lib/integrations/notes/utils";
import { getDisplayUrl, normalizeURL } from "@/lib/url";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
});

interface CollectionSharePageProps {
    params: Promise<{
        shareId: string;
    }>;
}

const getCachedPublicCollectionShare = cache(async (shareId: string) =>
    getPublicCollectionShareById(shareId)
);

function formatDate(value: Date | null | undefined): string | null {
    return value ? DATE_FORMATTER.format(value) : null;
}

function getSharedItemTitle(item: {
    caption: string | null;
    kind: string;
    noteContentText: string | null;
    url: string;
}): string {
    if (item.kind === "note") {
        return getNoteExcerpt(item.noteContentText, 80) || "Untitled note";
    }

    const caption = item.caption?.trim();
    return caption && caption.length > 0 ? caption : normalizeURL(item.url);
}

function getSharedItemExcerpt(item: {
    kind: string;
    noteContentText: string | null;
    url: string;
}): string {
    if (item.kind === "note") {
        return getNoteExcerpt(item.noteContentText, 220) || "No note text yet.";
    }

    return getDisplayUrl(normalizeURL(item.url));
}

function getSharedItemHref(item: { kind: string; url: string }): string | null {
    const href = normalizeURL(item.url);
    return item.kind === "note" || href === "about:blank" ? null : href;
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

export default async function CollectionSharePage(
    props: CollectionSharePageProps
) {
    const { shareId } = await props.params;
    const collection = await getCachedPublicCollectionShare(shareId);

    if (!collection) {
        notFound();
    }

    return (
        <PageShell className="relative overflow-hidden bg-linear-to-b from-amber-50/65 via-background to-background">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_28%)]" />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        className="rounded-full px-3 py-1.5 font-medium text-foreground text-sm transition-colors hover:bg-background/70"
                        href="/"
                    >
                        Cache App
                    </Link>
                    <span className="inline-flex rounded-full border border-border/70 bg-background/80 px-3 py-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                        Shared collection
                    </span>
                </div>

                <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
                    <aside className="h-fit rounded-[2rem] border border-border/70 bg-background/88 p-6 shadow-xl/5 backdrop-blur-sm lg:sticky lg:top-6">
                        <div className="inline-flex rounded-full border border-amber-200/80 bg-amber-100/70 px-3 py-1 text-[11px] text-amber-900/80 uppercase tracking-[0.16em]">
                            Public read-only link
                        </div>
                        <h1 className="mt-4 text-balance font-semibold text-3xl tracking-tight">
                            {collection.name}
                        </h1>
                        <p className="mt-3 text-pretty text-muted-foreground text-sm leading-relaxed">
                            {collection.description ??
                                "A curated set of saved items collected in Cache."}
                        </p>

                        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-border/60 bg-muted/35 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                                    Shared by
                                </span>
                                <span className="font-medium text-sm">
                                    {collection.ownerName}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                                    Items
                                </span>
                                <span className="font-medium text-sm">
                                    {collection.itemCount}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                                    Shared
                                </span>
                                <span className="font-medium text-sm">
                                    {formatDate(collection.sharedAt)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                                    Updated
                                </span>
                                <span className="font-medium text-sm">
                                    {formatDate(collection.updatedAt)}
                                </span>
                            </div>
                        </div>

                        <p className="mt-4 text-muted-foreground text-xs leading-relaxed">
                            This link is intentionally unlisted and read-only.
                            Search engines are asked not to index it.
                        </p>
                    </aside>

                    <section className="grid gap-3">
                        {collection.items.length === 0 ? (
                            <div className="rounded-[2rem] border border-border/70 border-dashed bg-background/70 p-8 text-center shadow-lg/4">
                                <p className="font-medium text-lg">
                                    Nothing has been added here yet.
                                </p>
                                <p className="mt-2 text-muted-foreground text-sm">
                                    This shared collection exists, but it
                                    doesn&apos;t include any saved items right
                                    now.
                                </p>
                            </div>
                        ) : (
                            collection.items.map((item) => {
                                const href = getSharedItemHref(item);
                                const itemDate =
                                    item.postedAt ??
                                    item.scrapedAt ??
                                    item.createdAt;

                                return (
                                    <article
                                        className="group rounded-[1.75rem] border border-border/70 bg-background/82 p-5 shadow-lg/4 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
                                        key={item.id}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                                                        {getSourceLabel(
                                                            item.source
                                                        )}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-border/50 bg-background px-2.5 py-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                                                        {item.kind === "note"
                                                            ? "Note"
                                                            : "Bookmark"}
                                                    </span>
                                                </div>
                                                <h2 className="mt-3 text-balance font-medium text-lg tracking-tight">
                                                    {getSharedItemTitle(item)}
                                                </h2>
                                                <p className="mt-2 text-pretty text-muted-foreground text-sm leading-relaxed">
                                                    {getSharedItemExcerpt(item)}
                                                </p>
                                            </div>

                                            {href ? (
                                                <a
                                                    className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-background px-3.5 py-2 font-medium text-sm transition-colors hover:bg-muted"
                                                    href={href}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    Open
                                                </a>
                                            ) : null}
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                                            <span>
                                                {item.kind === "note"
                                                    ? "Cache note"
                                                    : getDisplayUrl(item.url)}
                                            </span>
                                            {itemDate ? (
                                                <span>
                                                    Saved {formatDate(itemDate)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </section>
                </div>
            </div>
        </PageShell>
    );
}
