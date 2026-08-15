import { describe, expect, test } from "bun:test";
import * as z from "zod";
import { NamedError } from "@/lib/common/error";

const TestError = NamedError.create(
    "TestError",
    z.object({ message: z.string() })
);

describe("NamedError.isInstance", () => {
    test("accepts errors with a matching, valid serialized shape", () => {
        expect(
            TestError.isInstance({
                data: { message: "Expected failure" },
                name: "TestError",
            })
        ).toBe(true);
    });

    test("rejects matching names with missing or malformed data", () => {
        expect(TestError.isInstance({ name: "TestError" })).toBe(false);
        expect(
            TestError.isInstance({
                data: { message: 1 },
                name: "TestError",
            })
        ).toBe(false);
    });
});
