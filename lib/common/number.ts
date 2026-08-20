export function clamp(
    value: number,
    min: number = Number.MIN_SAFE_INTEGER,
    max: number = Number.MAX_SAFE_INTEGER
): number {
    return Math.max(min, Math.min(value, max));
}

export function formatPercent(value: number): string {
    if (value > 0 && value < 1) {
        return "<1%";
    }
    return `${Math.round(value)}%`;
}

export function formatSharePercent(value: number, total: number): string {
    if (total <= 0) {
        return "0%";
    }
    return formatPercent((value / total) * 100);
}
