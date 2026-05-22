import "server-only";

import { getSessionUserId } from "@/lib/auth/session";

/**
 * Resolves the current session user id for API routes.
 *
 * Route handlers return HTTP responses directly, so this helper keeps the
 * response-shaped unauthorized branch out of framework-independent services.
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
