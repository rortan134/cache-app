/**
 * Session cache of masonry preview image dimensions (url → natural size).
 * Keeps virtualized cards from reshuffling when images fail or remount.
 */

export interface Dimensions {
    readonly h: number;
    readonly w: number;
}

export const DEFAULT_DIMENSIONS = {
    h: 4,
    w: 3,
} as const satisfies Dimensions;

const PREVIEW_DIMENSIONS_CACHE = new Map<string, Dimensions>();
const PREVIEW_DIMENSIONS_CACHE_MAX = 500;

const PREVIEW_MIN_ASPECT_RATIO = 1 / 4;
const PREVIEW_MAX_ASPECT_RATIO = 3;

/** Pure read — safe during render. Does not reorder the cache. */
export function readCachedDimensions(src: string | null): Dimensions | null {
    if (!src) {
        return null;
    }
    return PREVIEW_DIMENSIONS_CACHE.get(src) ?? null;
}

export function cacheDimensions(src: string, dimensions: Dimensions): void {
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
 * Pin a default slot when a preview fails before its dimensions are known,
 * so virtualization remounts keep a stable aspect ratio.
 */
export function pinDefaultDimensionsIfMissing(src: string): Dimensions {
    const existing = PREVIEW_DIMENSIONS_CACHE.get(src);
    if (existing !== undefined) {
        return existing;
    }
    cacheDimensions(src, DEFAULT_DIMENSIONS);
    return DEFAULT_DIMENSIONS;
}

/** The aspect slot to render: cached dimensions when known, else the default, clamped to masonry bounds. */
export function resolveDisplayDimensions(
    dimensions: Dimensions | null
): Dimensions {
    return clampDimensions(dimensions ?? DEFAULT_DIMENSIONS);
}

function clampDimensions(dimensions: Dimensions): Dimensions {
    const { h, w } = dimensions;
    if (!(w > 0 && h > 0)) {
        return { ...DEFAULT_DIMENSIONS };
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
