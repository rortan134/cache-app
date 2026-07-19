/**
 * Single active hover surface for library hotkeys. Card menus pin their
 * hover target while open; without a shared claim, Alt+E / Alt+F would
 * fire for both a pinned card and a hovered collection row.
 */
let activeSurface: "card" | "collection" | null = null;

export function claimHoverHotkeySurface(surface: "card" | "collection"): void {
    activeSurface = surface;
}

export function releaseHoverHotkeySurface(
    surface: "card" | "collection"
): void {
    if (activeSurface === surface) {
        activeSurface = null;
    }
}

export function isHoverHotkeySurface(surface: "card" | "collection"): boolean {
    return activeSurface === surface;
}
