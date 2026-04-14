import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function loadTranslations(
    locale: string
): Promise<Record<string, unknown>> {
    const filePath = path.join(
        /* turbopackIgnore: true */ process.cwd(),
        "public",
        "_gt",
        `${locale}.json`
    );
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}
