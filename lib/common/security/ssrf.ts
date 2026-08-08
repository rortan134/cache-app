import * as ipaddr from "ipaddr.js";
import { unwrapIpv6Brackets } from "./hostnames";

/** An IP literal — no DNS lookup needed to classify it. */
export function isIpLiteral(host: string): boolean {
    return ipaddr.isValid(host);
}

/** 127.0.0.0/8 and ::1 only; other private ranges are `isPrivateIp`'s job. */
export function isLoopbackIp(ip: string): boolean {
    try {
        return ipaddr.isValid(ip) && ipaddr.process(ip).range() === "loopback";
    } catch {
        return false;
    }
}

/**
 * The SSRF gate: fail closed on anything that is not public unicast. regexes
 * miss octal/hex IPv4, IPv4-mapped/compatible IPv6, and link-local ranges
 * (including the cloud metadata endpoint `169.254.169.254`), so this relies
 * on ipaddr.js.
 */
export function isPrivateIp(ip: string): boolean {
    try {
        if (!ipaddr.isValid(ip)) {
            return true;
        }

        const addr = ipaddr.process(ip);
        const range = addr.range();

        if (range !== "unicast") {
            return true;
        }

        if (addr instanceof ipaddr.IPv6) {
            const parts = addr.parts;
            const firstSixZero = parts.slice(0, 6).every((part) => part === 0);
            if (firstSixZero) {
                // IPv4-compatible forms (`::a.b.c.d`) embed the address in
                // the last 32 bits while still classifying as unicast.
                const high = parts[6];
                const low = parts[7];
                if (high === undefined || low === undefined) {
                    return true;
                }
                const embedded = ipaddr.fromByteArray([
                    (high >> 8) & 0xff,
                    high & 0xff,
                    (low >> 8) & 0xff,
                    low & 0xff,
                ]);
                return embedded.range() !== "unicast";
            }
        }

        return false;
    } catch {
        return true;
    }
}

/** Blocks private **IP literals** synchronously; DNS names are resolved elsewhere. */
export function isPrivateIpHost(host: string): boolean {
    const clean = unwrapIpv6Brackets(host);
    return isIpLiteral(clean) && isPrivateIp(clean);
}
