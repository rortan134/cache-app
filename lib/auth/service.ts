import "server-only";

import { getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/prisma";
import { nanoid } from "nanoid";

const EXTENSION_INGEST_TOKEN_LENGTH = 48;

// ---------------------------------------------------------------------------
// Typed discriminated union for action auth results
// ---------------------------------------------------------------------------

export interface UnauthorizedActionResult {
    message: string;
    status: "UNAUTHORIZED";
}

export interface AuthorizedActionResult {
    userId: string;
}

export type ActionAuthResult =
    | UnauthorizedActionResult
    | AuthorizedActionResult;

/**
 * Returns true when `result` is an `UnauthorizedActionResult`, narrowing
 * the discriminated union so the caller can access `.message` / return early.
 *
 * Replaces bare `"status" in auth` checks — if a property name is misspelled
 * here, the compiler catches it.
 */
export function isUnauthenticated(
    result: ActionAuthResult
): result is UnauthorizedActionResult {
    return "status" in result;
}

/**
 * Resolves the current session user id for Server Actions.
 *
 * Server Actions return serializable status objects rather than HTTP responses,
 * so this helper keeps that transport shape close to auth without coupling
 * domain-agnostic procedure utilities to the auth module.
 */
export async function requireActionUserId(
    unauthorizedMessage = "Sign in to continue."
): Promise<ActionAuthResult> {
    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: unauthorizedMessage,
            status: "UNAUTHORIZED",
        };
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
    const existing = await prisma.user.findUnique({
        select: { extensionIngestToken: true },
        where: { id: args.userId },
    });

    if (existing?.extensionIngestToken) {
        return existing.extensionIngestToken;
    }

    const token = createExtensionIngestToken();
    const { count } = await prisma.user.updateMany({
        data: { extensionIngestToken: token },
        where: {
            extensionIngestToken: null,
            id: args.userId,
        },
    });

    if (count > 0) {
        return token;
    }

    const user = await prisma.user.findUniqueOrThrow({
        select: { extensionIngestToken: true },
        where: { id: args.userId },
    });

    if (!user.extensionIngestToken) {
        throw new Error("Failed to persist extension ingest token");
    }

    return user.extensionIngestToken;
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
