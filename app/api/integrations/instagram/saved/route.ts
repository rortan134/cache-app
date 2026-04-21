import {
    extensionIngestCorsHeaders,
    normalizeLibrarySource,
    parseBearerToken,
    resolveExtensionIngestUserId,
    upsertLibraryItemsFromIngest,
    type IngestItemInput,
} from "@/lib/integrations/shared/extension-ingest";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
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

    const source = normalizeLibrarySource(parsed.data.source);
    const result = await upsertLibraryItemsFromIngest(
        userId,
        source,
        parsed.data.items as IngestItemInput[]
    );

    if (result.smartCollectionItemIds.length > 0) {
        after(async () => {
            await autoTagLibraryItemsByIds({
                itemIds: result.smartCollectionItemIds,
                userId,
            });
        });
    }

    return Response.json(
        {
            ok: true,
            received: parsed.data.items.length,
            upserted: result.upsertedCount,
        },
        { headers: cors }
    );
}
