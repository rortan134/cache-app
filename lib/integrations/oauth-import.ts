import "server-only";

import { scheduleAutoTagging } from "@/lib/collections/intelligence/schedule";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    getIntegrationAccountId,
    resolveProviderAccessToken,
} from "@/lib/integrations/provider-account";
import { requireSessionUserId } from "@/lib/auth/api";

interface OAuthImportConfig<T> {
    importFn: (args: {
        accessToken: string;
        userId: string;
    }) => Promise<T & { smartCollectionItemIds: string[] }>;
    messages: {
        apiError: (error: IntegrationApiError) => string;
        genericError: string;
        noToken: string;
        notConnected: string;
    };
    providerId: string;
}

/**
 * Shared adapter for OAuth-based integration imports.
 *
 * Handles session resolution, account lookup, token resolution, import execution,
 * auto-tag scheduling, and normalized error handling.
 */
export async function runOAuthImport<T>(
    config: OAuthImportConfig<T>
): Promise<Response> {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const accountId = await getIntegrationAccountId(userId, config.providerId);
    if (!accountId) {
        return Response.json(
            { error: config.messages.notConnected },
            { status: 404 }
        );
    }

    const accessToken = await resolveProviderAccessToken({
        accountId,
        providerId: config.providerId,
    });
    if (!accessToken) {
        return Response.json(
            { error: config.messages.noToken },
            { status: 403 }
        );
    }

    try {
        const result = await config.importFn({ accessToken, userId });
        const { smartCollectionItemIds, ...response } = result;
        scheduleAutoTagging(userId, smartCollectionItemIds);
        return Response.json(response);
    } catch (error) {
        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === config.providerId
        ) {
            return Response.json(
                { error: config.messages.apiError(error) },
                { status: error.data.status ?? 500 }
            );
        }

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : config.messages.genericError,
            },
            { status: 500 }
        );
    }
}
