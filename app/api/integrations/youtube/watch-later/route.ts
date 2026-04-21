import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
} from "@/lib/integrations/shared/extension-ingest";
import { importYoutubeWatchLaterSnapshot } from "@/lib/integrations/youtube/service";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { after } from "next/server";
import * as z from "zod";

const optionalStringField = z
    .string()
    .transform((value) => value.trim())
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrlField = z
    .string()
    .transform((value) => value.trim())
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .pipe(z.url().optional());

const youtubeWatchLaterItemSchema = z.object({
    availability: optionalStringField,
    channelId: optionalStringField,
    channelName: optionalStringField,
    duration: optionalStringField,
    playlistItemId: optionalStringField,
    position: z.number().int().nonnegative().optional(),
    publishedAt: optionalStringField,
    scrapedAt: optionalStringField,
    thumbnailUrl: optionalUrlField,
    title: optionalStringField,
    videoId: z.string().min(1),
    videoUrl: optionalUrlField,
});

const bodySchema = z.object({
    browserProfileId: z.string().min(1).optional(),
    items: z.array(youtubeWatchLaterItemSchema),
    snapshotComplete: z.boolean().default(false),
    sourceDeviceId: z.string().optional(),
    sourceDeviceName: z.string().optional(),
});

export function OPTIONS() {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(),
        status: 204,
    });
}

export async function POST(request: Request) {
    const cors = extensionIngestCorsHeaders();
    const bearer = parseBearerToken(request);
    if (!bearer) {
        return Response.json(
            { error: "Missing Authorization: Bearer <extension ingest token>" },
            { headers: cors, status: 401 }
        );
    }

    const userId = await resolveExtensionIngestUserId(bearer);
    if (!userId) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: cors, status: 401 }
        );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return Response.json(
            { error: parsed.error.flatten() },
            { headers: cors, status: 400 }
        );
    }

    try {
        const result = await importYoutubeWatchLaterSnapshot({
            browserProfileId: parsed.data.browserProfileId,
            items: parsed.data.items,
            snapshotComplete: parsed.data.snapshotComplete,
            sourceDeviceId: parsed.data.sourceDeviceId,
            sourceDeviceName: parsed.data.sourceDeviceName,
            userId,
        });

        const { smartCollectionItemIds, ...snapshotResult } = result;

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId,
                });
            });
        }

        return Response.json(
            {
                ...snapshotResult,
                ok: true,
                received: parsed.data.items.length,
                snapshotComplete: parsed.data.snapshotComplete,
            },
            { headers: cors }
        );
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import YouTube Watch Later snapshot",
            },
            { headers: cors, status: 500 }
        );
    }
}
