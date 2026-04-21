"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

/**
 * Resolves the Google access token for the current user.
 *
 * @returns The access token or null if not found.
 */
export async function resolveGoogleAccessToken(): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: { providerId: "google" },
        headers: await headers(),
    });
    return tokenResponse?.accessToken ?? null;
}
