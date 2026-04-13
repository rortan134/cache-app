"use server";

import { auth } from "@/lib/auth/server";
import { extractNamedErrorMessage } from "@/lib/error";
import { LibraryCollectionError, LibraryNoteError } from "@/lib/library/error";
import {
    extractNoteText,
    normalizeNoteTitle,
    sanitizeNoteHtml,
} from "@/lib/library/notes";
import { normalizeCollectionName } from "@/lib/library/utils";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { createLogger } from "@/lib/logs/console/logger";
import { prisma } from "@/prisma";
import {
    type CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";
import { headers } from "next/headers";
import { z } from "zod";

const log = createLogger("library:actions");
const COLLECTION_NAME_MAX_LENGTH = 64;
const NOTE_TITLE_MAX_LENGTH = 160;
const NOTE_CONTENT_HTML_MAX_LENGTH = 100_000;

const CreateCollectionInputSchema = z.object({
    assignToItemId: z.string().trim().min(1).optional(),
    description: z.string().trim().max(1024).optional(),
    name: z
        .string()
        .trim()
        .min(1, "Enter a collection name.")
        .max(
            COLLECTION_NAME_MAX_LENGTH,
            `Collection names can be up to ${COLLECTION_NAME_MAX_LENGTH} characters.`
        ),
});

const UpdateLibraryItemCollectionsInputSchema = z.object({
    collectionIds: z.array(z.string().trim().min(1)).max(100),
    itemId: z.string().trim().min(1),
});

const DeleteCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to delete."),
});

const UpdateCollectionPriorityInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to update."),
    priority: z.enum([
        "none",
        "very_relevant",
        "relevant",
        "peripheral",
        "archive",
    ] satisfies [CollectionPriority, ...CollectionPriority[]]),
});

const CreateNoteInputSchema = z.object({
    contentHtml: z.string().max(NOTE_CONTENT_HTML_MAX_LENGTH).optional(),
    title: z.string().trim().max(NOTE_TITLE_MAX_LENGTH).optional(),
});

const UpdateNoteInputSchema = z.object({
    contentHtml: z.string().max(NOTE_CONTENT_HTML_MAX_LENGTH),
    itemId: z.string().trim().min(1),
    title: z.string().trim().max(NOTE_TITLE_MAX_LENGTH).optional(),
});

export type DeleteLibraryItemResult =
    | {
          itemId: string;
          status: "DELETED";
      }
    | {
          message: string;
          status: "ERROR" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type CreateCollectionResult =
    | {
          assignedItemId: string | null;
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | {
          message: string;
          status:
              | "DUPLICATE"
              | "ERROR"
              | "INVALID"
              | "NOT_FOUND"
              | "UNAUTHORIZED";
      };

export type DeleteCollectionResult =
    | {
          collection: Pick<LibraryCollectionSummary, "id" | "name">;
          status: "DELETED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type UpdateCollectionPriorityResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type UpdateLibraryItemCollectionsResult =
    | {
          collections: LibraryCollectionTag[];
          itemId: string;
          status: "UPDATED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type DownloadMediaResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "UNAUTHORIZED";
      };

export type NoteMutationResult =
    | {
          item: LibraryItemWithCollections;
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

async function getSessionUserId(): Promise<string | null> {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    return session?.user?.id ?? null;
}

function normalizeNotePayload(input: {
    contentHtml?: string;
    title?: string;
}): {
    contentHtml: string;
    contentText: string;
    title: string;
} {
    const contentHtml = sanitizeNoteHtml(input.contentHtml ?? "");
    const contentText = extractNoteText(contentHtml);
    const title = normalizeNoteTitle(input.title ?? "", contentText).slice(
        0,
        NOTE_TITLE_MAX_LENGTH
    );

    return {
        contentHtml,
        contentText,
        title,
    };
}

async function getNoteItemForUser(
    userId: string,
    itemId: string
): Promise<LibraryItemWithCollections | null> {
    return (await prisma.libraryItem.findFirst({
        include: {
            collections: {
                orderBy: {
                    name: "asc",
                },
                select: {
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                },
            },
        },
        where: {
            id: itemId,
            kind: "note",
            userId,
        },
    })) as LibraryItemWithCollections | null;
}

export async function deleteLibraryItem(
    itemId: string
): Promise<DeleteLibraryItemResult> {
    const normalizedItemId = itemId.trim();
    if (normalizedItemId.length === 0) {
        return {
            message: "Select a saved item before trying to delete it.",
            status: "ERROR",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to manage saved items.",
            status: "UNAUTHORIZED",
        };
    }

    const libraryItemDelegate = prisma.libraryItem as unknown as {
        deleteMany(args: {
            where: {
                id: string;
                userId: string;
            };
        }): Promise<{ count: number }>;
    };

    try {
        const result = await libraryItemDelegate.deleteMany({
            where: {
                id: normalizedItemId,
                userId,
            },
        });

        if (result.count === 0) {
            return {
                message: "This saved item was already removed.",
                status: "NOT_FOUND",
            };
        }

        return {
            itemId: normalizedItemId,
            status: "DELETED",
        };
    } catch (error) {
        log.error("Unexpected library item delete failure", error);
        return {
            message: "We couldn't delete this saved item right now.",
            status: "ERROR",
        };
    }
}

export async function createNote(
    input: { contentHtml?: string; title?: string } = {}
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
                browserProfileId: "default",
                caption: note.title,
                externalId: `note_${crypto.randomUUID()}`,
                kind: "note",
                noteContentHtml: note.contentHtml,
                noteContentText: note.contentText,
                source: LibraryItemSource.cache_note,
                url: "about:blank",
                userId,
            },
        });

        const item = await getNoteItemForUser(userId, created.id);
        if (!item) {
            throw new LibraryNoteError({
                code: "not_found",
                message: "We created the note but couldn't load it back.",
                operation: "createNote",
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
    itemId: string;
    title?: string;
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
                caption: note.title,
                noteContentHtml: note.contentHtml,
                noteContentText: note.contentText,
            },
            where: {
                id: parsed.data.itemId,
                kind: "note",
                userId,
            },
        });

        if (updated.count === 0) {
            throw new LibraryNoteError({
                code: "not_found",
                message: "This note no longer exists.",
                operation: "updateNote",
            });
        }

        const item = await getNoteItemForUser(userId, parsed.data.itemId);
        if (!item) {
            throw new LibraryNoteError({
                code: "not_found",
                message: "We couldn't reload this note after saving it.",
                operation: "updateNote",
            });
        }

        return {
            item,
            status: "SUCCESS",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        if (details.name === "LibraryNoteError") {
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

export async function deleteCollection(input: {
    collectionId: string;
}): Promise<DeleteCollectionResult> {
    const parsed = DeleteCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to delete.",
            status: "INVALID",
        };
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        return {
            message: "Sign in again to manage collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const collection = await tx.collection.findFirst({
                select: {
                    id: true,
                    name: true,
                },
                where: {
                    id: parsed.data.collectionId,
                    userId: session.user.id,
                },
            });

            if (!collection) {
                throw new LibraryCollectionError({
                    code: "not_found",
                    message: "This collection was already removed.",
                    operation: "deleteCollection",
                });
            }

            await tx.collection.delete({
                where: {
                    id: collection.id,
                },
            });

            return collection;
        });

        return {
            collection: result,
            status: "DELETED",
        };
    } catch (error) {
        if (
            LibraryCollectionError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: extractNamedErrorMessage(error).message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected collection delete failure", error);
        return {
            message: "We couldn't delete this collection right now.",
            status: "ERROR",
        };
    }
}

export async function updateCollectionPriority(input: {
    collectionId: string;
    priority: CollectionPriority;
}): Promise<UpdateCollectionPriorityResult> {
    const parsed = UpdateCollectionPriorityInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Pick a valid priority before saving.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to manage collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const updatedCollection = await prisma.collection.updateManyAndReturn({
            data: {
                priority: parsed.data.priority,
            },
            select: {
                description: true,
                id: true,
                name: true,
                priority: true,
            },
            where: {
                id: parsed.data.collectionId,
                userId,
            },
        });

        const collection = updatedCollection[0];
        if (!collection) {
            return {
                message: "That collection is no longer available.",
                status: "NOT_FOUND",
            };
        }

        return {
            collection,
            status: "UPDATED",
        };
    } catch (error) {
        log.error("Unexpected collection priority update failure", error);
        return {
            message: "We couldn't update this collection priority right now.",
            status: "ERROR",
        };
    }
}

export async function createCollection(input: {
    assignToItemId?: string;
    description?: string;
    name: string;
}): Promise<CreateCollectionResult> {
    const parsed = CreateCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name.",
            status: "INVALID",
        };
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        return {
            message: "Sign in again to create collections.",
            status: "UNAUTHORIZED",
        };
    }

    const { assignToItemId, description } = parsed.data;
    const normalized = normalizeCollectionName(parsed.data.name);

    try {
        const result = await prisma.$transaction(async (tx) => {
            if (assignToItemId) {
                const item = await tx.libraryItem.findFirst({
                    select: {
                        id: true,
                    },
                    where: {
                        id: assignToItemId,
                        userId: session.user.id,
                    },
                });

                if (!item) {
                    throw new LibraryCollectionError({
                        code: "not_found",
                        message: "We couldn't find that saved item to tag it.",
                        operation: "createCollection",
                    });
                }
            }

            const existingCollection = await tx.collection.findFirst({
                select: {
                    id: true,
                },
                where: {
                    nameKey: normalized.nameKey,
                    userId: session.user.id,
                },
            });

            if (existingCollection) {
                throw new LibraryCollectionError({
                    code: "duplicate_name",
                    message: "A collection with that name already exists.",
                    operation: "createCollection",
                });
            }

            const collection = await tx.collection.create({
                data: {
                    description,
                    items: assignToItemId
                        ? {
                              connect: {
                                  id: assignToItemId,
                              },
                          }
                        : undefined,
                    name: normalized.name,
                    nameKey: normalized.nameKey,
                    userId: session.user.id,
                },
                select: {
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                },
            });

            return {
                assignedItemId: assignToItemId ?? null,
                collection: {
                    description: collection.description,
                    id: collection.id,
                    itemCount: assignToItemId ? 1 : 0,
                    name: collection.name,
                    priority: collection.priority,
                    sources: [],
                } satisfies LibraryCollectionSummary,
            };
        });

        return {
            assignedItemId: result.assignedItemId,
            collection: result.collection,
            status: "CREATED",
        };
    } catch (error) {
        const named = extractNamedErrorMessage(error);
        if (
            LibraryCollectionError.isInstance(error) &&
            error.data.code === "duplicate_name"
        ) {
            return {
                message: named.message,
                status: "DUPLICATE",
            };
        }
        if (
            LibraryCollectionError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: named.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected collection create failure", error);
        return {
            message: "We couldn't create this collection right now.",
            status: "ERROR",
        };
    }
}

export async function updateLibraryItemCollections(input: {
    collectionIds: string[];
    itemId: string;
}): Promise<UpdateLibraryItemCollectionsResult> {
    const parsed = UpdateLibraryItemCollectionsInputSchema.safeParse({
        collectionIds: Array.from(new Set(input.collectionIds)),
        itemId: input.itemId,
    });

    if (!parsed.success) {
        return {
            message: "Pick valid collections before saving.",
            status: "INVALID",
        };
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        return {
            message: "Sign in again to manage collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const item = await prisma.libraryItem.findFirst({
            select: {
                id: true,
            },
            where: {
                id: parsed.data.itemId,
                userId: session.user.id,
            },
        });

        if (!item) {
            return {
                message: "We couldn't find that saved item.",
                status: "NOT_FOUND",
            };
        }

        const ownedCollections = parsed.data.collectionIds.length
            ? await prisma.collection.findMany({
                  orderBy: {
                      name: "asc",
                  },
                  select: {
                      description: true,
                      id: true,
                      name: true,
                      priority: true,
                  },
                  where: {
                      id: {
                          in: parsed.data.collectionIds,
                      },
                      userId: session.user.id,
                  },
              })
            : [];

        if (ownedCollections.length !== parsed.data.collectionIds.length) {
            return {
                message: "One of those collections is no longer available.",
                status: "NOT_FOUND",
            };
        }

        const updatedItem = await prisma.libraryItem.update({
            data: {
                collections: {
                    set: ownedCollections.map((collection) => ({
                        id: collection.id,
                    })),
                },
            },
            select: {
                collections: {
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        description: true,
                        id: true,
                        name: true,
                        priority: true,
                    },
                },
                id: true,
            },
            where: {
                id: parsed.data.itemId,
            },
        });

        return {
            collections: updatedItem.collections,
            itemId: updatedItem.id,
            status: "UPDATED",
        };
    } catch (error) {
        log.error("Unexpected library collection update failure", error);
        return {
            message: "We couldn't update collections for this item.",
            status: "ERROR",
        };
    }
}

export async function downloadMedia(url: string): Promise<DownloadMediaResult> {
    const normalizedUrl = url.trim();
    if (normalizedUrl.length === 0) {
        return {
            message: "A valid URL is required to download media.",
            status: "INVALID",
        };
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session?.user?.id) {
        return {
            message: "Sign in again to download media.",
            status: "UNAUTHORIZED",
        };
    }

    const API_BASE = "https://cobalt-production-d7b0.up.railway.app";

    try {
        const response = await fetch(`${API_BASE}/`, {
            body: JSON.stringify({ url: normalizedUrl }),
            cache: "no-store",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        if (!response.ok) {
            const errorText = await response.text();
            log.warn("Cobalt download request failed", {
                error: errorText,
                status: response.status,
                url: normalizedUrl,
            });
            return {
                message:
                    "The download service is currently unavailable. Please try again later.",
                status: "ERROR",
            };
        }

        const data = (await response.json()) as {
            status?: string;
            text?: string;
            url?: string;
        };

        if (data.status === "error") {
            return {
                message: data.text || "Failed to process the download request.",
                status: "ERROR",
            };
        }

        if (data.url) {
            return {
                downloadUrl: data.url,
                status: "SUCCESS",
            };
        }

        return {
            message: "Could not find a download link for this media.",
            status: "ERROR",
        };
    } catch (error) {
        log.error("Unexpected download failure", error);
        return {
            message:
                "We hit an unexpected error while preparing your download.",
            status: "ERROR",
        };
    }
}
