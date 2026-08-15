export interface CollectionHoverHotkeySurface {
    claim: () => number;
    clear: () => void;
    isClaimed: () => boolean;
    release: (claimId: number) => void;
}

export function createCollectionHoverHotkeySurface(): CollectionHoverHotkeySurface {
    let activeClaimId = 0;
    let nextClaimId = 0;

    return {
        claim: () => {
            nextClaimId += 1;
            activeClaimId = nextClaimId;
            return activeClaimId;
        },
        clear: () => {
            activeClaimId = 0;
        },
        isClaimed: () => activeClaimId !== 0,
        release: (claimId) => {
            if (activeClaimId === claimId) {
                activeClaimId = 0;
            }
        },
    };
}
