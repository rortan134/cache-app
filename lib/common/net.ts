import ipaddr from "ipaddr.js";

/**
 * Network-adjacent security utilities for SSRF prevention and private-range blocking.
 */

const LOCALHOST_ALIASES = new Set(["localhost", "0.0.0.0", "::1", "[::1]"]);

const PUBLIC_UNICAST_IP_RANGE = "unicast";
const TRAILING_DOTS_PATTERN = /\.+$/;

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
