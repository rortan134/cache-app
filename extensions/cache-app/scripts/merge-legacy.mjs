import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
    "build/chrome-mv3-dev",
    "build/chrome-mv3-prod",
];

const legacyFiles = [
    "cache-config.js",
    "cache-extension-runtime.js",
    "cache-site-bootstrap.js",
    "cache-site-page-bridge.js",
    "content.js",
    "service-worker.js",
    "youtube-page-bootstrap.js",
];

const contentScripts = [
    {
        js: ["cache-extension-runtime.js", "content.js"],
        matches: [
            "https://www.instagram.com/*",
            "https://www.tiktok.com/*",
            "https://www.youtube.com/*",
        ],
        run_at: "document_idle",
    },
    {
        js: [
            "cache-config.js",
            "cache-extension-runtime.js",
            "cache-site-bootstrap.js",
        ],
        matches: [
            "http://localhost:3000/*",
            "https://cachd.app/*",
            "https://*.cachd.app/*",
        ],
        run_at: "document_idle",
    },
];

const legacyWebAccessibleResources = [
    {
        matches: ["https://www.youtube.com/*"],
        resources: ["youtube-page-bootstrap.js"],
    },
    {
        matches: [
            "http://localhost:3000/*",
            "https://cachd.app/*",
            "https://*.cachd.app/*",
        ],
        resources: ["cache-site-page-bridge.js"],
    },
];

function mergeManifest(buildDir) {
    const manifestPath = join(buildDir, "manifest.json");
    if (!existsSync(manifestPath)) {
        return false;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    manifest.background = {
        service_worker: "service-worker.js",
    };

    manifest.content_scripts = [
        ...(Array.isArray(manifest.content_scripts) ? manifest.content_scripts : []),
        ...contentScripts,
    ];

    // Remove default_popup so action.onClicked fires instead.
    // The popup UI is now rendered as a content script overlay.
    if (manifest.action) {
        delete manifest.action.default_popup;
    }

    const plasmoWar = Array.isArray(manifest.web_accessible_resources)
        ? manifest.web_accessible_resources
        : [];
    const mergedWar = [...plasmoWar];
    for (const legacyEntry of legacyWebAccessibleResources) {
        const existing = mergedWar.find(
            (entry) =>
                Array.isArray(entry?.resources) &&
                Array.isArray(legacyEntry?.resources) &&
                entry.resources.length === legacyEntry.resources.length &&
                entry.resources.every(
                    (r, i) => r === legacyEntry.resources[i],
                ),
        );
        if (existing) {
            const matches = new Set([
                ...(existing.matches ?? []),
                ...(legacyEntry.matches ?? []),
            ]);
            existing.matches = [...matches];
        } else {
            mergedWar.push(legacyEntry);
        }
    }
    manifest.web_accessible_resources = mergedWar;

    // Plasmo-generated `action.default_popup` and `icons` are left untouched.

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return true;
}

function copyLegacy(buildDir) {
    for (const file of legacyFiles) {
        const from = join(root, file);
        if (!existsSync(from)) {
            console.warn(`[merge-legacy] missing ${file}`);
            continue;
        }
        copyFileSync(from, join(buildDir, file));
    }

    const iconsFrom = join(root, "icons", "icon.png");
    if (existsSync(iconsFrom)) {
        const iconsDir = join(buildDir, "icons");
        mkdirSync(iconsDir, { recursive: true });
        copyFileSync(iconsFrom, join(iconsDir, "icon.png"));
    }
}

let merged = 0;
for (const rel of targets) {
    const buildDir = join(root, rel);
    if (!existsSync(buildDir)) {
        continue;
    }
    copyLegacy(buildDir);
    if (mergeManifest(buildDir)) {
        merged += 1;
        console.log(`[merge-legacy] updated ${rel}`);
    }
}

if (merged === 0) {
    console.warn("[merge-legacy] no Plasmo build directories found");
    process.exitCode = 1;
}
