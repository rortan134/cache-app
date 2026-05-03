import "server-only";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/prisma";
import { nanoid } from "nanoid";
import { headers } from "next/headers";

/**
 * Resolves the current session user id for API routes.
 *
 * @returns The user id, or a 401 Response if the session is missing.
 */
export async function requireSessionUserId(): Promise<
    { userId: string } | Response
> {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return { userId };
}

/**
 * Returns the user's existing extension ingest token, generating and
 * persisting a new one when none exists.
 */
export async function getOrCreateExtensionIngestToken(args: {
    userId: string;
}): Promise<string> {
    const user = await prisma.user.findUnique({
        select: { extensionIngestToken: true },
        where: { id: args.userId },
    });

    if (user?.extensionIngestToken) {
        return user.extensionIngestToken;
    }

    const token = nanoid(48);
    await prisma.user.update({
        data: { extensionIngestToken: token },
        where: { id: args.userId },
    });

    return token;
}

/**
 * Generates a fresh extension ingest token and overwrites the existing one.
 */
export async function rotateExtensionIngestToken(args: {
    userId: string;
}): Promise<string> {
    const token = nanoid(48);
    await prisma.user.update({
        data: { extensionIngestToken: token },
        where: { id: args.userId },
    });

    return token;
}
