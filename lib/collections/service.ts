import "server-only";

import {
    LIBRARY_COLLECTION_TAG_SELECT,
    toLibraryCollectionSummary,
    toLibraryCollectionTag,
} from "@/lib/collections/utils";
import { resolveCobaltDownloadUrl } from "@/lib/common/cobalt";
import {
    getIncrementedName,
    normalizeCollectionName,
} from "@/lib/common/strings";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
} from "@/lib/common/types";
import { prisma } from "@/prisma";
import type { CollectionPriority } from "@/prisma/client/enums";
import { LibraryCollectionError } from "./error";

/**
 * Resolves a download URL for a given media URL.
 */
export async function downloadMedia(url: string): Promise<string> {
    const result = await resolveCobaltDownloadUrl(url);
    if (result.status === "ERROR") {
        throw new Error(
            result.message || "The download service is currently unavailable."
        );
    }
    return result.downloadUrl;
}

/**
 * Creates a new collection for a user.
 */
export async function createCollection(args: {
    assignToItemId?: string;
    description?: string;
    name: string;
    userId: string;
}): Promise<{
    assignedItemId: string | null;
    collection: LibraryCollectionSummary;
}> {
    const { assignToItemId, description, name, userId } = args;
    const normalized = normalizeCollectionName(name);

    return await prisma.$transaction(async (tx) => {
        if (assignToItemId) {
            const item = await tx.libraryItem.findFirst({
                select: { id: true },
                where: { id: assignToItemId, userId },
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
            select: { id: true },
            where: { nameKey: normalized.nameKey, userId },
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
                    ? { connect: { id: assignToItemId } }
                    : undefined,
                name: normalized.name,
                nameKey: normalized.nameKey,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemId: assignToItemId ?? null,
            collection: toLibraryCollectionSummary({
                ...collection,
                _count: { items: assignToItemId ? 1 : 0 },
                items: [],
            }),
        };
    });
}

/**
 * Creates a new collection from a list of existing library items.
 */
export async function createCollectionFromItems(args: {
    description?: string;
    itemIds: string[];
    name: string;
    userId: string;
}): Promise<{
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}> {
    const { description, itemIds, name, userId } = args;
    const normalized = normalizeCollectionName(name);

    return await prisma.$transaction(async (tx) => {
        const existingCollection = await tx.collection.findFirst({
            select: { id: true },
            where: { nameKey: normalized.nameKey, userId },
        });

        if (existingCollection) {
            throw new LibraryCollectionError({
                code: "duplicate_name",
                message: "A collection with that name already exists.",
                operation: "createCollectionFromItems",
            });
        }

        const matchingItems = await tx.libraryItem.findMany({
            select: { id: true, source: true },
            where: { id: { in: itemIds }, userId },
        });

        if (matchingItems.length !== itemIds.length) {
            throw new LibraryCollectionError({
                code: "not_found",
                message: "Some of those saved items are no longer available.",
                operation: "createCollectionFromItems",
            });
        }

        const collection = await tx.collection.create({
            data: {
                description,
                items: {
                    connect: itemIds.map((id) => ({ id })),
                },
                name: normalized.name,
                nameKey: normalized.nameKey,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemIds: itemIds,
            collection: toLibraryCollectionSummary({
                ...collection,
                _count: { items: itemIds.length },
                items: matchingItems.map((item) => ({ source: item.source })),
            }),
        };
    });
}

/**
 * Deletes a collection.
 */
export async function deleteCollection(args: {
    collectionId: string;
    userId: string;
}): Promise<Pick<LibraryCollectionSummary, "id" | "name">> {
    const { collectionId, userId } = args;

    return await prisma.$transaction(async (tx) => {
        const collection = await tx.collection.findFirst({
            select: { id: true, name: true },
            where: { id: collectionId, userId },
        });

        if (!collection) {
            throw new LibraryCollectionError({
                code: "not_found",
                message: "This collection was already removed.",
                operation: "deleteCollection",
            });
        }

        await tx.collection.delete({
            where: { id: collection.id },
        });

        return collection;
    });
}

/**
 * Duplicates an existing collection and its items.
 */
export async function duplicateCollection(args: {
    collectionId: string;
    userId: string;
}): Promise<{
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}> {
    const { collectionId, userId } = args;

    return await prisma.$transaction(async (tx) => {
        const sourceCollection = await tx.collection.findFirst({
            select: {
                description: true,
                items: {
                    select: { id: true, source: true },
                },
                name: true,
                priority: true,
            },
            where: { id: collectionId, userId },
        });

        if (!sourceCollection) {
            throw new LibraryCollectionError({
                code: "not_found",
                message: "That collection is no longer available.",
                operation: "duplicateCollection",
            });
        }

        const existingNames = await tx.collection.findMany({
            select: { name: true },
            where: { userId },
        });

        const existingNameKeys = new Set(
            existingNames.map(
                (collection) => normalizeCollectionName(collection.name).nameKey
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
                              connect: sourceCollection.items.map((item) => ({
                                  id: item.id,
                              })),
                          }
                        : undefined,
                name: normalized.name,
                nameKey: normalized.nameKey,
                priority: sourceCollection.priority,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemIds: sourceCollection.items.map((item) => item.id),
            collection: toLibraryCollectionSummary({
                ...duplicatedCollection,
                _count: { items: sourceCollection.items.length },
                items: sourceCollection.items.map((item) => ({
                    source: item.source,
                })),
            }),
        };
    });
}

/**
 * Updates the priority of a collection.
 */
export async function updateCollectionPriority(args: {
    collectionId: string;
    priority: CollectionPriority;
    userId: string;
}): Promise<LibraryCollectionTag> {
    const { collectionId, priority, userId } = args;

    const updatedCollection = await prisma.collection.updateManyAndReturn({
        data: { priority },
        select: LIBRARY_COLLECTION_TAG_SELECT,
        where: { id: collectionId, userId },
    });

    const collection = updatedCollection[0];
    if (!collection) {
        throw new LibraryCollectionError({
            code: "not_found",
            message: "That collection is no longer available.",
            operation: "updateCollectionPriority",
        });
    }

    return toLibraryCollectionTag(collection);
}

/**
 * Renames a collection.
 */
export async function renameCollection(args: {
    collectionId: string;
    name: string;
    userId: string;
}): Promise<LibraryCollectionTag> {
    const { collectionId, name, userId } = args;
    const normalized = normalizeCollectionName(name);

    return await prisma.$transaction(async (tx) => {
        const collection = await tx.collection.findFirst({
            select: LIBRARY_COLLECTION_TAG_SELECT,
            where: { id: collectionId, userId },
        });

        if (!collection) {
            throw new LibraryCollectionError({
                code: "not_found",
                message: "That collection is no longer available.",
                operation: "renameCollection",
            });
        }

        if (collection.name === normalized.name) {
            return toLibraryCollectionTag(collection);
        }

        const existingCollection = await tx.collection.findFirst({
            select: { id: true },
            where: {
                id: { not: collection.id },
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
            select: LIBRARY_COLLECTION_TAG_SELECT,
            where: { id: collection.id },
        });

        return toLibraryCollectionTag(updatedCollection);
    });
}

/**
 * Deletes a library item.
 */
export async function deleteLibraryItem(args: {
    itemId: string;
    userId: string;
}): Promise<string> {
    const { itemId, userId } = args;

    const result = await prisma.libraryItem.deleteMany({
        where: { id: itemId, userId },
    });

    if (result.count === 0) {
        throw new LibraryCollectionError({
            code: "not_found",
            message: "This saved item was already removed.",
            operation: "deleteLibraryItem",
        });
    }

    return itemId;
}

/**
 * Updates the collections assigned to a library item.
 */
export async function updateLibraryItemCollections(args: {
    collectionIds: string[];
    itemId: string;
    userId: string;
}): Promise<{
    collections: LibraryCollectionTag[];
    itemId: string;
}> {
    const { collectionIds, itemId, userId } = args;

    const item = await prisma.libraryItem.findFirst({
        select: { id: true },
        where: { id: itemId, userId },
    });

    if (!item) {
        throw new LibraryCollectionError({
            code: "not_found",
            message: "We couldn't find that saved item.",
            operation: "updateLibraryItemCollections",
        });
    }

    const ownedCollections = collectionIds.length
        ? await prisma.collection.findMany({
              orderBy: { name: "asc" },
              select: LIBRARY_COLLECTION_TAG_SELECT,
              where: {
                  id: { in: collectionIds },
                  userId,
              },
          })
        : [];

    if (ownedCollections.length !== collectionIds.length) {
        throw new LibraryCollectionError({
            code: "not_found",
            message: "One of those collections is no longer available.",
            operation: "updateLibraryItemCollections",
        });
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
                orderBy: { name: "asc" },
                select: LIBRARY_COLLECTION_TAG_SELECT,
            },
            id: true,
        },
        where: { id: itemId },
    });

    return {
        collections: updatedItem.collections.map(toLibraryCollectionTag),
        itemId: updatedItem.id,
    };
}
