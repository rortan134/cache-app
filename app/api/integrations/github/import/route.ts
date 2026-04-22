import { auth } from "@/lib/auth/server";
import { autoTagLibraryItemsByIds } from "@/lib/collections/smart-collections";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    getGitHubAccountId,
    importGitHubStarredRepositories,
} from "@/lib/integrations/github/service";
import { resolveProviderAccessToken } from "@/lib/integrations/provider-account";
import { headers } from "next/headers";
import { after } from "next/server";

function messageForGitHubApiError(error: IntegrationApiError): string {
    if (error.data.status === 401) {
        return "GitHub asked us to reconnect your account before importing stars.";
    }
    if (error.data.status === 403) {
        return "GitHub denied access to your starred repositories. Reconnect GitHub and try again.";
    }
    if (error.data.status === 429) {
        return "GitHub rate-limited the stars import. Please try again shortly.";
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

    const accountId = await getGitHubAccountId(userId);
    if (!accountId) {
        return Response.json(
            { error: "Connect GitHub before importing starred repositories." },
            { status: 404 }
        );
    }

    const accessToken = await resolveProviderAccessToken({
        accountId,
        providerId: "github",
    });
    if (!accessToken) {
        return Response.json(
            {
                error: "Reconnect GitHub before importing starred repositories.",
            },
            { status: 403 }
        );
    }

    try {
        const result = await importGitHubStarredRepositories({
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
            error.data.integrationId === "github"
        ) {
            return Response.json(
                { error: messageForGitHubApiError(error) },
                { status: error.data.status ?? 500 }
            );
        }

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import GitHub starred repositories",
            },
            { status: 500 }
        );
    }
}
