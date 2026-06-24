import "server-only";

import { requireRouteUserId } from "@/lib/auth/session";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    IntegrationApiError,
    IntegrationConnectionError,
} from "@/lib/integrations/error";
import type { IntegrationId } from "@/lib/integrations/support";
import { scheduleAutoTagging } from "@/lib/intelligence/schedule";
import { runOAuthImportService } from "./service";

const log = createLogger("integrations:oauth-import");

interface OAuthImportMessages {
    apiError: (error: IntegrationApiError) => string;
    genericError: string;
    noToken: string;
    notConnected: string;
}

interface OAuthImportConfig<T extends { smartCollectionItemIds: string[] }> {
    importFn: (args: { accessToken: string; userId: string }) => Promise<T>;
    messages: OAuthImportMessages;
    providerId: IntegrationId;
}

/**
 * Route adapter for OAuth-based integration imports.
 *
 * Resolves the current session, delegates the import to the framework-free
 * `runOAuthImportService`, schedules request-scoped side-effects
 * (`scheduleAutoTagging` uses `next/server`'s `after()`), and maps the
 * service's typed errors onto the integration-specific HTTP responses each
 * provider advertises.
 *
 * Domain failures are kept in the service; this layer is the only place
 * that touches `Request`/`Response` and the session helper.
 */
export async function runOAuthImport<
    T extends {
        smartCollectionItemIds: string[];
    },
>(config: OAuthImportConfig<T>): Promise<Response> {
    const sessionResult = await requireRouteUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    try {
        const { response, smartCollectionItemIds } =
            await runOAuthImportService({
                importFn: config.importFn,
                providerId: config.providerId,
                userId,
            });
        scheduleAutoTagging(userId, smartCollectionItemIds);
        return Response.json(response);
    } catch (error) {
        if (error instanceof IntegrationConnectionError) {
            if (error.data.code === "not_connected") {
                return Response.json(
                    { error: config.messages.notConnected },
                    { status: 404 }
                );
            }
            if (error.data.code === "token_missing") {
                return Response.json(
                    { error: config.messages.noToken },
                    { status: 403 }
                );
            }
        }

        if (
            error instanceof IntegrationApiError &&
            error.data.integrationId === config.providerId
        ) {
            return Response.json(
                { error: config.messages.apiError(error) },
                { status: error.data.status ?? 500 }
            );
        }

        log.error("OAuth import failed", {
            error,
            providerId: config.providerId,
            userId,
        });
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
