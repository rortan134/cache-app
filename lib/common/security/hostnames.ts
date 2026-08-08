/** No `ipaddr.js` here, so client bundles can share these without the library. */

/** The WHATWG parser brackets IPv6; strip the markers before IP matching. */
export function unwrapIpv6Brackets(host: string): string {
    return host.startsWith("[") && host.endsWith("]")
        ? host.slice(1, -1)
        : host;
}

/** Exact loopback hosts that may use plain HTTP. */
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
]);

/**
 * Exact-match only — `127.0.0.5` and friends are loopback too but belong
 * to `isLoopbackIp` in `./ssrf`.
 */
export function isLoopbackHostname(host: string): boolean {
    return LOOPBACK_HOSTNAMES.has(unwrapIpv6Brackets(host));
}
