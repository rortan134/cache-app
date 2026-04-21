"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

const X_PROVIDER_ID = "x";

/**
 * Resolves the X access token for the given account ID.
 */
export async function resolveXAccessToken(
    accountId: string
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: X_PROVIDER_ID,
        },
        headers: await headers(),
    });
    return tokenResponse?.accessToken ?? null;
}
