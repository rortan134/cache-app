import { createLogger } from "@/lib/common/logs/console/logger";
import { getIntegrationAccountId } from "@/lib/integrations/provider-account";
import { importLibraryItemSnapshot } from "@/lib/integrations/snapshot";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    getGitHubAuthenticatedUser,
    listGitHubStarredRepositories,
} from "./api";

const log = createLogger("integrations:github");

export function getGitHubAccountId(userId: string): Promise<string | null> {
    return getIntegrationAccountId(userId, "github");
}

export async function importGitHubStarredRepositories(args: {
    accessToken: string;
    userId: string;
}) {
    const { accessToken, userId } = args;
    const span = log.time("import-starred-repositories", { userId });

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
                url: repository.url,
            })),
            snapshotComplete: true,
            source: LibraryItemSource.github_starred_repositories,
            userId,
        });

        log.info("Successfully imported GitHub starred repositories", {
            githubLogin: gitHubUser.login,
            importedCount: result.importedCount,
            userId,
        });

        return {
            ...result,
            gitHubLogin: gitHubUser.login,
            gitHubUserId: gitHubUser.id,
            smartCollectionItemIds: result.smartCollectionItemIds,
            totalFetched: repositories.length,
        };
    } catch (error) {
        log.error("Failed to import GitHub starred repositories", {
            error,
            userId,
        });
        throw error;
    } finally {
        span.stop();
    }
}
