import "server-only";

import {
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { IntegrationResourceNotFoundError } from "@/lib/integrations/error";
import {
    extractNoteText,
    isNoteSerializedEditorState,
    sanitizeNoteHtml,
    serializeNoteEditorStateToHtml,
} from "@/lib/integrations/notes/utils";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    DbNull,
    type InputJsonValue,
} from "@/prisma/client/internal/prismaNamespace";

export interface NormalizedNotePayload {
    contentHtml: string;
    contentState: InputJsonValue | null;
    contentText: string;
}

export function normalizeNotePayload(input: {
    contentHtml?: string;
    contentState?: unknown;
}): NormalizedNotePayload {
    const contentState = isNoteSerializedEditorState(input.contentState)
        ? JSON.parse(JSON.stringify(input.contentState))
        : null;
    const contentHtml = contentState
        ? serializeNoteEditorStateToHtml(contentState)
        : sanitizeNoteHtml(input.contentHtml ?? "");
    const contentText = extractNoteText(contentHtml);

    return {
        contentHtml,
        contentState,
        contentText,
    };
}

export async function getNoteItemForUser(
    userId: string,
    itemId: string
): Promise<LibraryItemWithCollections | null> {
    return (await prisma.libraryItem.findFirst({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        where: {
            id: itemId,
            kind: "note",
            userId,
        },
    })) as LibraryItemWithCollections | null;
}

export async function createNote(
    userId: string,
    note: NormalizedNotePayload
): Promise<LibraryItemWithCollections> {
    const created = await prisma.libraryItem.create({
        data: {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            caption: null,
            externalId: `note_${crypto.randomUUID()}`,
            kind: "note",
            noteContentHtml: note.contentHtml,
            noteContentState: note.contentState ?? DbNull,
            noteContentText: note.contentText,
            source: LibraryItemSource.cache_note,
            url: "about:blank",
            userId,
        },
    });

    const item = await getNoteItemForUser(userId, created.id);
    if (!item) {
        throw new IntegrationResourceNotFoundError({
            message: "We created the note but couldn't load it back.",
            operation: "createNote",
            resource: "note",
        });
    }

    return item;
}

export async function updateNote(
    userId: string,
    itemId: string,
    note: NormalizedNotePayload
): Promise<LibraryItemWithCollections> {
    const updated = await prisma.libraryItem.updateMany({
        data: {
            caption: null,
            noteContentHtml: note.contentHtml,
            noteContentState: note.contentState ?? DbNull,
            noteContentText: note.contentText,
        },
        where: {
            id: itemId,
            kind: "note",
            userId,
        },
    });

    if (updated.count === 0) {
        throw new IntegrationResourceNotFoundError({
            message: "This note no longer exists.",
            operation: "updateNote",
            resource: "note",
        });
    }

    const item = await getNoteItemForUser(userId, itemId);
    if (!item) {
        throw new IntegrationResourceNotFoundError({
            message: "We couldn't reload this note after saving it.",
            operation: "updateNote",
            resource: "note",
        });
    }

    return item;
}
