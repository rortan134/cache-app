import "server-only";

import { SessionError } from "@/lib/auth/error";
import { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { headers } from "next/headers";
import { cache } from "react";

const log = createLogger("Auth:session");

export const getServerSession = cache(
    async () =>
        await auth.api.getSession({
            headers: await headers(),
        })
);

export type Session = Awaited<ReturnType<typeof getServerSession>>;

export const getSessionUserId = cache(async (): Promise<string | null> => {
    const session = await getServerSession();
    return session?.user?.id ?? null;
});

/* @internal */
type WithSessionCallback<T> = (client: Session) => Promise<T> | T;

/**
 * Executes a callback with the current session, normalizing errors to SessionError.
 */
export async function withSession<T>(
    callback: WithSessionCallback<T>
): Promise<T> {
    try {
        const session = await getServerSession();
        return await callback(session);
    } catch (error) {
        log.error("Session operation failed:", error);

        if (error instanceof SessionError) {
            throw error;
        }

        throw new SessionError({
            cause: error instanceof Error ? error : undefined,
            message: error instanceof Error ? error.message : String(error),
            operation: "auth::withSession",
        });
    }
}
