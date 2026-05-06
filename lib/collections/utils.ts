import type { LibraryItem, Prisma } from "@/prisma/client/client";
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";
import {
    FALLBACK_URL,
    ITEM_KIND_BOOKMARK,
    SORT_ASC,
} from "@/lib/common/constants";
import { isCobaltHost, toValidUrl } from "@/lib/common/url";
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
            name: SORT_ASC,
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
} as const;

export const LIBRARY_ITEM_COLLECTIONS_SELECT = {
    collections: {
        orderBy: {
            name: SORT_ASC,
        },
        select: LIBRARY_COLLECTION_TAG_SELECT,
    },
    id: true,
} as const satisfies Prisma.LibraryItemSelect;

// ---------------------------------------------------------------------------
// Shared status maps
// ---------------------------------------------------------------------------

export const STATUS_MAP_NOT_FOUND = {
    not_found: "NOT_FOUND",
} as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

export function uniqueLibraryItemSources(
    items: readonly { source: LibraryItemSource }[]
): LibraryItemSource[] {
    return Array.from(new Set(items.map((item) => item.source)));
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
        sources: uniqueLibraryItemSources(collection.items),
    };
}

export function toLibraryCollectionSummaryFromTagRecord(
    collection: LibraryCollectionTagRecord,
    items: Array<{ source: LibraryItemSource }>
): LibraryCollectionSummary {
    return {
        ...toLibraryCollectionTag(collection),
        itemCount: items.length,
        sources: uniqueLibraryItemSources(items),
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

/**
 * Returns the API proxy URL for a bookmark's preview image.
 * Notes and invalid URLs return null.
 */
export function itemPreviewImageUrl(item: {
    kind: string;
    url: string;
}): string | null {
    if (item.kind !== ITEM_KIND_BOOKMARK) {
        return null;
    }

    const href = toValidUrl(item.url);
    if (href === FALLBACK_URL) {
        return null;
    }

    return `/api/preview?url=${encodeURIComponent(href)}`;
}

/**
 * Returns the API proxy URL for a bookmark's video preview.
 * Only supported hosts (YouTube, X, Instagram, TikTok) return a URL.
 */
export function itemPreviewVideoUrl(item: {
    kind: string;
    url: string;
}): string | null {
    if (item.kind !== ITEM_KIND_BOOKMARK) {
        return null;
    }

    const href = toValidUrl(item.url);
    if (href === FALLBACK_URL) {
        return null;
    }

    if (!isCobaltHost(href)) {
        return null;
    }

    return `/api/preview?url=${encodeURIComponent(href)}&type=video`;
}
