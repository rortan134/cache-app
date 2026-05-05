import { scheduleAutoTagging } from "@/lib/collections/intelligence/schedule";
import {
    extensionIngestCorsHeaders,
    runExtensionIngestImport,
} from "@/lib/integrations/extension-ingest";
import {
    importInstagramSaved,
    instagramSavedBodySchema,
} from "@/lib/integrations/instagram/service";

export function OPTIONS() {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(),
        status: 204,
    });
}

export function POST(request: Request) {
    return runExtensionIngestImport(request, {
        bodySchema: instagramSavedBodySchema,
        genericError: "Failed to import items from Instagram",
        importFn: ({ body, userId }) =>
            importInstagramSaved({
                items: body.items,
                userId,
            }),
        onSmartCollectionItemIds: scheduleAutoTagging,
    });
}
