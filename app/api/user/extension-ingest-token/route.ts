import { requireSessionUserId } from "@/lib/integrations/route-utils";
import { prisma } from "@/prisma";
import { nanoid } from "nanoid";

export async function GET() {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const user = await prisma.user.findUnique({
        select: { extensionIngestToken: true },
        where: { id: userId },
    });

    if (user?.extensionIngestToken) {
        return Response.json({ token: user.extensionIngestToken });
    }

    const token = nanoid(48);
    await prisma.user.update({
        data: { extensionIngestToken: token },
        where: { id: userId },
    });

    return Response.json({ token });
}

export async function POST() {
    const sessionResult = await requireSessionUserId();
    if (sessionResult instanceof Response) {
        return sessionResult;
    }
    const { userId } = sessionResult;

    const token = nanoid(48);
    await prisma.user.update({
        data: { extensionIngestToken: token },
        where: { id: userId },
    });

    return Response.json({ token });
}
