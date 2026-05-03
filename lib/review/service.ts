import "server-only";

import {
    LIBRARY_COLLECTION_TAG_SELECT,
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    toLibraryCollectionSummary,
    type LibraryCollectionSummary,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { ReviewError } from "./error";
import {
    ITEM_KIND_FOLDER,
    SORT_ASC,
    SORT_DESC,
    REVIEW_WINDOW_MS,
} from "@/lib/common/constants";
import { prisma } from "@/prisma";

export async function getReviewData({ userId }: { userId: string }): Promise<{
    collections: LibraryCollectionSummary[];
    items: LibraryItemWithCollections[];
}> {
    const sevenDaysAgo = new Date(Date.now() - REVIEW_WINDOW_MS);

    const [items, collections] = await Promise.all([
        prisma.libraryItem.findMany({
            include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
            orderBy: [{ scrapedAt: SORT_DESC }, { updatedAt: SORT_DESC }],
            take: 100,
            where: {
                collections: {
                    none: {},
                },
                kind: {
                    not: ITEM_KIND_FOLDER,
                },
                OR: [
                    { reviewedAt: null },
                    { reviewedAt: { lt: sevenDaysAgo } },
                ],
                userId,
            },
        }),
        prisma.collection.findMany({
            orderBy: {
                name: SORT_ASC,
            },
            select: {
                _count: {
                    select: {
                        items: true,
                    },
                },
                ...LIBRARY_COLLECTION_TAG_SELECT,
                items: {
                    select: {
                        source: true,
                    },
                },
            },
            where: {
                userId,
            },
        }),
    ]);

    return {
        collections: collections.map((collection) =>
            toLibraryCollectionSummary(collection)
        ),
        items,
    };
}

export async function markLibraryItemAsReviewed({
    itemId,
    userId,
}: {
    itemId: string;
    userId: string;
}): Promise<void> {
    const result = await prisma.libraryItem.updateMany({
        data: {
            reviewedAt: new Date(),
        },
        where: {
            id: itemId,
            userId,
        },
    });

    if (result.count === 0) {
        throw new ReviewError({
            code: "not_found",
            message: "Saved item not found.",
            operation: "markLibraryItemAsReviewed",
        });
    }
}
