import {
    getGitHubAuthenticatedUser,
    listGitHubStarredRepositories,
} from "./api";
import { importLibraryItemSnapshot } from "@/lib/integrations/shared/snapshot";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";

export async function getGitHubAccountId(
    userId: string
): Promise<string | null> {
    const account = await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId: "github",
            userId,
        },
    });
    return account?.accountId ?? null;
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

    const { smartCollectionItemIds, ...snapshotResult } = result;

    if (smartCollectionItemIds.length > 0) {
        // We use an async operation without waiting for it to block the response
        // Note: In an edge/serverless environment, this should ideally be handled via a background queue
        autoTagLibraryItemsByIds({
            itemIds: smartCollectionItemIds,
            userId,
        }).catch(console.error);
    }

    return {
        ...snapshotResult,
        gitHubLogin: gitHubUser.login,
        gitHubUserId: gitHubUser.id,
        totalFetched: repositories.length,
    };
}
