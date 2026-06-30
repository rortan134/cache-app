import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const encoder = new TextEncoder();

const MCP_TOKEN_TTL_DAYS = 90;
const MCP_TOKEN_TTL_MS = MCP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

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

interface TokenPayload {
    expiresAt: number;
    issuedAt: number;
    userId: string;
}

function encodePayload(
    userId: string,
    issuedAt: number,
    expiresAt: number
): string {
    return `${userId}.${issuedAt}.${expiresAt}`;
}

function decodePayload(payload: string): TokenPayload | null {
    const [userId, issuedAtRaw, expiresAtRaw] = payload.split(".");
    if (!(userId && issuedAtRaw && expiresAtRaw)) {
        return null;
    }
    const issuedAt = Number(issuedAtRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!(Number.isFinite(issuedAt) && Number.isFinite(expiresAt))) {
        return null;
    }
    return { expiresAt, issuedAt, userId };
}

/**
 * Generates a stateless HMAC token for MCP authentication.
 *
 * The token encodes `userId`, `issuedAt`, and `expiresAt` (default TTL: 90 days)
 * and signs the joined string with `BETTER_AUTH_SECRET`. Tokens are
 * self-validating: `verifyMcpToken` only needs the secret + the token bytes,
 * so there is no server-side state to revoke on rotation. To invalidate a
 * compromised token today, rotate `BETTER_AUTH_SECRET`; keep the same secret
 * across deploys until you want everyone to re-issue.
 */
export async function generateMcpToken(userId: string): Promise<string> {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + MCP_TOKEN_TTL_MS;
    const payload = encodePayload(userId, issuedAt, expiresAt);
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
 * Verifies an MCP token. Returns the authenticated `userId` if the signature
 * is valid AND the token has not expired, otherwise `null`. The expiry check
 * runs after signature verification so an attacker cannot probe expiry with a
 * forged token.
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

    let payload: string;
    let signature: Uint8Array<ArrayBuffer>;
    try {
        payload = atob(payloadB64);
        // TS6 narrows `Uint8Array<ArrayBufferLike>` away from `BufferSource`;
        // copy into a fresh `ArrayBuffer` so `crypto.subtle.verify` accepts it.
        const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
        signature = new Uint8Array(sigBytes);
    } catch {
        return null;
    }

    try {
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
    } catch {
        return null;
    }

    const parsed = decodePayload(payload);
    if (!parsed) {
        return null;
    }

    if (parsed.expiresAt <= Date.now()) {
        return null;
    }

    return parsed.userId;
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
