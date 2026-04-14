import { LibraryItemSource } from "@/prisma/client/enums";
import { auth } from "@/lib/auth/server";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/library/chrome-bookmarks";
import { autoTagLibraryItemsByIds } from "@/lib/library/smart-collections";
import {
    listPinterestBoardPins,
    listPinterestBoards,
    PinterestApiError,
} from "@/lib/integrations/pinterest/api";
import { prisma } from "@/prisma";
import { headers } from "next/headers";
import { after } from "next/server";

const PINTEREST_PROVIDER_ID = "pinterest";

async function getPinterestAccount(userId: string) {
    return await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: PINTEREST_PROVIDER_ID,
            userId,
        },
    });
}

async function resolvePinterestAccessToken(
    accountId: string,
    requestHeaders: Headers
) {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: PINTEREST_PROVIDER_ID,
        },
        headers: requestHeaders,
    });
    return tokenResponse?.accessToken ?? null;
}

function messageForPinterestApiError(error: PinterestApiError): string {
    if (error.status === 401) {
        return "Pinterest asked us to reconnect your account before importing pins.";
    }
    if (error.status === 403) {
        return "Pinterest denied access to boards or pins. Confirm the app has boards:read, pins:read, and user_accounts:read.";
    }
    return error.message;
}

async function importPinterestBoards(
    accessToken: string,
    userId: string
): Promise<{
    boardsCount: number;
    importedCount: number;
    skippedCount: number;
    smartCollectionItemIds: string[];
}> {
    const libraryItemDelegate = prisma.libraryItem as unknown as {
        findMany(args: {
            select: {
                externalId: true;
            };
            where: {
                browserProfileId: string;
                externalId: {
                    in: string[];
                };
                source: LibraryItemSource;
                userId: string;
            };
        }): Promise<
            {
                externalId: string;
            }[]
        >;
        upsert(args: {
            create: {
                browserProfileId: string;
                caption: string | null;
                externalId: string;
                scrapedAt: Date | null;
                source: LibraryItemSource;
                thumbnailUrl: string | null;
                url: string;
                userId: string;
            };
            select: {
                id: true;
            };
            update: {
                browserProfileId: string;
                caption: string | null;
                scrapedAt: Date | null;
                thumbnailUrl: string | null;
                url: string;
            };
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: string;
                    externalId: string;
                    source: LibraryItemSource;
                    userId: string;
                };
            };
        }): Promise<{
            id: string;
        }>;
    };
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
            ? await libraryItemDelegate.findMany({
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
        const savedRow = await libraryItemDelegate.upsert({
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

    return {
        boardsCount: boards.length,
        importedCount: importedExternalIds.size,
        skippedCount,
        smartCollectionItemIds: [...smartCollectionItemIds],
    };
}

export async function POST() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });
    const userId = session?.user?.id;
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getPinterestAccount(userId);
    if (!account) {
        return Response.json(
            { error: "Connect Pinterest before importing pins." },
            { status: 404 }
        );
    }

    const accessToken = await resolvePinterestAccessToken(
        account.accountId,
        requestHeaders
    );
    if (!accessToken) {
        return Response.json(
            { error: "Reconnect Pinterest before importing pins." },
            { status: 403 }
        );
    }

    try {
        const result = await importPinterestBoards(accessToken, userId);
        const { smartCollectionItemIds, ...response } = result;

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId,
                });
            });
        }

        return Response.json(response);
    } catch (error) {
        if (error instanceof PinterestApiError) {
            return Response.json(
                { error: messageForPinterestApiError(error) },
                { status: error.status }
            );
        }

        throw error;
    }
}
