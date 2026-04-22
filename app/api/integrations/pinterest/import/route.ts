import { auth } from "@/lib/auth/server";
import { autoTagLibraryItemsByIds } from "@/lib/collections/smart-collections";
import { IntegrationApiError } from "@/lib/integrations/error";
import { resolvePinterestAccessToken } from "@/lib/integrations/pinterest/actions";
import {
    getPinterestAccountId,
    importPinterestBoards,
} from "@/lib/integrations/pinterest/service";
import { headers } from "next/headers";
import { after } from "next/server";

function messageForPinterestApiError(error: IntegrationApiError): string {
    if (error.data.status === 401) {
        return "Pinterest asked us to reconnect your account before importing pins.";
    }
    if (error.data.status === 403) {
        return "Pinterest denied access to boards or pins. Confirm the app has boards:read, pins:read, and user_accounts:read.";
    }
    return error.message;
}

export async function POST() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const userId = session?.user?.id;
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = await getPinterestAccountId(userId);
    if (!accountId) {
        return Response.json(
            { error: "Connect Pinterest before importing pins." },
            { status: 404 }
        );
    }

    const accessToken = await resolvePinterestAccessToken(accountId);
    if (!accessToken) {
        return Response.json(
            { error: "Reconnect Pinterest before importing pins." },
            { status: 403 }
        );
    }

    try {
        const result = await importPinterestBoards({
            accessToken,
            userId,
        });

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
        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === "pinterest"
        ) {
            return Response.json(
                { error: messageForPinterestApiError(error) },
                { status: error.data.status ?? 500 }
            );
        }

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import Pinterest pins",
            },
            { status: 500 }
        );
    }
}
