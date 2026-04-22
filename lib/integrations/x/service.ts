import { getIntegrationAccountId } from "@/lib/integrations/provider-account";
import { importLibraryItemSnapshot } from "@/lib/integrations/snapshot";
import { LibraryItemSource } from "@/prisma/client/enums";
import { getXAuthenticatedUser, listXBookmarks } from "./api";

export function getXAccountId(userId: string): Promise<string | null> {
    return getIntegrationAccountId(userId, "x");
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

    return {
        ...result,
        smartCollectionItemIds: result.smartCollectionItemIds,
        totalFetched: bookmarks.length,
        xUserId: xUser.id,
    };
}
