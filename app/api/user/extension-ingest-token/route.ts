import {
    getOrCreateExtensionIngestToken,
    requireSessionUserId,
    rotateExtensionIngestToken,
} from "@/lib/auth/service";

export async function GET() {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const token = await getOrCreateExtensionIngestToken({ userId });
    return Response.json({ token });
}

export async function POST() {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const token = await rotateExtensionIngestToken({ userId });
    return Response.json({ token });
}
