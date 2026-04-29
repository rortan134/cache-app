export function centsToMicroCents(amount: number) {
    return Math.round(amount * 1_000_000);
}

export function microCentsToCents(amount: number) {
    return Math.round(amount / 1_000_000);
}
