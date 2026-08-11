import { redact } from "@arcjet/redact";
import { formatLogValue } from "@/lib/common/logs/format";

/**
 * Redacts sensitive entities (email addresses, phone numbers, IP addresses,
 * and credit cards) from a single text value using Arcjet.
 */
async function redactString(string: string): Promise<string> {
    if (string.length === 0) {
        return string;
    }

    try {
        const [redacted] = await redact(string, {
            entities: [
                "email",
                "phone-number",
                "ip-address",
                "credit-card",
                "credit-card-number",
            ],
        });
        return redacted;
    } catch {
        return string;
    }
}

/**
 * Recursively redacts every string found inside arrays and records,
 * preserving all other values. Runs after formatting, so the input is
 * guaranteed acyclic and bounded.
 */
async function redactDeep(value: unknown): Promise<unknown> {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string") {
        return await redactString(value);
    }

    if (Array.isArray(value)) {
        return await Promise.all(value.map(redactDeep));
    }

    if (typeof value === "object") {
        const record: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            record[key] = await redactDeep(item);
        }
        return record;
    }

    return value;
}

/**
 * Formats a value for logging, then redacts sensitive entities embedded in it.
 *
 * @param value - Value to sanitize. Rejects symbols and functions.
 * @returns Sanitized value safe for logging.
 * @throws {TypeError} If value contains non-loggable types.
 */
export async function sanitizeLog(value: unknown): Promise<unknown> {
    return await redactDeep(
        formatLogValue(value, {
            unsupportedValueBehavior: "throw",
        })
    );
}

/**
 * Best-effort sanitization: returns the fallback value when the value cannot
 * be sanitized, so logging never fails on unloggable data.
 */
export async function sanitizeLogSafe(
    value: unknown,
    fallback = "[Unsanitizable]"
): Promise<unknown> {
    try {
        return await sanitizeLog(value);
    } catch {
        return fallback;
    }
}
