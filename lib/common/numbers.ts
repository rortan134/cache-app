export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
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
