import { auth } from "@/lib/auth/server";
import { XApiError } from "@/lib/integrations/x/error";
import { resolveXAccessToken } from "@/lib/integrations/x/actions";
import { getXAccountId, importXBookmarks } from "@/lib/integrations/x/service";
import { headers } from "next/headers";

function messageForXApiError(error: XApiError): string {
    if (error.data.status === 401) {
        return "X asked us to reconnect your account before importing bookmarks.";
    }
    if (error.data.status === 429) {
        return "X rate-limited the bookmark import. Please try again shortly.";
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

    const accountId = await getXAccountId(userId);
    if (!accountId) {
        return Response.json(
            { error: "Connect X before importing bookmarks." },
            { status: 404 }
        );
    }

    const accessToken = await resolveXAccessToken(accountId);
    if (!accessToken) {
        return Response.json(
            { error: "Reconnect X before importing bookmarks." },
            { status: 403 }
        );
    }

    try {
        const result = await importXBookmarks({
            accessToken,
            userId,
        });

        return Response.json(result);
    } catch (error) {
        if (error instanceof XApiError) {
            return Response.json(
                { error: messageForXApiError(error) },
                { status: error.data.status }
            );
        }

        throw error;
    }
}
