import "server-only";

import { SessionError } from "@/lib/auth/error";
import { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { headers } from "next/headers";
import { cache } from "react";

const log = createLogger("Auth:session");
const BETTER_AUTH_COOKIE_PREFIXES = ["better-auth.", "__Secure-better-auth."];
const SESSION_DATA_COOKIE_NAME = "session_data";
const SESSION_TOKEN_COOKIE_NAME = "session_token";

export const getServerSession = cache(async () => {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (session || !shouldRetryWithoutSessionDataCookie(requestHeaders)) {
        return session;
    }

    /**
     * better-auth reads the cache cookie before the durable session token.
     * If a refreshed response races with a client-side router refresh, that
     * cache cookie can be stale or missing one of its chunks, causing a null
     * session even though the signed session token is still valid.
     */
    return await auth.api.getSession({
        headers: headersWithoutSessionDataCookie(requestHeaders),
    });
});

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

function shouldRetryWithoutSessionDataCookie(requestHeaders: Headers): boolean {
    const cookieHeader = requestHeaders.get("cookie");
    if (!cookieHeader) {
        return false;
    }

    let hasSessionDataCookie = false;
    let hasSessionTokenCookie = false;

    for (const cookie of cookieHeader.split(";")) {
        const cookieName = getCookieName(cookie);
        if (!cookieName) {
            continue;
        }

        if (isBetterAuthCookie(cookieName, SESSION_DATA_COOKIE_NAME)) {
            hasSessionDataCookie = true;
        }

        if (isBetterAuthCookie(cookieName, SESSION_TOKEN_COOKIE_NAME)) {
            hasSessionTokenCookie = true;
        }
    }

    return hasSessionDataCookie && hasSessionTokenCookie;
}

function headersWithoutSessionDataCookie(requestHeaders: Headers): Headers {
    const nextHeaders = new Headers(requestHeaders);
    const cookieHeader = requestHeaders.get("cookie");
    if (!cookieHeader) {
        return nextHeaders;
    }

    const retainedCookies = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .filter((cookie) => {
            const cookieName = getCookieName(cookie);
            return (
                cookieName &&
                !isBetterAuthCookie(cookieName, SESSION_DATA_COOKIE_NAME)
            );
        });

    if (retainedCookies.length === 0) {
        nextHeaders.delete("cookie");
        return nextHeaders;
    }

    nextHeaders.set("cookie", retainedCookies.join("; "));
    return nextHeaders;
}

function getCookieName(cookie: string): string | null {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) {
        return null;
    }

    return cookie.slice(0, separatorIndex).trim();
}

function isBetterAuthCookie(cookieName: string, name: string): boolean {
    for (const prefix of BETTER_AUTH_COOKIE_PREFIXES) {
        const fullName = `${prefix}${name}`;
        if (cookieName === fullName || cookieName.startsWith(`${fullName}.`)) {
            return true;
        }
    }

    return false;
}
