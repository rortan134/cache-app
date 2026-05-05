import "server-only";

import {
    FALLBACK_URL,
    ITEM_KIND_BOOKMARK,
    ITEM_KIND_NOTE,
    SORT_ASC,
} from "@/lib/common/constants";
import { deleteLibraryItem } from "@/lib/collections/service";
import { parseStandaloneUrl } from "@/lib/common/url";
import { IntegrationApiError } from "@/lib/integrations/error";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import type { LibraryItemWithCollections } from "@/lib/collections/utils";
import { nanoid } from "nanoid";

interface AddLibraryItemArgs {
    caption?: string;
    noteContentText?: string;
    url: string;
    userId: string;
}

function escapeHtmlText(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
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
        const item = await prisma.libraryItem.create({
            data: {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: null,
                externalId: `mcp_${nanoid()}`,
                kind: ITEM_KIND_NOTE,
                noteContentHtml: `<p>${escapeHtmlText(args.noteContentText)}</p>`,
                noteContentText: args.noteContentText,
                source: LibraryItemSource.cache_note,
                url: FALLBACK_URL,
                userId: args.userId,
            },
            include: {
                collections: {
                    orderBy: { name: SORT_ASC },
                    select: {
                        createdAt: true,
                        description: true,
                        id: true,
                        name: true,
                        priority: true,
                        sharedAt: true,
                        shareId: true,
                        updatedAt: true,
                    },
                },
            },
        });

        return item as unknown as LibraryItemWithCollections;
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
        include: {
            collections: {
                orderBy: { name: SORT_ASC },
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    sharedAt: true,
                    shareId: true,
                    updatedAt: true,
                },
            },
        },
    });

    return item as unknown as LibraryItemWithCollections;
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
