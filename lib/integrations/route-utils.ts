import "server-only";

import { auth } from "@/lib/auth/server";
import { autoTagLibraryItemsByIds } from "@/lib/collections/intelligence";
import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
} from "@/lib/integrations/extension-ingest";
import { IntegrationApiError } from "@/lib/integrations/error";
import {
    getIntegrationAccountId,
    resolveProviderAccessToken,
} from "@/lib/integrations/provider-account";
import { headers } from "next/headers";
import { after } from "next/server";

/**
 * Authenticates an extension ingest request by Bearer token.
 *
 * @returns The CORS headers and resolved user id, or a 401 Response if authentication fails.
 */
export async function authenticateExtensionIngest(
    request: Request
): Promise<{ cors: HeadersInit; userId: string } | Response> {
    const cors = extensionIngestCorsHeaders();
    const bearer = parseBearerToken(request);
    if (!bearer) {
        return Response.json(
            { error: "Missing Authorization: Bearer <extension ingest token>" },
            { headers: cors, status: 401 }
        );
    }

    const userId = await resolveExtensionIngestUserId(bearer);
    if (!userId) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: cors, status: 401 }
        );
    }

    return { cors, userId };
}

/**
 * Resolves the current session user id for API routes.
 *
 * @returns The user id, or a 401 Response if the session is missing.
 */
export async function requireSessionUserId(): Promise<
    { userId: string } | Response
> {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return { userId };
}

/**
 * Schedules background auto-tagging for newly imported items.
 *
 * Uses `after()` so it only works inside Next.js route handlers or server actions.
 */
export function scheduleAutoTagging(userId: string, itemIds: string[]): void {
    if (itemIds.length === 0) {
        return;
    }

    after(async () => {
        await autoTagLibraryItemsByIds({ itemIds, userId });
    });
}

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
