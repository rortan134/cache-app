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
type Loggable =
    | LoggablePrimitive
    | Error
    | readonly Loggable[]
    | { readonly [key: string]: Loggable };

export type { Loggable };

interface RedactionContext {
    readonly redactionCache: Map<string, string>;
}

/**
 * Redacts sensitive entities from text using Arcjet.
 * Detects email addresses, phone numbers, IP addresses, and credit cards.
 */
async function redactSensitiveEntities(
    text: string,
    context: RedactionContext
): Promise<string> {
    if (text.length === 0) {
        return text;
    }

    const cached = context.redactionCache.get(text);
    if (cached !== undefined) {
        return cached;
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
        context.redactionCache.set(text, redacted);
        return redacted;
    } catch {
        // Error logging must remain best-effort, even if the redaction engine fails.
        return text;
    }
}

/**
 * Applies entity redaction after structural formatting has made the value finite.
 */
async function redactSanitizedStrings(
    value: unknown,
    context: RedactionContext
): Promise<unknown> {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string") {
        return await redactSensitiveEntities(value, context);
    }

    if (Array.isArray(value)) {
        return await Promise.all(
            value.map((item) => redactSanitizedStrings(item, context))
        );
    }

    if (typeof value === "object") {
        const record: Record<string, unknown> = {};
        await Promise.all(
            Object.entries(value).map(async ([key, item]) => {
                record[key] = await redactSanitizedStrings(item, context);
            })
        );
        return record;
    }

    return value;
}

/**
 * Sanitizes values for logging with comprehensive protection:
 *
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
    const context: RedactionContext = {
        redactionCache: new Map(),
    };

    return await redactSanitizedStrings(structurallySanitized, context);
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
