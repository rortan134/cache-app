import "server-only";

import { mapConcurrent } from "@/lib/common/arrays";
import { createLogger } from "@/lib/common/logs/console/logger";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { LibraryItemSource } from "@/prisma/client/enums";
import { listPinterestBoardPins, listPinterestBoards } from "./api";

const log = createLogger("integrations:pinterest");

export async function importPinterestBoards(args: {
    accessToken: string;
    userId: string;
}): Promise<{
    boardsCount: number;
    importedCount: number;
    skippedCount: number;
    smartCollectionItemIds: string[];
}> {
    const { accessToken, userId } = args;
    const span = log.time("import-boards", { userId });

    try {
        const boards = await listPinterestBoards(accessToken);

        const boardsWithPins = await mapConcurrent(
            boards,
            async (board) => {
                try {
                    return await listPinterestBoardPins(accessToken, board);
                } catch (error) {
                    log.error("Failed to fetch pins for board", {
                        boardId: board.id,
                        boardName: board.name,
                        error,
                    });
                    return [];
                }
            },
            4
        );

        const importedExternalIds = new Set<string>();
        const pinsToImport: {
            caption: string | null;
            externalId: string;
            scrapedAt: Date | null;
            url: string;
        }[] = [];
        let skippedCount = 0;

        for (const pins of boardsWithPins) {
            for (const pin of pins) {
                if (importedExternalIds.has(pin.externalId)) {
                    continue;
                }

                importedExternalIds.add(pin.externalId);
                if (!pin.url) {
                    skippedCount += 1;
                    continue;
                }
                pinsToImport.push(pin);
            }
        }

        const upsertResult = await upsertLibraryItemImports({
            items: pinsToImport,
            source: LibraryItemSource.pinterest,
            userId,
        });

        log.info("Successfully imported Pinterest pins from boards", {
            boardsCount: boards.length,
            importedCount: upsertResult.upsertedCount,
            userId,
        });

        return {
            boardsCount: boards.length,
            importedCount: upsertResult.upsertedCount,
            skippedCount: skippedCount + upsertResult.skippedCount,
            smartCollectionItemIds: upsertResult.smartCollectionItemIds,
        };
    } catch (error) {
        log.error("Failed to import Pinterest pins", {
            error,
            userId,
        });
        throw error;
    } finally {
        span.stop();
    }
}
