"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { LIBRARY_ITEM_COLLECTIONS_INCLUDE } from "@/lib/collections/utils";
import { extractNamedErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import type { LibraryItemWithCollections } from "@/lib/common/types";
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
import * as z from "zod";

const log = createLogger("integrations:notes:actions");
const NOTE_CONTENT_HTML_MAX_LENGTH = 100_000;

const CreateNoteInputSchema = z.object({
    contentHtml: z.string().max(NOTE_CONTENT_HTML_MAX_LENGTH).optional(),
    contentState: z.unknown().optional(),
});

const UpdateNoteInputSchema = z.object({
    contentHtml: z.string().max(NOTE_CONTENT_HTML_MAX_LENGTH),
    contentState: z.unknown().optional(),
    itemId: z.string().trim().min(1),
});

export type NoteMutationResult =
    | {
          item: LibraryItemWithCollections;
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

function normalizeNotePayload(input: {
    contentHtml?: string;
    contentState?: unknown;
}): {
    contentHtml: string;
    contentState: InputJsonValue | null;
    contentText: string;
} {
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

async function getNoteItemForUser(
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
    input: { contentHtml?: string; contentState?: unknown } = {}
): Promise<NoteMutationResult> {
    const parsed = CreateNoteInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "We couldn't create this note.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to create notes.",
            status: "UNAUTHORIZED",
        };
    }

    const note = normalizeNotePayload(parsed.data);

    try {
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

        return {
            item,
            status: "SUCCESS",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        log.error("Unexpected note create failure", error);
        return {
            message:
                details.message || "We couldn't create this note right now.",
            status: "ERROR",
        };
    }
}

export async function updateNote(input: {
    contentHtml: string;
    contentState?: unknown;
    itemId: string;
}): Promise<NoteMutationResult> {
    const parsed = UpdateNoteInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "We couldn't save this note.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to save notes.",
            status: "UNAUTHORIZED",
        };
    }

    const note = normalizeNotePayload(parsed.data);

    try {
        const updated = await prisma.libraryItem.updateMany({
            data: {
                caption: null,
                noteContentHtml: note.contentHtml,
                noteContentState: note.contentState ?? DbNull,
                noteContentText: note.contentText,
            },
            where: {
                id: parsed.data.itemId,
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

        const item = await getNoteItemForUser(userId, parsed.data.itemId);
        if (!item) {
            throw new IntegrationResourceNotFoundError({
                message: "We couldn't reload this note after saving it.",
                operation: "updateNote",
                resource: "note",
            });
        }

        return {
            item,
            status: "SUCCESS",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        if (details.name === "IntegrationResourceNotFoundError") {
            return {
                message: details.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected note update failure", error);
        return {
            message: "We couldn't save this note right now.",
            status: "ERROR",
        };
    }
}
