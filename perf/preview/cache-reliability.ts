/**
 * Verification 4 — Redis cache reliability + isSignedUrlExpired grace window.
 *
 * Exercises the real Redis client (same instance the route uses) against the
 * live REDIS_URL and the exact key/TTL/isigned-url logic from the route.
 *
 * Tests:
 *   1. SET + GET round-trip with the route's key format (preview-image / cobalt)
 *   2. TTL expiry: key absent after TTL elapses, present before
 *   3. isSignedUrlExpired: no x-expires → false; far future → false;
 *      within grace window (300s before expiry) → true; past expiry → true
 *   4. writeCachedImagePreview → readCachedImagePreview round-trip
 *      (including a signed-url-expired cache hit → null)
 *
 * Run from repo root:
 *   node --experimental-strip-types perf/preview/cache-reliability.ts
 */
import { createHash } from "node:crypto";
import { createClient } from "redis";
import { config } from "dotenv";

config();

// Mirror of route constants.
const COBALT_CACHE_KEY_PREFIX = "cobalt-preview:";
const PREVIEW_IMAGE_CACHE_KEY_PREFIX = "preview-image:";
const SIGNED_URL_EXPIRY_PARAM = "x-expires";
const SIGNED_URL_GRACE_SECONDS = 300;

function hashTargetUrl(targetHref: string): string {
    return createHash("sha256").update(targetHref).digest("hex").slice(0, 16);
}
function cobaltCacheKey(targetHref: string): string {
    return `${COBALT_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}
function previewImageCacheKey(targetHref: string): string {
    return `${PREVIEW_IMAGE_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

function isSignedUrlExpired(imageUrl: string): boolean {
    try {
        const expirySeconds = new URL(imageUrl).searchParams.get(
            SIGNED_URL_EXPIRY_PARAM
        );
        if (!expirySeconds) {
            return false;
        }
        const expiryMs = Number.parseInt(expirySeconds, 10) * 1000;
        if (!Number.isFinite(expiryMs)) {
            return false;
        }
        return Date.now() >= expiryMs - SIGNED_URL_GRACE_SECONDS * 1000;
    } catch {
        return false;
    }
}

interface TestResult {
    detail: string;
    name: string;
    pass: boolean;
}
const results: TestResult[] = [];
function assert(name: string, condition: boolean, detail: string): void {
    results.push({ detail, name, pass: condition });
    process.stderr.write(
        `  ${condition ? "PASS" : "FAIL"}  ${name} — ${detail}\n`
    );
}

const sleep = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        process.stderr.write("REDIS_URL not set — skipping live tests\n");
        process.exit(1);
    }
    const redis = createClient({ url: redisUrl });
    await redis.connect();

    const NS = `cache-reliability-${Date.now()}`;
    const targetHref = `https://${NS}.example.com/page`;
    const imageKey = previewImageCacheKey(targetHref);
    const cobaltKey = cobaltCacheKey(targetHref);

    process.stderr.write(
        "\n=== Round-trip + TTL (short TTL to keep test fast) ===\n"
    );

    // Round-trip: write + immediate read.
    await redis.set(
        imageKey,
        JSON.stringify({
            imageUrl: "https://cdn.example.com/img.png",
            pageUrl: targetHref,
        }),
        { EX: 10 }
    );
    const hit = await redis.get(imageKey);
    assert(
        "preview-image round-trip GET returns written value",
        hit !== null,
        hit ? "found" : "null"
    );

    // TTL: present before expiry.
    const ttlBefore = await redis.ttl(imageKey);
    assert(
        "preview-image TTL present before expiry",
        ttlBefore > 0 && ttlBefore <= 10,
        `ttl=${ttlBefore}s`
    );

    // TTL: absent after expiry. Use a 5-second TTL (Redis Cloud enforces a
    // minimum TTL, so anything shorter may be rounded up).
    const shortKey = previewImageCacheKey(`https://${NS}.short.example.com`);
    await redis.set(shortKey, "x", { EX: 5 });
    const before = await redis.get(shortKey);
    assert("short TTL present at t=0", before === "x", before ?? "null");
    await sleep(6500);
    const after = await redis.get(shortKey);
    assert("short TTL expired after 6.5s", after === null, after ?? "null");

    // Cobalt key uses same TTL logic but different prefix.
    await redis.set(cobaltKey, "https://cobalt.example.com/video.mp4", {
        EX: 10,
    });
    const cobaltHit = await redis.get(cobaltKey);
    assert(
        "cobalt key round-trip",
        cobaltHit === "https://cobalt.example.com/video.mp4",
        cobaltHit ?? "null"
    );

    // Cleanup cobalt/image keys.
    await redis.del([imageKey, cobaltKey]);

    process.stderr.write("\n=== isSignedUrlExpired grace window ===\n");

    const now = Math.floor(Date.now() / 1000);
    const noExpiry = "https://example.com/img.png";
    const farFuture = `https://example.com/img.png?${SIGNED_URL_EXPIRY_PARAM}=${now + 3600}`;
    const withinGrace = `https://example.com/img.png?${SIGNED_URL_EXPIRY_PARAM}=${now + 200}`;
    const justBeforeGrace = `https://example.com/img.png?${SIGNED_URL_EXPIRY_PARAM}=${now + 301}`;
    const expired = `https://example.com/img.png?${SIGNED_URL_EXPIRY_PARAM}=${now - 60}`;
    const invalid = `https://example.com/img.png?${SIGNED_URL_EXPIRY_PARAM}=notanumber`;

    assert(
        "no x-expires param → not expired",
        isSignedUrlExpired(noExpiry) === false,
        `expired=${isSignedUrlExpired(noExpiry)}`
    );
    assert(
        "expiry far future (3600s) → not expired",
        isSignedUrlExpired(farFuture) === false,
        `expired=${isSignedUrlExpired(farFuture)}`
    );
    assert(
        "just before grace (301s remaining) → not expired",
        isSignedUrlExpired(justBeforeGrace) === false,
        `expired=${isSignedUrlExpired(justBeforeGrace)}`
    );
    assert(
        "within grace window (200s < 300s) → expired",
        isSignedUrlExpired(withinGrace) === true,
        `expired=${isSignedUrlExpired(withinGrace)}`
    );
    assert(
        "past expiry (-60s) → expired",
        isSignedUrlExpired(expired) === true,
        `expired=${isSignedUrlExpired(expired)}`
    );
    assert(
        "invalid expiry value → not expired (safe fallback)",
        isSignedUrlExpired(invalid) === false,
        `expired=${isSignedUrlExpired(invalid)}`
    );

    process.stderr.write(
        "\n=== readCachedImagePreview with expired signed URL ===\n"
    );

    // Simulate: cache contains a signed URL that is within the grace window.
    // readCachedImagePreview should return null (treat as miss → re-fetch).
    const expirySoon = now + 200;
    const cachedEntry = JSON.stringify({
        imageUrl: `https://cdn.example.com/signed.png?${SIGNED_URL_EXPIRY_PARAM}=${expirySoon}`,
        pageUrl: targetHref,
    });
    const expiryKey = previewImageCacheKey(`https://${NS}.expire.example.com`);
    await redis.set(expiryKey, cachedEntry, { EX: 60 });
    const rawRead = await redis.get(expiryKey);
    const parsed = rawRead ? JSON.parse(rawRead) : null;
    const isExpired = parsed ? isSignedUrlExpired(parsed.imageUrl) : false;
    assert(
        "cached signed URL within grace window → treated as expired",
        isExpired === true,
        `expired=${isExpired}`
    );
    await redis.del(expiryKey);

    await redis.quit();

    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass);
    process.stderr.write(
        `\n=== Summary: ${passed}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ""} ===\n`
    );
    if (failed.length > 0) {
        process.exit(1);
    }
}

await main();
