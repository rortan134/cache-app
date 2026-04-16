const NOTE_ALLOWED_TAGS = new Set([
    "br",
    "div",
    "em",
    "i",
    "mark",
    "p",
    "s",
    "strike",
    "strong",
    "u",
]);
const NOTE_TAG_ALIASES: Record<string, string> = {
    b: "strong",
    div: "p",
    i: "em",
    strike: "s",
};
const NOTE_BLOCK_END_TAGS = /<\/(div|p)>/gi;
const NOTE_BREAK_TAGS = /<br\s*\/?>/gi;
const NOTE_TAGS = /<(\/?)([a-z0-9]+)(?:\s[^>]*)?>/gi;
const NOTE_STRIP_TAGS = /<[^>]+>/g;
const NOTE_SCRIPT_STYLE_BLOCKS =
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const NOTE_COMMENTS = /<!--[\s\S]*?-->/g;
const NOTE_EMPTY_PARAGRAPHS = /<p>(?:\s|<br>)*<\/p>/gi;

function decodeHtmlEntities(value: string): string {
    return value
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'");
}

export function sanitizeNoteHtml(input: string): string {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
        return "<p></p>";
    }

    const withoutUnsafeBlocks = trimmedInput
        .replaceAll(NOTE_SCRIPT_STYLE_BLOCKS, "")
        .replaceAll(NOTE_COMMENTS, "");

    const sanitized = withoutUnsafeBlocks.replaceAll(
        NOTE_TAGS,
        (_match, closingSlash: string, tagName: string) => {
            const normalizedTagName = tagName.toLowerCase();
            if (!NOTE_ALLOWED_TAGS.has(normalizedTagName)) {
                return "";
            }

            const resolvedTagName =
                NOTE_TAG_ALIASES[normalizedTagName] ?? normalizedTagName;

            if (resolvedTagName === "br") {
                return "<br>";
            }

            return closingSlash
                ? `</${resolvedTagName}>`
                : `<${resolvedTagName}>`;
        }
    );

    const normalizedParagraphs = sanitized
        .replaceAll(/\r\n?/g, "\n")
        .replaceAll(/<p><\/p>/gi, "")
        .replaceAll(NOTE_EMPTY_PARAGRAPHS, "")
        .trim();

    return normalizedParagraphs.length > 0 ? normalizedParagraphs : "<p></p>";
}

export function extractNoteText(input: string): string {
    const sanitizedHtml = sanitizeNoteHtml(input);

    return decodeHtmlEntities(
        sanitizedHtml
            .replaceAll(NOTE_BREAK_TAGS, "\n")
            .replaceAll(NOTE_BLOCK_END_TAGS, "\n")
            .replaceAll(NOTE_STRIP_TAGS, "")
            .replaceAll(/\n{3,}/g, "\n\n")
    )
        .replaceAll(/\u00a0/g, " ")
        .trim();
}

export function getNoteExcerpt(
    text: string | null | undefined,
    maxLength = 180
): string {
    const normalizedText = (text ?? "").trim().replaceAll(/\s+/g, " ");
    if (normalizedText.length <= maxLength) {
        return normalizedText;
    }

    return `${normalizedText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
