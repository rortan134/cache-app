import { scheduleAutoTagging } from "@/lib/collections/intelligence/schedule";
import {
    extensionIngestCorsHeaders,
    runExtensionIngestImport,
} from "@/lib/integrations/extension-ingest";
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

export function POST(request: Request) {
    return runExtensionIngestImport(request, {
        bodySchema: tiktokSavedBodySchema,
        genericError: "Failed to import items from TikTok",
        importFn: ({ body, userId }) =>
            importTiktokSaved({
                items: body.items,
                userId,
            }),
        onSmartCollectionItemIds: scheduleAutoTagging,
    });
}
