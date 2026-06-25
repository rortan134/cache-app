import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function loadTranslations(locale: string) {
    const filePath = path.join(
        /* turbopackIgnore: true */ process.cwd(),
        "public",
        "_gt",
        `${locale}.json`
    );

    const translations = await readFile(filePath, "utf8");
    return JSON.parse(translations) as Record<string, unknown>;
}
