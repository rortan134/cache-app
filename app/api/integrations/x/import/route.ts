import { auth } from "@/lib/auth/server";
import {
    getXAuthenticatedUser,
    listXBookmarks,
    XApiError,
} from "@/lib/integrations/x/api";
import { autoTagLibraryItemsByIds } from "@/lib/library/smart-collections";
import { importLibraryItemSnapshot } from "@/lib/library/snapshot-import";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import { headers } from "next/headers";
import { after } from "next/server";

const X_PROVIDER_ID = "x";

async function getXAccount(userId: string) {
    return await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: X_PROVIDER_ID,
            userId,
        },
    });
}

async function resolveXAccessToken(
    accountId: string,
    requestHeaders: Headers
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: X_PROVIDER_ID,
        },
        headers: requestHeaders,
    });
    return tokenResponse?.accessToken ?? null;
}

function messageForXApiError(error: XApiError): string {
    if (error.status === 401) {
        return "X asked us to reconnect your account before importing bookmarks.";
    }
    if (error.status === 429) {
        return "X rate-limited the bookmark import. Please try again shortly.";
    }
    return error.message;
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

    const account = await getXAccount(userId);
    if (!account) {
        return Response.json(
            { error: "Connect X before importing bookmarks." },
            { status: 404 }
        );
    }

    const accessToken = await resolveXAccessToken(
        account.accountId,
        requestHeaders
    );
    if (!accessToken) {
        return Response.json(
            { error: "Reconnect X before importing bookmarks." },
            { status: 403 }
        );
    }

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
                thumbnailUrl: bookmark.thumbnailUrl,
                url: bookmark.url,
            })),
            snapshotComplete: true,
            source: LibraryItemSource.x_bookmarks,
            userId,
        });
        const { smartCollectionItemIds, ...snapshotResult } = result;

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId,
                });
            });
        }

        return Response.json({
            ...snapshotResult,
            totalFetched: bookmarks.length,
            xUserId: xUser.id,
        });
    } catch (error) {
        if (error instanceof XApiError) {
            return Response.json(
                { error: messageForXApiError(error) },
                { status: error.status }
            );
        }

        throw error;
    }
}
