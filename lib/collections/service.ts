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
import type { Prisma } from "@/prisma/client/client";
import type { CollectionPriority } from "@/prisma/client/enums";
import { LibraryCollectionError } from "./error";

type CollectionTransaction = Prisma.TransactionClient;

interface OwnedCollectionLookup {
    readonly id: string;
    readonly name: string;
    readonly nameKey: string;
}

function createCollectionError(args: {
    code: "duplicate_name" | "not_found";
    message: string;
    operation: string;
}): InstanceType<typeof LibraryCollectionError> {
    return new LibraryCollectionError(args);
}

function throwCollectionNotFound(operation: string, message: string): never {
    throw createCollectionError({
        code: "not_found",
        message,
        operation,
    });
}

function throwDuplicateCollectionName(
    operation: string,
    message = "A collection with that name already exists."
): never {
    throw createCollectionError({
        code: "duplicate_name",
        message,
        operation,
    });
}

function findOwnedCollection(
    tx: CollectionTransaction,
    args: {
        collectionId: string;
        userId: string;
    }
): Promise<OwnedCollectionLookup | null> {
    return tx.collection.findFirst({
        select: {
            id: true,
            name: true,
            nameKey: true,
        },
        where: {
            id: args.collectionId,
            userId: args.userId,
        },
    });
}

async function requireOwnedCollection(
    tx: CollectionTransaction,
    args: {
        collectionId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<OwnedCollectionLookup> {
    const collection = await findOwnedCollection(tx, args);
    if (!collection) {
        throwCollectionNotFound(args.operation, args.message);
    }

    return collection;
}

async function ensureCollectionNameIsAvailable(
    tx: CollectionTransaction,
    args: {
        excludeCollectionId?: string;
        message?: string;
        normalizedNameKey: string;
        operation: string;
        userId: string;
    }
): Promise<void> {
    const existingCollection = await tx.collection.findFirst({
        select: { id: true },
        where: {
            id: args.excludeCollectionId
                ? { not: args.excludeCollectionId }
                : undefined,
            nameKey: args.normalizedNameKey,
            userId: args.userId,
        },
    });

    if (existingCollection) {
        throwDuplicateCollectionName(args.operation, args.message);
    }
}

function buildDuplicateCollectionName(
    sourceName: string,
    existingNames: readonly string[]
): string {
    const uniqueName = getIncrementedName(sourceName, [...existingNames]);
    return normalizeCollectionName(uniqueName).name;
}

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
                throwCollectionNotFound(
                    "createCollection",
                    "We couldn't find that saved item to tag it."
                );
            }
        }

        await ensureCollectionNameIsAvailable(tx, {
            normalizedNameKey: normalized.nameKey,
            operation: "createCollection",
            userId,
        });

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
        await ensureCollectionNameIsAvailable(tx, {
            normalizedNameKey: normalized.nameKey,
            operation: "createCollectionFromItems",
            userId,
        });

        const matchingItems = await tx.libraryItem.findMany({
            select: { id: true, source: true },
            where: { id: { in: itemIds }, userId },
        });

        if (matchingItems.length !== itemIds.length) {
            throwCollectionNotFound(
                "createCollectionFromItems",
                "Some of those saved items are no longer available."
            );
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
        const collection = await requireOwnedCollection(tx, {
            collectionId,
            message: "This collection was already removed.",
            operation: "deleteCollection",
            userId,
        });

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
    const operation = "duplicateCollection";

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
            throwCollectionNotFound(
                operation,
                "That collection is no longer available."
            );
        }

        const existingNames = await tx.collection.findMany({
            select: { name: true },
            where: { userId },
        });

        const nextName = buildDuplicateCollectionName(
            sourceCollection.name,
            existingNames.map((collection) => collection.name)
        );
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

    return await prisma.$transaction(async (tx) => {
        const collection = await requireOwnedCollection(tx, {
            collectionId,
            message: "That collection is no longer available.",
            operation: "updateCollectionPriority",
            userId,
        });

        const updatedCollection = await tx.collection.update({
            data: { priority },
            select: LIBRARY_COLLECTION_TAG_SELECT,
            where: { id: collection.id },
        });

        return toLibraryCollectionTag(updatedCollection);
    });
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
            throwCollectionNotFound(
                "renameCollection",
                "That collection is no longer available."
            );
        }

        if (collection.name === normalized.name) {
            return toLibraryCollectionTag(collection);
        }

        await ensureCollectionNameIsAvailable(tx, {
            excludeCollectionId: collection.id,
            normalizedNameKey: normalized.nameKey,
            operation: "renameCollection",
            userId,
        });

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
        throwCollectionNotFound(
            "deleteLibraryItem",
            "This saved item was already removed."
        );
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
        throwCollectionNotFound(
            "updateLibraryItemCollections",
            "We couldn't find that saved item."
        );
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
        throwCollectionNotFound(
            "updateLibraryItemCollections",
            "One of those collections is no longer available."
        );
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
