import {
    formatLogValue,
    LOG_ARRAY_SAMPLE_LIMIT,
    LOG_OBJECT_KEYS_LIMIT,
    LOG_STRING_MAX_LENGTH,
} from "@/lib/common/logs/format";
import { safeSanitize, sanitizeForLog } from "@/lib/common/logs/sanitize";
import { describe, expect, test } from "bun:test";

describe("formatLogValue", () => {
    test("redacts sensitive keys through nested records", () => {
        expect(
            formatLogValue({
                apiKey: "abc123",
                nested: {
                    password: "hunter2",
                },
                visible: "ok",
            })
        ).toEqual({
            apiKey: "[REDACTED]",
            nested: {
                password: "[REDACTED]",
            },
            visible: "ok",
        });
    });

    test("keeps arrays bounded with length metadata and a sample", () => {
        const values = Array.from(
            { length: LOG_ARRAY_SAMPLE_LIMIT + 1 },
            (_, index) => index
        );

        expect(formatLogValue(values)).toEqual({
            length: LOG_ARRAY_SAMPLE_LIMIT + 1,
            sample: [0, 1, 2, 3, 4],
            type: "array",
        });
    });

    test("keeps records bounded with truncated key metadata", () => {
        const value = Object.fromEntries(
            Array.from({ length: LOG_OBJECT_KEYS_LIMIT + 1 }, (_, index) => [
                `field${index}`,
                index,
            ])
        );

        expect(formatLogValue(value)).toEqual({
            __truncated__: "1 more keys",
            field0: 0,
            field1: 1,
            field2: 2,
            field3: 3,
            field4: 4,
            field5: 5,
            field6: 6,
            field7: 7,
            field8: 8,
            field9: 9,
            field10: 10,
            field11: 11,
        });
    });

    test("truncates long strings", () => {
        const value = "a".repeat(LOG_STRING_MAX_LENGTH + 3);

        expect(formatLogValue(value)).toBe(
            `${"a".repeat(LOG_STRING_MAX_LENGTH)}... [truncated 3 chars]`
        );
    });

    test("marks circular references", () => {
        const value: Record<string, unknown> = { name: "root" };
        value.self = value;

        expect(formatLogValue(value)).toEqual({
            name: "root",
            self: "[Circular]",
        });
    });

    test("can reject non-loggable values for strict sanitizers", () => {
        expect(() =>
            formatLogValue(
                { transform: () => "nope" },
                { unsupportedValueBehavior: "throw" }
            )
        ).toThrow(TypeError);
    });
});

describe("sanitizeForLog", () => {
    test("uses the shared formatter before async entity redaction", async () => {
        const value: Record<string, unknown> = { token: "abc123" };
        value.self = value;

        await expect(sanitizeForLog(value)).resolves.toEqual({
            self: "[Circular]",
            token: "[REDACTED]",
        });
    });

    test("returns the fallback for unsupported values", async () => {
        await expect(
            safeSanitize({ transform: () => "nope" }, "[fallback]")
        ).resolves.toBe("[fallback]");
    });
});
