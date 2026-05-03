import { autoTagLibraryItemsByIds } from "@/lib/collections/intelligence";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    applyChromeBookmarkSyncEvents,
    chromeBookmarkSyncBodySchema,
    purgeChromeBookmarksForUser,
} from "@/lib/integrations/chrome/service";
import { extensionIngestCorsHeaders } from "@/lib/integrations/extension-ingest";
import { authenticateExtensionIngest } from "@/lib/integrations/extension-ingest";
import { requireSessionUserId } from "@/lib/auth/api";
import { after } from "next/server";

const log = createLogger("api:sync:chrome-bookmarks");

const MISSING_SCHEMA_HINTS = [
    "LibraryItemSource",
    "chrome_bookmarks",
    "browserProfileId",
    "sourceAliasIds",
    "postedAt",
];

function isMissingSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    return MISSING_SCHEMA_HINTS.some((hint) => error.message.includes(hint));
}

export function OPTIONS() {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(),
        status: 204,
    });
}

export async function POST(request: Request) {
    const authResult = await authenticateExtensionIngest(request);
    if (authResult instanceof Response) {
        return authResult;
    }
    const { cors, userId } = authResult;

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
        log.error("Chrome bookmark sync failed", { error, userId });

        let message: string;
        if (isMissingSchemaError(error)) {
            message =
                "Chrome bookmark sync requires the latest database migrations. Run Prisma migrations, then try again.";
        } else if (error instanceof Error) {
            message = error.message;
        } else {
            message = "Unknown Chrome sync error";
        }

        return Response.json(
            { error: message },
            { headers: cors, status: 500 }
        );
    }
}

export async function DELETE() {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }

    try {
        const purged = await purgeChromeBookmarksForUser(sessionResult.userId);
        return Response.json({ ok: true, purged });
    } catch (error) {
        log.error("Failed to purge Chrome bookmarks", error);
        return Response.json(
            { error: "Could not purge Chrome bookmarks right now." },
            { status: 500 }
        );
    }
}
