import "server-only";

import { SessionError } from "@/lib/auth/error";
import { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { headers } from "next/headers";
import { cache } from "react";

const log = createLogger("Auth:session");

export const getServerSession = cache(async () =>
    auth.api.getSession({ headers: await headers() })
);

export const getSessionUserId = cache(async (): Promise<string | null> => {
    const session = await getServerSession();
    return session?.user?.id ?? null;
});

export type Session = Awaited<ReturnType<typeof getServerSession>>;

type WithSessionCallback<T> = (session: Session) => Promise<T> | T;

/**
 * Executes a callback with the current session, normalizing failures to a named error.
 */
export async function withSession<T>(
    callback: WithSessionCallback<T>
): Promise<T> {
    try {
        return await callback(await getServerSession());
    } catch (error) {
        log.error("Session operation failed", error);

        if (error instanceof SessionError) {
            throw error;
        }

        throw new SessionError(
            {
                message: error instanceof Error ? error.message : String(error),
                operation: "auth::withSession",
            },
            { cause: error }
        );
    }
}

interface UnauthorizedActionResult {
    message: string;
    status: "UNAUTHORIZED";
}

interface AuthorizedActionResult {
    userId: string;
}

type ActionAuthResult = UnauthorizedActionResult | AuthorizedActionResult;

/**
 * Narrows the serializable auth result used by Server Actions.
 */
export function isUnauthenticated(
    result: ActionAuthResult
): result is UnauthorizedActionResult {
    return "status" in result;
}

/**
 * Resolves the current session user id for Server Actions.
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
 * Resolves the current session user id for API route handlers.
 */
export async function requireRouteUserId(args?: {
    headers?: HeadersInit;
}): Promise<{ userId: string } | Response> {
    const userId = await getSessionUserId();

    if (!userId) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: args?.headers, status: 401 }
        );
    }

    return { userId };
}
