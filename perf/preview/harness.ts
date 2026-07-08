// Micro-benchmark harness for app/api/preview/route.ts.
//
// Isolates the route's COMPUTE from network nondeterminism by stubbing the
// three external boundaries the route depends on:
//   1. globalThis.fetch          -> canned Responses keyed by URL + method
//   2. node:dns/promises.lookup  -> instant public-unicast answer (1.2.3.4),
//      so the SSRF check in parsePublicHttpUrl succeeds without real DNS.
//   3. redis.createClient        -> in-memory Map shim (microsecond roundtrips)
//
// What is measured: query parsing, cache serialization/deserialization, redirect
// loop control, body-size-limit streaming, content-type/MIME gating, cache-tag
// and CDN header construction, response assembly. What is excluded: real DNS,
// real upstream HTTP, real Redis network. Those are surfaced by the load test
// (plow against `next dev` + live Redis) and the standalone DNS measurement.
//
// Usage:
//   bun perf/preview/harness.ts paths       # 5 hot paths, p50/p99 + throughput
//   bun perf/preview/harness.ts cold-start  # fresh-process import cost
//   bun perf/preview/harness.ts dns         # per-hop DNS cost (localhost + public)
//   bun perf/preview/harness.ts all
//
// Run from the repo root so the `@/*` tsconfig path alias resolves.

import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Silence the route's debug logging (logger.ts is disabled under NODE_ENV=test)
// so console I/O does not contaminate the compute timings.
Object.assign(process.env, { NODE_ENV: "test" });

const HARNESS_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HARNESS_DIR, "..", "..");
const ROUTE_MODULE = `${REPO_ROOT}/app/api/preview/route.ts`;
const PATH_ITERATIONS = 2000;
const COLD_START_SAMPLES = 30;
const COLD_START_WARMUPS = 3;
const DNS_SAMPLES = 200;
const PUBLIC_DNS_HOST = "github.com";
const REDIRECT_HOPS = 3;
const HOP_PATTERN = /\/hop(\d+)$/;

const TARGET_URL = "https://example.com/page";
const TARGET_IMAGE_URL = "https://example.com/img.png";
const VIDEO_TARGET_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const COBALT_VIDEO_URL = "https://example.com/video.mp4";

// A realistic-sized HTML document (~256 KiB) with the og:image buried inside
// filler markup. Real preview targets ship 100 KiB–2 MiB pages; a tiny fixture
// hides the body-read and cheerio-parse costs that dominate the cache-miss path.
const PAGE_FILLER_BLOCK =
    `<div class="filler"><p>${"lorem ipsum dolor sit amet ".repeat(48)}</p>` +
    `<img src="/static/asset-${"x".repeat(40)}.jpg" alt="asset"></div>`;
const PAGE_HTML =
    "<!doctype html><html><head><title>Page</title>" +
    `<meta property="og:image" content="${TARGET_IMAGE_URL}">` +
    `<meta name="twitter:image" content="${TARGET_IMAGE_URL}">` +
    `<meta property="og:title" content="Example">` +
    "</head><body><h1>Example</h1>" +
    PAGE_FILLER_BLOCK.repeat(256) +
    "</body></html>";

const IMAGE_BYTES = new Uint8Array(8 * 1024);
const VIDEO_BYTES = new Uint8Array(64 * 1024);

interface Sample {
    max: number;
    min: number;
    n: number;
    p50: number;
    p99: number;
    throughput: number;
}

// --- stubs ---------------------------------------------------------------

// A single shared store so the in-memory Redis shim can be reset per path
// without re-creating the cached global client in lib/common/redis.ts.
const redisStore = new Map<string, string>();

type FetchResponder = (
    url: string,
    init: RequestInit
) => Response | Promise<Response>;

function resolveFetchInput(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input;
    }
    if (input instanceof URL) {
        return input.href;
    }
    return input.url;
}

function installFetchStub(responder: FetchResponder): void {
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
            responder(resolveFetchInput(input), init ?? {})
        )) as typeof fetch;
}

function installDnsStub(): void {
    // CJS interop: patching the require()'d export propagates to the ESM
    // `import { lookup }` live binding in lib/common/server-net.ts.
    const dnsPromises = require("node:dns/promises") as {
        lookup: (
            hostname: string
        ) => Promise<readonly { address: string; family: number }[]>;
    };
    dnsPromises.lookup = () =>
        Promise.resolve([{ address: "1.2.3.4", family: 4 }]);
}

interface RedisLike {
    close(): Promise<unknown>;
    connect(): Promise<unknown>;
    del(key: string): Promise<number>;
    destroy(): void;
    get(key: string): Promise<string | null>;
    isReady: boolean;
    on(): void;
    ping(): Promise<string>;
    quit(): Promise<unknown>;
    set(key: string, value: string, options?: { EX?: number }): Promise<string>;
}

function installRedisStub(): void {
    const redis = require("redis") as {
        createClient: (...args: unknown[]) => RedisLike;
    };
    redis.createClient = (): RedisLike => ({
        close: () => Promise.resolve(),
        connect: () => Promise.resolve(),
        del: (key) => Promise.resolve(redisStore.delete(key) ? 1 : 0),
        destroy: () => undefined,
        get: (key) => Promise.resolve(redisStore.get(key) ?? null),
        isReady: true,
        on: () => undefined,
        ping: () => Promise.resolve("PONG"),
        quit: () => Promise.resolve(),
        set: (key, value) => {
            redisStore.set(key, value);
            return Promise.resolve("OK");
        },
    });
}

function resetRedisStore(): void {
    redisStore.clear();
}

// --- canned fetch responders --------------------------------------------

function imageResponseBody(): ReadableStream<Uint8Array> {
    return new Response(IMAGE_BYTES).body as ReadableStream<Uint8Array>;
}

function videoResponseBody(): ReadableStream<Uint8Array> {
    return new Response(VIDEO_BYTES).body as ReadableStream<Uint8Array>;
}

function cacheMissImageResponder(): FetchResponder {
    return (url) => {
        if (url === TARGET_URL) {
            return new Response(PAGE_HTML, {
                headers: { "content-type": "text/html; charset=utf-8" },
                status: 200,
            });
        }
        if (url === TARGET_IMAGE_URL) {
            return new Response(imageResponseBody(), {
                headers: {
                    "content-length": String(IMAGE_BYTES.byteLength),
                    "content-type": "image/png",
                },
                status: 200,
            });
        }
        return new Response("not found", { status: 404 });
    };
}

function videoProxyResponder(): FetchResponder {
    return (url, _init) => {
        if (url.endsWith("preview.cachd.app/")) {
            return new Response(
                JSON.stringify({ status: "tunnel", url: COBALT_VIDEO_URL }),
                {
                    headers: {
                        "content-type": "application/json",
                    },
                    status: 200,
                }
            );
        }
        if (url === COBALT_VIDEO_URL) {
            return new Response(videoResponseBody(), {
                headers: {
                    "accept-ranges": "bytes",
                    "content-length": String(VIDEO_BYTES.byteLength),
                    "content-type": "video/mp4",
                },
                status: 200,
            });
        }
        return new Response("not found", { status: 404 });
    };
}

function redirectChainResponder(): FetchResponder {
    return (url) => {
        const match = HOP_PATTERN.exec(url);
        if (match) {
            const next = Number.parseInt(match[1] ?? "", 10);
            if (next < REDIRECT_HOPS) {
                return new Response(null, {
                    headers: { location: `${TARGET_URL}/hop${next + 1}` },
                    status: 302,
                });
            }
        }
        return new Response(PAGE_HTML, {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
        });
    };
}

// --- request builders ----------------------------------------------------

function buildRequest(
    targetUrl: string,
    params: Record<string, string>
): Request {
    const search = new URLSearchParams({ url: targetUrl, ...params });
    return new Request(`https://cache.local/api/preview?${search}`, {
        signal: new AbortController().signal,
    });
}

interface BenchPath {
    buildRequest: () => Request;
    drainBody: boolean;
    name: string;
    responder: FetchResponder;
    setup: () => void;
}

const PATHS: BenchPath[] = [
    {
        buildRequest: () =>
            buildRequest(TARGET_URL, { delivery: "redirect", type: "image" }),
        drainBody: false,
        name: "cache-hit",
        responder: () => new Response(null, { status: 404 }),
        setup: () => {
            resetRedisStore();
            redisStore.set(
                `preview-image:${hashKey(TARGET_URL)}`,
                JSON.stringify({
                    imageUrl: TARGET_IMAGE_URL,
                    pageUrl: TARGET_URL,
                })
            );
        },
    },
    {
        buildRequest: () =>
            buildRequest(TARGET_URL, { delivery: "proxy", type: "image" }),
        drainBody: true,
        name: "cache-miss-image",
        responder: cacheMissImageResponder(),
        setup: resetRedisStore,
    },
    {
        buildRequest: () =>
            buildRequest(VIDEO_TARGET_URL, {
                delivery: "proxy",
                type: "video",
            }),
        drainBody: true,
        name: "video-proxy",
        responder: videoProxyResponder(),
        setup: resetRedisStore,
    },
    {
        buildRequest: () =>
            buildRequest(`${TARGET_URL}/hop0`, {
                delivery: "proxy",
                type: "image",
            }),
        drainBody: true,
        name: "redirect-chain",
        responder: redirectChainResponder(),
        setup: resetRedisStore,
    },
];

// --- helpers -------------------------------------------------------------

function hashKey(targetHref: string): string {
    // Mirrors route's hashTargetUrl (sha256, first 16 hex chars) so the cache-hit
    // pre-populated key matches what the route will look up.
    const { createHash } = require("node:crypto") as {
        createHash: (alg: string) => {
            update: (data: string) => { digest: (enc: string) => string };
        };
    };
    return createHash("sha256").update(targetHref).digest("hex").slice(0, 16);
}

function percentile(sorted: number[], q: number): number {
    if (sorted.length === 0) {
        return 0;
    }
    const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(q * sorted.length) - 1)
    );
    return sorted[idx] ?? 0;
}

function summarize(samplesMs: number[]): Sample {
    const sorted = [...samplesMs].sort((a, b) => a - b);
    const total = samplesMs.reduce((sum, v) => sum + v, 0);
    const seconds = total / 1000;
    return {
        max: sorted.at(-1) ?? 0,
        min: sorted.at(0) ?? 0,
        n: samplesMs.length,
        p50: percentile(sorted, 0.5),
        p99: percentile(sorted, 0.99),
        throughput: seconds > 0 ? samplesMs.length / seconds : 0,
    };
}

function formatSample(s: Sample): string {
    const pad = (n: number, w = 8) => n.toFixed(3).padStart(w);
    return `${pad(s.p50)}  ${pad(s.p99)}  ${pad(s.throughput, 9)}`;
}

// --- path benchmark ------------------------------------------------------

async function runPathBench(
    path: BenchPath,
    iterations: number
): Promise<Sample> {
    path.setup();
    installFetchStub(path.responder);

    const samples: number[] = [];
    // Warmup: let V8/Bun JIT settle and fill the redis global client.
    for (let w = 0; w < 200; w++) {
        const res = await pathBenchOnce(path);
        await res.body?.cancel().catch(() => undefined);
    }

    for (let i = 0; i < iterations; i++) {
        path.setup();
        const start = performance.now();
        const res = await pathBenchOnce(path);
        if (path.drainBody) {
            await res.body?.cancel().catch(() => undefined);
        }
        samples.push(performance.now() - start);
    }
    return summarize(samples);
}

// Imported lazily after stubs are installed so the redis/dns live bindings
// resolve to the stubs.
type GetHandler = (request: Request) => Promise<Response>;
let cachedGet: GetHandler | null = null;

async function loadRoute(): Promise<GetHandler> {
    if (!cachedGet) {
        const mod = await import(ROUTE_MODULE);
        cachedGet = mod.GET as GetHandler;
    }
    return cachedGet;
}

async function pathBenchOnce(path: BenchPath): Promise<Response> {
    const get = await loadRoute();
    return get(path.buildRequest());
}

function printPathHeader(): void {
    console.log("path                       p50(ms)   p99(ms)   req/s");
    console.log("-".repeat(60));
}

async function benchPaths(): Promise<void> {
    installDnsStub();
    installRedisStub();
    printPathHeader();
    for (const path of PATHS) {
        const sample = await runPathBench(path, PATH_ITERATIONS);
        console.log(`${path.name.padEnd(26)} ${formatSample(sample)}`);
    }
}

// --- cold-start benchmark ------------------------------------------------

async function benchColdStart(): Promise<void> {
    // Spawn fresh processes that import the route once and report the wall time.
    // Each child is a clean module graph (no warm cache), so this reflects the
    // import-evaluation cost a cold serverless instance pays.
    const childSource = `
const t0 = performance.now();
await import(${JSON.stringify(ROUTE_MODULE)});
const dt = performance.now() - t0;
process.stdout.write(String(dt));
`;
    const childFile = join(REPO_ROOT, "perf/preview/.cold-start-child.ts");
    writeFileSync(childFile, childSource);

    const samples: number[] = [];
    for (let i = 0; i < COLD_START_WARMUPS + COLD_START_SAMPLES; i++) {
        const dt = await runChild(["bun", "run", childFile]);
        if (i >= COLD_START_WARMUPS) {
            samples.push(dt);
        }
    }
    rmSync(childFile, { force: true });

    const s = summarize(samples);
    console.log("cold-start import (fresh process, route.ts transitive)");
    console.log("-".repeat(60));
    console.log("p50(ms)   p99(ms)   min       max       n");
    console.log(
        `${s.p50.toFixed(3).padStart(8)}  ${s.p99.toFixed(3).padStart(8)}  ${s.min.toFixed(3).padStart(8)}  ${s.max.toFixed(3).padStart(8)}  ${s.n}`
    );
}

function runChild(cmd: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd[0] ?? "bun", cmd.slice(1), {
            stdio: ["ignore", "pipe", "inherit"],
        });
        let out = "";
        child.stdout.on("data", (chunk: Buffer) => {
            out += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
            const value = Number.parseFloat(out.trim());
            if (code !== 0 || Number.isNaN(value)) {
                reject(new Error(`child exited ${code}: ${out}`));
                return;
            }
            resolve(value);
        });
    });
}

// --- DNS benchmark -------------------------------------------------------

async function benchDns(): Promise<void> {
    const { lookup } = await import("node:dns/promises");
    const opts = { all: true, verbatim: true } as const;

    // Warm the resolver cache.
    await lookup("localhost", opts);
    await lookup(PUBLIC_DNS_HOST, opts).catch(() => undefined);

    const localhostSamples: number[] = [];
    const publicSamples: number[] = [];
    for (let i = 0; i < DNS_SAMPLES; i++) {
        const t0 = performance.now();
        await lookup("localhost", opts);
        localhostSamples.push(performance.now() - t0);
    }
    for (let i = 0; i < DNS_SAMPLES; i++) {
        const t0 = performance.now();
        await lookup(PUBLIC_DNS_HOST, opts).catch(() => undefined);
        publicSamples.push(performance.now() - t0);
    }

    const local = summarize(localhostSamples);
    const pub = summarize(publicSamples);
    console.log("DNS lookup cost (resolvesToBlockedHostname per-hop input)");
    console.log("-".repeat(60));
    console.log("host           p50(ms)   p99(ms)   n");
    console.log(
        `localhost      ${local.p50.toFixed(3).padStart(8)}  ${local.p99.toFixed(3).padStart(8)}  ${local.n}`
    );
    console.log(
        `${PUBLIC_DNS_HOST.padEnd(14)} ${pub.p50.toFixed(3).padStart(8)}  ${pub.p99.toFixed(3).padStart(8)}  ${pub.n}`
    );
    console.log(
        `\nPer-redirect-hop SSRF cost (public host): ~${pub.p50.toFixed(3)}ms p50, ` +
            `${pub.p99.toFixed(3)}ms p99. A ${REDIRECT_HOPS}-hop chain pays this ${REDIRECT_HOPS + 1} times ` +
            "(initial parsePublicHttpUrl + one per hop)."
    );
}

// --- entry ---------------------------------------------------------------

async function main(): Promise<void> {
    const mode = process.argv[2] ?? "all";
    switch (mode) {
        case "paths":
            await benchPaths();
            break;
        case "cold-start":
            await benchColdStart();
            break;
        case "dns":
            await benchDns();
            break;
        case "all":
            await benchColdStart();
            console.log("");
            await benchDns();
            console.log("");
            await benchPaths();
            break;
        default:
            console.error(`unknown mode: ${mode}`);
            console.error(
                "usage: bun perf/preview/harness.ts [paths|cold-start|dns|all]"
            );
            process.exit(2);
    }
}

await main();
