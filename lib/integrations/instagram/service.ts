import {
    normalizeLibrarySource,
    upsertLibraryItemsFromIngest,
    type IngestItemInput,
} from "@/lib/integrations/shared/extension-ingest";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";

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

    if (result.smartCollectionItemIds.length > 0) {
        autoTagLibraryItemsByIds({
            itemIds: result.smartCollectionItemIds,
            userId,
        }).catch(console.error);
    }

    return {
        received: items.length,
        upserted: result.upsertedCount,
    };
}
