import { describe, expect, test } from "bun:test";

import { GET } from "./route";

function getMarkdown(locale?: string[]): Promise<Response> {
    return GET(new Request("https://www.cachd.app/api/markdown/home"), {
        params: Promise.resolve({ locale }),
    });
}

describe("GET /api/markdown/home", () => {
    test("defaults to English when no locale is provided", async () => {
        const response = await getMarkdown();

        expect(response.status).toBe(200);
        expect(await response.text()).toContain(
            "The AI bookmark manager for busy people"
        );
    });

    test("returns the requested supported locale", async () => {
        const response = await getMarkdown(["es-ES"]);

        expect(response.status).toBe(200);
        expect(await response.text()).toContain(
            "El gestor de marcadores con IA"
        );
    });

    test("rejects unsupported and extra locale segments", async () => {
        for (const locale of [["fr-FR"], ["en-US", "extra"]]) {
            const response = await getMarkdown(locale);

            expect(response.status).toBe(404);
        }
    });
});
