import {
    extensionIngestCorsHeaders,
    runExtensionIngestImport,
} from "@/lib/integrations/extension-ingest";
import {
    importYoutubeWatchLaterSnapshot,
    youtubeWatchLaterBodySchema,
} from "@/lib/integrations/youtube/service";
import { scheduleAutoTagging } from "@/lib/intelligence/schedule";

export function OPTIONS(request: Request) {
    return new Response(null, {
        headers: extensionIngestCorsHeaders(request),
        status: 204,
    });
}

export function POST(request: Request) {
    return runExtensionIngestImport(request, {
        bodySchema: youtubeWatchLaterBodySchema,
        genericError: "Failed to import YouTube Watch Later snapshot",
        importFn: ({ body, userId }) =>
            importYoutubeWatchLaterSnapshot({
                ...body,
                userId,
            }),
        onSmartCollectionItemIds: scheduleAutoTagging,
        response: ({ body, result }) => ({
            ...result,
            received: body.items.length,
            snapshotComplete: body.snapshotComplete,
        }),
    });
}
