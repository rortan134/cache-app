import type {
    LibraryItem,
    LibraryItemPreview,
    Prisma,
} from "@/prisma/client/client";
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";
import * as z from "zod";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface LibraryCollectionTag {
    createdAt: Date;
    description: string | null;
    id: string;
    name: string;
    priority: CollectionPriority;
    sharedAt: Date | null;
    shareId: string | null;
    updatedAt: Date;
}

export interface LibraryCollectionSummary extends LibraryCollectionTag {
    itemCount: number;
    sources: LibraryItemSource[];
}

export interface LibraryItemWithCollections extends LibraryItem {
    collections: LibraryCollectionTag[];
    preview: LibraryItemPreview | null;
}

export interface LibraryCollectionTagRecord {
    createdAt: Date;
    description: string | null;
    id: string;
    name: string;
    priority: LibraryCollectionTag["priority"];
    sharedAt: Date | null;
    shareId: string | null;
    updatedAt: Date;
}

export interface LibraryCollectionSummaryRecord
    extends LibraryCollectionTagRecord {
    _count: {
        items: number;
    };
    items: Array<{
        source: LibraryItemSource;
    }>;
}

// ---------------------------------------------------------------------------
// Shared action error shapes
// ---------------------------------------------------------------------------

export interface ActionError {
    message: string;
    status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
}

export interface ActionErrorWithDuplicate {
    message: string;
    status: "DUPLICATE" | "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
}

export interface ActionErrorWithoutNotFound {
    message: string;
    status: "ERROR" | "INVALID" | "UNAUTHORIZED";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const COLLECTION_NAME_LENGTH_MAX = 64;

export const collectionNameSchema = z
    .string()
    .trim()
    .min(1, "Enter a collection name.")
    .max(
        COLLECTION_NAME_LENGTH_MAX,
        `Collection names can be up to ${COLLECTION_NAME_LENGTH_MAX} characters.`
    );

// ---------------------------------------------------------------------------
// Prisma selections
// ---------------------------------------------------------------------------

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
    preview: true,
} as const;

export const LIBRARY_ITEM_COLLECTIONS_SELECT = {
    collections: {
        orderBy: {
            name: "asc",
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
    id: true,
} as const satisfies Prisma.LibraryItemSelect;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

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
        itemCount: collection._count.items,
        sources: Array.from(
            new Set(collection.items.map((item) => item.source))
        ),
    };
}

export function toLibraryCollectionSummaryFromTagRecord(
    collection: LibraryCollectionTagRecord,
    items: Array<{ source: LibraryItemSource }>
): LibraryCollectionSummary {
    return {
        ...toLibraryCollectionTag(collection),
        itemCount: items.length,
        sources: Array.from(new Set(items.map((item) => item.source))),
    };
}

export function toLibraryItemWithCollections(
    item: Prisma.LibraryItemGetPayload<{
        include: typeof LIBRARY_ITEM_COLLECTIONS_INCLUDE;
    }>
): LibraryItemWithCollections {
    return {
        ...item,
        collections: item.collections.map(toLibraryCollectionTag),
    };
}
