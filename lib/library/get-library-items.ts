import "server-only";

import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { prisma } from "@/prisma";

export async function getUserLibraryItems(userId: string) {
    const [items, collections] = await Promise.all([
        prisma.libraryItem.findMany({
            include: {
                collections: {
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        description: true,
                        id: true,
                        name: true,
                        priority: true,
                    },
                },
            },
            orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
            where: {
                kind: {
                    not: "folder",
                },
                userId,
            },
        }) as Promise<LibraryItemWithCollections[]>,
        prisma.collection.findMany({
            orderBy: {
                name: "asc",
            },
            select: {
                _count: {
                    select: {
                        items: true,
                    },
                },
                description: true,
                id: true,
                items: {
                    select: {
                        source: true,
                    },
                },
                name: true,
                priority: true,
            },
            where: {
                userId,
            },
        }),
    ]);

    return {
        collections: collections.map(
            (collection): LibraryCollectionSummary => ({
                description: collection.description,
                id: collection.id,
                itemCount: collection._count.items,
                name: collection.name,
                priority: collection.priority,
                sources: Array.from(
                    new Set(collection.items.map((item) => item.source))
                ),
            })
        ),
        items,
    };
}
