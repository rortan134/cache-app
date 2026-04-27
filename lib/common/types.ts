import type { LibraryItem } from "@/prisma/client/client";
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";

export interface LibraryCollectionTag {
    createdAt: Date;
    description?: string | null;
    id: string;
    name: string;
    priority: CollectionPriority;
    sharedAt: Date | null;
    shareId: string | null;
    updatedAt: Date;
}

export interface LibraryCollectionSummary extends LibraryCollectionTag {
    description: string | null;
    itemCount: number;
    sources: LibraryItemSource[];
}

export interface LibraryItemWithCollections extends LibraryItem {
    collections: LibraryCollectionTag[];
}
