import ipaddr from "ipaddr.js";

/**
 * Network-adjacent security utilities for SSRF prevention and private-range blocking.
 */

const LOCALHOST_ALIASES = new Set(["localhost", "0.0.0.0", "::1", "[::1]"]);

const PUBLIC_UNICAST_IP_RANGE = "unicast";
const TRAILING_DOTS_PATTERN = /\.+$/;

interface ResolvedHostnameAddress {
    address: string;
}

type ResolveHostnameAddresses = (
    hostname: string
) => Promise<readonly ResolvedHostnameAddress[]>;

function isLocalhostVariant(hostname: string): boolean {
    const normalized = normalizeHostnameForPolicy(hostname);
    if (LOCALHOST_ALIASES.has(normalized)) {
        return true;
    }
    if (normalized.endsWith(".localhost")) {
        return true;
    }
    if (normalized.endsWith(".internal")) {
        return true;
    }
    return false;
}

function normalizeHostnameForPolicy(hostname: string): string {
    return hostname.trim().toLowerCase().replace(TRAILING_DOTS_PATTERN, "");
}

function normalizeIpHostname(hostname: string): string {
    const normalized = normalizeHostnameForPolicy(hostname);
    if (normalized.startsWith("[") && normalized.endsWith("]")) {
        return normalized.slice(1, -1);
    }
    return normalized;
}

/**
 * Returns true for local aliases and IP literals that are not public unicast.
 *
 * Domain names are intentionally not resolved here; fetch boundaries still need
 * DNS-aware checks before opening sockets.
 */
export function isBlockedHostname(hostname: string): boolean {
    const normalized = normalizeHostnameForPolicy(hostname);
    if (!normalized) {
        return true;
    }
    if (isLocalhostVariant(normalized)) {
        return true;
    }

    const ipHostname = normalizeIpHostname(normalized);
    if (!ipaddr.isValid(ipHostname)) {
        return false;
    }

    return ipaddr.process(ipHostname).range() !== PUBLIC_UNICAST_IP_RANGE;
}

export function parseHttpUrl(value: string): URL | null {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Returns true when a hostname is a blocked literal/local alias or resolves to
 * at least one blocked address. DNS failures are blocked because callers use
 * this before server-side fetches of user-supplied URLs.
 */
export async function resolvesToBlockedHostname(
    hostname: string,
    resolveHostnameAddresses: ResolveHostnameAddresses
): Promise<boolean> {
    if (isBlockedHostname(hostname)) {
        return true;
    }

    try {
        const records = await resolveHostnameAddresses(hostname);
        if (records.length === 0) {
            return true;
        }
        return records.some((record) => isBlockedHostname(record.address));
    } catch {
        return true;
    }
}

/**
 * Parses an absolute HTTP(S) URL and rejects hosts that are local, private, or
 * unresolvable. The resolver is injected so browser-safe modules can share the
 * policy without importing Node DNS APIs.
 */
export async function parsePublicHttpUrl(
    value: string,
    resolveHostnameAddresses: ResolveHostnameAddresses
): Promise<URL | null> {
    const parsed = parseHttpUrl(value);
    if (!parsed) {
        return null;
    }

    if (
        await resolvesToBlockedHostname(
            parsed.hostname,
            resolveHostnameAddresses
        )
    ) {
        return null;
    }

    return parsed;
}
