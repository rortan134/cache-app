import "server-only";

import {
    LIBRARY_COLLECTION_TAG_SELECT,
    toLibraryCollectionTag,
} from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import { prisma } from "@/prisma";
import { LibraryItemKind, type LibraryItemSource } from "@/prisma/client/enums";
import { Prisma } from "@/prisma/client/client";
import { nanoid } from "nanoid";
import { CollectionShareError } from "./error";

const log = createLogger("collection-sharing:service");
const COLLECTION_SHARE_ID_LENGTH = 12;
const COLLECTION_SHARE_ID_ATTEMPTS = 3;

interface PublicCollectionShareItem {
    readonly caption: string | null;
    readonly createdAt: Date;
    readonly id: string;
    readonly kind: LibraryItemKind;
    readonly noteContentText: string | null;
    readonly postedAt: Date | null;
    readonly scrapedAt: Date | null;
    readonly source: LibraryItemSource;
    readonly url: string;
}

interface PublicCollectionShare {
    readonly description: string | null;
    readonly itemCount: number;
    readonly items: PublicCollectionShareItem[];
    readonly name: string;
    readonly ownerName: string;
    readonly sharedAt: Date;
    readonly shareId: string;
    readonly updatedAt: Date;
}

function findOwnedCollectionTag(args: {
    collectionId: string;
    userId: string;
}) {
    return prisma.collection.findFirst({
        select: LIBRARY_COLLECTION_TAG_SELECT,
        where: {
            id: args.collectionId,
            userId: args.userId,
        },
    });
}

async function requireOwnedCollectionTag(args: {
    collectionId: string;
    operation: string;
    userId: string;
}) {
    const collection = await findOwnedCollectionTag(args);
    if (!collection) {
        throw new CollectionShareError({
            code: "not_found",
            message: "That collection is no longer available.",
            operation: args.operation,
        });
    }

    return collection;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

export async function enablePublicCollectionShare(input: {
    collectionId: string;
    userId: string;
}) {
    const existingCollection = await requireOwnedCollectionTag({
        collectionId: input.collectionId,
        operation: "enablePublicCollectionShare",
        userId: input.userId,
    });

    if (existingCollection.shareId && existingCollection.sharedAt) {
        return toLibraryCollectionTag(existingCollection);
    }

    for (
        let attempt = 0;
        attempt < COLLECTION_SHARE_ID_ATTEMPTS;
        attempt += 1
    ) {
        try {
            const sharedCollection = await prisma.collection.update({
                data: {
                    sharedAt: new Date(),
                    shareId: nanoid(COLLECTION_SHARE_ID_LENGTH),
                },
                select: LIBRARY_COLLECTION_TAG_SELECT,
                where: {
                    id: existingCollection.id,
                },
            });

            log.info("Enabled public collection share", {
                collectionId: sharedCollection.id,
                shareId: sharedCollection.shareId,
                userId: input.userId,
            });

            return toLibraryCollectionTag(sharedCollection);
        } catch (error) {
            if (isPrismaUniqueConstraintError(error)) {
                continue;
            }

            throw error;
        }
    }

    throw new CollectionShareError({
        code: "share_generation_failed",
        message: "We couldn't create a public link right now.",
        operation: "enablePublicCollectionShare",
    });
}

export async function disablePublicCollectionShare(input: {
    collectionId: string;
    userId: string;
}) {
    const existingCollection = await requireOwnedCollectionTag({
        collectionId: input.collectionId,
        operation: "disablePublicCollectionShare",
        userId: input.userId,
    });

    if (!(existingCollection.shareId || existingCollection.sharedAt)) {
        return toLibraryCollectionTag(existingCollection);
    }

    const disabledCollection = await prisma.collection.update({
        data: {
            sharedAt: null,
            shareId: null,
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
        where: {
            id: existingCollection.id,
        },
    });

    log.info("Disabled public collection share", {
        collectionId: disabledCollection.id,
        userId: input.userId,
    });

    return toLibraryCollectionTag(disabledCollection);
}

export async function getPublicCollectionShareById(
    shareId: string
): Promise<PublicCollectionShare | null> {
    const normalizedShareId = shareId.trim();
    if (normalizedShareId.length === 0) {
        return null;
    }

    const sharedCollection = await prisma.collection.findFirst({
        select: {
            description: true,
            items: {
                orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
                select: {
                    caption: true,
                    createdAt: true,
                    id: true,
                    kind: true,
                    noteContentText: true,
                    postedAt: true,
                    scrapedAt: true,
                    source: true,
                    url: true,
                },
                where: {
                    kind: {
                        not: LibraryItemKind.folder,
                    },
                },
            },
            name: true,
            sharedAt: true,
            shareId: true,
            updatedAt: true,
            user: {
                select: {
                    name: true,
                },
            },
        },
        where: {
            shareId: normalizedShareId,
        },
    });

    if (!(sharedCollection?.shareId && sharedCollection.sharedAt)) {
        return null;
    }

    return {
        description: sharedCollection.description,
        itemCount: sharedCollection.items.length,
        items: sharedCollection.items,
        name: sharedCollection.name,
        ownerName: sharedCollection.user.name,
        sharedAt: sharedCollection.sharedAt,
        shareId: sharedCollection.shareId,
        updatedAt: sharedCollection.updatedAt,
    };
}
