import "server-only";

import {
    upsertLibraryItemsFromIngest,
    type IngestItemInput,
} from "@/lib/integrations/extension-ingest";
import { LibraryItemSource } from "@/prisma/client/enums";
import * as z from "zod";

export const instagramSavedItemSchema = z
    .object({
        browserProfileId: z.string().optional(),
        caption: z.string().optional(),
        kind: z.enum(["bookmark", "folder"]).optional(),
        parentExternalId: z.string().optional(),
        postedAt: z.string().optional(),
        scrapedAt: z.string().optional(),
        shortcode: z.string().optional(),
        sourceDeviceId: z.string().optional(),
        sourceDeviceName: z.string().optional(),
        sourceMetadata: z.record(z.string(), z.json()).nullable().optional(),
        url: z.string(),
    })
    .refine((row) => Boolean(row.shortcode), {
        message: "Each item needs a shortcode",
    });

export const instagramSavedBodySchema = z.object({
    items: z.array(instagramSavedItemSchema),
    syncedAt: z.string().optional(),
});

export async function importInstagramSaved(args: {
    items: z.infer<typeof instagramSavedItemSchema>[];
    userId: string;
}) {
    const { items, userId } = args;

    const ingestItems: IngestItemInput[] = items.map((item) => ({
        ...item,
        externalId: item.shortcode,
    }));

    const result = await upsertLibraryItemsFromIngest(
        userId,
        LibraryItemSource.instagram,
        ingestItems
    );

    return {
        received: items.length,
        smartCollectionItemIds: result.smartCollectionItemIds,
        upserted: result.upsertedCount,
    };
}
