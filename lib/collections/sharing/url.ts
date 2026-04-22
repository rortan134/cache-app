import { BASE_URL } from "@/lib/common/constants";

/** @internal */
function getPublicCollectionSharePath(shareId: string): string {
    return `/c/${encodeURIComponent(shareId)}`;
}

export function buildPublicCollectionShareUrl(
    shareId: string,
    baseUrl = BASE_URL
): string {
    return new URL(getPublicCollectionSharePath(shareId), baseUrl).toString();
}
