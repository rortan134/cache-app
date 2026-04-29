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
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";
import { LibraryCollectionError } from "./error";

type CollectionTransaction = Prisma.TransactionClient;

interface OwnedCollectionLookup {
    id: string;
    name: string;
    nameKey: string;
}

interface OwnedLibraryItemLookup {
    id: string;
    source: LibraryItemSource;
}

interface CollectionTagRecord {
    createdAt: Date;
    description: string | null;
    id: string;
    name: string;
    priority: LibraryCollectionTag["priority"];
    sharedAt: Date | null;
    shareId: string | null;
    updatedAt: Date;
}

interface CollectionSummarySourceRecord {
    source: LibraryItemSource;
}

interface OwnedItemCollectionRecord {
    collections: Array<{ id: string }>;
    id: string;
}

const ITEM_COLLECTION_TAGS_SELECT = {
    collections: {
        orderBy: {
            name: "asc",
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
    id: true,
} as const satisfies Prisma.LibraryItemSelect;

function toCollectionConnections(collectionIds: string[]): Array<{
    id: string;
}> {
    return collectionIds.map((id) => ({ id }));
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

async function requireOwnedCollection(
    tx: CollectionTransaction,
    args: {
        collectionId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<OwnedCollectionLookup> {
    const collection = await tx.collection.findFirst({
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
    existingNames: string[]
): string {
    const uniqueName = getIncrementedName(sourceName, [...existingNames]);
    return normalizeCollectionName(uniqueName).name;
}

function toCollectionSummary(args: {
    collection: CollectionTagRecord;
    items: CollectionSummarySourceRecord[];
}): LibraryCollectionSummary {
    return toLibraryCollectionSummary({
        ...args.collection,
        _count: { items: args.items.length },
        items: args.items.map((item) => ({ source: item.source })),
    });
}

async function findOwnedCollectionSummariesByIds(
    tx: CollectionTransaction,
    args: {
        collectionIds: string[];
        userId: string;
    }
): Promise<LibraryCollectionSummary[]> {
    if (args.collectionIds.length === 0) {
        return [];
    }

    const collections = await tx.collection.findMany({
        orderBy: {
            name: "asc",
        },
        select: {
            _count: {
                select: {
                    items: true,
                },
            },
            ...LIBRARY_COLLECTION_TAG_SELECT,
            items: {
                select: {
                    source: true,
                },
            },
        },
        where: {
            id: {
                in: args.collectionIds,
            },
            userId: args.userId,
        },
    });

    return collections.map((collection) =>
        toLibraryCollectionSummary(collection)
    );
}

async function findOwnedCollectionTagsByIds(
    tx: CollectionTransaction,
    args: {
        collectionIds: string[];
        userId: string;
    }
): Promise<CollectionTagRecord[]> {
    if (args.collectionIds.length === 0) {
        return [];
    }

    return await tx.collection.findMany({
        orderBy: {
            name: "asc",
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
        where: {
            id: {
                in: args.collectionIds,
            },
            userId: args.userId,
        },
    });
}

async function requireOwnedItemsWithCollectionIds(
    tx: CollectionTransaction,
    args: {
        itemIds: string[];
        message: string;
        operation: string;
        userId: string;
    }
): Promise<OwnedItemCollectionRecord[]> {
    const items = await tx.libraryItem.findMany({
        select: {
            collections: {
                select: {
                    id: true,
                },
            },
            id: true,
        },
        where: {
            id: {
                in: args.itemIds,
            },
            userId: args.userId,
        },
    });

    if (items.length !== args.itemIds.length) {
        throwCollectionNotFound(args.operation, args.message);
    }

    const itemById = new Map(items.map((item) => [item.id, item]));
    return args.itemIds.map((itemId) => {
        const item = itemById.get(itemId);
        if (!item) {
            throwCollectionNotFound(args.operation, args.message);
        }
        return item;
    });
}

async function requireOwnedItemWithCollectionIds(
    tx: CollectionTransaction,
    args: {
        itemId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<OwnedItemCollectionRecord> {
    const item = await tx.libraryItem.findFirst({
        select: {
            collections: {
                select: {
                    id: true,
                },
            },
            id: true,
        },
        where: {
            id: args.itemId,
            userId: args.userId,
        },
    });

    if (!item) {
        throwCollectionNotFound(args.operation, args.message);
    }

    return item;
}

function mergeCollectionIds(args: {
    currentCollectionIds: string[];
    nextSharedCollectionIds: string[];
    previousSharedCollectionIds: string[];
}): string[] {
    const previousSharedCollectionIdSet = new Set(
        args.previousSharedCollectionIds
    );
    const mergedCollectionIds = args.currentCollectionIds.filter(
        (collectionId) => !previousSharedCollectionIdSet.has(collectionId)
    );
    const mergedCollectionIdSet = new Set(mergedCollectionIds);

    for (const collectionId of args.nextSharedCollectionIds) {
        if (mergedCollectionIdSet.has(collectionId)) {
            continue;
        }

        mergedCollectionIds.push(collectionId);
        mergedCollectionIdSet.add(collectionId);
    }

    return mergedCollectionIds;
}

async function requireOwnedLibraryItem(
    tx: CollectionTransaction,
    args: {
        itemId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<OwnedLibraryItemLookup> {
    const item = await tx.libraryItem.findFirst({
        select: { id: true, source: true },
        where: {
            id: args.itemId,
            userId: args.userId,
        },
    });

    if (!item) {
        throwCollectionNotFound(args.operation, args.message);
    }

    return item;
}

async function requireOwnedLibraryItems(
    tx: CollectionTransaction,
    args: {
        itemIds: string[];
        message: string;
        operation: string;
        userId: string;
    }
): Promise<Array<{ id: string; source: LibraryItemSource }>> {
    const items = await tx.libraryItem.findMany({
        select: { id: true, source: true },
        where: {
            id: { in: args.itemIds },
            userId: args.userId,
        },
    });

    if (items.length !== args.itemIds.length) {
        throwCollectionNotFound(args.operation, args.message);
    }

    return items;
}

export async function downloadMedia(url: string): Promise<string> {
    const result = await resolveCobaltDownloadUrl(url);
    if (result.status === "ERROR") {
        throw new Error(
            result.message || "The download service is currently unavailable."
        );
    }
    return result.downloadUrl;
}

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
        const assignedItem = assignToItemId
            ? await requireOwnedLibraryItem(tx, {
                  itemId: assignToItemId,
                  message: "We couldn't find that saved item to tag it.",
                  operation: "createCollection",
                  userId,
              })
            : null;

        await ensureCollectionNameIsAvailable(tx, {
            normalizedNameKey: normalized.nameKey,
            operation: "createCollection",
            userId,
        });

        const collection = await tx.collection.create({
            data: {
                description,
                items: assignedItem
                    ? { connect: { id: assignedItem.id } }
                    : undefined,
                name: normalized.name,
                nameKey: normalized.nameKey,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemId: assignedItem?.id ?? null,
            collection: toCollectionSummary({
                collection,
                items: assignedItem ? [assignedItem] : [],
            }),
        };
    });
}

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

        const matchingItems = await requireOwnedLibraryItems(tx, {
            itemIds,
            message: "Some of those saved items are no longer available.",
            operation: "createCollectionFromItems",
            userId,
        });

        const collection = await tx.collection.create({
            data: {
                description,
                items: {
                    connect: toCollectionConnections(itemIds),
                },
                name: normalized.name,
                nameKey: normalized.nameKey,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemIds: itemIds,
            collection: toCollectionSummary({
                collection,
                items: matchingItems,
            }),
        };
    });
}

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
                              connect: toCollectionConnections(
                                  sourceCollection.items.map((item) => item.id)
                              ),
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
            collection: toCollectionSummary({
                collection: duplicatedCollection,
                items: sourceCollection.items,
            }),
        };
    });
}

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

export async function deleteLibraryItem(args: {
    itemId: string;
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    itemId: string;
}> {
    const { itemId, userId } = args;

    return await prisma.$transaction(async (tx) => {
        const item = await requireOwnedItemWithCollectionIds(tx, {
            itemId,
            message: "This saved item was already removed.",
            operation: "deleteLibraryItem",
            userId,
        });

        await tx.libraryItem.delete({
            where: {
                id: item.id,
            },
        });

        return {
            collectionSummaries: await findOwnedCollectionSummariesByIds(tx, {
                collectionIds: item.collections.map(
                    (collection) => collection.id
                ),
                userId,
            }),
            itemId: item.id,
        };
    });
}

export async function updateLibraryItemCollections(args: {
    collectionIds: string[];
    itemId: string;
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    collections: LibraryCollectionTag[];
    itemId: string;
}> {
    const { collectionIds, itemId, userId } = args;

    return await prisma.$transaction(async (tx) => {
        const item = await requireOwnedItemWithCollectionIds(tx, {
            itemId,
            message: "We couldn't find that saved item.",
            operation: "updateLibraryItemCollections",
            userId,
        });

        const ownedCollections = await findOwnedCollectionTagsByIds(tx, {
            collectionIds,
            userId,
        });

        if (ownedCollections.length !== collectionIds.length) {
            throwCollectionNotFound(
                "updateLibraryItemCollections",
                "One of those collections is no longer available."
            );
        }

        const updatedItem = await tx.libraryItem.update({
            data: {
                collections: {
                    set: toCollectionConnections(
                        ownedCollections.map((collection) => collection.id)
                    ),
                },
            },
            select: ITEM_COLLECTION_TAGS_SELECT,
            where: { id: item.id },
        });

        const affectedCollectionIds = Array.from(
            new Set([
                ...item.collections.map((collection) => collection.id),
                ...updatedItem.collections.map((collection) => collection.id),
            ])
        );

        return {
            collectionSummaries: await findOwnedCollectionSummariesByIds(tx, {
                collectionIds: affectedCollectionIds,
                userId,
            }),
            collections: updatedItem.collections.map(toLibraryCollectionTag),
            itemId: updatedItem.id,
        };
    });
}

export async function updateLibraryItemsCollections(args: {
    itemIds: string[];
    nextSharedCollectionIds: string[];
    previousSharedCollectionIds: string[];
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    itemCollections: Array<{
        collections: LibraryCollectionTag[];
        itemId: string;
    }>;
}> {
    const {
        itemIds,
        nextSharedCollectionIds,
        previousSharedCollectionIds,
        userId,
    } = args;

    return await prisma.$transaction(async (tx) => {
        const items = await requireOwnedItemsWithCollectionIds(tx, {
            itemIds,
            message: "Some of those saved items are no longer available.",
            operation: "updateLibraryItemsCollections",
            userId,
        });
        const referencedCollectionIds = Array.from(
            new Set([
                ...previousSharedCollectionIds,
                ...nextSharedCollectionIds,
            ])
        );
        const ownedCollections = await findOwnedCollectionTagsByIds(tx, {
            collectionIds: referencedCollectionIds,
            userId,
        });

        if (ownedCollections.length !== referencedCollectionIds.length) {
            throwCollectionNotFound(
                "updateLibraryItemsCollections",
                "One of those collections is no longer available."
            );
        }

        const updatedItems: Array<{
            collections: LibraryCollectionTag[];
            itemId: string;
        }> = [];

        for (const item of items) {
            const nextCollectionIds = mergeCollectionIds({
                currentCollectionIds: item.collections.map(
                    (collection) => collection.id
                ),
                nextSharedCollectionIds,
                previousSharedCollectionIds,
            });

            const updatedItem = await tx.libraryItem.update({
                data: {
                    collections: {
                        set: toCollectionConnections(nextCollectionIds),
                    },
                },
                select: ITEM_COLLECTION_TAGS_SELECT,
                where: {
                    id: item.id,
                },
            });

            updatedItems.push({
                collections: updatedItem.collections.map(
                    toLibraryCollectionTag
                ),
                itemId: updatedItem.id,
            });
        }

        return {
            collectionSummaries: await findOwnedCollectionSummariesByIds(tx, {
                collectionIds: referencedCollectionIds,
                userId,
            }),
            itemCollections: updatedItems,
        };
    });
}
