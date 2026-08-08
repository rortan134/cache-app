import { describe, expect, test } from "bun:test";

import { GET } from "./route";

describe("GET /api/sitemap", () => {
    test("returns a text/xml sitemap", async () => {
        const response = GET();

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe(
            "text/xml; charset=utf-8"
        );
        expect(await response.text()).toContain(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
        );
    });
});
