import { requireRouteUserId } from "@/lib/auth/route";
import { autoTagLibraryItemsByIds } from "@/lib/collections/intelligence";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    deletePickerSession,
    getPickerSession,
    listPickedMediaItems,
} from "@/lib/integrations/google-photos/api";
import {
    collectGooglePhotosImportCandidates,
    importGooglePhotosCandidates,
} from "@/lib/integrations/google-photos/service";
import { resolveProviderAccessToken } from "@/lib/integrations/provider-account";
import { after } from "next/server";
import * as z from "zod";

const bodySchema = z.object({
    sessionId: z.string().min(1),
});

export async function POST(request: Request) {
    const sessionResult = await requireRouteUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const bodyRaw = await request.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(bodyRaw);
    if (!parsedBody.success) {
        return Response.json(
            { error: parsedBody.error.flatten() },
            { status: 400 }
        );
    }

    const accessToken = await resolveProviderAccessToken({
        providerId: "google",
    });
    if (!accessToken) {
        return Response.json(
            { error: "Missing Google access token. Reconnect Google first." },
            { status: 403 }
        );
    }

    try {
        const pickerSession = await getPickerSession(
            accessToken,
            parsedBody.data.sessionId
        );
        if (!pickerSession.mediaItemsSet) {
            return Response.json(
                { error: "Selection is not complete yet." },
                { status: 409 }
            );
        }

        const pickedItems = await listPickedMediaItems(
            accessToken,
            parsedBody.data.sessionId
        );
        const { candidates, skippedCount } =
            collectGooglePhotosImportCandidates(pickedItems);
        const { importedCount, smartCollectionItemIds } =
            await importGooglePhotosCandidates({
                candidates,
                userId,
            });

        await deletePickerSession(accessToken, parsedBody.data.sessionId);

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId,
                });
            });
        }

        return Response.json({
            importedCount,
            skippedCount,
            totalPicked: pickedItems.length,
        });
    } catch (error) {
        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === "google-photos"
        ) {
            const message =
                error.data.status === 401
                    ? "Your Google account needs Photos permission. Please sign out and sign back in to reconnect."
                    : error.message;
            return Response.json(
                { error: message },
                { status: error.data.status ?? 500 }
            );
        }
        throw error;
    }
}
