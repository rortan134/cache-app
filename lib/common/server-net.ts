import "server-only";

import {
    parsePublicHttpUrl as parsePublicHttpUrlWithResolver,
    resolvesToBlockedHostname as resolvesToBlockedHostnameWithResolver,
} from "@/lib/common/net";
import { lookup } from "node:dns/promises";

function resolveHostnameAddresses(hostname: string) {
    return lookup(hostname, {
        all: true,
        verbatim: true,
    });
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
