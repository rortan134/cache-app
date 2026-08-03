interface AcceptEntry {
    position: number;
    quality: number;
    specificity: number;
    type: string;
}

/**
 * Selects the best representation from a server's supported media types.
 * Specific Accept ranges take precedence over wildcards for each candidate,
 * even when the wildcard has a higher quality value.
 */
export function negotiateContentType(
    acceptHeader: string | null,
    supportedTypes: readonly string[],
    defaultType: string
): string | null {
    if (!acceptHeader) {
        return defaultType;
    }

    const entries = parseAcceptHeader(acceptHeader);
    if (entries.length === 0) {
        return defaultType;
    }

    let bestPosition = Number.POSITIVE_INFINITY;
    let bestQuality = -1;
    let bestType: string | null = null;

    for (const supportedType of supportedTypes) {
        const normalizedSupportedType = supportedType.toLowerCase();
        let bestMatch: AcceptEntry | null = null;

        for (const entry of entries) {
            if (!matchesMediaType(entry.type, normalizedSupportedType)) {
                continue;
            }

            if (
                bestMatch === null ||
                entry.specificity > bestMatch.specificity ||
                (entry.specificity === bestMatch.specificity &&
                    entry.position < bestMatch.position)
            ) {
                bestMatch = entry;
            }
        }

        if (bestMatch === null || bestMatch.quality <= 0) {
            continue;
        }

        if (
            bestMatch.quality > bestQuality ||
            (bestMatch.quality === bestQuality &&
                bestMatch.position < bestPosition)
        ) {
            bestQuality = bestMatch.quality;
            bestPosition = bestMatch.position;
            bestType = supportedType;
        }
    }

    return bestType;
}

/** Adds `Accept` to Vary without dropping values set by another layer. */
export function appendVaryAccept(headers: Headers): void {
    const existing = headers.get("Vary");
    if (!existing) {
        headers.set("Vary", "Accept");
        return;
    }

    const values = existing.split(",").map((value) => value.trim());
    if (!values.some((value) => value.toLowerCase() === "accept")) {
        headers.set("Vary", `${existing}, Accept`);
    }
}

function parseAcceptHeader(header: string): AcceptEntry[] {
    return header
        .split(",")
        .map((raw, position) => {
            const parts = raw.trim().split(";");
            const type = parts[0]?.trim().toLowerCase() ?? "";
            let quality = 1;

            for (const parameter of parts.slice(1)) {
                const separatorIndex = parameter.indexOf("=");
                if (separatorIndex === -1) {
                    continue;
                }

                const name = parameter.slice(0, separatorIndex).trim();
                if (name.toLowerCase() !== "q") {
                    continue;
                }

                const parsedQuality = Number(
                    parameter.slice(separatorIndex + 1).trim()
                );
                if (!Number.isNaN(parsedQuality)) {
                    quality = Math.max(0, Math.min(1, parsedQuality));
                }
            }

            return {
                position,
                quality,
                specificity: getSpecificity(type),
                type,
            };
        })
        .filter((entry) => entry.type.length > 0);
}

function getSpecificity(type: string): number {
    if (type === "*/*") {
        return 0;
    }

    return type.endsWith("/*") ? 1 : 2;
}

function matchesMediaType(range: string, candidate: string): boolean {
    if (range === "*/*") {
        return true;
    }

    if (range.endsWith("/*")) {
        return candidate.startsWith(range.slice(0, -1));
    }

    return range === candidate;
}
