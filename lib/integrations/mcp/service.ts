import "server-only";

import {
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    type LibraryItemWithCollections,
    toLibraryItemWithCollections,
} from "@/lib/collections/utils";
import { ITEM_KIND_BOOKMARK } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseStandaloneUrl } from "@/lib/common/url";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { IntegrationApiError } from "@/lib/integrations/error";
import type { McpLibraryItemSchema } from "@/lib/integrations/mcp/protocol";
import { createNoteFromPlainText } from "@/lib/integrations/notes/service";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import crypto from "node:crypto";
import type * as z from "zod";

const log = createLogger("mcp.service");

/**
 * Wire-format view of a library item returned to MCP clients. Derived from the
 * zod schema so the protocol and the domain cannot drift.
 */
export type McpLibraryItem = z.infer<typeof McpLibraryItemSchema>;

interface AddLibraryItemArgs {
    caption?: string;
    noteContentText?: string;
    url?: string;
    userId: string;
}

/**
 * Adds a new bookmark or note to the user's library.
 *
 * Exactly one of `noteContentText` or `url` must be provided. Supplying both
 * (or neither) raises `IntegrationApiError` with status 400. Bookmark creation
 * routes through `upsertLibraryItemImports` so a URL already saved by any
 * prior ingest path is reused (no duplicate triggers); new bookmarks flow into
 * the smart-collection auto-tag pipeline. Notes use the dedicated
 * `createNoteFromPlainText` path because their identity is content-derived,
 * not URL-derived.
 */
export async function addLibraryItem(
    args: AddLibraryItemArgs
): Promise<LibraryItemWithCollections> {
    if (args.noteContentText && args.url) {
        throw new IntegrationApiError({
            message:
                "Pass either `url` (for a bookmark) or `noteContentText` (for a note), not both.",
            operation: "addLibraryItem",
            status: 400,
        });
    }

    if (args.noteContentText) {
        return createNoteFromPlainText(args.userId, args.noteContentText);
    }

    if (!args.url) {
        throw new IntegrationApiError({
            message: "Either `url` or `noteContentText` is required.",
            operation: "addLibraryItem",
            status: 400,
        });
    }

    const validatedUrl = parseStandaloneUrl(args.url);
    if (!validatedUrl) {
        throw new IntegrationApiError({
            message: "The provided URL is not valid.",
            operation: "addLibraryItem",
            status: 400,
        });
    }

    const externalId = hashBookmarkExternalId(validatedUrl.href);

    const upsertResult = await upsertLibraryItemImports({
        items: [
            {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: args.caption ?? null,
                externalId,
                kind: ITEM_KIND_BOOKMARK,
                url: validatedUrl.href,
            },
        ],
        source: LibraryItemSource.other,
        userId: args.userId,
    });

    if (upsertResult.upsertedCount === 0) {
        throw new IntegrationApiError({
            message: "Bookmark could not be saved.",
            operation: "addLibraryItem",
            status: 500,
        });
    }

    const created = await prisma.libraryItem.findFirst({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        where: {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            deletedAt: null,
            externalId,
            source: LibraryItemSource.other,
            userId: args.userId,
        },
    });

    if (!created) {
        log.error("Bookmark upsert reported success but row is missing", {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            source: LibraryItemSource.other,
        });
        throw new IntegrationApiError({
            message: "Bookmark was saved but could not be reloaded.",
            operation: "addLibraryItem",
            status: 500,
        });
    }

    return toLibraryItemWithCollections(created);
}

/**
 * Stable, deterministic externalId derived from a bookmark URL so any ingest
 * path (Pinterest, RSS, direct MCP add, etc.) agreeing on the same URL maps to
 * the same row via the `(userId, source, browserProfileId, externalId)` unique
 * key. This is what makes the upsert idempotent.
 */
function hashBookmarkExternalId(url: string): string {
    return crypto.createHash("sha256").update(url).digest("hex");
}

export function toMcpLibraryItem(
    item: LibraryItemWithCollections
): McpLibraryItem {
    return {
        caption: item.caption,
        collections: item.collections.map((c) => ({
            id: c.id,
            name: c.name,
        })),
        createdAt: item.createdAt.toISOString(),
        favoritedAt: item.favoritedAt?.toISOString() ?? null,
        id: item.id,
        isFavorite: item.favoritedAt !== null,
        kind: item.kind,
        noteContentText: item.noteContentText,
        source: item.source,
        updatedAt: item.updatedAt.toISOString(),
        url: item.url,
    };
}
