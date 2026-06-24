import { requireRouteUserId } from "@/lib/auth/session";
import { extensionTokenCorsHeaders } from "@/lib/integrations/extension-ingest/route";
import {
    getOrCreateExtensionIngestToken,
    rotateExtensionIngestToken,
} from "@/lib/integrations/extension-ingest/service";

export function OPTIONS(request: Request) {
    return new Response(null, {
        headers: extensionTokenCorsHeaders(request),
        status: 204,
    });
}

export async function GET(request: Request) {
    const cors = extensionTokenCorsHeaders(request);
    const session = await requireRouteUserId({ headers: cors });
    if (session instanceof Response) {
        return session;
    }
    const { userId } = session;

    const token = await getOrCreateExtensionIngestToken({ userId });
    return Response.json({ token }, { headers: cors });
}

export async function POST(request: Request) {
    const cors = extensionTokenCorsHeaders(request);
    const session = await requireRouteUserId({ headers: cors });
    if (session instanceof Response) {
        return session;
    }
    const { userId } = session;

    const token = await rotateExtensionIngestToken({ userId });
    return Response.json({ token }, { headers: cors });
}
