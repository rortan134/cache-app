import {
    authenticateExtensionIngest,
    extensionIngestCorsHeaders,
} from "@/lib/integrations/extension-ingest";
import { scheduleAutoTagging } from "@/lib/collections/intelligence/schedule";
import {
    importTiktokSaved,
    tiktokSavedBodySchema,
} from "@/lib/integrations/tiktok/service";

export function OPTIONS() {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(),
        status: 204,
    });
}

export async function POST(request: Request) {
    const authResult = await authenticateExtensionIngest(request);
    if (authResult instanceof Response) {
        return authResult;
    }
    const { cors, userId } = authResult;

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON" },
            { headers: cors, status: 400 }
        );
    }

    const parsed = tiktokSavedBodySchema.safeParse(json);
    if (!parsed.success) {
        return Response.json(
            { error: parsed.error.flatten() },
            { headers: cors, status: 400 }
        );
    }

    try {
        const result = await importTiktokSaved({
            items: parsed.data.items,
            userId,
        });

        const { smartCollectionItemIds, ...response } = result;
        scheduleAutoTagging(userId, smartCollectionItemIds);

        return Response.json({ ok: true, ...response }, { headers: cors });
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to import items from TikTok",
            },
            { headers: cors, status: 500 }
        );
    }
}
