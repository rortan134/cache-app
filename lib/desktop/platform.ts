import type { DesktopPlatform } from "@/lib/desktop/constants";

const MOBILE_UA_RE = /Android|iPhone|iPad|iPod|Mobile/i;
const WINDOWS_UA_RE = /Windows/i;
const MACOS_UA_RE = /Mac OS X|Macintosh/i;
const LINUX_UA_RE = /Linux|X11|CrOS/i;

/**
 * Best-effort desktop OS from a user-agent string.
 * Returns null on mobile or when the OS cannot be classified.
 * When `userAgent` is omitted, uses `navigator.userAgent` in the browser.
 */
export function detectDesktopPlatform(
    userAgent?: string | null
): DesktopPlatform | null {
    let resolvedUserAgent: string | null;
    if (typeof userAgent === "string") {
        resolvedUserAgent = userAgent;
    } else if (typeof navigator === "undefined") {
        resolvedUserAgent = null;
    } else {
        resolvedUserAgent = navigator.userAgent;
    }

    if (
        typeof resolvedUserAgent !== "string" ||
        resolvedUserAgent.length === 0
    ) {
        return null;
    }

    if (MOBILE_UA_RE.test(resolvedUserAgent)) {
        return null;
    }

    if (WINDOWS_UA_RE.test(resolvedUserAgent)) {
        return "windows";
    }

    if (MACOS_UA_RE.test(resolvedUserAgent)) {
        return "macos";
    }

    if (LINUX_UA_RE.test(resolvedUserAgent)) {
        return "linux";
    }

    return null;
}
