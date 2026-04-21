import type { LibraryItem } from "@/prisma/client/client";
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";

export interface LibraryCollectionTag {
    readonly createdAt: Date;
    readonly description?: string | null;
    readonly id: string;
    readonly name: string;
    readonly priority: CollectionPriority;
    readonly sharedAt: Date | null;
    readonly shareId: string | null;
    readonly updatedAt: Date;
}

export interface LibraryCollectionSummary extends LibraryCollectionTag {
    readonly description: string | null;
    readonly itemCount: number;
    readonly sources: LibraryItemSource[];
}

export interface LibraryItemWithCollections extends LibraryItem {
    readonly collections: LibraryCollectionTag[];
}
