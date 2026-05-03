import "server-only";

import { prisma } from "@/prisma";
import { nanoid } from "nanoid";

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

/**
 * Reads whether the user has disabled smart collections.
 */
export async function getUserSmartCollectionsPreference(args: {
    userId: string;
}): Promise<boolean> {
    const user = await prisma.user.findUnique({
        select: { smartCollectionsDisabled: true },
        where: { id: args.userId },
    });

    return user?.smartCollectionsDisabled ?? false;
}
