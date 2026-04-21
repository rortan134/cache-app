import { auth } from "@/lib/auth/server";
import { PinterestApiError } from "@/lib/integrations/pinterest/error";
import { resolvePinterestAccessToken } from "@/lib/integrations/pinterest/actions";
import {
    getPinterestAccountId,
    importPinterestBoards,
} from "@/lib/integrations/pinterest/service";
import { headers } from "next/headers";

function messageForPinterestApiError(error: PinterestApiError): string {
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

        // The smartCollectionItemIds handling was moved to the service layer.
        // We strip it from the result here if it was accidentally exposed, but
        // importPinterestBoards returns the safe subset already.
        const { smartCollectionItemIds, ...response } = result;

        return Response.json(response);
    } catch (error) {
        if (error instanceof PinterestApiError) {
            return Response.json(
                { error: messageForPinterestApiError(error) },
                { status: error.data.status }
            );
        }

        throw error;
    }
}
