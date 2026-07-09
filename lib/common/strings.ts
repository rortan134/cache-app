import * as z from "zod";

const TRAILING_NUMBER_PATTERN = /^.*(\d+)$/;
const TRAILING_NUMBER_REPLACE_PATTERN = /(\d+)$/;

/**
 * Get an incremented name (e.g. New page (2)) from a name (e.g. New page), based on an array of
 * existing names.
 *
 * @param name - The name to increment.
 * @param others - The array of existing names.
 * @public
 */
export function getIncrementedName(baseName: string, others: string[]) {
    let result = baseName;
    const set = new Set(others);

    while (set.has(result)) {
        result = TRAILING_NUMBER_PATTERN.exec(result)?.[1]
            ? result.replace(TRAILING_NUMBER_REPLACE_PATTERN, (m) =>
                  (+m + 1).toString()
              )
            : `${result} 1`;
    }

    return result;
}

export function normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
}

export function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");
}

export function decodeHtmlEntities(input: string): string {
    return input
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'");
}

export function normalizeCollectionName(baseName: string): {
    name: string;
    nameKey: string;
} {
    const normalizedName = normalizeWhitespace(baseName);
    return {
        name: normalizedName,
        nameKey: normalizedName.toLowerCase(),
    };
}

const WHITESPACE_PATTERN = /\s+/;

export function getInitials(baseName: string | null, email: string): string {
    const source = baseName?.trim() || email.trim();
    const parts = source.split(WHITESPACE_PATTERN).filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
}

/**
 * A name is a user given human-readable string.
 *
 * It must not be used in URLs.
 *
 * @example the name of a key
 */
export const name = z.string().min(3).max(256);

/**
 * A description is a user given human-readable string.
 *
 * It must not be used in URLs.
 *
 * @example The description of a permission
 */
export const description = z
    .string()
    .min(3)
    .max(256)
    .optional()
    .or(z.literal(""));

export function escapeCsv(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

export function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

export function getNoteExcerpt(
    text: string | null | undefined,
    maxLength = 180
): string {
    const normalizedText = (text ?? "").trim().replaceAll(/\s+/g, " ");
    if (normalizedText.length <= maxLength) {
        return normalizedText;
    }

    return `${normalizedText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
