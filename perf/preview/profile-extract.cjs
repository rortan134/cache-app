"use strict";
// CPU-profile harness for the moved frame: the cache-miss image extraction.
// mode = "cheerio"  -> link-preview-js getPreviewFromContent (baseline)
// mode = "htmlparser2" -> app/api/preview/extract extractPreviewImageUrls (after)
//
// Run under `node --cpu-prof` to capture a V8 .cpuprofile, then parse with
// perf/preview/parse-cpuprofile.cjs to get the top-3 frames by self-time.
//
//   node --experimental-strip-types --cpu-prof \
//       --cpu-prof-dir=/tmp/cpu-profiles perf/preview/profile-extract.cjs cheerio
//   node --experimental-strip-types --cpu-prof \
//       --cpu-prof-dir=/tmp/cpu-profiles perf/preview/profile-extract.cjs htmlparser2

const { getPreviewFromContent } = require("link-preview-js");
const { extractPreviewImageUrls } = require("../../app/api/preview/extract.ts");

const FILLER =
    `<div><p>${"lorem ipsum dolor sit amet ".repeat(20)}</p>` +
    `<img src="/static/asset-${"x".repeat(40)}.jpg" alt="asset"></div>`;
const HTML =
    "<!doctype html><html><head><title>Page</title>" +
    `<meta property="og:image" content="https://example.com/img.png">` +
    `<meta name="twitter:image" content="https://example.com/tw.png">` +
    `</head><body>${FILLER.repeat(256)}</body></html>`;
const BASE_URL = "https://example.com/page";
const mode = process.argv[2] ?? "htmlparser2";
const ITERATIONS = mode === "cheerio" ? 3000 : 30_000;

(async () => {
    // Warm up so JIT does not dominate the profile.
    for (let i = 0; i < 100; i++) {
        if (mode === "cheerio") {
            await getPreviewFromContent({
                data: HTML,
                headers: { "content-type": "text/html" },
                url: BASE_URL,
            });
        } else {
            extractPreviewImageUrls(HTML, BASE_URL);
        }
    }

    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        if (mode === "cheerio") {
            await getPreviewFromContent({
                data: HTML,
                headers: { "content-type": "text/html" },
                url: BASE_URL,
            });
        } else {
            extractPreviewImageUrls(HTML, BASE_URL);
        }
    }
    const elapsed = performance.now() - start;
    process.stderr.write(
        `${mode}: ${ITERATIONS} iters in ${elapsed.toFixed(1)}ms ` +
            `(${(elapsed / ITERATIONS).toFixed(3)}ms/iter)\n`
    );
})();
