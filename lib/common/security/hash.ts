import { createHash } from "node:crypto";

/** Fast SHA-1 digest in hexadecimal; not suitable for security-sensitive uses. */
export function sha1Hex(input: string | Uint8Array): string {
    const hash = createHash("sha1");
    if (typeof input === "string") {
        hash.update(input, "utf8");
    } else {
        hash.update(input);
    }
    return hash.digest("hex");
}

/**
 * Fast digest — safe only for high-entropy input (API keys, encrypted values,
 * digests). Passwords never land here: Better Auth owns the slow KDF.
 */
export function sha256Hex(input: string | Uint8Array): string {
    const hash = createHash("sha256");
    if (typeof input === "string") {
        hash.update(input, "utf8");
    } else {
        hash.update(input);
    }
    return hash.digest("hex");
}

/** PKCE code challenge encoding (RFC 7636) so both sides derive it identically. */
export function sha256Base64Url(input: string | Uint8Array): string {
    const hash = createHash("sha256");
    if (typeof input === "string") {
        hash.update(input, "utf8");
    } else {
        hash.update(input);
    }
    return hash.digest("base64url");
}
