import { getIntegrationAccountId } from "@/lib/integrations/provider-account";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { LibraryItemSource } from "@/prisma/client/enums";
import { listPinterestBoardPins, listPinterestBoards } from "./api";

export function getPinterestAccountId(userId: string): Promise<string | null> {
    return getIntegrationAccountId(userId, "pinterest");
}

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

    const boards = await listPinterestBoards(accessToken);
    const importedExternalIds = new Set<string>();
    const pinsToImport: {
        caption: string | null;
        externalId: string;
        scrapedAt: Date | null;
        thumbnailUrl: string | null;
        url: string;
    }[] = [];
    let skippedCount = 0;

    for (const board of boards) {
        const pins = await listPinterestBoardPins(accessToken, board);

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

    return {
        boardsCount: boards.length,
        importedCount: upsertResult.upsertedCount,
        skippedCount: skippedCount + upsertResult.skippedCount,
        smartCollectionItemIds: upsertResult.smartCollectionItemIds,
    };
}
