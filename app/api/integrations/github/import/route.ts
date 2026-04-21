import { auth } from "@/lib/auth/server";
import { GitHubApiError } from "@/lib/integrations/github/error";
import { resolveGitHubAccessToken } from "@/lib/integrations/github/actions";
import {
    getGitHubAccountId,
    importGitHubStarredRepositories,
} from "@/lib/integrations/github/service";
import { headers } from "next/headers";

function messageForGitHubApiError(error: GitHubApiError): string {
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

    const accessToken = await resolveGitHubAccessToken(accountId);
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

        return Response.json(result);
    } catch (error) {
        if (error instanceof GitHubApiError) {
            return Response.json(
                { error: messageForGitHubApiError(error) },
                { status: error.data.status }
            );
        }

        throw error;
    }
}
