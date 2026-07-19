import { requireRouteUserId } from "@/lib/auth/session";
import {
    eachProviderAccountAccess,
    resolveProviderAccountAccessToken,
} from "@/lib/integrations/account";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    createPickerSession,
    getPickerSession,
} from "@/lib/integrations/google-photos/api";
import { mapPickerSessionToViewModel } from "@/lib/integrations/google-photos/service";
import { GOOGLE_PHOTOS_PICKER_SCOPE } from "@/lib/integrations/google-photos/shared";

function photosAuthErrorResponse(error: IntegrationApiError): Response {
    const message =
        error.data.status === 401
            ? "Your Google account needs Photos permission. Please sign out and sign back in to reconnect."
            : error.message;
    return Response.json(
        { error: message },
        { status: error.data.status ?? 500 }
    );
}

function isPhotosAuthFailure(error: unknown): error is IntegrationApiError {
    return (
        error instanceof IntegrationApiError &&
        error.data.integrationId === "google-photos" &&
        (error.data.status === 401 || error.data.status === 403)
    );
}

export async function POST() {
    const sessionResult = await requireRouteUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    let attemptedAccountCount = 0;
    let lastPhotosAuthError: IntegrationApiError | null = null;

    for await (const access of eachProviderAccountAccess({
        providerId: "google",
        requiredScope: GOOGLE_PHOTOS_PICKER_SCOPE,
        userId,
    })) {
        attemptedAccountCount += 1;
        try {
            const pickerSession = await createPickerSession(access.accessToken);
            return Response.json(
                mapPickerSessionToViewModel(pickerSession, access.accountId)
            );
        } catch (error) {
            if (isPhotosAuthFailure(error)) {
                lastPhotosAuthError = error;
                continue;
            }
            if (
                error instanceof IntegrationApiError &&
                error.data.integrationId === "google-photos"
            ) {
                return photosAuthErrorResponse(error);
            }
            throw error;
        }
    }

    if (lastPhotosAuthError) {
        return photosAuthErrorResponse(lastPhotosAuthError);
    }

    if (attemptedAccountCount === 0) {
        return Response.json(
            { error: "Missing Google access token. Reconnect Google first." },
            { status: 403 }
        );
    }

    return Response.json(
        {
            error: "Your Google account needs Photos permission. Please sign out and sign back in to reconnect.",
        },
        { status: 401 }
    );
}

export async function GET(request: Request) {
    const sessionResult = await requireRouteUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
        return Response.json({ error: "Missing session id" }, { status: 400 });
    }

    const accountId = url.searchParams.get("accountId");
    if (!accountId) {
        return Response.json({ error: "Missing account id" }, { status: 400 });
    }

    const accessToken = await resolveProviderAccountAccessToken({
        accountId,
        providerId: "google",
        userId,
    });
    if (!accessToken) {
        return Response.json(
            { error: "Missing Google access token. Reconnect Google first." },
            { status: 403 }
        );
    }

    try {
        const pickerSession = await getPickerSession(accessToken, id);
        return Response.json(
            mapPickerSessionToViewModel(pickerSession, accountId)
        );
    } catch (error) {
        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === "google-photos"
        ) {
            return photosAuthErrorResponse(error);
        }
        throw error;
    }
}
