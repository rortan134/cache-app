import { createLogger } from "@/lib/common/logs/console/logger";
import * as ipaddr from "ipaddr.js";
import { unwrapIpv6Brackets } from "./hostnames";

const logger = createLogger("security/ssrf");

/**
 * The SSRF gate: fail closed on anything that is not public unicast. regexes
 * miss octal/hex IPv4, IPv4-mapped/compatible IPv6, and link-local ranges
 * (including the cloud metadata endpoint `169.254.169.254`), so this relies
 * on ipaddr.js.
 */
export function isPrivateIp(ip: string): boolean {
    const addr = parseIp(ip);
    if (addr === null) {
        return true;
    }

    if (addr.range() !== "unicast") {
        return true;
    }

    if (addr instanceof ipaddr.IPv6) {
        const parts = addr.parts;
        const firstSixZero = parts.slice(0, 6).every((part) => part === 0);
        if (firstSixZero) {
            // IPv4-compatible forms (`::a.b.c.d`) embed the address in the
            // last 32 bits while still classifying as unicast.
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
}

/**
 * `isValid` and `process` share one parser, and `process` guards its only
 * post-parse conversion with the same predicate the conversion re-checks
 * itself, so with the pinned 2.5.0 a throw on accepted input is impossible
 * (fuzz-verified). Rejected input is the everyday case here: fail closed,
 * silently. The impossible case alone gets recorded, never silently.
 */
function parseIp(ip: string): ipaddr.IPv4 | ipaddr.IPv6 | null {
    try {
        return ipaddr.process(ip);
    } catch {
        if (ipaddr.isValid(ip)) {
            logger.warn("SSRF IP parser failed on a valid literal — closed", {
                ip,
            });
        }
        return null;
    }
}

export function isIpLiteral(host: string): boolean {
    return ipaddr.isValid(host);
}

/** 127.0.0.0/8 and ::1 only; other private ranges are `isPrivateIp`'s job. */
export function isLoopbackIp(ip: string): boolean {
    const addr = parseIp(ip);
    return addr !== null && addr.range() === "loopback";
}

/** Blocks private **IP literals** synchronously; DNS names are resolved elsewhere. */
export function isPrivateIpHost(host: string): boolean {
    const clean = unwrapIpv6Brackets(host);
    return isIpLiteral(clean) && isPrivateIp(clean);
}
