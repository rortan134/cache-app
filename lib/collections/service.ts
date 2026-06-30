import "server-only";

import {
    LIBRARY_COLLECTION_TAG_SELECT,
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    LIBRARY_ITEM_COLLECTIONS_SELECT,
    toLibraryCollectionSummary,
    toLibraryCollectionSummaryFromTagRecord,
    toLibraryCollectionTag,
    toLibraryItemWithCollections,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
    type LibraryCollectionTagRecord,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { resolveCobaltDownloadUrl } from "@/lib/integrations/cobalt/service";

import {
    FREE_LIBRARY_PREVIEW_ITEMS,
    ITEM_KIND_FOLDER,
    SORT_ASC,
    SORT_DESC,
} from "@/lib/common/constants";
import {
    getIncrementedName,
    normalizeCollectionName,
} from "@/lib/common/strings";
import { prisma } from "@/prisma";
import { Prisma } from "@/prisma/client/client";
import {
    AutomationStatus,
    AutomationTemplateKey,
    AutomationRunStatus,
    type CollectionPriority,
    type LibraryItemSource,
} from "@/prisma/client/enums";
import { LibraryCollectionError } from "./error";

const COLLECTION_LIST_LIMIT_MAX = 9999;
const LIBRARY_ITEMS_PAGE_LIMIT_DEFAULT = 9999;
const LIBRARY_ITEMS_PAGE_LIMIT_MAX = 9999;

type CollectionTransaction = Prisma.TransactionClient;

interface CollectionLookupOwned {
    id: string;
    name: string;
    nameKey: string;
}

interface LibraryItemLookupOwned {
    id: string;
    source: LibraryItemSource;
}

interface LibraryItemCollectionsOwned {
    collections: Array<{ id: string }>;
    id: string;
}

function toIdConnections(ids: readonly string[]): Array<{
    id: string;
}> {
    return ids.map((id) => ({ id }));
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

function throwCollectionNameDuplicate(
    operation: string,
    message = "A collection with that name already exists."
): never {
    throw createCollectionError({
        code: "duplicate_name",
        message,
        operation,
    });
}

function buildUniqueCollectionName(
    sourceName: string,
    existingNames: string[]
): string {
    const uniqueName = getIncrementedName(sourceName, [...existingNames]);
    return normalizeCollectionName(uniqueName).name;
}

async function requireCollectionOwned(
    tx: CollectionTransaction,
    args: {
        collectionId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<CollectionLookupOwned> {
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

async function ensureCollectionNameAvailable(
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
        throwCollectionNameDuplicate(args.operation, args.message);
    }
}

async function findCollectionSummariesOwnedByIds(
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
            name: SORT_ASC,
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

async function findCollectionTagsOwnedByIds(
    tx: CollectionTransaction,
    args: {
        collectionIds: string[];
        userId: string;
    }
): Promise<LibraryCollectionTagRecord[]> {
    if (args.collectionIds.length === 0) {
        return [];
    }

    const collections = await tx.collection.findMany({
        orderBy: {
            name: SORT_ASC,
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
        where: {
            id: {
                in: args.collectionIds,
            },
            userId: args.userId,
        },
    });

    return collections;
}

async function requireLibraryItemsOwnedWithCollections(
    tx: CollectionTransaction,
    args: {
        itemIds: string[];
        message: string;
        operation: string;
        userId: string;
    }
): Promise<LibraryItemCollectionsOwned[]> {
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

async function deleteSharedCollectionItems(
    tx: CollectionTransaction,
    args: {
        collectionIds: string[];
        itemIds: string[];
    }
): Promise<void> {
    if (args.collectionIds.length === 0 || args.itemIds.length === 0) {
        return;
    }

    await tx.$executeRaw`
        DELETE FROM "_CollectionToLibraryItem"
        WHERE "A" IN (${Prisma.join(args.collectionIds)})
            AND "B" IN (${Prisma.join(args.itemIds)})
    `;
}

async function insertSharedCollectionItems(
    tx: CollectionTransaction,
    args: {
        collectionIds: string[];
        itemIds: string[];
    }
): Promise<void> {
    if (args.collectionIds.length === 0 || args.itemIds.length === 0) {
        return;
    }

    const rows = args.collectionIds.flatMap((collectionId) =>
        args.itemIds.map((itemId) => Prisma.sql`(${collectionId}, ${itemId})`)
    );

    await tx.$executeRaw`
        INSERT INTO "_CollectionToLibraryItem" ("A", "B")
        VALUES ${Prisma.join(rows)}
        ON CONFLICT DO NOTHING
    `;
}

async function requireLibraryItemOwnedWithCollections(
    tx: CollectionTransaction,
    args: {
        itemId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<LibraryItemCollectionsOwned> {
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

async function requireLibraryItemOwned(
    tx: CollectionTransaction,
    args: {
        itemId: string;
        message: string;
        operation: string;
        userId: string;
    }
): Promise<LibraryItemLookupOwned> {
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

async function requireLibraryItemsOwned(
    tx: CollectionTransaction,
    args: {
        itemIds: string[];
        message: string;
        operation: string;
        userId: string;
    }
): Promise<LibraryItemLookupOwned[]> {
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

export function createCollection({
    assignToItemId,
    description,
    name,
    userId,
}: {
    assignToItemId?: string;
    description?: string;
    name: string;
    userId: string;
}): Promise<{
    assignedItemId: string | null;
    collection: LibraryCollectionSummary;
}> {
    const normalized = normalizeCollectionName(name);

    return prisma.$transaction(async (tx) => {
        const assignedItem = assignToItemId
            ? await requireLibraryItemOwned(tx, {
                  itemId: assignToItemId,
                  message: "We couldn't find that saved item to tag it.",
                  operation: "createCollection",
                  userId,
              })
            : null;

        await ensureCollectionNameAvailable(tx, {
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
            collection: toLibraryCollectionSummaryFromTagRecord(
                collection,
                assignedItem ? [assignedItem] : []
            ),
        };
    });
}

export function createCollectionFromItems({
    description,
    itemIds,
    name,
    userId,
}: {
    description?: string;
    itemIds: string[];
    name: string;
    userId: string;
}): Promise<{
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}> {
    const normalized = normalizeCollectionName(name);

    return prisma.$transaction(async (tx) => {
        await ensureCollectionNameAvailable(tx, {
            normalizedNameKey: normalized.nameKey,
            operation: "createCollectionFromItems",
            userId,
        });

        const matchingItems = await requireLibraryItemsOwned(tx, {
            itemIds,
            message: "Some of those saved items are no longer available.",
            operation: "createCollectionFromItems",
            userId,
        });

        const collection = await tx.collection.create({
            data: {
                description,
                items: {
                    connect: toIdConnections(itemIds),
                },
                name: normalized.name,
                nameKey: normalized.nameKey,
                userId,
            },
            select: LIBRARY_COLLECTION_TAG_SELECT,
        });

        return {
            assignedItemIds: itemIds,
            collection: toLibraryCollectionSummaryFromTagRecord(
                collection,
                matchingItems
            ),
        };
    });
}

export function deleteCollection({
    collectionId,
    userId,
}: {
    collectionId: string;
    userId: string;
}): Promise<Pick<LibraryCollectionSummary, "id" | "name">> {
    return prisma.$transaction(async (tx) => {
        const collection = await requireCollectionOwned(tx, {
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

export function duplicateCollection({
    collectionId,
    userId,
}: {
    collectionId: string;
    userId: string;
}): Promise<{
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}> {
    const operation = "duplicateCollection";

    return prisma.$transaction(async (tx) => {
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

        const nextName = buildUniqueCollectionName(
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
                              connect: toIdConnections(
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
            collection: toLibraryCollectionSummaryFromTagRecord(
                duplicatedCollection,
                sourceCollection.items
            ),
        };
    });
}

export function updateCollectionPriority({
    collectionId,
    priority,
    userId,
}: {
    collectionId: string;
    priority: CollectionPriority;
    userId: string;
}): Promise<LibraryCollectionTag> {
    return prisma.$transaction(async (tx) => {
        const collection = await requireCollectionOwned(tx, {
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

export function renameCollection({
    collectionId,
    name,
    userId,
}: {
    collectionId: string;
    name: string;
    userId: string;
}): Promise<LibraryCollectionTag> {
    const normalized = normalizeCollectionName(name);

    return prisma.$transaction(async (tx) => {
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

        await ensureCollectionNameAvailable(tx, {
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

export function deleteLibraryItem({
    itemId,
    userId,
}: {
    itemId: string;
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    itemId: string;
}> {
    return prisma.$transaction(async (tx) => {
        const item = await requireLibraryItemOwnedWithCollections(tx, {
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
            collectionSummaries: await findCollectionSummariesOwnedByIds(tx, {
                collectionIds: item.collections.map(
                    (collection) => collection.id
                ),
                userId,
            }),
            itemId: item.id,
        };
    });
}

export async function toggleLibraryItemFavorite({
    itemId,
    userId,
}: {
    itemId: string;
    userId: string;
}): Promise<{ item: LibraryItemWithCollections }> {
    const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.libraryItem.findFirst({
            select: { favoritedAt: true },
            where: { id: itemId, userId },
        });

        if (!existing) {
            throwCollectionNotFound(
                "toggleLibraryItemFavorite",
                "We couldn't find that saved item."
            );
        }

        return tx.libraryItem.update({
            data: {
                favoritedAt: existing.favoritedAt ? null : new Date(),
            },
            include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
            where: {
                favoritedAt: existing.favoritedAt ? { not: null } : null,
                id: itemId,
                userId,
            },
        });
    });

    return { item: toLibraryItemWithCollections(updated) };
}

export function updateLibraryItemCollections({
    collectionIds,
    itemId,
    userId,
}: {
    collectionIds: string[];
    itemId: string;
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    collections: LibraryCollectionTag[];
    itemId: string;
}> {
    return prisma.$transaction(async (tx) => {
        const item = await requireLibraryItemOwnedWithCollections(tx, {
            itemId,
            message: "We couldn't find that saved item.",
            operation: "updateLibraryItemCollections",
            userId,
        });

        const ownedCollections = await findCollectionTagsOwnedByIds(tx, {
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
                    set: toIdConnections(
                        ownedCollections.map((collection) => collection.id)
                    ),
                },
            },
            select: LIBRARY_ITEM_COLLECTIONS_SELECT,
            where: { id: item.id },
        });

        const affectedCollectionIds = Array.from(
            new Set([
                ...item.collections.map((collection) => collection.id),
                ...updatedItem.collections.map((collection) => collection.id),
            ])
        );

        return {
            collectionSummaries: await findCollectionSummariesOwnedByIds(tx, {
                collectionIds: affectedCollectionIds,
                userId,
            }),
            collections: updatedItem.collections.map(toLibraryCollectionTag),
            itemId: updatedItem.id,
        };
    });
}

export function updateLibraryItemsCollections({
    itemIds,
    nextSharedCollectionIds,
    previousSharedCollectionIds,
    userId,
}: {
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
    return prisma.$transaction(async (tx) => {
        await requireLibraryItemsOwnedWithCollections(tx, {
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

        const ownedCollections = await findCollectionTagsOwnedByIds(tx, {
            collectionIds: referencedCollectionIds,
            userId,
        });

        if (ownedCollections.length !== referencedCollectionIds.length) {
            throwCollectionNotFound(
                "updateLibraryItemsCollections",
                "One of those collections is no longer available."
            );
        }

        await deleteSharedCollectionItems(tx, {
            collectionIds: previousSharedCollectionIds,
            itemIds,
        });
        await insertSharedCollectionItems(tx, {
            collectionIds: nextSharedCollectionIds,
            itemIds,
        });

        const updatedItems = await tx.libraryItem.findMany({
            select: LIBRARY_ITEM_COLLECTIONS_SELECT,
            where: {
                id: {
                    in: itemIds,
                },
                userId,
            },
        });

        const updatedItemById = new Map(
            updatedItems.map((item) => [item.id, item])
        );

        return {
            collectionSummaries: await findCollectionSummariesOwnedByIds(tx, {
                collectionIds: referencedCollectionIds,
                userId,
            }),
            itemCollections: itemIds.map((itemId) => {
                const item = updatedItemById.get(itemId);
                if (!item) {
                    throwCollectionNotFound(
                        "updateLibraryItemsCollections",
                        "Some of those saved items are no longer available."
                    );
                }

                return {
                    collections: item.collections.map(toLibraryCollectionTag),
                    itemId: item.id,
                };
            }),
        };
    });
}

interface ListLibraryItemsArgs {
    collectionId?: string;
    limit?: number;
    offset?: number;
    search?: string;
    userId: string;
}

export async function listLibraryItems(
    args: ListLibraryItemsArgs
): Promise<{ items: LibraryItemWithCollections[]; total: number }> {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
    const skip = Math.max(args.offset ?? 0, 0);
    const where: Prisma.LibraryItemWhereInput = {
        kind: { not: ITEM_KIND_FOLDER },
        userId: args.userId,
    };

    if (args.search) {
        where.OR = [
            { caption: { contains: args.search, mode: "insensitive" } },
            { url: { contains: args.search, mode: "insensitive" } },
            { noteContentText: { contains: args.search, mode: "insensitive" } },
        ];
    }

    if (args.collectionId) {
        where.collections = { some: { id: args.collectionId } };
    }

    const [items, total] = await prisma.$transaction([
        prisma.libraryItem.findMany({
            include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
            orderBy: [
                { scrapedAt: SORT_DESC },
                { updatedAt: SORT_DESC },
                { id: SORT_DESC },
            ],
            skip,
            take: limit,
            where,
        }),
        prisma.libraryItem.count({ where }),
    ]);

    return {
        items: items.map(toLibraryItemWithCollections),
        total,
    };
}

interface GetLibraryItemArgs {
    itemId: string;
    userId: string;
}

export async function getLibraryItem(
    args: GetLibraryItemArgs
): Promise<LibraryItemWithCollections | null> {
    const item = await prisma.libraryItem.findFirst({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        where: { id: args.itemId, userId: args.userId },
    });

    return item ? toLibraryItemWithCollections(item) : null;
}

interface ListCollectionsArgs {
    userId: string;
}

export async function listCollections(
    args: ListCollectionsArgs
): Promise<LibraryCollectionSummary[]> {
    const collections = await prisma.collection.findMany({
        include: {
            _count: {
                select: { items: true },
            },
            items: {
                select: { source: true },
            },
        },
        orderBy: { name: SORT_ASC },
        take: COLLECTION_LIST_LIMIT_MAX,
        where: { userId: args.userId },
    });

    return collections.map((collection) =>
        toLibraryCollectionSummary(collection)
    );
}

/**
 * Disables smart collections by pausing the seeded automation.
 *
 * The built-in automation is the durable preference source; pending runs are
 * deleted to match `pauseAutomation` semantics.
 */
export async function disableSmartCollectionsForUser(
    userId: string
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const automation = await tx.automation.findFirst({
            select: { id: true },
            where: {
                templateKey: AutomationTemplateKey.smart_collections,
                userId,
            },
        });

        if (!automation) {
            return;
        }

        await tx.automation.update({
            data: {
                nextRunAtUtc: null,
                status: AutomationStatus.paused,
            },
            where: { id: automation.id },
        });
        await tx.automationRun.deleteMany({
            where: {
                automationId: automation.id,
                status: AutomationRunStatus.pending,
            },
        });
    });
}

export function countLibraryItems(args: { userId: string }): Promise<number> {
    return prisma.libraryItem.count({
        where: {
            kind: { not: ITEM_KIND_FOLDER },
            userId: args.userId,
        },
    });
}

export function listLibraryItemSources(args: {
    userId: string;
}): Promise<Array<{ source: LibraryItemSource }>> {
    return prisma.libraryItem.findMany({
        distinct: ["source"],
        select: { source: true },
        where: {
            kind: { not: ITEM_KIND_FOLDER },
            userId: args.userId,
        },
    });
}

export async function getLibraryItems(args: {
    hasAccess: boolean;
    limit?: number;
    userId: string;
}): Promise<{
    itemSources: Array<{ source: LibraryItemSource }>;
    items: LibraryItemWithCollections[];
    lockedItemCount: number;
    totalItemCount: number;
}> {
    const itemWhere: Prisma.LibraryItemWhereInput = {
        kind: { not: ITEM_KIND_FOLDER },
        userId: args.userId,
    };

    const limit = Math.min(
        args.limit ?? LIBRARY_ITEMS_PAGE_LIMIT_DEFAULT,
        LIBRARY_ITEMS_PAGE_LIMIT_MAX
    );

    if (args.hasAccess) {
        const [items, totalItemCount, itemSources] = await Promise.all([
            prisma.libraryItem.findMany({
                include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
                orderBy: [
                    { scrapedAt: SORT_DESC },
                    { updatedAt: SORT_DESC },
                    { id: SORT_DESC },
                ],
                take: limit,
                where: itemWhere,
            }),
            prisma.libraryItem.count({ where: itemWhere }),
            prisma.libraryItem.findMany({
                distinct: ["source"],
                select: { source: true },
                where: itemWhere,
            }),
        ]);

        return {
            itemSources,
            items: items.map(toLibraryItemWithCollections),
            lockedItemCount: Math.max(totalItemCount - items.length, 0),
            totalItemCount,
        };
    }

    const [items, totalItemCount, itemSources] = await Promise.all([
        prisma.libraryItem.findMany({
            include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
            orderBy: [
                { scrapedAt: SORT_DESC },
                { updatedAt: SORT_DESC },
                { id: SORT_DESC },
            ],
            take: Math.min(limit, FREE_LIBRARY_PREVIEW_ITEMS),
            where: itemWhere,
        }),
        prisma.libraryItem.count({ where: itemWhere }),
        prisma.libraryItem.findMany({
            distinct: ["source"],
            select: { source: true },
            where: itemWhere,
        }),
    ]);

    return {
        itemSources,
        items: items.map(toLibraryItemWithCollections),
        lockedItemCount: Math.max(totalItemCount - items.length, 0),
        totalItemCount,
    };
}
