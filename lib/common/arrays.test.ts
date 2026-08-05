import { describe, expect, test } from "bun:test";
import { countBy } from "@/lib/common/arrays";

describe("countBy", () => {
    test("counts keys that overlap with object prototype properties", () => {
        const counts = countBy(
            ["__proto__", "toString", "__proto__"],
            (value) => value
        );

        expect(
            Object.getOwnPropertyDescriptor(counts, "__proto__")?.value
        ).toBe(2);
        expect(Object.getOwnPropertyDescriptor(counts, "toString")?.value).toBe(
            1
        );
    });
});
