import "server-only";

import {
    normalizeLibrarySource,
    upsertLibraryItemsFromIngest,
    type IngestItemInput,
} from "@/lib/integrations/extension-ingest";

export async function importInstagramSaved(args: {
    items: IngestItemInput[];
    source?: string;
    userId: string;
}) {
    const { items, source, userId } = args;

    const normalizedSource = normalizeLibrarySource(source);
    const result = await upsertLibraryItemsFromIngest(
        userId,
        normalizedSource,
        items
    );

    return {
        received: items.length,
        smartCollectionItemIds: result.smartCollectionItemIds,
        upserted: result.upsertedCount,
    };
}
