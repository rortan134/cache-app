import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { ActivePathname } from "@/components/ui/active-pathname";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/ui/page-shell";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
} from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/server";
import { cn } from "@/lib/common/cn";
import { parseDisplayUrl } from "@/lib/common/url";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/support";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { prisma } from "@/prisma";
import type {
    LibraryActivityEventKind,
    LibraryItemSource,
} from "@/prisma/client/enums";
import { T } from "gt-next";
import {
    Activity,
    Bookmark,
    Boxes,
    Compass,
    ExternalLink,
    FolderPlus,
    GitBranch,
    History,
    House,
    Link2,
    Share2,
    Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "activity.metadata.description",
            "A chronological history of recent saves, updates, and collection changes in your library."
        ),
        keywords: [
            "activity",
            "library timeline",
            "saved items history",
            "Cache App",
        ],
        locale,
        path: "/activity",
        title: gtPublicString(locale, "activity.metadata.title", "Activity"),
    });
}

const ACTIVITY_LIMIT = 80;
const RECENT_COLLECTION_LIMIT = 20;

type ActivityTone = "blue" | "green" | "neutral" | "purple" | "yellow";

interface TimelineEvent {
    detail: string;
    href?: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    id: string;
    occurredAt: Date;
    source?: LibraryItemSource;
    title: string;
    tone: ActivityTone;
    type: "collection" | "item" | "system";
}

const sourceLabels = new Map<LibraryItemSource, string>(
    INTEGRATIONS.flatMap((integration) =>
        (integration.source?.libraryItemSources ?? []).map(
            (source) => [source, integration.label] as const
        )
    )
);

function getSourceLabel(source: LibraryItemSource) {
    return sourceLabels.get(source) ?? "Cache";
}

function formatEventDate(date: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatEventTime(date: Date, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function getHostname(url: string) {
    return parseDisplayUrl(url) || url;
}

function getItemLabel(item: { caption: string | null; url: string }) {
    return item.caption ?? getHostname(item.url);
}

function eventToneClassName(tone: ActivityTone) {
    switch (tone) {
        case "blue":
            return "border-blue-500/20 bg-blue-500/10 text-blue-700";
        case "green":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
        case "purple":
            return "border-violet-500/20 bg-violet-500/10 text-violet-700";
        case "yellow":
            return "border-amber-500/20 bg-amber-500/10 text-amber-700";
        case "neutral":
            return "border-border bg-muted text-muted-foreground";
        default:
            return "border-border bg-muted text-muted-foreground";
    }
}

function getPersistedEventCopy(kind: LibraryActivityEventKind) {
    switch (kind) {
        case "collection_created":
            return {
                detail: "Collection created",
                Icon: FolderPlus,
                tone: "green" as const,
                type: "collection" as const,
            };
        case "collection_shared":
            return {
                detail: "Public collection link enabled",
                Icon: Share2,
                tone: "yellow" as const,
                type: "collection" as const,
            };
        case "item_added":
            return {
                detail: "Saved to library",
                Icon: Bookmark,
                tone: "blue" as const,
                type: "item" as const,
            };
        case "item_collected":
            return {
                detail: "Added to collection",
                Icon: Boxes,
                tone: "green" as const,
                type: "collection" as const,
            };
        case "item_updated":
            return {
                detail: "Item updated",
                Icon: GitBranch,
                tone: "neutral" as const,
                type: "item" as const,
            };
        case "source_connected":
            return {
                detail: "Source connected",
                Icon: Link2,
                tone: "purple" as const,
                type: "system" as const,
            };
        default:
            return {
                detail: "Library activity",
                Icon: Activity,
                tone: "neutral" as const,
                type: "system" as const,
            };
    }
}

async function getActivityTimeline(userId: string): Promise<TimelineEvent[]> {
    const activityEvents = await prisma.libraryActivityEvent.findMany({
        orderBy: {
            occurredAt: "desc",
        },
        select: {
            collection: {
                select: {
                    name: true,
                },
            },
            id: true,
            kind: true,
            libraryItem: {
                select: {
                    caption: true,
                    source: true,
                    url: true,
                },
            },
            occurredAt: true,
        },
        take: ACTIVITY_LIMIT,
        where: {
            userId,
        },
    });

    if (activityEvents.length > 0) {
        return activityEvents.map((event): TimelineEvent => {
            const copy = getPersistedEventCopy(event.kind);
            const item = event.libraryItem;
            const collection = event.collection;

            return {
                detail:
                    collection && copy.type === "collection"
                        ? `${copy.detail}: ${collection.name}`
                        : copy.detail,
                href: item?.url,
                Icon: copy.Icon,
                id: `persisted-${event.id}`,
                occurredAt: event.occurredAt,
                source: item?.source,
                title:
                    item === null
                        ? (collection?.name ?? "Library")
                        : getItemLabel(item),
                tone: copy.tone,
                type: copy.type,
            };
        });
    }

    const [items, collections] = await Promise.all([
        prisma.libraryItem.findMany({
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            select: {
                caption: true,
                collections: {
                    orderBy: {
                        updatedAt: "desc",
                    },
                    select: {
                        id: true,
                        name: true,
                        updatedAt: true,
                    },
                    take: 1,
                },
                createdAt: true,
                id: true,
                kind: true,
                source: true,
                updatedAt: true,
                url: true,
            },
            take: ACTIVITY_LIMIT,
            where: {
                kind: {
                    not: "folder",
                },
                userId,
            },
        }),
        prisma.collection.findMany({
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            select: {
                _count: {
                    select: {
                        items: true,
                    },
                },
                createdAt: true,
                id: true,
                name: true,
                sharedAt: true,
                updatedAt: true,
            },
            take: RECENT_COLLECTION_LIMIT,
            where: {
                userId,
            },
        }),
    ]);

    const itemEvents = items.flatMap((item): TimelineEvent[] => {
        const label = getItemLabel(item);
        const sourceLabel = getSourceLabel(item.source);
        const events: TimelineEvent[] = [
            {
                detail:
                    item.kind === "note"
                        ? "Created as a Cache note"
                        : `Saved from ${sourceLabel}`,
                href: item.url,
                Icon: item.kind === "note" ? Sparkles : Bookmark,
                id: `item-created-${item.id}`,
                occurredAt: item.createdAt,
                source: item.source,
                title: label,
                tone: item.kind === "note" ? "purple" : "blue",
                type: "item",
            },
        ];

        if (item.updatedAt.getTime() !== item.createdAt.getTime()) {
            events.push({
                detail: `Updated ${sourceLabel} metadata`,
                href: item.url,
                Icon: GitBranch,
                id: `item-updated-${item.id}`,
                occurredAt: item.updatedAt,
                source: item.source,
                title: label,
                tone: "neutral",
                type: "item",
            });
        }

        const [collection] = item.collections;
        if (collection && collection.updatedAt > item.createdAt) {
            events.push({
                detail: `Added to ${collection.name}`,
                href: item.url,
                Icon: Boxes,
                id: `item-collected-${item.id}-${collection.id}`,
                occurredAt: collection.updatedAt,
                source: item.source,
                title: label,
                tone: "green",
                type: "collection",
            });
        }

        return events;
    });

    const collectionEvents = collections.flatMap(
        (collection): TimelineEvent[] => {
            const events: TimelineEvent[] = [
                {
                    detail: `${collection._count.items} saved ${
                        collection._count.items === 1 ? "item" : "items"
                    }`,
                    Icon: FolderPlus,
                    id: `collection-created-${collection.id}`,
                    occurredAt: collection.createdAt,
                    title: `Created ${collection.name}`,
                    tone: "green",
                    type: "collection",
                },
            ];

            if (collection.sharedAt) {
                events.push({
                    detail: "Public collection link enabled",
                    Icon: Share2,
                    id: `collection-shared-${collection.id}`,
                    occurredAt: collection.sharedAt,
                    title: `Shared ${collection.name}`,
                    tone: "yellow",
                    type: "collection",
                });
            }

            return events;
        }
    );

    return [...itemEvents, ...collectionEvents]
        .sort(
            (left, right) =>
                right.occurredAt.getTime() - left.occurredAt.getTime()
        )
        .slice(0, ACTIVITY_LIMIT);
}

function TimelineEmptyState() {
    return (
        <div className="flex min-h-[360px] w-full flex-col items-center justify-center gap-4 border-border border-y px-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <Activity aria-hidden className="size-5" focusable="false" />
            </div>
            <div className="flex max-w-sm flex-col gap-2">
                <h2 className="font-semibold text-foreground text-lg">
                    No activity yet
                </h2>
                <p className="text-muted-foreground text-sm leading-6">
                    Save a bookmark, create a note, or collect items into a
                    group and the timeline will start filling in here.
                </p>
            </div>
        </div>
    );
}

function ActivityTimeline({
    events,
    locale,
}: {
    events: TimelineEvent[];
    locale: string;
}) {
    let previousDate = "";

    return (
        <div className="flex w-full flex-col">
            {events.map((event) => {
                const eventDate = formatEventDate(event.occurredAt, locale);
                const showDate = eventDate !== previousDate;
                previousDate = eventDate;
                const EventIcon = event.Icon;

                return (
                    <div className="contents" key={event.id}>
                        {showDate ? (
                            <div className="sticky top-0 z-10 border-border border-b bg-background/95 px-1 py-3 backdrop-blur">
                                <span className="font-medium text-muted-foreground text-xs">
                                    {eventDate}
                                </span>
                            </div>
                        ) : null}
                        <article className="group grid grid-cols-[5rem_1.75rem_minmax(0,1fr)] gap-3 border-border border-b px-1 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[6rem_2rem_minmax(0,1fr)]">
                            <time
                                className="pt-1 text-muted-foreground text-xs tabular-nums"
                                dateTime={event.occurredAt.toISOString()}
                            >
                                {formatEventTime(event.occurredAt, locale)}
                            </time>
                            <div className="relative flex justify-center">
                                <div
                                    className={cn(
                                        "flex size-7 items-center justify-center rounded-md border",
                                        eventToneClassName(event.tone)
                                    )}
                                >
                                    <EventIcon
                                        aria-hidden
                                        className="size-3.5"
                                        focusable="false"
                                    />
                                </div>
                            </div>
                            <div className="flex min-w-0 items-start justify-between gap-4">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <h2 className="truncate font-medium text-[15px] text-foreground">
                                        {event.title}
                                    </h2>
                                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground text-sm">
                                        <span className="truncate">
                                            {event.detail}
                                        </span>
                                        {event.source ? (
                                            <Badge
                                                className="h-5 rounded-md px-1.5 text-[11px]"
                                                variant="secondary"
                                            >
                                                {getSourceLabel(event.source)}
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                                {event.href ? (
                                    <a
                                        aria-label={`Open ${event.title}`}
                                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                        href={event.href}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <ExternalLink
                                            aria-hidden
                                            className="size-3.5"
                                            focusable="false"
                                        />
                                    </a>
                                ) : null}
                            </div>
                        </article>
                    </div>
                );
            })}
        </div>
    );
}

export default async function ActivityPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const [{ locale }, session] = await Promise.all([
        params,
        getServerSession(),
    ]);
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const events = await getActivityTimeline(userId);

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader className="gap-3">
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                        <SidebarGroup>
                            <Link className="contents" href="/library" prefetch>
                                <ActivePathname href="/library">
                                    <SidebarItem>
                                        <House
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Home</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                            <Link className="contents" href="/review" prefetch>
                                <ActivePathname href="/review">
                                    <SidebarItem>
                                        <Compass
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Review</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                            <Link
                                className="contents"
                                href="/activity"
                                prefetch
                            >
                                <ActivePathname href="/activity">
                                    <SidebarItem>
                                        <History
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Activity</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                        </SidebarGroup>
                    </SidebarHeader>
                </Sidebar>
                <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                    <header className="flex flex-col gap-6 border-border border-b pb-6">
                        <div className="flex items-start justify-between gap-6">
                            <div className="flex min-w-0 flex-col gap-2">
                                <h1 className="font-semibold text-2xl text-foreground">
                                    Activity
                                </h1>
                            </div>
                        </div>
                    </header>
                    {events.length === 0 ? (
                        <TimelineEmptyState />
                    ) : (
                        <ActivityTimeline events={events} locale={locale} />
                    )}
                </div>
            </div>
        </PageShell>
    );
}
