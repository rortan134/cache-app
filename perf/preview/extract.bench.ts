import { bench, boxplot, run, summary } from "mitata";

import { extractPreviewImageUrls } from "@/app/api/preview/extract";

const BASE_URL = "https://example.com/page";
const TARGET_IMAGE_URL = "https://example.com/img.png";

const FILLER_BLOCK =
    `<div class="filler"><p>${"lorem ipsum dolor sit amet ".repeat(48)}</p>` +
    `<img src="/static/asset-${"x".repeat(40)}.jpg" alt="asset"></div>`;

const FIXTURES = {
    empty: "<!doctype html><html><head><title>Page</title></head><body></body></html>",

    "image-src": `<link rel="image_src" href="/fav.png"><img src="https://x.com/a.png">`,

    "img-fallback":
        "<!doctype html><html><body>" +
        `<img src="/a.png"><img src="/b.png"><img src="/a.png">` +
        "</body></html>",

    mixed:
        "<!doctype html><html><head>" +
        `<meta property="og:image" content="${TARGET_IMAGE_URL}">` +
        "</head><body>" +
        FILLER_BLOCK.repeat(128) +
        "</body></html>",

    "og-name-only": `<meta name="og:image" content="${TARGET_IMAGE_URL}">`,

    "og-property-large":
        "<!doctype html><html><head><title>Page</title>" +
        `<meta property="og:image" content="${TARGET_IMAGE_URL}">` +
        `<meta property="og:title" content="Example">` +
        "</head><body><h1>Example</h1>" +
        FILLER_BLOCK.repeat(256) +
        "</body></html>",

    "og-property-small": `<meta property="og:image" content="${TARGET_IMAGE_URL}">`,
} as const;

boxplot(() => {
    summary(() => {
        for (const [name, html] of Object.entries(FIXTURES)) {
            bench(name, () => {
                extractPreviewImageUrls(html, BASE_URL);
            });
        }
    });
});

await run();
