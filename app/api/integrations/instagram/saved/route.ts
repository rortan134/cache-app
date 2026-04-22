import { autoTagLibraryItemsByIds } from "@/lib/collections/smart-collections";
import { importInstagramSaved } from "@/lib/integrations/instagram/service";
import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
    type IngestItemInput,
} from "@/lib/integrations/shared/extension-ingest";
import { after } from "next/server";
import * as z from "zod";

const itemSchema = z
    .object({
        browserProfileId: z.string().optional(),
        caption: z.string().optional(),
        id: z.string().optional(),
        kind: z.enum(["bookmark", "folder"]).optional(),
        parentExternalId: z.string().optional(),
        postedAt: z.string().optional(),
        scrapedAt: z.string().optional(),
        shortcode: z.string().optional(),
        sourceDeviceId: z.string().optional(),
        sourceDeviceName: z.string().optional(),
        sourceMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
        thumbnailUrl: z.string().optional(),
        url: z.string(),
    })
    .refine((row) => Boolean(row.shortcode || row.id), {
        message:
            "Each item needs shortcode (Instagram), id (TikTok), or id (Chrome)",
    });

const bodySchema = z.object({
    items: z.array(itemSchema),
    source: z.string().optional(),
    syncedAt: z.string().optional(),
});

/**
 * Extension ingest: Bearer token must match `User.extensionIngestToken`, or (dev)
 * `INSTAGRAM_SAVED_INGEST_TOKEN` + `EXTENSION_FALLBACK_USER_ID`.
 */
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

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON" },
            { headers: cors, status: 400 }
        );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return Response.json(
            { error: parsed.error.flatten() },
            { headers: cors, status: 400 }
        );
    }

    try {
        const result = await importInstagramSaved({
            items: parsed.data.items as IngestItemInput[],
            source: parsed.data.source,
            userId,
        });

        const { smartCollectionItemIds, ...response } = result;

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
                ok: true,
                ...response,
            },
            { headers: cors }
        );
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import items from Instagram/TikTok",
            },
            { headers: cors, status: 500 }
        );
    }
}
