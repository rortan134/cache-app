import { auth } from "@/lib/auth/server";
import {
    getGitHubAuthenticatedUser,
    GitHubApiError,
    listGitHubStarredRepositories,
} from "@/lib/integrations/github/api";
import { autoTagLibraryItemsByIds } from "@/lib/library/smart-collections";
import { importLibraryItemSnapshot } from "@/lib/library/snapshot-import";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import { headers } from "next/headers";
import { after } from "next/server";

const GITHUB_PROVIDER_ID = "github";

async function getGitHubAccount(userId: string) {
    return await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: GITHUB_PROVIDER_ID,
            userId,
        },
    });
}

async function resolveGitHubAccessToken(
    accountId: string,
    requestHeaders: Headers
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: GITHUB_PROVIDER_ID,
        },
        headers: requestHeaders,
    });
    return tokenResponse?.accessToken ?? null;
}

function messageForGitHubApiError(error: GitHubApiError): string {
    if (error.status === 401) {
        return "GitHub asked us to reconnect your account before importing stars.";
    }
    if (error.status === 403) {
        return "GitHub denied access to your starred repositories. Reconnect GitHub and try again.";
    }
    if (error.status === 429) {
        return "GitHub rate-limited the stars import. Please try again shortly.";
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

    const account = await getGitHubAccount(userId);
    if (!account) {
        return Response.json(
            { error: "Connect GitHub before importing starred repositories." },
            { status: 404 }
        );
    }

    const accessToken = await resolveGitHubAccessToken(
        account.accountId,
        requestHeaders
    );
    if (!accessToken) {
        return Response.json(
            {
                error: "Reconnect GitHub before importing starred repositories.",
            },
            { status: 403 }
        );
    }

    try {
        const gitHubUser = await getGitHubAuthenticatedUser(accessToken);
        const repositories = await listGitHubStarredRepositories(accessToken);
        const importedAt = new Date();
        const result = await importLibraryItemSnapshot({
            items: repositories.map((repository) => ({
                caption: repository.caption,
                externalId: repository.externalId,
                postedAt: repository.postedAt,
                scrapedAt: importedAt,
                sourceMetadata: repository.sourceMetadata,
                thumbnailUrl: repository.thumbnailUrl,
                url: repository.url,
            })),
            snapshotComplete: true,
            source: LibraryItemSource.github_starred_repositories,
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
            gitHubLogin: gitHubUser.login,
            gitHubUserId: gitHubUser.id,
            totalFetched: repositories.length,
        });
    } catch (error) {
        if (error instanceof GitHubApiError) {
            return Response.json(
                { error: messageForGitHubApiError(error) },
                { status: error.status }
            );
        }

        throw error;
    }
}
