import { randomBytes } from "node:crypto";

/** base64url: no padding or `+`/`/`, so tokens survive URLs and headers. */
export function generateSecureToken(byteLength = 24): string {
    return randomBytes(byteLength).toString("base64url");
}
