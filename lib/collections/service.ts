import "server-only";

import {
    LIBRARY_COLLECTION_TAG_SELECT,
    toLibraryCollectionSummary,
    toLibraryCollectionSummaryFromTagRecord,
    toLibraryCollectionTag,
    type LibraryCollectionTagRecord,
} from "@/lib/collections/utils";
import {
    resolveCobaltDownloadUrl,
    resolveCobaltPreview,
} from "@/lib/common/cobalt";
import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";
import {
    getIncrementedName,
    normalizeCollectionName,
} from "@/lib/common/strings";
import { isHttpUrl, toValidUrl } from "@/lib/common/url";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
} from "@/lib/common/types";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import type {
    CollectionPriority,
    LibraryItemPreviewMediaType,
    LibraryItemSource,
} from "@/prisma/client/enums";
import {
    LibraryItemPreviewMediaType as PreviewMediaType,
    LibraryItemPreviewProviderStatus as PreviewProviderStatus,
} from "@/prisma/client/enums";
import { LibraryCollectionError } from "./error";

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

const LIBRARY_ITEM_COLLECTIONS_SELECT = {
    collections: {
        orderBy: {
            name: "asc",
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
    id: true,
} as const satisfies Prisma.LibraryItemSelect;

const PREVIEW_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

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

function buildCollectionNameDuplicate(
    sourceName: string,
    existingNames: string[]
): string {
    const uniqueName = getIncrementedName(sourceName, [...existingNames]);
    return normalizeCollectionName(uniqueName).name;
}

function isPreviewFresh(resolvedAt: Date): boolean {
    return Date.now() - resolvedAt.getTime() < PREVIEW_CACHE_TTL_MS;
}

function toPreviewMediaType(
    value: "gif" | "image" | "unknown" | "video"
): LibraryItemPreviewMediaType {
    switch (value) {
        case "gif":
            return PreviewMediaType.gif;
        case "image":
            return PreviewMediaType.image;
        case "video":
            return PreviewMediaType.video;
        default:
            return PreviewMediaType.unknown;
    }
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

export async function resolveLibraryItemPreview({
    itemId,
    refreshIfMissingVideo,
    userId,
}: {
    itemId: string;
    refreshIfMissingVideo?: boolean;
    userId: string;
}) {
    const item = await prisma.libraryItem.findFirst({
        select: {
            id: true,
            preview: {
                select: {
                    errorCode: true,
                    mediaType: true,
                    providerStatus: true,
                    resolvedAt: true,
                    sourceUrl: true,
                    staticImageUrl: true,
                    videoPreviewUrl: true,
                },
            },
            url: true,
        },
        where: {
            id: itemId,
            userId,
        },
    });

    if (!item) {
        throwCollectionNotFound(
            "resolveLibraryItemPreview",
            "We couldn't find that saved item to preview it."
        );
    }

    const existingStaticImageUrl = toUsableStaticPreviewUrl(
        item.preview?.staticImageUrl
    );
    const existingVideoPreviewUrl = item.preview?.videoPreviewUrl ?? null;

    const shouldUseFreshPreview =
        item.preview &&
        isPreviewFresh(item.preview.resolvedAt) &&
        !(refreshIfMissingVideo && !existingVideoPreviewUrl);

    if (item.preview && shouldUseFreshPreview) {
        return {
            errorCode: item.preview.errorCode,
            libraryItemId: item.id,
            mediaType: item.preview.mediaType,
            providerStatus: item.preview.providerStatus,
            sourceUrl: item.preview.sourceUrl,
            staticImageUrl: existingStaticImageUrl,
            videoPreviewUrl: existingVideoPreviewUrl,
        };
    }

    const normalizedItemUrl = toValidUrl(item.url);
    if (!isHttpUrl(normalizedItemUrl)) {
        const invalidPayload = {
            errorCode: "invalid_url" as const,
            mediaType: PreviewMediaType.unknown,
            providerStatus: PreviewProviderStatus.unavailable,
            sourceUrl: item.url,
            staticImageUrl: existingStaticImageUrl,
            videoPreviewUrl: existingVideoPreviewUrl,
        };

        const preview = await prisma.libraryItemPreview.upsert({
            create: {
                ...invalidPayload,
                libraryItemId: item.id,
                resolvedAt: new Date(),
            },
            update: {
                ...invalidPayload,
                resolvedAt: new Date(),
            },
            where: {
                libraryItemId: item.id,
            },
        });

        return {
            errorCode: preview.errorCode,
            libraryItemId: item.id,
            mediaType: preview.mediaType,
            providerStatus: preview.providerStatus,
            sourceUrl: preview.sourceUrl,
            staticImageUrl: preview.staticImageUrl,
            videoPreviewUrl: preview.videoPreviewUrl,
        };
    }

    const resolved = await resolveCobaltPreview(normalizedItemUrl);
    const resolvedAt = new Date();
    const previewData =
        resolved.status === "SUCCESS"
            ? {
                  errorCode: null,
                  mediaType: toPreviewMediaType(resolved.mediaType),
                  providerStatus: PreviewProviderStatus.success,
                  sourceUrl: resolved.sourceUrl,
                  staticImageUrl:
                      resolved.staticImageUrl ?? existingStaticImageUrl,
                  videoPreviewUrl:
                      resolved.videoPreviewUrl ?? existingVideoPreviewUrl,
              }
            : {
                  errorCode: resolved.errorCode,
                  mediaType: PreviewMediaType.unknown,
                  providerStatus:
                      resolved.status === "UNAVAILABLE"
                          ? PreviewProviderStatus.unavailable
                          : PreviewProviderStatus.error,
                  sourceUrl: normalizedItemUrl,
                  staticImageUrl: existingStaticImageUrl,
                  videoPreviewUrl: existingVideoPreviewUrl,
              };

    const preview = await prisma.libraryItemPreview.upsert({
        create: {
            ...previewData,
            libraryItemId: item.id,
            resolvedAt,
        },
        update: {
            ...previewData,
            resolvedAt,
        },
        where: {
            libraryItemId: item.id,
        },
    });

    return {
        errorCode: preview.errorCode,
        libraryItemId: item.id,
        mediaType: preview.mediaType,
        providerStatus: preview.providerStatus,
        sourceUrl: preview.sourceUrl,
        staticImageUrl: preview.staticImageUrl,
        videoPreviewUrl: preview.videoPreviewUrl,
    };
}

export async function createCollection({
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

    return await prisma.$transaction(async (tx) => {
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

export async function createCollectionFromItems({
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

    return await prisma.$transaction(async (tx) => {
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
            collection: toLibraryCollectionSummaryFromTagRecord(
                collection,
                matchingItems
            ),
        };
    });
}

export async function deleteCollection({
    collectionId,
    userId,
}: {
    collectionId: string;
    userId: string;
}): Promise<Pick<LibraryCollectionSummary, "id" | "name">> {
    return await prisma.$transaction(async (tx) => {
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

export async function duplicateCollection({
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

        const nextName = buildCollectionNameDuplicate(
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
            collection: toLibraryCollectionSummaryFromTagRecord(
                duplicatedCollection,
                sourceCollection.items
            ),
        };
    });
}

export async function updateCollectionPriority({
    collectionId,
    priority,
    userId,
}: {
    collectionId: string;
    priority: CollectionPriority;
    userId: string;
}): Promise<LibraryCollectionTag> {
    return await prisma.$transaction(async (tx) => {
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

export async function renameCollection({
    collectionId,
    name,
    userId,
}: {
    collectionId: string;
    name: string;
    userId: string;
}): Promise<LibraryCollectionTag> {
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

export async function deleteLibraryItem({
    itemId,
    userId,
}: {
    itemId: string;
    userId: string;
}): Promise<{
    collectionSummaries: LibraryCollectionSummary[];
    itemId: string;
}> {
    return await prisma.$transaction(async (tx) => {
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

export async function updateLibraryItemCollections({
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
    return await prisma.$transaction(async (tx) => {
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
                    set: toCollectionConnections(
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

export async function updateLibraryItemsCollections({
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
    return await prisma.$transaction(async (tx) => {
        const items = await requireLibraryItemsOwnedWithCollections(tx, {
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
                select: LIBRARY_ITEM_COLLECTIONS_SELECT,
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
            collectionSummaries: await findCollectionSummariesOwnedByIds(tx, {
                collectionIds: referencedCollectionIds,
                userId,
            }),
            itemCollections: updatedItems,
        };
    });
}
