import "server-only";

import { createLogger } from "@/lib/common/logs/console/logger";
import { importLibraryItemSnapshot } from "@/lib/integrations/import-snapshot";
import { LibraryItemSource } from "@/prisma/client/enums";
import { getXAuthenticatedUser, listXBookmarks } from "./api";

const log = createLogger("integrations:x");

export async function importXBookmarks(args: {
    accessToken: string;
    userId: string;
}) {
    const { accessToken, userId } = args;
    const span = log.time("import-bookmarks", { userId });

    try {
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
                url: bookmark.url,
            })),
            snapshotComplete: true,
            source: LibraryItemSource.x_bookmarks,
            userId,
        });

        log.info("Successfully imported X bookmarks", {
            importedCount: result.importedCount,
            userId,
            xUserId: xUser.id,
        });

        return {
            ...result,
            smartCollectionItemIds: result.smartCollectionItemIds,
            totalFetched: bookmarks.length,
            xUserId: xUser.id,
        };
    } catch (error) {
        log.error("Failed to import X bookmarks", {
            error,
            userId,
        });
        throw error;
    } finally {
        span.stop();
    }
}
