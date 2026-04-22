import { getIntegrationAccountId } from "@/lib/integrations/provider-account";
import { importLibraryItemSnapshot } from "@/lib/integrations/snapshot";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    getGitHubAuthenticatedUser,
    listGitHubStarredRepositories,
} from "./api";

export function getGitHubAccountId(userId: string): Promise<string | null> {
    return getIntegrationAccountId(userId, "github");
}

export async function importGitHubStarredRepositories(args: {
    accessToken: string;
    userId: string;
}) {
    const { accessToken, userId } = args;
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

    return {
        ...result,
        gitHubLogin: gitHubUser.login,
        gitHubUserId: gitHubUser.id,
        smartCollectionItemIds: result.smartCollectionItemIds,
        totalFetched: repositories.length,
    };
}
