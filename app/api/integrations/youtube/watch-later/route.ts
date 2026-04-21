import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
} from "@/lib/integrations/shared/extension-ingest";
import { importLibraryItemSnapshot } from "@/lib/integrations/shared/snapshot";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { LibraryItemSource } from "@/prisma/client/enums";
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

function parseDate(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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

    const syncedAt = new Date();
    const result = await importLibraryItemSnapshot({
        browserProfileIdsToSync: [parsed.data.browserProfileId ?? "default"],
        items: parsed.data.items.map((item) => ({
            browserProfileId: parsed.data.browserProfileId,
            caption: item.title ?? null,
            externalId: item.videoId,
            postedAt: parseDate(item.publishedAt),
            scrapedAt: parseDate(item.scrapedAt) ?? syncedAt,
            sourceDeviceId: parsed.data.sourceDeviceId ?? null,
            sourceDeviceName: parsed.data.sourceDeviceName ?? null,
            sourceMetadata: {
                youtube: {
                    availability: item.availability ?? null,
                    channelId: item.channelId ?? null,
                    channelName: item.channelName ?? null,
                    duration: item.duration ?? null,
                    importTimestamp: syncedAt.toISOString(),
                    isLive: item.availability === "live",
                    isUpcoming: item.availability === "upcoming",
                    playlistItemId: item.playlistItemId ?? null,
                    position: item.position ?? null,
                    videoId: item.videoId,
                },
            },
            thumbnailUrl: item.thumbnailUrl ?? null,
            url:
                item.videoUrl ??
                `https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}`,
        })),
        snapshotComplete: parsed.data.snapshotComplete,
        source: LibraryItemSource.youtube_watch_later,
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
}
