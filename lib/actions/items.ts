"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { createLogger } from "@/lib/logs/console/logger";
import { prisma } from "@/prisma";

import * as z from "zod";
import type { LibraryCollectionTag } from "@/lib/types";

const log = createLogger("library:actions:items");

const UpdateLibraryItemCollectionsInputSchema = z.object({
    collectionIds: z.array(z.string().trim().min(1)).max(100),
    itemId: z.string().trim().min(1),
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

    const userId = await getSessionUserId();
    if (!userId) {
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
                userId,
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
                      createdAt: true,
                      description: true,
                      id: true,
                      name: true,
                      priority: true,
                      updatedAt: true,
                  },
                  where: {
                      id: {
                          in: parsed.data.collectionIds,
                      },
                      userId,
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
                        createdAt: true,
                        description: true,
                        id: true,
                        name: true,
                        priority: true,
                        updatedAt: true,
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
