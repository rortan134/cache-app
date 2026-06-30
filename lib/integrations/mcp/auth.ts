import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const encoder = new TextEncoder();

const MCP_TOKEN_TTL_DAYS = 90;
const MCP_TOKEN_TTL_MS = MCP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * MCP scopes map onto tool capabilities. Tokens carry one or both; the route
 * checks the relevant scope before executing mutating tools. Adding
 * `library:read-only` would model an audit/summary agent that cannot write.
 */
export const MCP_SCOPES = ["library:read", "library:write"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** Full-access scopes are minted by default; not yet a readers-only path. */
const LEGACY_DEFAULT_SCOPES: McpScope[] = ["library:read", "library:write"];

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
    scopes: McpScope[];
    userId: string;
}

function encodePayload(
    userId: string,
    issuedAt: number,
    expiresAt: number,
    scopes: McpScope[]
): string {
    // Dot-separated so the existing base64 wrap carries it verbatim. Trailing
    // `.` lets decoders distinguish an unscoped legacy payload from an empty
    // scope list (semantically the same today but easy to flip later).
    return `${userId}.${issuedAt}.${expiresAt}.${scopes.join("+")}`;
}

function decodePayload(payload: string): TokenPayload | null {
    const [userId, issuedAtRaw, expiresAtRaw, scopesRaw] = payload.split(".");
    if (!(userId && issuedAtRaw && expiresAtRaw)) {
        return null;
    }
    const issuedAt = Number(issuedAtRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!(Number.isFinite(issuedAt) && Number.isFinite(expiresAt))) {
        return null;
    }
    // Tokens issued before the scope segment existed decode as
    // `library:read+library:write` so existing clients keep working until
    // they re-issue. New tokens carry an explicit scope list.
    const scopes: McpScope[] = scopesRaw
        ? decodeScopes(scopesRaw)
        : LEGACY_DEFAULT_SCOPES;
    return { expiresAt, issuedAt, scopes, userId };
}

function decodeScopes(raw: string): McpScope[] {
    const seen = new Set<McpScope>();
    for (const chunk of raw.split("+")) {
        if (chunk === "" || !isMcpScope(chunk)) {
            continue;
        }
        seen.add(chunk);
    }
    return [...seen];
}

function isMcpScope(value: string): value is McpScope {
    return (MCP_SCOPES as readonly string[]).includes(value);
}

/**
 * Generates a stateless HMAC token for MCP authentication.
 *
 * The token encodes `userId`, `issuedAt`, `expiresAt` (default TTL: 90 days)
 * and the granted `scopes`, and signs the joined string with
 * `BETTER_AUTH_SECRET`. Tokens are self-validating: `verifyMcpToken` only
 * needs the secret + the token bytes, so there is no server-side state to
 * revoke on rotation. To invalidate a compromised token today, rotate
 * `BETTER_AUTH_SECRET`; keep the same secret across deploys until you want
 * everyone to re-issue.
 */
export async function generateMcpToken(
    userId: string,
    scopes: readonly McpScope[] = LEGACY_DEFAULT_SCOPES
): Promise<string> {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + MCP_TOKEN_TTL_MS;
    const normalized = dedupeScopes(scopes);
    const payload = encodePayload(userId, issuedAt, expiresAt, normalized);
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

function dedupeScopes(scopes: readonly McpScope[]): McpScope[] {
    const seen = new Set<McpScope>();
    const result: McpScope[] = [];
    for (const scope of scopes) {
        if (!isMcpScope(scope)) {
            continue;
        }
        if (seen.has(scope)) {
            continue;
        }
        seen.add(scope);
        result.push(scope);
    }
    return result;
}

/**
 * Verifies an MCP token. Returns the authenticated `userId` and granted
 * `scopes` if the signature is valid AND the token has not expired,
 * otherwise `null`. The expiry check runs after signature verification so
 * an attacker cannot probe expiry with a forged token.
 */
export async function verifyMcpToken(
    token: string
): Promise<{ scopes: McpScope[]; userId: string } | null> {
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

    return { scopes: parsed.scopes, userId: parsed.userId };
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

    const verified = await verifyMcpToken(bearerToken);
    if (!verified) {
        return;
    }

    return {
        clientId: verified.userId,
        extra: { userId: verified.userId },
        scopes: verified.scopes,
        token: bearerToken,
    };
}
