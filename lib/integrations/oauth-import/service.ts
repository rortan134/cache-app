import "server-only";

import {
    getIntegrationAccountId,
    resolveProviderAccountAccessToken,
} from "@/lib/integrations/account";
import { IntegrationConnectionError } from "@/lib/integrations/error";
import type { IntegrationId } from "@/lib/integrations/support";

interface OAuthImportResult<T> {
    response: Omit<T, "smartCollectionItemIds">;
    smartCollectionItemIds: string[];
}

/**
 * Resolves the linked provider account, fetches an access token, and runs
 * the provider-specific import.
 *
 * Throws `IntegrationConnectionError` with `code: "not_connected"` when the
 * user has no linked account, and `code: "token_missing"` when the account
 * is linked but no access token can be issued. Provider-specific HTTP
 * failures (`IntegrationApiError`) and any other error from `importFn`
 * propagate unchanged so the transport layer can map them.
 *
 * Framework-free: callers in a route handler should still wrap downstream
 * side-effects (e.g. auto-tagging) in `next/server`'s `after()` because
 * those primitives are request-scoped.
 */
export async function runOAuthImportService<
    T extends {
        smartCollectionItemIds: string[];
    },
>(args: {
    importFn: (args: { accessToken: string; userId: string }) => Promise<T>;
    providerId: IntegrationId;
    userId: string;
}): Promise<OAuthImportResult<T>> {
    const accountId = await getIntegrationAccountId(
        args.userId,
        args.providerId
    );
    if (!accountId) {
        throw new IntegrationConnectionError({
            code: "not_connected",
            integrationId: args.providerId,
            message: "Provider account is not connected.",
            operation: "runOAuthImportService",
        });
    }

    const accessToken = await resolveProviderAccountAccessToken({
        accountId,
        providerId: args.providerId,
    });
    if (!accessToken) {
        throw new IntegrationConnectionError({
            accountId,
            code: "token_missing",
            integrationId: args.providerId,
            message: "Provider access token is unavailable.",
            operation: "runOAuthImportService",
        });
    }

    const { smartCollectionItemIds, ...response } = await args.importFn({
        accessToken,
        userId: args.userId,
    });

    return {
        response,
        smartCollectionItemIds,
    };
}
