import type { CollectionPreview } from "@/lib/collections/service";
import { CollectionThumbnailGrid } from "./collection-thumbnail-grid";

export function CollectionsGrid({
    collections,
}: {
    collections: CollectionPreview[];
}) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((collection) => (
                <CollectionCard collection={collection} key={collection.id} />
            ))}
        </div>
    );
}

function CollectionCard({ collection }: { collection: CollectionPreview }) {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
            <CollectionThumbnailGrid urls={collection.previewImageUrls} />
            <div className="flex flex-col gap-1 p-3">
                <h3
                    className="truncate font-medium text-foreground text-sm"
                    title={collection.name}
                >
                    {collection.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                </p>
            </div>
        </div>
    );
}
