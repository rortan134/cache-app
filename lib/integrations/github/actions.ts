"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

const GITHUB_PROVIDER_ID = "github";

/**
 * Resolves the GitHub access token for the given account ID.
 *
 * @returns The access token or null if not found.
 */
export async function resolveGitHubAccessToken(
    accountId: string
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId: GITHUB_PROVIDER_ID,
        },
        headers: await headers(),
    });
    return tokenResponse?.accessToken ?? null;
}
