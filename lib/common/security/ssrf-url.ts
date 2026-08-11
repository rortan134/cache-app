import { resolveHostAddresses } from "./dns";
import {
    parsePublicHttpUrl as parsePublicHttpUrlWithResolver,
    resolvesToBlockedHostname as resolvesToBlockedHostnameWithResolver,
} from "./ssrf";

const SSRF_GATE_DNS_TIMEOUT_MS = 15_000;

async function resolveHostnameAddresses(hostname: string) {
    const resolved = await resolveHostAddresses(hostname, {
        timeoutMs: SSRF_GATE_DNS_TIMEOUT_MS,
    });
    return resolved.addresses.map((address) => ({ address }));
}

export function resolvesToBlockedHostname(hostname: string): Promise<boolean> {
    return resolvesToBlockedHostnameWithResolver(
        hostname,
        resolveHostnameAddresses
    );
}

export function parsePublicHttpUrl(value: string): Promise<URL | null> {
    return parsePublicHttpUrlWithResolver(value, resolveHostnameAddresses);
}
