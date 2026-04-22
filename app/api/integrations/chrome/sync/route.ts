import { auth } from "@/lib/auth/server";
import { autoTagLibraryItemsByIds } from "@/lib/collections/smart-collections";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    applyChromeBookmarkSyncEvents,
    chromeBookmarkSyncBodySchema,
    purgeChromeBookmarksForUser,
} from "@/lib/integrations/chrome/service";
import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
} from "@/lib/integrations/shared/extension-ingest";
import { headers } from "next/headers";
import { after } from "next/server";

const log = createLogger("api:sync:chrome-bookmarks");

export function OPTIONS() {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(),
        status: 204,
    });
}

export async function POST(request: Request) {
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

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON" },
            { headers: cors, status: 400 }
        );
    }

    const parsed = chromeBookmarkSyncBodySchema.safeParse(json);
    if (!parsed.success) {
        return Response.json(
            { error: parsed.error.flatten() },
            { headers: cors, status: 400 }
        );
    }

    try {
        const result = await applyChromeBookmarkSyncEvents(userId, parsed.data);
        const { smartCollectionItemIds, ...syncResult } = result;

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId,
                });
            });
        }

        return Response.json({ ok: true, ...syncResult }, { headers: cors });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Unknown Chrome sync error";
        log.error("Chrome bookmark sync failed", {
            error,
            userId,
        });

        const missingSchemaHint =
            message.includes("LibraryItemSource") ||
            message.includes("chrome_bookmarks") ||
            message.includes("browserProfileId") ||
            message.includes("sourceAliasIds") ||
            message.includes("postedAt");

        return Response.json(
            {
                error: missingSchemaHint
                    ? "Chrome bookmark sync requires the latest database migrations. Run Prisma migrations, then try again."
                    : message,
            },
            { headers: cors, status: 500 }
        );
    }
}

export async function DELETE() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const purged = await purgeChromeBookmarksForUser(session.user.id);
        return Response.json({ ok: true, purged });
    } catch (error) {
        log.error("Failed to purge Chrome bookmarks", error);
        return Response.json(
            { error: "Could not purge Chrome bookmarks right now." },
            { status: 500 }
        );
    }
}
