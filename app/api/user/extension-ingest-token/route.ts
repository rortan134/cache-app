import { extensionTokenCorsHeaders } from "@/lib/integrations/extension-ingest";
import {
    getOrCreateExtensionIngestToken,
    requireSessionUserId,
    rotateExtensionIngestToken,
} from "@/lib/auth/service";

export function OPTIONS(request: Request) {
    return new Response(null, {
        headers: extensionTokenCorsHeaders(request),
        status: 204,
    });
}

export async function GET(request: Request) {
    const cors = extensionTokenCorsHeaders(request);
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: cors, status: 401 }
        );
    }
    const { userId } = sessionResult;

    const token = await getOrCreateExtensionIngestToken({ userId });
    return Response.json({ token }, { headers: cors });
}

export async function POST(request: Request) {
    const cors = extensionTokenCorsHeaders(request);
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: cors, status: 401 }
        );
    }
    const { userId } = sessionResult;

    const token = await rotateExtensionIngestToken({ userId });
    return Response.json({ token }, { headers: cors });
}
