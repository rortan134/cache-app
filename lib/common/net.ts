/**
 * Network-adjacent security utilities for SSRF prevention and private-range blocking.
 */

const LOCALHOST_ALIASES = new Set(["localhost", "0.0.0.0", "::1", "[::1]"]);

function isLocalhostVariant(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    if (LOCALHOST_ALIASES.has(normalized)) {
        return true;
    }
    if (normalized.endsWith(".localhost")) {
        return true;
    }
    return false;
}

function parseIpv4Octets(hostname: string): number[] | null {
    const segments = hostname.split(".");
    if (segments.length !== 4) {
        return null;
    }

    const octets = segments.map((segment) => Number(segment));
    if (
        octets.some(
            (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255
        )
    ) {
        return null;
    }

    return octets;
}

function isPrivateIpv4(octets: number[]): boolean {
    const [first, second] = octets;
    if (first === undefined || second === undefined) {
        return false;
    }

    return (
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
    );
}

/**
 * Returns true if the hostname resolves to a private, loopback, or local-only
 * address that should not be reached from the public internet.
 *
 * Used to prevent SSRF when fetching user-supplied URLs.
 */
export function isBlockedHostname(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    if (!normalized) {
        return true;
    }
    if (isLocalhostVariant(normalized)) {
        return true;
    }

    const octets = parseIpv4Octets(normalized);
    if (!octets) {
        return false;
    }

    return isPrivateIpv4(octets);
}
