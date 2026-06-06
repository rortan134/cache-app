import {
    extensionIngestCorsHeaders,
    runExtensionIngestImport,
} from "@/lib/integrations/extension-ingest/route";
import {
    importTiktokSaved,
    tiktokSavedBodySchema,
} from "@/lib/integrations/tiktok/service";
import { scheduleAutoTagging } from "@/lib/intelligence/schedule";

export function OPTIONS(request: Request) {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(request),
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
