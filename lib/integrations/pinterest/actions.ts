"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

const PINTEREST_PROVIDER_ID = "pinterest";

/**
 * Resolves the Pinterest access token for the given account ID.
 */
export async function resolvePinterestAccessToken(
    accountId: string
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: PINTEREST_PROVIDER_ID,
        },
        headers: await headers(),
    });
    return tokenResponse?.accessToken ?? null;
}
