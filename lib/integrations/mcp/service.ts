import "server-only";

import { ITEM_KIND_BOOKMARK } from "@/lib/common/constants";
import { deleteLibraryItem } from "@/lib/collections/service";
import { parseStandaloneUrl } from "@/lib/common/url";
import { IntegrationApiError } from "@/lib/integrations/error";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { createNoteFromPlainText } from "@/lib/integrations/notes/service";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    type LibraryItemWithCollections,
    toLibraryItemWithCollections,
} from "@/lib/collections/utils";
import { nanoid } from "nanoid";

interface AddLibraryItemArgs {
    caption?: string;
    noteContentText?: string;
    url: string;
    userId: string;
}

/**
 * Adds a new bookmark or note to the user's library.
 *
 * If `noteContentText` is provided, creates a note. Otherwise creates a bookmark.
 */
export async function addLibraryItem(
    args: AddLibraryItemArgs
): Promise<LibraryItemWithCollections> {
    if (args.noteContentText) {
        return createNoteFromPlainText(args.userId, args.noteContentText);
    }

    const validatedUrl = parseStandaloneUrl(args.url);
    if (!validatedUrl) {
        throw new IntegrationApiError({
            message: "The provided URL is not valid.",
            operation: "addLibraryItem",
            status: 400,
        });
    }

    const item = await prisma.libraryItem.create({
        data: {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            caption: args.caption ?? null,
            externalId: nanoid(),
            kind: ITEM_KIND_BOOKMARK,
            source: LibraryItemSource.other,
            url: validatedUrl.href,
            userId: args.userId,
        },
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    });

    return toLibraryItemWithCollections(item);
}

interface DeleteLibraryItemArgs {
    itemId: string;
    userId: string;
}

/**
 * Deletes a library item by ID.
 */
export async function deleteLibraryItemMcp(
    args: DeleteLibraryItemArgs
): Promise<{ success: boolean }> {
    await deleteLibraryItem({ itemId: args.itemId, userId: args.userId });
    return { success: true };
}

export interface McpLibraryItem {
    caption: string | null;
    collections: string[];
    createdAt: string;
    id: string;
    isFavorite: boolean;
    kind: "bookmark" | "note";
    noteContentText: string | null;
    source: string;
    updatedAt: string;
    url: string;
}

export function toMcpLibraryItem(
    item: LibraryItemWithCollections
): McpLibraryItem {
    return {
        caption: item.caption,
        collections: item.collections.map((c) => c.name),
        createdAt: item.createdAt.toISOString(),
        id: item.id,
        isFavorite: item.favoritedAt !== null,
        kind: item.kind as "bookmark" | "note",
        noteContentText: item.noteContentText,
        source: item.source,
        updatedAt: item.updatedAt.toISOString(),
        url: item.url,
    };
}
