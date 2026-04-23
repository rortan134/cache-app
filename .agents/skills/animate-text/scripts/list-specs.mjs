#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readJson(url) {
    return JSON.parse(readFileSync(url, "utf8"));
}

const catalog = readJson(new URL("../assets/catalog.json", import.meta.url));
const specsDir = new URL("../assets/specs/", import.meta.url);
const visibleOrder = new Map(
    catalog.visible_ids.map((id, index) => [id, index])
);
const specs = readdirSync(fileURLToPath(specsDir))
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) =>
        readJson(new URL(`../assets/specs/${fileName}`, import.meta.url))
    )
    .sort((left, right) => {
        const leftVisible = visibleOrder.has(left.id);
        const rightVisible = visibleOrder.has(right.id);

        if (leftVisible && rightVisible) {
            return visibleOrder.get(left.id) - visibleOrder.get(right.id);
        }

        if (leftVisible) {
            return -1;
        }

        if (rightVisible) {
            return 1;
        }

        return left.id.localeCompare(right.id);
    })
    .map((spec) => ({
        description: spec.description,
        display_name: spec.display_name,
        id: spec.id,
        renderer:
            spec.site_reference?.renderer?.id ??
            spec.custom_renderer ??
            catalog.renderer_overrides?.[spec.id] ??
            null,
        target: spec.target,
        visible: spec.visibility
            ? spec.visibility === "visible"
            : visibleOrder.has(spec.id),
    }));

process.stdout.write(`${JSON.stringify(specs, null, 2)}\n`);
