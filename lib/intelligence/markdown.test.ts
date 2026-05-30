import { describe, expect, test } from "bun:test";
import {
    normalizeExpandedSummary,
    normalizeSummary,
} from "@/lib/intelligence/overview";
import { normalizeGeneratedMarkdown } from "./markdown";

describe("normalizeGeneratedMarkdown", () => {
    test("extracts markdown from common JSON envelopes", () => {
        expect(
            normalizeGeneratedMarkdown(
                '{"summary":"A collection of automotive culture clips."}'
            )
        ).toBe("A collection of automotive culture clips.");
        expect(
            normalizeGeneratedMarkdown('{"markdown":"Done.\\n- Added filters"}')
        ).toBe("Done.\n- Added filters");
    });

    test("extracts fenced JSON envelopes", () => {
        expect(
            normalizeGeneratedMarkdown(
                '```json\n{"summary":"A compact overview."}\n```'
            )
        ).toBe("A compact overview.");
    });

    test("unwraps a single nested envelope", () => {
        expect(
            normalizeGeneratedMarkdown('{"data":{"summary":"Nested summary."}}')
        ).toBe("Nested summary.");
    });

    test("preserves raw markdown and normalizes escaped newlines", () => {
        expect(
            normalizeGeneratedMarkdown(
                "Done.\\n- Added filters\\n- Sorted newest"
            )
        ).toBe("Done.\n- Added filters\n- Sorted newest");
    });

    test("unwraps encoded strings and joins arrays", () => {
        expect(normalizeGeneratedMarkdown('"Done.\\\\n- Added filters"')).toBe(
            "Done.\n- Added filters"
        );
        expect(normalizeGeneratedMarkdown('["One","Two"]')).toBe("One\nTwo");
    });

    test("preserves JSON without a display field as intentional content", () => {
        expect(normalizeGeneratedMarkdown('{"ok":true}')).toBe('{"ok":true}');
    });
});

describe("section overview normalization", () => {
    test("normalizes collapsed JSON summaries before sentence cleanup", () => {
        expect(
            normalizeSummary(
                '{"summary":"A collection of short-form automotive culture videos."}'
            )
        ).toBe("A collection of short-form automotive culture videos.");
    });

    test("normalizes expanded JSON summaries while preserving markdown lines", () => {
        expect(
            normalizeExpandedSummary(
                '{"summary":"Automotive culture and lifestyle trends.\\n- Car clips\\n- Motivation"}'
            )
        ).toBe(
            "Automotive culture and lifestyle trends.\n- Car clips\n- Motivation"
        );
    });
});
