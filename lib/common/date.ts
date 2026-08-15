/**
 * Format a 1–31 calendar day with an English ordinal suffix ("1st", "2nd", "3rd").
 */
export function getMonthDayLabel(monthDay: number): string {
    const suffix =
        monthDay >= 11 && monthDay <= 13
            ? "th"
            : (["th", "st", "nd", "rd"][monthDay % 10] ?? "th");
    return `${monthDay}${suffix}`;
}

export function parseDate(
    value: Date | string | null | undefined
): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}
