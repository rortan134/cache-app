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
