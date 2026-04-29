import { describe, expect, test } from "bun:test";
import { resolveCobaltPreview } from "./cobalt.ts";

const LIVE_COBALT_TEST_URL =
    process.env.LIVE_COBALT_TEST_URL ??
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const LIVE_COBALT_TIMEOUT_MS = 45_000;
const HTTP_PROTOCOL_PATTERN = /^https?:$/;

describe("resolveCobaltPreview live API", () => {
    test(
        "resolves a live Cobalt preview URL to reachable media",
        async () => {
            const preview = await resolveCobaltPreview(LIVE_COBALT_TEST_URL);
            if (preview.status !== "SUCCESS") {
                throw new Error(
                    `Expected live Cobalt success, got ${preview.status}: ${preview.message} (${preview.errorCode ?? "no_code"})`
                );
            }

            const mediaUrl = preview.videoPreviewUrl ?? preview.staticImageUrl;
            expect(mediaUrl).toBeTruthy();
            expect(new URL(mediaUrl ?? "").protocol).toMatch(
                HTTP_PROTOCOL_PATTERN
            );

            const response = await fetch(mediaUrl ?? "", {
                headers: {
                    Range: "bytes=0-1023",
                },
            });

            expect(response.ok || response.status === 206).toBe(true);
            expect(response.url.startsWith("http")).toBe(true);
        },
        LIVE_COBALT_TIMEOUT_MS
    );
});
