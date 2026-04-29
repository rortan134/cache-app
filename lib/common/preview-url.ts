const BLOCKED_NATIVE_PREVIEW_HOST_PARTS = [
    "cdninstagram.com",
    "fbcdn.net",
    "tiktokcdn.com",
    "tiktokcdn-us.com",
] as const;

export function isBlockedNativePreviewUrl(
    value: string | null | undefined
): boolean {
    if (!value) {
        return false;
    }

    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return BLOCKED_NATIVE_PREVIEW_HOST_PARTS.some((hostPart) =>
            hostname.includes(hostPart)
        );
    } catch {
        return false;
    }
}

export function toUsableStaticPreviewUrl(
    value: string | null | undefined
): string | null {
    if (!value || isBlockedNativePreviewUrl(value)) {
        return null;
    }

    return value;
}
