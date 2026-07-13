/**
 * Session cache of masonry preview image dimensions (url → natural size).
 * Keeps virtualized cards from reshuffling when images fail or remount.
 */

export interface PreviewDimensions {
    h: number;
    w: number;
}

/** Stable fallback so failed/missing previews keep a consistent masonry slot. */
export const DEFAULT_PREVIEW_DIMENSIONS = {
    h: 4,
    w: 3,
} as const satisfies PreviewDimensions;

const PREVIEW_DIMENSIONS_CACHE = new Map<string, PreviewDimensions>();
const PREVIEW_DIMENSIONS_CACHE_MAX = 500;
const PREVIEW_MIN_ASPECT_RATIO = 1 / 4;
const PREVIEW_MAX_ASPECT_RATIO = 3;

/** Pure read — safe during render. Does not reorder the cache. */
export function readCachedPreviewDimensions(
    src: string | null
): PreviewDimensions | null {
    if (!src) {
        return null;
    }
    return PREVIEW_DIMENSIONS_CACHE.get(src) ?? null;
}

export function cachePreviewDimensions(
    src: string,
    dimensions: PreviewDimensions
): void {
    // Reinsert so updates act as LRU touches (write path only — keep reads pure).
    if (PREVIEW_DIMENSIONS_CACHE.has(src)) {
        PREVIEW_DIMENSIONS_CACHE.delete(src);
    } else if (PREVIEW_DIMENSIONS_CACHE.size >= PREVIEW_DIMENSIONS_CACHE_MAX) {
        const oldestKey = PREVIEW_DIMENSIONS_CACHE.keys().next().value;
        if (oldestKey !== undefined) {
            PREVIEW_DIMENSIONS_CACHE.delete(oldestKey);
        }
    }
    PREVIEW_DIMENSIONS_CACHE.set(src, dimensions);
}

/**
 * Pin a default aspect when a preview fails and nothing is known yet.
 * Remounts (virtualization) reuse the same slot size.
 */
export function pinDefaultPreviewDimensionsIfMissing(
    src: string
): PreviewDimensions {
    const existing = PREVIEW_DIMENSIONS_CACHE.get(src);
    if (existing !== undefined) {
        return existing;
    }
    const next: PreviewDimensions = { ...DEFAULT_PREVIEW_DIMENSIONS };
    cachePreviewDimensions(src, next);
    return next;
}

export function clampPreviewDimensions(
    dimensions: PreviewDimensions
): PreviewDimensions {
    const { h, w } = dimensions;
    if (!(w > 0 && h > 0)) {
        return { ...DEFAULT_PREVIEW_DIMENSIONS };
    }
    const aspectRatio = h / w;
    if (aspectRatio > PREVIEW_MAX_ASPECT_RATIO) {
        return { h: Math.round(w * PREVIEW_MAX_ASPECT_RATIO), w };
    }
    if (aspectRatio < PREVIEW_MIN_ASPECT_RATIO) {
        return { h: Math.round(w * PREVIEW_MIN_ASPECT_RATIO), w };
    }
    return dimensions;
}
