import { BASE_URL } from "@/lib/constants";

export const PUBLIC_COLLECTION_SHARE_ROUTE_PREFIX = "/c";

export function getPublicCollectionSharePath(shareId: string): string {
    return `${PUBLIC_COLLECTION_SHARE_ROUTE_PREFIX}/${encodeURIComponent(shareId)}`;
}

export function buildPublicCollectionShareUrl(
    shareId: string,
    baseUrl = BASE_URL
): string {
    return new URL(getPublicCollectionSharePath(shareId), baseUrl).toString();
}
