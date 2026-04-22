import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
} from "@/lib/common/types";
import type { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";

export const LIBRARY_COLLECTION_TAG_SELECT = {
    createdAt: true,
    description: true,
    id: true,
    name: true,
    priority: true,
    sharedAt: true,
    shareId: true,
    updatedAt: true,
} as const satisfies Prisma.CollectionSelect;

export const LIBRARY_ITEM_COLLECTIONS_INCLUDE = {
    collections: {
        orderBy: {
            name: "asc" as const,
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
} as const;

interface LibraryCollectionTagRecord {
    readonly createdAt: Date;
    readonly description: string | null;
    readonly id: string;
    readonly name: string;
    readonly priority: LibraryCollectionTag["priority"];
    readonly sharedAt: Date | null;
    readonly shareId: string | null;
    readonly updatedAt: Date;
}

interface LibraryCollectionSummaryRecord extends LibraryCollectionTagRecord {
    readonly _count: {
        readonly items: number;
    };
    readonly items: ReadonlyArray<{
        readonly source: LibraryItemSource;
    }>;
}

export function toLibraryCollectionTag(
    collection: LibraryCollectionTagRecord
): LibraryCollectionTag {
    return {
        createdAt: collection.createdAt,
        description: collection.description,
        id: collection.id,
        name: collection.name,
        priority: collection.priority,
        sharedAt: collection.sharedAt,
        shareId: collection.shareId,
        updatedAt: collection.updatedAt,
    };
}

export function toLibraryCollectionSummary(
    collection: LibraryCollectionSummaryRecord
): LibraryCollectionSummary {
    return {
        ...toLibraryCollectionTag(collection),
        description: collection.description,
        itemCount: collection._count.items,
        sources: Array.from(
            new Set(collection.items.map((item) => item.source))
        ),
    };
}
