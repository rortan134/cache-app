/**
 * Reusable micro-bench harness for `/api/preview`.
 *
 * Run: `bun perf/preview/harness.ts <command>`
 * Commands: cold-start | paths | cache-reliability | dns | all
 *
 * Cache-hit redirect uses Redis only (no upstream). Proxy / miss / redirect-chain
 * hit public hosts so `parsePublicHttpUrl` SSRF checks pass (loopback is blocked).
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { lookup } from "node:dns/promises";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface LatencyStats {
    count: number;
    maxMs: number;
    meanMs: number;
    minMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughputRps: number;
}

export function percentile(sorted: number[], q: number): number {
    if (sorted.length === 0) {
        return 0;
    }
    const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(q * sorted.length) - 1)
    );
    return sorted[idx] ?? 0;
}

export function summarizeLatencies(
    samplesMs: number[],
    wallMs: number
): LatencyStats {
    const sorted = [...samplesMs].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;
    return {
        count,
        maxMs: sorted.at(-1) ?? 0,
        meanMs: count === 0 ? 0 : sum / count,
        minMs: sorted[0] ?? 0,
        p50Ms: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
        p99Ms: percentile(sorted, 0.99),
        throughputRps: wallMs > 0 ? (count / wallMs) * 1000 : 0,
    };
}

export function formatStats(label: string, s: LatencyStats): string {
    return [
        label,
        `n=${s.count}`,
        `p50=${s.p50Ms.toFixed(2)}ms`,
        `p95=${s.p95Ms.toFixed(2)}ms`,
        `p99=${s.p99Ms.toFixed(2)}ms`,
        `mean=${s.meanMs.toFixed(2)}ms`,
        `min=${s.minMs.toFixed(2)}ms`,
        `max=${s.maxMs.toFixed(2)}ms`,
        `thru=${s.throughputRps.toFixed(1)}/s`,
    ].join("  ");
}

export async function benchAsync(
    name: string,
    iterations: number,
    fn: () => Promise<void>,
    opts?: { warmup?: number }
): Promise<LatencyStats> {
    const warmup = opts?.warmup ?? Math.min(5, Math.floor(iterations / 5));
    for (let i = 0; i < warmup; i += 1) {
        await fn();
    }
    const samples: number[] = [];
    const wall0 = performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const t0 = performance.now();
        await fn();
        samples.push(performance.now() - t0);
    }
    const wallMs = performance.now() - wall0;
    const stats = summarizeLatencies(samples, wallMs);
    console.log(formatStats(name, stats));
    return stats;
}

// ---------------------------------------------------------------------------
// Public fixtures (SSRF-safe)
// ---------------------------------------------------------------------------

/** Stable page with og:image that allows facebookexternalhit UA. */
export const FIXTURE_HTML_PAGE =
    "https://ogp.me/"; /** Small public PNG for proxy / cache-hit image body (allows facebookexternalhit UA). */
export const FIXTURE_IMAGE =
    "https://httpbingo.org/image/png"; /** Single-hop redirect ending at an image. */
export const FIXTURE_REDIRECT_CHAIN =
    "https://httpbingo.org/redirect-to?url=https%3A%2F%2Fhttpbingo.org%2Fimage%2Fpng&status_code=302";
/** Cobalt-eligible bookmark URL used only as cache key for video proxy hit. */
export const FIXTURE_VIDEO_PAGE =
    "https://www.tiktok.com/@perf_preview_bench/video/0000000000000000000";
/** Public sample mp4. */
export const FIXTURE_VIDEO =
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const videoFixtureUrl = FIXTURE_VIDEO;
// ---------------------------------------------------------------------------
// Redis key helpers (mirrors route)
// ---------------------------------------------------------------------------

const PREVIEW_IMAGE_CACHE_KEY_PREFIX = "preview-image:";
const COBALT_CACHE_KEY_PREFIX = "cobalt-preview:";
export const PREVIEW_IMAGE_CACHE_TTL_SECONDS = 5 * 60;
export const COBALT_CACHE_TTL_SECONDS = 5 * 60;
const SIGNED_URL_EXPIRY_PARAM = "x-expires";
const SIGNED_URL_GRACE_SECONDS = 300;

export function hashTargetUrl(targetHref: string): string {
    return createHash("sha256").update(targetHref).digest("hex").slice(0, 16);
}

export function previewImageCacheKey(targetHref: string): string {
    return `${PREVIEW_IMAGE_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

export function cobaltCacheKey(targetHref: string): string {
    return `${COBALT_CACHE_KEY_PREFIX}${hashTargetUrl(targetHref)}`;
}

export async function waitForRedis(timeoutMs = 5000) {
    const { getRedisClient, healthCheck } = await import(
        "../../lib/common/redis.ts"
    );
    const t0 = Date.now();
    // Prime client creation
    getRedisClient();
    while (Date.now() - t0 < timeoutMs) {
        const client = getRedisClient();
        if (client?.isReady) {
            await healthCheck();
            return client;
        }
        await new Promise((r) => setTimeout(r, 25));
        getRedisClient();
    }
    throw new Error("Redis unavailable: healthCheck timeout");
}

// ---------------------------------------------------------------------------
// Cold-start
// ---------------------------------------------------------------------------

export function measureColdStartImport(samples = 30): LatencyStats {
    const routePath = resolve("app/api/preview/route.ts");
    const samplesMs: number[] = [];
    const wall0 = performance.now();
    for (let i = 0; i < samples; i += 1) {
        const code = `
            const t0 = performance.now();
            await import(${JSON.stringify(routePath)});
            console.log(performance.now() - t0);
        `;
        const result = spawnSync("bun", ["--eval", code], {
            cwd: process.cwd(),
            encoding: "utf8",
            env: process.env,
        });
        if (result.status !== 0) {
            throw new Error(
                `cold-start import failed: ${result.stderr || result.stdout}`
            );
        }
        const line = result.stdout.trim().split("\n").pop() ?? "";
        const ms = Number.parseFloat(line);
        if (!Number.isFinite(ms)) {
            throw new Error(`bad cold-start sample: ${result.stdout}`);
        }
        samplesMs.push(ms);
    }
    const stats = summarizeLatencies(samplesMs, performance.now() - wall0);
    console.log(formatStats("cold-start import (route.ts)", stats));
    return stats;
}

// ---------------------------------------------------------------------------
// Path benches
// ---------------------------------------------------------------------------

export async function measurePaths(iterations = 40) {
    const redis = await waitForRedis();
    const { GET } = await import("../../app/api/preview/route.ts");

    // Synthetic cache key URL (does not need to be fetchable for redirect hit)
    const cachedPageUrl = "https://example.com/perf-preview-cache-hit";
    await redis.set(
        previewImageCacheKey(cachedPageUrl),
        JSON.stringify({
            imageUrl: FIXTURE_IMAGE,
            pageUrl: cachedPageUrl,
        }),
        { EX: PREVIEW_IMAGE_CACHE_TTL_SECONDS }
    );

    await redis.set(cobaltCacheKey(FIXTURE_VIDEO_PAGE), videoFixtureUrl, {
        EX: COBALT_CACHE_TTL_SECONDS,
    });

    const results: Record<string, LatencyStats> = {};

    results["cache-hit redirect"] = await benchAsync(
        "cache-hit redirect",
        iterations,
        async () => {
            const res = await GET(
                new Request(
                    `http://localhost:3000/api/preview?url=${encodeURIComponent(cachedPageUrl)}&delivery=redirect`
                )
            );
            if (res.status !== 307) {
                throw new Error(
                    `expected 307, got ${res.status} ${await res.text()}`
                );
            }
            await res.arrayBuffer();
        }
    );

    results["cache-hit proxy"] = await benchAsync(
        "cache-hit proxy",
        Math.min(iterations, 20),
        async () => {
            const res = await GET(
                new Request(
                    `http://localhost:3000/api/preview?url=${encodeURIComponent(cachedPageUrl)}&delivery=proxy`
                )
            );
            if (res.status !== 200) {
                throw new Error(
                    `expected 200, got ${res.status} ${await res.text()}`
                );
            }
            await res.arrayBuffer();
        },
        { warmup: 2 }
    );

    results["cache-miss image redirect"] = await benchAsync(
        "cache-miss image redirect",
        Math.min(iterations, 15),
        async () => {
            // Unique URL each time so Redis cannot hit (query varies cache key)
            const missUrl = `${FIXTURE_HTML_PAGE}?perf=${Date.now()}-${Math.random()}`;
            const res = await GET(
                new Request(
                    `http://localhost:3000/api/preview?url=${encodeURIComponent(missUrl)}&delivery=redirect`
                )
            );
            if (res.status !== 307) {
                throw new Error(
                    `expected 307 miss, got ${res.status} ${await res.text()}`
                );
            }
            await res.arrayBuffer();
        },
        { warmup: 1 }
    );

    results["video proxy (redis hit)"] = await benchAsync(
        "video proxy (redis hit)",
        Math.min(iterations, 10),
        async () => {
            const res = await GET(
                new Request(
                    `http://localhost:3000/api/preview?url=${encodeURIComponent(FIXTURE_VIDEO_PAGE)}&type=video&delivery=proxy`
                )
            );
            if (res.status !== 200) {
                throw new Error(
                    `expected 200 video, got ${res.status} ${await res.text()}`
                );
            }
            // Only read headers / first chunk to avoid multi-MB body cost dominating
            await res.body?.cancel().catch(() => undefined);
        },
        { warmup: 1 }
    );

    results["redirect-chain"] = await benchAsync(
        "redirect-chain",
        Math.min(iterations, 12),
        async () => {
            const chainUrl = `${FIXTURE_REDIRECT_CHAIN}&n=${Date.now()}`;
            const res = await GET(
                new Request(
                    `http://localhost:3000/api/preview?url=${encodeURIComponent(chainUrl)}&delivery=redirect`
                )
            );
            if (!(res.status === 307 || res.status === 200)) {
                throw new Error(
                    `unexpected redirect-chain status ${res.status} ${await res.text()}`
                );
            }
            await res.arrayBuffer();
        },
        { warmup: 1 }
    );

    return results;
}

// ---------------------------------------------------------------------------
// Cache reliability
// ---------------------------------------------------------------------------

/** Mirror of route isSignedUrlExpired for unit-level grace checks. */
export function isSignedUrlExpired(imageUrl: string): boolean {
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

export async function measureCacheReliability() {
    const redis = await waitForRedis();
    const target = "https://example.com/perf-preview-ttl-probe";
    const imageKey = previewImageCacheKey(target);
    const cobaltKey = cobaltCacheKey(target);

    await redis.set(
        imageKey,
        JSON.stringify({
            imageUrl: "https://cdn.example.com/i.png",
            pageUrl: target,
        }),
        { EX: PREVIEW_IMAGE_CACHE_TTL_SECONDS }
    );
    await redis.set(cobaltKey, "https://cdn.example.com/v.mp4", {
        EX: COBALT_CACHE_TTL_SECONDS,
    });

    const imageTtl = await redis.ttl(imageKey);
    const cobaltTtl = await redis.ttl(cobaltKey);

    console.log(
        `preview-image Redis TTL: ${imageTtl}s (expected ~${PREVIEW_IMAGE_CACHE_TTL_SECONDS})`
    );
    console.log(
        `cobalt-preview Redis TTL: ${cobaltTtl}s (expected ~${COBALT_CACHE_TTL_SECONDS})`
    );
    console.log(
        "Browser Cache-Control max-age=60 (not Redis); s-maxage=300 matches CDN header."
    );

    if (
        imageTtl < PREVIEW_IMAGE_CACHE_TTL_SECONDS - 5 ||
        imageTtl > PREVIEW_IMAGE_CACHE_TTL_SECONDS
    ) {
        throw new Error(`preview TTL out of range: ${imageTtl}`);
    }
    if (
        cobaltTtl < COBALT_CACHE_TTL_SECONDS - 5 ||
        cobaltTtl > COBALT_CACHE_TTL_SECONDS
    ) {
        throw new Error(`cobalt TTL out of range: ${cobaltTtl}`);
    }

    const { GET } = await import("../../app/api/preview/route.ts");
    const hitUrl = "https://example.com/perf-preview-hit-miss";
    await redis.del(previewImageCacheKey(hitUrl));

    // MISS then HIT for redirect delivery with seeded-after-miss simulation
    await redis.set(
        previewImageCacheKey(hitUrl),
        JSON.stringify({
            imageUrl: FIXTURE_IMAGE,
            pageUrl: hitUrl,
        }),
        { EX: 60 }
    );
    const hitRes = await GET(
        new Request(
            `http://localhost:3000/api/preview?url=${encodeURIComponent(hitUrl)}&delivery=redirect`
        )
    );
    console.log(
        `cache HIT redirect status=${hitRes.status} (expect 307) location=${hitRes.headers.get("location")?.slice(0, 60)}`
    );
    await hitRes.arrayBuffer();

    // Fresh URL never written to L1 or Redis → true miss (L1 survives redis.del).
    const missUrl = `https://example.com/perf-preview-true-miss-${Date.now()}`;
    const missRes = await GET(
        new Request(
            `http://localhost:3000/api/preview?url=${encodeURIComponent(missUrl)}&delivery=redirect`
        )
    );
    // example.com has no og:image → 404 Preview not found on miss
    console.log(
        `cache MISS redirect status=${missRes.status} (expect 404 for example.com shell)`
    );
    if (missRes.status === 307) {
        throw new Error("true miss should not 307");
    }
    await missRes.arrayBuffer();

    const nowSec = Math.floor(Date.now() / 1000);
    const signedCases: {
        name: string;
        expires: number | null;
        expectExpired: boolean;
    }[] = [
        { expectExpired: false, expires: null, name: "no x-expires" },
        {
            expectExpired: false,
            expires: nowSec + 3600,
            name: "far future",
        },
        {
            expectExpired: true,
            expires: nowSec + SIGNED_URL_GRACE_SECONDS - 10,
            name: "inside grace (expiry - 10s < now+grace)",
        },
        {
            expectExpired: true,
            expires: nowSec - 10,
            name: "already past",
        },
        {
            expectExpired: false,
            expires: nowSec + SIGNED_URL_GRACE_SECONDS + 30,
            name: "just outside grace",
        },
    ];

    for (const c of signedCases) {
        const url =
            c.expires === null
                ? "https://cdn.example.com/a.png"
                : `https://cdn.example.com/a.png?${SIGNED_URL_EXPIRY_PARAM}=${c.expires}`;
        const expired = isSignedUrlExpired(url);
        const ok = expired === c.expectExpired;
        console.log(
            `${ok ? "OK" : "FAIL"}  isSignedUrlExpired: ${c.name} → ${expired}`
        );
        if (!ok) {
            throw new Error(`isSignedUrlExpired mismatch: ${c.name}`);
        }
    }

    // End-to-end: expired signed URL in Redis is treated as miss
    const signedTarget = "https://example.com/perf-signed";
    const expiredSigned = `https://cdn.example.com/a.png?${SIGNED_URL_EXPIRY_PARAM}=${nowSec - 1}`;
    await redis.set(
        previewImageCacheKey(signedTarget),
        JSON.stringify({
            imageUrl: expiredSigned,
            pageUrl: signedTarget,
        }),
        { EX: 60 }
    );
    const signedRes = await GET(
        new Request(
            `http://localhost:3000/api/preview?url=${encodeURIComponent(signedTarget)}&delivery=redirect`
        )
    );
    // Falls through to miss → example.com → 404
    console.log(
        `expired signed cache entry status=${signedRes.status} (expect 404 miss, not 307 hit)`
    );
    if (signedRes.status === 307) {
        throw new Error("expired signed URL should not serve from cache");
    }
    await signedRes.arrayBuffer();

    await redis.del(imageKey);
    await redis.del(cobaltKey);
    await redis.del(previewImageCacheKey(signedTarget));
}

// ---------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------

export async function measureDns(samples = 30) {
    for (const host of ["localhost", "127.0.0.1", "example.com"] as const) {
        const times: number[] = [];
        try {
            await lookup(host, { all: true, verbatim: true });
        } catch {
            // warmup
        }
        for (let i = 0; i < samples; i += 1) {
            const t0 = performance.now();
            try {
                await lookup(host, { all: true, verbatim: true });
            } catch {
                // still record elapsed
            }
            times.push(performance.now() - t0);
        }
        console.log(
            formatStats(
                `dns.lookup(${host})`,
                summarizeLatencies(
                    times,
                    times.reduce((a, b) => a + b, 0)
                )
            )
        );
    }
}

// ---------------------------------------------------------------------------
// CLI (only when executed directly — Bun sets import.meta.main)
// ---------------------------------------------------------------------------

if (import.meta.main) {
    const command = process.argv[2] ?? "all";

    async function main() {
        console.log(
            `runtime: bun ${process.versions.bun ?? process.version} | node-compat`
        );
        console.log(`command: ${command}`);
        console.log(`date: ${new Date().toISOString()}`);
        console.log(`videoFixture: ${videoFixtureUrl}`);

        if (command === "cold-start" || command === "all") {
            console.log("\n== cold-start ==");
            measureColdStartImport(command === "all" ? 20 : 30);
        }
        if (command === "dns" || command === "all") {
            console.log("\n== dns ==");
            await measureDns();
        }
        if (command === "paths" || command === "all") {
            console.log("\n== paths ==");
            await measurePaths(command === "all" ? 30 : 40);
        }
        if (command === "cache-reliability" || command === "all") {
            console.log("\n== cache-reliability ==");
            await measureCacheReliability();
        }
    }

    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
