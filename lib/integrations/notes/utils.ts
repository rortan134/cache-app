import { isRecord } from "@/lib/common/objects";
import { decodeHtmlEntities } from "@/lib/common/strings";
import type { SerializedHeadingNode } from "@lexical/rich-text";
import {
    IS_BOLD,
    IS_HIGHLIGHT,
    IS_ITALIC,
    IS_STRIKETHROUGH,
    IS_UNDERLINE,
    type SerializedEditorState,
    type SerializedElementNode,
    type SerializedLexicalNode,
    type SerializedTextNode,
} from "lexical";

export const NOTE_EMPTY_HTML = "<p></p>";

export type NoteSerializedEditorState = SerializedEditorState;

type NoteSerializedElementNode = SerializedElementNode<SerializedLexicalNode>;
type NoteSerializedRootNode = NoteSerializedEditorState["root"];

const NOTE_ALLOWED_TAGS = new Set([
    "br",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
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
const NOTE_BLOCK_END_TAGS = /<\/(div|h[1-6]|p)>/gi;
const NOTE_BREAK_TAGS = /<br\s*\/?>/gi;
const NOTE_TAGS = /<(\/?)([a-z0-9]+)(?:\s[^>]*)?>/gi;
const NOTE_STRIP_TAGS = /<[^>]+>/g;
const NOTE_SCRIPT_STYLE_BLOCKS =
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const NOTE_COMMENTS = /<!--[\s\S]*?-->/g;
const NOTE_EMPTY_PARAGRAPHS = /<p>(?:\s|<br>)*<\/p>/gi;
const NOTE_HEADING_TAG = /^h[1-6]$/;

function escapeNoteHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function isNoteSerializedElementNode(
    value: unknown
): value is NoteSerializedElementNode {
    return (
        isRecord(value) &&
        typeof value.type === "string" &&
        Array.isArray(value.children)
    );
}

function isNoteSerializedRootNode(
    value: unknown
): value is NoteSerializedRootNode {
    return isNoteSerializedElementNode(value) && value.type === "root";
}

function isNoteSerializedTextNode(value: unknown): value is SerializedTextNode {
    return (
        isRecord(value) &&
        value.type === "text" &&
        typeof value.format === "number" &&
        typeof value.text === "string"
    );
}

function isNoteSerializedHeadingNode(
    value: unknown
): value is SerializedHeadingNode {
    return (
        isRecord(value) &&
        value.type === "heading" &&
        Array.isArray(value.children) &&
        typeof value.tag === "string"
    );
}

function isSupportedHeadingTag(
    tag: string
): tag is SerializedHeadingNode["tag"] {
    return NOTE_HEADING_TAG.test(tag);
}

function wrapNoteInlineFormat(
    html: string,
    enabled: boolean,
    tag: "em" | "mark" | "s" | "strong" | "u"
): string {
    return enabled ? `<${tag}>${html}</${tag}>` : html;
}

function renderNoteTextNode(node: SerializedTextNode): string {
    let html = escapeNoteHtml(node.text).replaceAll("\n", "<br>");

    if (html.length === 0) {
        return "";
    }

    html = wrapNoteInlineFormat(html, (node.format & IS_BOLD) !== 0, "strong");
    html = wrapNoteInlineFormat(html, (node.format & IS_ITALIC) !== 0, "em");
    html = wrapNoteInlineFormat(html, (node.format & IS_UNDERLINE) !== 0, "u");
    html = wrapNoteInlineFormat(
        html,
        (node.format & IS_STRIKETHROUGH) !== 0,
        "s"
    );
    html = wrapNoteInlineFormat(
        html,
        (node.format & IS_HIGHLIGHT) !== 0,
        "mark"
    );

    return html;
}

function renderNoteChildren(children: SerializedLexicalNode[]): string {
    return children.map((child) => renderNoteNode(child)).join("");
}

function renderNoteElement(
    tag: "p" | SerializedHeadingNode["tag"],
    node: NoteSerializedElementNode
): string {
    return `<${tag}>${renderNoteChildren(node.children)}</${tag}>`;
}

function renderNoteNode(node: SerializedLexicalNode): string {
    if (isNoteSerializedTextNode(node)) {
        return renderNoteTextNode(node);
    }

    if (isNoteSerializedHeadingNode(node)) {
        return renderNoteElement(
            isSupportedHeadingTag(node.tag) ? node.tag : "h2",
            node
        );
    }

    if (isNoteSerializedElementNode(node)) {
        if (node.type === "paragraph") {
            return renderNoteElement("p", node);
        }

        if (node.type === "root") {
            return renderNoteChildren(node.children);
        }

        if (node.type === "linebreak") {
            return "<br>";
        }

        return renderNoteChildren(node.children);
    }

    if (isRecord(node) && node.type === "linebreak") {
        return "<br>";
    }

    return "";
}

export function normalizeNoteHtml(html: string | null | undefined): string {
    return html?.trim() || NOTE_EMPTY_HTML;
}

export function isNoteSerializedEditorState(
    value: unknown
): value is NoteSerializedEditorState {
    return isRecord(value) && isNoteSerializedRootNode(value.root);
}

export function serializeNoteEditorStateToHtml(
    editorState: NoteSerializedEditorState
): string {
    const html = renderNoteNode(editorState.root);
    return sanitizeNoteHtml(html);
}

export function sanitizeNoteHtml(input: string): string {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
        return NOTE_EMPTY_HTML;
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
        .replaceAll(NOTE_EMPTY_PARAGRAPHS, "")
        .trim();

    return normalizedParagraphs.length > 0
        ? normalizedParagraphs
        : NOTE_EMPTY_HTML;
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
