import { redact } from "@arcjet/redact";

/**
 * Robust redaction module for sanitizing sensitive information from logs.
 * Architecture: Type-safe, modular sanitizers with explicit contracts.
 */

// ============================================================================
// Type System - Explicit contracts for what we accept
// ============================================================================

/**
 * Primitive types that can be logged as-is
 */
type LoggablePrimitive = string | number | boolean | null | undefined | bigint;

/**
 * Recursive type definition for values that can be sanitized.
 * Excludes symbols and functions which cannot be meaningfully logged.
 */
type Loggable =
    | LoggablePrimitive
    | Error
    | readonly Loggable[]
    | { readonly [key: string]: Loggable };

/**
 * Re-export for consumers who need the type for type annotations
 */
export type { Loggable };

/**
 * Sanitization context shared across all sanitizers
 */
interface SanitizationContext {
    readonly redactionCache: Map<string, string>;
    readonly visitedObjects: WeakSet<object>;
}

// ============================================================================
// Configuration Constants
// ============================================================================

const SENSITIVE_KEY_PATTERN = /pass|secret|token|key|otp|authorization|cookie/i;
const STRING_MAX_LENGTH = 2000;
const ARRAY_SAMPLE_LIMIT = 5;
const OBJECT_KEYS_LIMIT = 12;

// ============================================================================
// Core Sanitizers - Modular, single-responsibility functions
// ============================================================================

/**
 * Redacts sensitive entities from text using Arcjet.
 * Detects: email addresses, phone numbers, IP addresses, credit cards
 */
async function redactSensitiveEntities(
    text: string,
    context: SanitizationContext
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
        // Arcjet failure fallback - return original text
        // Better to log unredacted than to crash
        return text;
    }
}

/**
 * Sanitizes string values: redacts sensitive entities, then truncates if needed
 */
async function sanitizeString(
    text: string,
    context: SanitizationContext
): Promise<string> {
    const isOverLimit = text.length > STRING_MAX_LENGTH;
    const processingText = isOverLimit
        ? text.slice(0, STRING_MAX_LENGTH)
        : text;

    const redactedText = await redactSensitiveEntities(processingText, context);

    if (!isOverLimit) {
        return redactedText;
    }

    const truncatedLength = text.length - STRING_MAX_LENGTH;
    return `${redactedText}… [truncated ${truncatedLength} chars]`;
}

/**
 * Sanitizes arrays: samples first N items to avoid performance issues
 */
async function sanitizeArray(
    items: readonly Loggable[],
    context: SanitizationContext
): Promise<{
    readonly type: "array";
    readonly length: number;
    readonly sample: unknown[];
}> {
    const itemsToSample = items.slice(0, ARRAY_SAMPLE_LIMIT);
    const sanitizedSample = await Promise.all(
        itemsToSample.map((item) => sanitizeValue(item, context))
    );

    return {
        length: items.length,
        sample: sanitizedSample,
        type: "array",
    };
}

/**
 * Sanitizes Error objects: extracts standard properties + custom fields
 */
async function sanitizeError(
    error: Error,
    context: SanitizationContext
): Promise<Record<string, unknown>> {
    const standardFields = ["name", "message", "stack"];
    const customFields = Object.fromEntries(
        Object.entries(error).filter(([key]) => !standardFields.includes(key))
    );

    const errorRecord = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...customFields,
    };

    return await sanitizeRecord(errorRecord, context);
}

/**
 * Sanitizes objects: redacts sensitive keys, limits key count for performance
 *
 * Risk mitigation: Pattern-based key detection catches sensitive field names
 */
async function sanitizeRecord(
    record: Record<string, Loggable>,
    context: SanitizationContext
): Promise<Record<string, unknown>> {
    const allKeys = Object.keys(record);
    const keysToProcess = allKeys.slice(0, OBJECT_KEYS_LIMIT);
    const sanitizedRecord: Record<string, unknown> = {};

    // Process keys in parallel for performance
    await Promise.all(
        keysToProcess.map(async (key) => {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                sanitizedRecord[key] = "[REDACTED]";
            } else {
                sanitizedRecord[key] = await sanitizeValue(
                    record[key],
                    context
                );
            }
        })
    );

    const remainingKeys = allKeys.length - OBJECT_KEYS_LIMIT;
    if (remainingKeys > 0) {
        sanitizedRecord.__truncated__ = `${remainingKeys} more keys`;
    }

    return sanitizedRecord;
}

/**
 * Type-safe dispatcher for object-like values
 *
 * Risk mitigation: Circular reference detection prevents infinite loops
 */
async function sanitizeObject(
    value: object,
    context: SanitizationContext
): Promise<unknown> {
    // Prevent infinite loops from circular references
    if (context.visitedObjects.has(value)) {
        return "[Circular]";
    }
    context.visitedObjects.add(value);

    // Dispatch to specialized sanitizers
    if (value instanceof Error) {
        return await sanitizeError(value, context);
    }
    if (Array.isArray(value)) {
        return await sanitizeArray(value as Loggable[], context);
    }
    return await sanitizeRecord(value as Record<string, Loggable>, context);
}

/**
 * Core sanitization dispatcher - routes values to appropriate sanitizers
 *
 * @throws {TypeError} If value is a symbol or function (non-loggable types)
 */
async function sanitizeValue(
    value: Loggable,
    context: SanitizationContext
): Promise<unknown> {
    if (value === null || value === undefined) {
        return value;
    }

    // Type narrowing with explicit checks
    if (typeof value === "string") {
        return await sanitizeString(value, context);
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    if (typeof value === "object") {
        return await sanitizeObject(value, context);
    }

    // Reject non-loggable types (symbols, functions)
    throw new TypeError(
        `Cannot sanitize ${typeof value} for logging. Only primitives, errors, arrays, and objects are supported.`
    );
}

// ============================================================================
// Public API - Clean entry point with context initialization
// ============================================================================

/**
 * Sanitizes values for logging with comprehensive protection:
 *
 * 1. Entity-level redaction (email, phone, IP, credit card) via Arcjet
 * 2. Pattern-based key redaction (passwords, tokens, secrets)
 * 3. String truncation for long values
 * 4. Array/object sampling to limit size
 * 5. Circular reference prevention
 * 6. Error property extraction
 *
 * @param value - Value to sanitize. Accepts: primitives, errors, arrays, objects.
 *                Rejects: symbols, functions (throws TypeError)
 * @returns Sanitized value safe for logging
 * @throws {TypeError} If value contains non-loggable types (symbols, functions)
 *
 * @example
 * ```ts
 * const sanitized = await sanitizeForLog({
 *   email: "user@example.com",
 *   password: "secret123"
 * });
 * // { email: "<Redacted email #1>", password: "[REDACTED]" }
 * ```
 */
export async function sanitizeForLog(value: Loggable): Promise<unknown> {
    const context: SanitizationContext = {
        redactionCache: new Map(),
        visitedObjects: new WeakSet(),
    };

    return await sanitizeValue(value, context);
}

export async function safeSanitize(
    value: unknown,
    fallback = "[Unsanitizable]"
): Promise<unknown> {
    try {
        return await sanitizeForLog(value as Loggable);
    } catch {
        return fallback;
    }
}
