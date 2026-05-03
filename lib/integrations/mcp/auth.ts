import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const encoder = new TextEncoder();

function requireSecret(): string {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
        throw new Error(
            "Missing required environment variable: BETTER_AUTH_SECRET"
        );
    }
    return secret;
}

function importKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(requireSecret()),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign", "verify"]
    );
}

/**
 * Generates a stateless HMAC token for MCP authentication.
 *
 * The token encodes the userId and a timestamp, signed with BETTER_AUTH_SECRET.
 */
export async function generateMcpToken(userId: string): Promise<string> {
    const timestamp = Date.now();
    const payload = `${userId}.${timestamp}`;
    const key = await importKey();
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payload)
    );
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const payloadB64 = btoa(payload);
    return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies an MCP token and returns the userId if valid.
 */
export async function verifyMcpToken(token: string): Promise<string | null> {
    const parts = token.split(".");
    if (parts.length !== 2) {
        return null;
    }

    const [payloadB64, sigB64] = parts;
    if (!(payloadB64 && sigB64)) {
        return null;
    }

    try {
        const payload = atob(payloadB64);
        const signature = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));

        const key = await importKey();
        const valid = await crypto.subtle.verify(
            "HMAC",
            key,
            signature,
            encoder.encode(payload)
        );
        if (!valid) {
            return null;
        }

        const [userId] = payload.split(".");
        return userId ?? null;
    } catch {
        return null;
    }
}

/**
 * Verifies a Bearer token for use with `withMcpAuth`.
 */
export async function verifyMcpAuthToken(
    _req: Request,
    bearerToken?: string
): Promise<AuthInfo | undefined> {
    if (!bearerToken) {
        return;
    }

    const userId = await verifyMcpToken(bearerToken);
    if (!userId) {
        return;
    }

    return {
        clientId: userId,
        extra: { userId },
        scopes: ["library:read", "library:write"],
        token: bearerToken,
    };
}
