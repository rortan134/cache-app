import "server-only";

import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/prisma";
import { nanoid } from "nanoid";

const EXTENSION_INGEST_TOKEN_LENGTH = 48;

/**
 * Resolves the current session user id for API routes.
 *
 * @returns The user id, or a 401 Response if the session is missing.
 */
export async function requireSessionUserId(): Promise<
    { userId: string } | Response
> {
    const session = await getServerSession();
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
    const token = createExtensionIngestToken();
    const updateResult = await prisma.user.updateMany({
        data: { extensionIngestToken: token },
        where: {
            extensionIngestToken: null,
            id: args.userId,
        },
    });

    if (updateResult.count > 0) {
        return token;
    }

    const user = await prisma.user.findUniqueOrThrow({
        select: { extensionIngestToken: true },
        where: { id: args.userId },
    });

    if (user.extensionIngestToken) {
        return user.extensionIngestToken;
    }

    throw new Error("Failed to persist extension ingest token");
}

/**
 * Generates a fresh extension ingest token and overwrites the existing one.
 */
export async function rotateExtensionIngestToken(args: {
    userId: string;
}): Promise<string> {
    const token = createExtensionIngestToken();
    await prisma.user.update({
        data: { extensionIngestToken: token },
        where: { id: args.userId },
    });

    return token;
}

function createExtensionIngestToken(): string {
    return nanoid(EXTENSION_INGEST_TOKEN_LENGTH);
}
