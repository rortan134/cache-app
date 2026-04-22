import { auth } from "@/lib/auth/server";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    createPickerSession,
    getPickerSession,
} from "@/lib/integrations/google-photos/api";
import { mapPickerSessionToViewModel } from "@/lib/integrations/google-photos/service";
import { resolveProviderAccessToken } from "@/lib/integrations/provider-account";
import { headers } from "next/headers";

export async function POST() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
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
        const pickerSession = await createPickerSession(accessToken);
        return Response.json(mapPickerSessionToViewModel(pickerSession));
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

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
        return Response.json({ error: "Missing session id" }, { status: 400 });
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
        const pickerSession = await getPickerSession(accessToken, id);
        return Response.json(mapPickerSessionToViewModel(pickerSession));
    } catch (error) {
        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === "google-photos"
        ) {
            return Response.json(
                { error: error.message },
                { status: error.data.status ?? 500 }
            );
        }
        throw error;
    }
}
