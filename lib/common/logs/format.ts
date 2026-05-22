export const SENSITIVE_LOG_KEY_PATTERN =
    /pass|secret|token|key|otp|authorization|cookie/i;
export const LOG_STRING_MAX_LENGTH = 2000;
export const LOG_ARRAY_SAMPLE_LIMIT = 5;
export const LOG_OBJECT_KEYS_LIMIT = 12;

const REDACTED_LOG_VALUE = "[REDACTED]";
const CIRCULAR_LOG_VALUE = "[Circular]";
const ERROR_STANDARD_FIELD_NAMES = new Set(["message", "name", "stack"]);

type UnsupportedLogValueBehavior = "describe" | "throw";

interface LogValueFormatContext {
    readonly options: RequiredLogValueFormatOptions;
    readonly visitedObjects: WeakSet<object>;
}

interface RequiredLogValueFormatOptions {
    readonly formatString: (value: string) => string;
    readonly includeErrorStack: boolean;
    readonly unsupportedValueBehavior: UnsupportedLogValueBehavior;
}

export interface LogValueFormatOptions {
    readonly formatString?: (value: string) => string;
    readonly includeErrorStack?: boolean;
    readonly unsupportedValueBehavior?: UnsupportedLogValueBehavior;
}

export function truncateLogString(value: string): string {
    if (value.length <= LOG_STRING_MAX_LENGTH) {
        return value;
    }

    return `${value.slice(0, LOG_STRING_MAX_LENGTH)}... [truncated ${value.length - LOG_STRING_MAX_LENGTH} chars]`;
}

export function formatLogValue(
    value: unknown,
    options: LogValueFormatOptions = {}
): unknown {
    return formatValueForLog("", value, {
        options: resolveFormatOptions(options),
        visitedObjects: new WeakSet(),
    });
}

function resolveFormatOptions(
    options: LogValueFormatOptions
): RequiredLogValueFormatOptions {
    return {
        formatString: options.formatString ?? truncateLogString,
        includeErrorStack: options.includeErrorStack ?? true,
        unsupportedValueBehavior:
            options.unsupportedValueBehavior ?? "describe",
    };
}

function formatErrorForLog(
    error: Error,
    context: LogValueFormatContext
): Record<string, unknown> {
    const record: Record<string, unknown> = {
        message: context.options.formatString(error.message),
        name: error.name,
    };

    if (context.options.includeErrorStack) {
        record.stack =
            error.stack === undefined
                ? error.stack
                : context.options.formatString(error.stack);
    }

    for (const [key, value] of Object.entries(error)) {
        if (ERROR_STANDARD_FIELD_NAMES.has(key)) {
            continue;
        }
        record[key] = formatValueForLog(key, value, context);
    }

    return record;
}

function formatObjectForLog(
    value: object,
    context: LogValueFormatContext
): unknown {
    if (context.visitedObjects.has(value)) {
        return CIRCULAR_LOG_VALUE;
    }
    context.visitedObjects.add(value);

    if (value instanceof Error) {
        return formatErrorForLog(value, context);
    }

    if (Array.isArray(value)) {
        return {
            length: value.length,
            sample: value
                .slice(0, LOG_ARRAY_SAMPLE_LIMIT)
                .map((item) => formatValueForLog("", item, context)),
            type: "array",
        };
    }

    const keys = Object.keys(value);
    const record: Record<string, unknown> = {};
    for (const key of keys.slice(0, LOG_OBJECT_KEYS_LIMIT)) {
        record[key] = formatValueForLog(key, Reflect.get(value, key), context);
    }

    const remainingKeys = keys.length - LOG_OBJECT_KEYS_LIMIT;
    if (remainingKeys > 0) {
        record.__truncated__ = `${remainingKeys} more keys`;
    }

    return record;
}

function formatUnsupportedValueForLog(
    value: unknown,
    context: LogValueFormatContext
): string {
    if (context.options.unsupportedValueBehavior === "throw") {
        throw new TypeError(
            `Cannot sanitize ${typeof value} for logging. Only primitives, errors, arrays, and objects are supported.`
        );
    }

    if (typeof value === "function") {
        return "[Function]";
    }
    return typeof value === "symbol" ? value.toString() : String(value);
}

function formatValueForLog(
    key: string,
    value: unknown,
    context: LogValueFormatContext
): unknown {
    if (SENSITIVE_LOG_KEY_PATTERN.test(key)) {
        return REDACTED_LOG_VALUE;
    }
    if (typeof value === "string") {
        return context.options.formatString(value);
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    if (typeof value === "function" || typeof value === "symbol") {
        return formatUnsupportedValueForLog(value, context);
    }
    if (typeof value === "object" && value !== null) {
        return formatObjectForLog(value, context);
    }

    return value;
}
