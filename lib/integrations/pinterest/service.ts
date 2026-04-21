import { listPinterestBoardPins, listPinterestBoards } from "./api";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/chrome/service";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";

export async function getPinterestAccountId(
    userId: string
): Promise<string | null> {
    const account = await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: "pinterest",
            userId,
        },
    });
    return account?.accountId ?? null;
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

    const existingRows =
        pinsToImport.length > 0
            ? await prisma.libraryItem.findMany({
                  select: {
                      externalId: true,
                  },
                  where: {
                      browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                      externalId: {
                          in: pinsToImport.map((pin) => pin.externalId),
                      },
                      source: LibraryItemSource.pinterest,
                      userId,
                  },
              })
            : [];
    const existingExternalIds = new Set(
        existingRows.map((row) => row.externalId)
    );
    const smartCollectionItemIds = new Set<string>();

    for (const pin of pinsToImport) {
        const savedRow = await prisma.libraryItem.upsert({
            create: {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: pin.caption,
                externalId: pin.externalId,
                scrapedAt: pin.scrapedAt,
                source: LibraryItemSource.pinterest,
                thumbnailUrl: pin.thumbnailUrl,
                url: pin.url,
                userId,
            },
            select: {
                id: true,
            },
            update: {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: pin.caption,
                scrapedAt: pin.scrapedAt,
                thumbnailUrl: pin.thumbnailUrl,
                url: pin.url,
            },
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                    externalId: pin.externalId,
                    source: LibraryItemSource.pinterest,
                    userId,
                },
            },
        });

        if (!existingExternalIds.has(pin.externalId)) {
            smartCollectionItemIds.add(savedRow.id);
        }
    }

    if (smartCollectionItemIds.size > 0) {
        autoTagLibraryItemsByIds({
            itemIds: [...smartCollectionItemIds],
            userId,
        }).catch(console.error);
    }

    return {
        boardsCount: boards.length,
        importedCount: importedExternalIds.size,
        skippedCount,
        smartCollectionItemIds: [...smartCollectionItemIds],
    };
}
