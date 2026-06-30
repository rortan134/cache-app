import {
    generateMcpToken,
    verifyMcpToken,
    verifyMcpAuthToken,
} from "@/lib/integrations/mcp/auth";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const PREVIOUS_SECRET = process.env.BETTER_AUTH_SECRET;

beforeAll(() => {
    if (!process.env.BETTER_AUTH_SECRET) {
        process.env.BETTER_AUTH_SECRET = "test-secret-do-not-use-in-prod";
    }
});

afterAll(() => {
    // `delete` avoids leaving the key set to the literal string "undefined"
    // when the host process never configured a secret in the first place.
    if (PREVIOUS_SECRET === undefined) {
        delete process.env.BETTER_AUTH_SECRET;
    } else {
        process.env.BETTER_AUTH_SECRET = PREVIOUS_SECRET;
    }
});

describe("generateMcpToken / verifyMcpToken", () => {
    test("round-trips a userId through a freshly issued token", async () => {
        const token = await generateMcpToken("user-123");
        await expect(verifyMcpToken(token)).resolves.toBe("user-123");
    });

    test("rejects a token whose signature is corrupted", async () => {
        const token = await generateMcpToken("user-123");
        const tampered = `${token}x`;
        await expect(verifyMcpToken(tampered)).resolves.toBeNull();
    });

    test("rejects a token with the wrong part count", async () => {
        await expect(verifyMcpToken("not-a-real-token")).resolves.toBeNull();
        await expect(verifyMcpToken("a.b.c")).resolves.toBeNull();
    });

    test("rejects a token signed under a different secret", async () => {
        const original = process.env.BETTER_AUTH_SECRET;
        process.env.BETTER_AUTH_SECRET = "other-secret";
        const token = await generateMcpToken("user-123");
        process.env.BETTER_AUTH_SECRET = original;
        await expect(verifyMcpToken(token)).resolves.toBeNull();
    });

    test("rejects an expired token", async () => {
        const originalVerify = Date.now;
        const issuedAt = 1_700_000_000_000;
        // Generate now, then advance the clock past TTL.
        Date.now = () => issuedAt;
        try {
            const token = await generateMcpToken("user-123");
            // 91 days past issuance: well past the 90-day TTL.
            Date.now = () => issuedAt + 91 * 24 * 60 * 60 * 1000;
            await expect(verifyMcpToken(token)).resolves.toBeNull();
        } finally {
            Date.now = originalVerify;
        }
    });
});

describe("verifyMcpAuthToken", () => {
    test("returns undefined when no bearer is supplied", async () => {
        await expect(
            verifyMcpAuthToken(new Request("https://x"))
        ).resolves.toBeUndefined();
    });

    test("returns undefined when the bearer is malformed", async () => {
        await expect(
            verifyMcpAuthToken(new Request("https://x"), "garbage")
        ).resolves.toBeUndefined();
    });

    test("returns AuthInfo with the userId when the token is valid", async () => {
        const token = await generateMcpToken("user-123");
        const info = await verifyMcpAuthToken(new Request("https://x"), token);
        expect(info).toMatchObject({
            clientId: "user-123",
            extra: { userId: "user-123" },
            scopes: ["library:read", "library:write"],
            token,
        });
    });
});
