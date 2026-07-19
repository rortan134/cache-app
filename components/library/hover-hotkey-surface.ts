/**
 * Collection rows claim library hover hotkeys while the pointer is over them
 * so card shortcuts (Alt+E / Alt+F / ⌘⌫ / S) do not also fire for a pinned or
 * hovered card. Claim ids make release safe when the pointer crosses rows
 * (leave of the previous row must not clear the next row's claim).
 */
let activeClaimId = 0;
let nextClaimId = 0;

/** @returns claim id to pass to {@link releaseCollectionHoverHotkeySurface} */
export function claimCollectionHoverHotkeySurface(): number {
    nextClaimId += 1;
    activeClaimId = nextClaimId;
    return activeClaimId;
}

export function releaseCollectionHoverHotkeySurface(claimId: number): void {
    if (activeClaimId === claimId) {
        activeClaimId = 0;
    }
}

export function clearCollectionHoverHotkeySurface(): void {
    activeClaimId = 0;
}

export function isCollectionHoverHotkeySurface(): boolean {
    return activeClaimId !== 0;
}
