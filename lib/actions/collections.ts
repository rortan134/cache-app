"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { NamedError, extractNamedErrorMessage } from "@/lib/error";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
} from "@/lib/types";
import { createLogger } from "@/lib/logs/console/logger";
import { getIncrementedName, normalizeCollectionName } from "@/lib/strings";
import { prisma } from "@/prisma";
import type { CollectionPriority } from "@/prisma/client/enums";
import * as z from "zod";

const LibraryCollectionError = NamedError.create(
    "LibraryCollectionError",
    z.object({
        code: z.enum(["duplicate_name", "invalid_name", "not_found"]),
        message: z.string(),
        operation: z.string(),
    })
);

const log = createLogger("library:actions");
const COLLECTION_NAME_MAX_LENGTH = 64;

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

const CreateCollectionFromItemsInputSchema = z.object({
    description: z.string().trim().max(1024).optional(),
    itemIds: z.array(z.string().trim().min(1)).min(1).max(500),
    name: z
        .string()
        .trim()
        .min(1, "Enter a collection name.")
        .max(
            COLLECTION_NAME_MAX_LENGTH,
            `Collection names can be up to ${COLLECTION_NAME_MAX_LENGTH} characters.`
        ),
});

const DeleteCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to delete."),
});

const DuplicateCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to copy."),
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

const RenameCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to rename."),
    name: z
        .string()
        .trim()
        .min(1, "Enter a collection name.")
        .max(
            COLLECTION_NAME_MAX_LENGTH,
            `Collection names can be up to ${COLLECTION_NAME_MAX_LENGTH} characters.`
        ),
});

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

export type CreateCollectionFromItemsResult =
    | {
          assignedItemIds: string[];
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

export type DuplicateCollectionResult =
    | {
          assignedItemIds: string[];
          collection: LibraryCollectionSummary;
          status: "CREATED";
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

export type RenameCollectionResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
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

    const userId = await getSessionUserId();
    if (!userId) {
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
                    userId,
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

export async function duplicateCollection(input: {
    collectionId: string;
}): Promise<DuplicateCollectionResult> {
    const parsed = DuplicateCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to copy.",
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
        const result = await prisma.$transaction(async (tx) => {
            const sourceCollection = await tx.collection.findFirst({
                select: {
                    description: true,
                    items: {
                        select: {
                            id: true,
                            source: true,
                        },
                    },
                    name: true,
                    priority: true,
                },
                where: {
                    id: parsed.data.collectionId,
                    userId,
                },
            });

            if (!sourceCollection) {
                throw new LibraryCollectionError({
                    code: "not_found",
                    message: "That collection is no longer available.",
                    operation: "duplicateCollection",
                });
            }

            const existingNames = await tx.collection.findMany({
                select: {
                    name: true,
                },
                where: {
                    userId,
                },
            });
            const existingNameKeys = new Set(
                existingNames.map(
                    (collection) =>
                        normalizeCollectionName(collection.name).nameKey
                )
            );
            let nextName = sourceCollection.name;

            while (
                existingNameKeys.has(normalizeCollectionName(nextName).nameKey)
            ) {
                nextName = getIncrementedName(nextName, [nextName]);
            }

            const normalized = normalizeCollectionName(nextName);

            const duplicatedCollection = await tx.collection.create({
                data: {
                    description: sourceCollection.description,
                    items:
                        sourceCollection.items.length > 0
                            ? {
                                  connect: sourceCollection.items.map(
                                      (item) => ({
                                          id: item.id,
                                      })
                                  ),
                              }
                            : undefined,
                    name: normalized.name,
                    nameKey: normalized.nameKey,
                    priority: sourceCollection.priority,
                    userId,
                },
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    updatedAt: true,
                },
            });

            return {
                assignedItemIds: sourceCollection.items.map((item) => item.id),
                collection: {
                    createdAt: duplicatedCollection.createdAt,
                    description: duplicatedCollection.description,
                    id: duplicatedCollection.id,
                    itemCount: sourceCollection.items.length,
                    name: duplicatedCollection.name,
                    priority: duplicatedCollection.priority,
                    sources: Array.from(
                        new Set(
                            sourceCollection.items.map((item) => item.source)
                        )
                    ),
                    updatedAt: duplicatedCollection.updatedAt,
                } satisfies LibraryCollectionSummary,
            };
        });

        return {
            assignedItemIds: result.assignedItemIds,
            collection: result.collection,
            status: "CREATED",
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

        log.error("Unexpected collection duplicate failure", error);
        return {
            message: "We couldn't make a copy of this collection right now.",
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
                createdAt: true,
                description: true,
                id: true,
                name: true,
                priority: true,
                updatedAt: true,
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

export async function renameCollection(input: {
    collectionId: string;
    name: string;
}): Promise<RenameCollectionResult> {
    const parsed = RenameCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name.",
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

    const normalized = normalizeCollectionName(parsed.data.name);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const collection = await tx.collection.findFirst({
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    updatedAt: true,
                },
                where: {
                    id: parsed.data.collectionId,
                    userId,
                },
            });

            if (!collection) {
                throw new LibraryCollectionError({
                    code: "not_found",
                    message: "That collection is no longer available.",
                    operation: "renameCollection",
                });
            }

            if (collection.name === normalized.name) {
                return collection;
            }

            const existingCollection = await tx.collection.findFirst({
                select: {
                    id: true,
                },
                where: {
                    id: {
                        not: collection.id,
                    },
                    nameKey: normalized.nameKey,
                    userId,
                },
            });

            if (existingCollection) {
                throw new LibraryCollectionError({
                    code: "duplicate_name",
                    message: "A collection with that name already exists.",
                    operation: "renameCollection",
                });
            }

            const updatedCollection = await tx.collection.update({
                data: {
                    name: normalized.name,
                    nameKey: normalized.nameKey,
                },
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    updatedAt: true,
                },
                where: {
                    id: collection.id,
                },
            });

            return updatedCollection;
        });

        return {
            collection: result,
            status: "UPDATED",
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

        log.error("Unexpected collection rename failure", error);
        return {
            message: "We couldn't rename this collection right now.",
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

    const userId = await getSessionUserId();
    if (!userId) {
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
                        userId,
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
                    userId,
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
                    userId,
                },
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    updatedAt: true,
                },
            });

            return {
                assignedItemId: assignToItemId ?? null,
                collection: {
                    createdAt: collection.createdAt,
                    description: collection.description,
                    id: collection.id,
                    itemCount: assignToItemId ? 1 : 0,
                    name: collection.name,
                    priority: collection.priority,
                    sources: [],
                    updatedAt: collection.updatedAt,
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

export async function createCollectionFromItems(input: {
    description?: string;
    itemIds: string[];
    name: string;
}): Promise<CreateCollectionFromItemsResult> {
    const parsed = CreateCollectionFromItemsInputSchema.safeParse({
        ...input,
        itemIds: Array.from(new Set(input.itemIds)),
    });

    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name and at least one saved item.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to create collections.",
            status: "UNAUTHORIZED",
        };
    }

    const { description, itemIds } = parsed.data;
    const normalized = normalizeCollectionName(parsed.data.name);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const existingCollection = await tx.collection.findFirst({
                select: {
                    id: true,
                },
                where: {
                    nameKey: normalized.nameKey,
                    userId,
                },
            });

            if (existingCollection) {
                throw new LibraryCollectionError({
                    code: "duplicate_name",
                    message: "A collection with that name already exists.",
                    operation: "createCollectionFromItems",
                });
            }

            const matchingItems = await tx.libraryItem.findMany({
                select: {
                    id: true,
                    source: true,
                },
                where: {
                    id: {
                        in: itemIds,
                    },
                    userId,
                },
            });

            if (matchingItems.length !== itemIds.length) {
                throw new LibraryCollectionError({
                    code: "not_found",
                    message:
                        "Some of those saved items are no longer available.",
                    operation: "createCollectionFromItems",
                });
            }

            const collection = await tx.collection.create({
                data: {
                    description,
                    items: {
                        connect: itemIds.map((id) => ({
                            id,
                        })),
                    },
                    name: normalized.name,
                    nameKey: normalized.nameKey,
                    userId,
                },
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    name: true,
                    priority: true,
                    updatedAt: true,
                },
            });

            return {
                assignedItemIds: itemIds,
                collection: {
                    createdAt: collection.createdAt,
                    description: collection.description,
                    id: collection.id,
                    itemCount: itemIds.length,
                    name: collection.name,
                    priority: collection.priority,
                    sources: Array.from(
                        new Set(matchingItems.map((item) => item.source))
                    ),
                    updatedAt: collection.updatedAt,
                } satisfies LibraryCollectionSummary,
            };
        });

        return {
            assignedItemIds: result.assignedItemIds,
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

        log.error("Unexpected collection create from results failure", error);
        return {
            message: "We couldn't create this collection right now.",
            status: "ERROR",
        };
    }
}
