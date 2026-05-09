import "server-only";

import { ITEM_KIND_FOLDER, SORT_DESC } from "@/lib/common/constants";
import { prisma } from "@/prisma";
import type {
    LibraryActivityEventKind,
    LibraryItemKind,
    LibraryItemSource,
} from "@/prisma/client/enums";

const ACTIVITY_LIMIT = 50;
const RECENT_COLLECTION_LIMIT = 20;

export interface PersistedActivityEvent {
    caption: string | null;
    collectionName: string | null;
    id: string;
    kind: LibraryActivityEventKind;
    occurredAt: Date;
    source: LibraryItemSource | null;
    url: string | null;
}

export interface RecentActivityItem {
    caption: string | null;
    collectionId: string | null;
    collectionName: string | null;
    collectionUpdatedAt: Date | null;
    createdAt: Date;
    id: string;
    kind: LibraryItemKind;
    source: LibraryItemSource;
    updatedAt: Date;
    url: string;
}

export interface RecentActivityCollection {
    createdAt: Date;
    id: string;
    itemCount: number;
    name: string;
    sharedAt: Date | null;
    updatedAt: Date;
}

export interface ActivityTimelineData {
    persistedEvents: PersistedActivityEvent[];
    recentCollections: RecentActivityCollection[];
    recentItems: RecentActivityItem[];
}

/**
 * Fetches raw timeline data for the activity page.
 *
 * When persisted activity events exist they are returned directly; otherwise
 * the service falls back to recent library items and collections so the page
 * can synthesize a timeline.
 */
export async function getActivityTimelineData(args: {
    userId: string;
}): Promise<ActivityTimelineData> {
    const persistedEvents = await prisma.libraryActivityEvent.findMany({
        orderBy: {
            occurredAt: SORT_DESC,
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
            userId: args.userId,
        },
    });

    if (persistedEvents.length > 0) {
        return {
            persistedEvents: persistedEvents.map((event) => ({
                caption: event.libraryItem?.caption ?? null,
                collectionName: event.collection?.name ?? null,
                id: event.id,
                kind: event.kind,
                occurredAt: event.occurredAt,
                source: event.libraryItem?.source ?? null,
                url: event.libraryItem?.url ?? null,
            })),
            recentCollections: [],
            recentItems: [],
        };
    }

    const [items, collections] = await Promise.all([
        prisma.libraryItem.findMany({
            orderBy: [{ updatedAt: SORT_DESC }, { createdAt: SORT_DESC }],
            select: {
                caption: true,
                collections: {
                    orderBy: {
                        updatedAt: SORT_DESC,
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
                    not: ITEM_KIND_FOLDER,
                },
                userId: args.userId,
            },
        }),
        prisma.collection.findMany({
            orderBy: [{ updatedAt: SORT_DESC }, { createdAt: SORT_DESC }],
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
                userId: args.userId,
            },
        }),
    ]);

    return {
        persistedEvents: [],
        recentCollections: collections.map((collection) => ({
            createdAt: collection.createdAt,
            id: collection.id,
            itemCount: collection._count.items,
            name: collection.name,
            sharedAt: collection.sharedAt,
            updatedAt: collection.updatedAt,
        })),
        recentItems: items.map((item) => {
            const [collection] = item.collections;

            return {
                caption: item.caption,
                collectionId: collection?.id ?? null,
                collectionName: collection?.name ?? null,
                collectionUpdatedAt: collection?.updatedAt ?? null,
                createdAt: item.createdAt,
                id: item.id,
                kind: item.kind,
                source: item.source,
                updatedAt: item.updatedAt,
                url: item.url,
            };
        }),
    };
}
