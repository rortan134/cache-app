import "server-only";

import {
    extensionIngestCorsHeaders,
    parseBearerToken,
    resolveExtensionIngestUserId,
} from "@/lib/integrations/extension-ingest";

/**
 * Authenticates an extension ingest request by Bearer token.
 *
 * @returns The CORS headers and resolved user id, or a 401 Response if authentication fails.
 */
export async function authenticateExtensionIngest(
    request: Request
): Promise<{ cors: HeadersInit; userId: string } | Response> {
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

    return { cors, userId };
}
