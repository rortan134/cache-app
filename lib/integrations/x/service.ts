import { getXAuthenticatedUser, listXBookmarks } from "./api";
import { importLibraryItemSnapshot } from "@/lib/integrations/shared/snapshot";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";

export async function getXAccountId(userId: string): Promise<string | null> {
    const account = await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: "x",
            userId,
        },
    });
    return account?.accountId ?? null;
}

export async function importXBookmarks(args: {
    accessToken: string;
    userId: string;
}) {
    const { accessToken, userId } = args;
    const xUser = await getXAuthenticatedUser(accessToken);
    const bookmarks = await listXBookmarks(accessToken, xUser.id);
    const importedAt = new Date();

    const result = await importLibraryItemSnapshot({
        items: bookmarks.map((bookmark) => ({
            caption: bookmark.caption,
            externalId: bookmark.externalId,
            postedAt: bookmark.postedAt,
            scrapedAt: importedAt,
            sourceMetadata: bookmark.sourceMetadata,
            thumbnailUrl: bookmark.thumbnailUrl,
            url: bookmark.url,
        })),
        snapshotComplete: true,
        source: LibraryItemSource.x_bookmarks,
        userId,
    });

    const { smartCollectionItemIds, ...snapshotResult } = result;

    if (smartCollectionItemIds.length > 0) {
        autoTagLibraryItemsByIds({
            itemIds: smartCollectionItemIds,
            userId,
        }).catch(console.error);
    }

    return {
        ...snapshotResult,
        totalFetched: bookmarks.length,
        xUserId: xUser.id,
    };
}
