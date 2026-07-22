import { formatLogValue } from "@/lib/common/logs/format";
import { redact } from "@arcjet/redact";

/**
 * Primitive types that can be logged as-is.
 */
type LoggablePrimitive = string | number | boolean | null | undefined | bigint;

/**
 * Recursive type definition for values that can be sanitized.
 * Excludes symbols and functions, which are rejected by sanitizeForLog.
 */
export type Loggable =
    | LoggablePrimitive
    | Error
    | readonly Loggable[]
    | { readonly [key: string]: Loggable };

/**
 * Redacts sensitive entities from text using Arcjet.
 * Detects email addresses, phone numbers, IP addresses, and credit cards.
 */
async function redactSensitiveEntities(text: string): Promise<string> {
    if (text.length === 0) {
        return text;
    }

    try {
        const [redacted] = await redact(text, {
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
        // Error logging must remain best-effort, even if the redaction engine fails.
        return text;
    }
}

/**
 * Applies entity redaction after structural formatting has made the value finite.
 */
async function redactSanitizedStrings(value: unknown): Promise<unknown> {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string") {
        return await redactSensitiveEntities(value);
    }

    if (Array.isArray(value)) {
        return await Promise.all(value.map(redactSanitizedStrings));
    }

    if (typeof value === "object") {
        const record: Record<string, unknown> = {};
        await Promise.all(
            Object.entries(value).map(async ([key, item]) => {
                record[key] = await redactSanitizedStrings(item);
            })
        );
        return record;
    }

    return value;
}

/**
 * 1. Entity-level redaction via Arcjet
 * 2. Pattern-based key redaction
 * 3. String truncation
 * 4. Array/object sampling
 * 5. Circular reference prevention
 * 6. Error property extraction
 *
 * @param value - Value to sanitize. Rejects symbols and functions.
 * @returns Sanitized value safe for logging.
 * @throws {TypeError} If value contains non-loggable types.
 */
export async function sanitizeForLog(value: unknown): Promise<unknown> {
    const structurallySanitized = formatLogValue(value, {
        unsupportedValueBehavior: "throw",
    });
    return await redactSanitizedStrings(structurallySanitized);
}

export async function safeSanitize(
    value: unknown,
    fallback = "[Unsanitizable]"
): Promise<unknown> {
    try {
        return await sanitizeForLog(value);
    } catch {
        return fallback;
    }
}
