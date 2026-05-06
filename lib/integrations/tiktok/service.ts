import "server-only";

import {
    upsertLibraryItemsFromIngest,
    type IngestItemInput,
} from "@/lib/integrations/extension-ingest";
import { LibraryItemSource } from "@/prisma/client/enums";
import * as z from "zod";

export const tiktokSavedItemSchema = z
    .object({
        browserProfileId: z.string().optional(),
        caption: z.string().optional(),
        id: z.string().optional(),
        kind: z.enum(["bookmark", "folder"]).optional(),
        parentExternalId: z.string().optional(),
        postedAt: z.string().optional(),
        scrapedAt: z.string().optional(),
        sourceDeviceId: z.string().optional(),
        sourceDeviceName: z.string().optional(),
        sourceMetadata: z.record(z.string(), z.json()).nullable().optional(),
        url: z.string(),
    })
    .refine((row) => Boolean(row.id), {
        message: "Each item needs an id",
    });

export const tiktokSavedBodySchema = z.object({
    items: z.array(tiktokSavedItemSchema),
    syncedAt: z.string().optional(),
});

export async function importTiktokSaved(args: {
    items: z.infer<typeof tiktokSavedItemSchema>[];
    userId: string;
}) {
    const { items, userId } = args;

    const ingestItems: IngestItemInput[] = items.map((item) => ({
        ...item,
        externalId: item.id,
    }));

    const result = await upsertLibraryItemsFromIngest(
        userId,
        LibraryItemSource.tiktok,
        ingestItems
    );

    return {
        received: items.length,
        smartCollectionItemIds: result.smartCollectionItemIds,
        upserted: result.upsertedCount,
    };
}
