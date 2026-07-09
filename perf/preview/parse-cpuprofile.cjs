"use strict";
// Parses a V8 .cpuprofile and prints the top-N frames by self time.
// Self time per node = hitCount (samples where the node is the leaf of the
// sampled stack). Prints functionName, script url, self-ms (estimated), and
// share of total samples.
//
//   node perf/preview/parse-cpuprofile.cjs <cpuprofile-file> [topN]

const fs = require("node:fs");

const file = process.argv[2];
const topN = Number.parseInt(process.argv[3] ?? "10", 10);

const profile = JSON.parse(fs.readFileSync(file, "utf8"));
const nodes = profile.nodes;
const samples = profile.samples;
const timeDeltas = profile.timeDeltas;
const totalUs = timeDeltas.reduce((sum, d) => sum + d, 0);

// hitCount per node (self samples).
const hits = new Map();
for (const id of samples) {
    hits.set(id, (hits.get(id) ?? 0) + 1);
}

const ranked = [...nodes]
    .map((node) => {
        const count = hits.get(node.id) ?? 0;
        const selfUs = (count / samples.length) * totalUs;
        return {
            count,
            line: node.callFrame.lineNumber,
            name: node.callFrame.functionName || "(anonymous)",
            selfMs: selfUs / 1000,
            url: node.callFrame.url || "",
        };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.selfMs - a.selfMs);

process.stderr.write(
    `total samples=${samples.length} duration=${(totalUs / 1000).toFixed(1)}ms\n`
);
for (const entry of ranked.slice(0, topN)) {
    const where = entry.url ? ` ${entry.url}:${entry.line}` : "";
    process.stdout.write(
        `${entry.selfMs.toFixed(2).padStart(9)}ms ` +
            `${((entry.count / samples.length) * 100).toFixed(1).padStart(5)}% ` +
            `${entry.name}${where}\n`
    );
}
