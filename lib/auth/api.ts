import "server-only";

import { auth } from "@/lib/auth/server";
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
