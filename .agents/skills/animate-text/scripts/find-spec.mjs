#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readJson(url) {
    return JSON.parse(readFileSync(url, "utf8"));
}

function scoreSpec(spec, query, terms) {
    let score = 0;
    const id = spec.id.toLowerCase();
    const displayName = spec.display_name.toLowerCase();
    const description = spec.description.toLowerCase();
    const inspiration = spec.inspiration.toLowerCase();
    const usageNotes = spec.usage_notes.toLowerCase();
    const target = spec.target.toLowerCase();
    const renderer = (
        spec.site_reference?.renderer?.id ??
        spec.custom_renderer ??
        ""
    ).toLowerCase();

    if (id === query) {
        score += 120;
    }
    if (displayName === query) {
        score += 100;
    }
    if (id.includes(query)) {
        score += 60;
    }
    if (displayName.includes(query)) {
        score += 45;
    }
    if (target === query) {
        score += 35;
    }
    if (renderer === query) {
        score += 25;
    }

    for (const term of terms) {
        if (id.includes(term)) {
            score += 18;
        }
        if (displayName.includes(term)) {
            score += 14;
        }
        if (description.includes(term)) {
            score += 10;
        }
        if (usageNotes.includes(term)) {
            score += 8;
        }
        if (inspiration.includes(term)) {
            score += 6;
        }
        if (target.includes(term)) {
            score += 5;
        }
        if (renderer.includes(term)) {
            score += 4;
        }
    }

    return score;
}

const rawQuery = process.argv.slice(2).join(" ").trim();

if (!rawQuery) {
    process.stderr.write('Usage: node scripts/find-spec.mjs "<query>"\n');
    process.exit(1);
}

const query = rawQuery.toLowerCase();
const terms = query.split(/\s+/).filter(Boolean);
const catalog = readJson(new URL("../assets/catalog.json", import.meta.url));
const visibleOrder = new Map(
    catalog.visible_ids.map((id, index) => [id, index])
);
const specsDir = new URL("../assets/specs/", import.meta.url);

const results = readdirSync(fileURLToPath(specsDir))
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) =>
        readJson(new URL(`../assets/specs/${fileName}`, import.meta.url))
    )
    .map((spec) => ({
        score: scoreSpec(spec, query, terms),
        spec,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        const leftVisible = visibleOrder.has(left.spec.id);
        const rightVisible = visibleOrder.has(right.spec.id);

        if (leftVisible && rightVisible) {
            return (
                visibleOrder.get(left.spec.id) - visibleOrder.get(right.spec.id)
            );
        }

        if (leftVisible) {
            return -1;
        }

        if (rightVisible) {
            return 1;
        }

        return left.spec.id.localeCompare(right.spec.id);
    })
    .slice(0, 10)
    .map(({ spec, score }) => ({
        description: spec.description,
        display_name: spec.display_name,
        id: spec.id,
        renderer:
            spec.site_reference?.renderer?.id ?? spec.custom_renderer ?? null,
        score,
        target: spec.target,
        visible: spec.visibility
            ? spec.visibility === "visible"
            : visibleOrder.has(spec.id),
    }));

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
