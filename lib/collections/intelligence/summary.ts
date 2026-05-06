import { LibraryItemSource } from "@/prisma/client/enums";
import * as z from "zod";

// --- Input Limits ---

export const SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT = 20;
export const SECTION_DESCRIPTION_TEXT_MAX_LENGTH = 180;
export const SECTION_DESCRIPTION_URL_MAX_LENGTH = 240;
export const SECTION_DESCRIPTION_DOMAIN_MAX_LENGTH = 80;
export const SECTION_DESCRIPTION_TITLE_MAX_LENGTH = 140;

// --- Output Limits ---

export const SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH = 220;
export const SECTION_DESCRIPTION_FALLBACK_TEXT =
    "Summary is unavailable right now.";
export const SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT = 512;
export const SECTION_DESCRIPTION_EXPANDED_MAX_CONCLUSIONS = 8;

// --- Prompt Budget ---

const SECTION_DESCRIPTION_MAX_PROMPT_TOKENS = 4096;
const SECTION_DESCRIPTION_PROMPT_OVERHEAD_TOKENS = 400;
const SECTION_DESCRIPTION_CHARS_PER_TOKEN_ESTIMATE = 4;

// --- Schemas ---

export const SectionDescriptionContextItemSchema = z.object({
    addedAt: z.iso.datetime().optional(),
    createdAt: z.iso.datetime().optional(),
    domain: z
        .string()
        .trim()
        .max(SECTION_DESCRIPTION_DOMAIN_MAX_LENGTH)
        .optional(),
    kind: z.enum(["bookmark", "note"]),
    noteExcerpt: z
        .string()
        .trim()
        .max(SECTION_DESCRIPTION_TEXT_MAX_LENGTH)
        .optional(),
    primaryText: z
        .string()
        .trim()
        .min(1)
        .max(SECTION_DESCRIPTION_TEXT_MAX_LENGTH),
    source: z.enum(LibraryItemSource),
    title: z.string().trim().min(1).max(SECTION_DESCRIPTION_TITLE_MAX_LENGTH),
    url: z.string().trim().max(SECTION_DESCRIPTION_URL_MAX_LENGTH).optional(),
});

export const SectionDescriptionRequestSchema = z.object({
    expanded: z.boolean().optional(),
    items: z
        .array(SectionDescriptionContextItemSchema)
        .min(1)
        .max(SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT),
    sectionTitle: z.string().trim().min(1).max(120),
});

export type SectionDescriptionContextItem = z.infer<
    typeof SectionDescriptionContextItemSchema
>;

export type SectionDescriptionRequest = z.infer<
    typeof SectionDescriptionRequestSchema
>;

// --- Few-Shot Examples ---

interface FewShotExample {
    input: {
        items: Array<{ primaryText: string; title: string }>;
        sectionTitle: string;
    };
    output: string;
}

const FEW_SHOT_EXAMPLES: readonly FewShotExample[] = [
    {
        input: {
            items: [
                {
                    primaryText:
                        "A quick vegetarian pasta dish using seasonal vegetables.",
                    title: "15-Minute Pasta Primavera",
                },
                {
                    primaryText:
                        "One-pan meal with bell peppers, onions, and seasoned chicken.",
                    title: "Sheet Pan Chicken Fajitas",
                },
            ],
            sectionTitle: "Weeknight Dinners",
        },
        output: "Quick and practical recipes designed for busy evenings.",
    },
    {
        input: {
            items: [
                {
                    primaryText:
                        "Exploring whitespace, typography, and restrained color palettes.",
                    title: "Minimalist Portfolio Trends 2024",
                },
                {
                    primaryText:
                        "Subtle animations and feedback patterns in modern interfaces.",
                    title: "Micro-interactions That Delight",
                },
            ],
            sectionTitle: "Design Inspiration",
        },
        output: "Curated visual references spanning interface design, typography, and creative portfolios.",
    },
    {
        input: {
            items: [
                {
                    primaryText:
                        "Navigating technical leadership without moving into management.",
                    title: "Staff Engineer Path",
                },
                {
                    primaryText:
                        "Structuring conversations that build trust and accelerate growth.",
                    title: "Effective 1:1s",
                },
            ],
            sectionTitle: "Career Growth",
        },
        output: "Resources on engineering leadership, team building, and strategic career planning.",
    },
];

function formatFewShotExamples(): string {
    return FEW_SHOT_EXAMPLES.map((example, index) => {
        const lines = [
            `Example ${index + 1}:`,
            `Section: ${example.input.sectionTitle}`,
            ...example.input.items.map(
                (item) => `- ${item.title}: ${item.primaryText}`
            ),
            `Summary: ${example.output}`,
        ];
        return lines.join("\n");
    }).join("\n\n");
}

// --- Prompt Builder ---

interface CompactItem {
    domain?: string;
    noteExcerpt?: string;
    primaryText: string;
    title: string;
}

function compactItem(item: SectionDescriptionContextItem): CompactItem {
    const compact: CompactItem = {
        primaryText: item.primaryText,
        title: item.title,
    };
    if (item.noteExcerpt) {
        compact.noteExcerpt = item.noteExcerpt;
    }
    if (item.domain) {
        compact.domain = item.domain;
    }
    return compact;
}

export function buildSummaryPrompt(request: SectionDescriptionRequest): string {
    const items = request.items.map(compactItem);

    return [
        "You write one-sentence UI summaries for personal library sections.",
        "Analyze the section title and items below, then produce a single sentence that captures the shared themes and intent.",
        "",
        "Output rules:",
        "- Return only the summary sentence and nothing else.",
        "- Keep it high-level, neutral, and easy to skim.",
        "- Keep it under 22 words.",
        "- Do not mention counts, totals, quantities, or how many entries exist.",
        "- Do not mention source platforms or platform names.",
        '- Do not start with: "This library contains", "This collection contains", "This section contains", "These items", or "The items".',
        "- Do not use markdown, bullets, headings, labels, or code fences.",
        "- Do not wrap the summary in quotes.",
        "",
        formatFewShotExamples(),
        "",
        `Section title: ${request.sectionTitle}`,
        "Items:",
        ...items.map((item, index) => {
            const parts: string[] = [`${index + 1}. ${item.title}`];
            if (item.noteExcerpt) {
                parts.push(`   Note: ${item.noteExcerpt}`);
            }
            parts.push(`   ${item.primaryText}`);
            if (item.domain) {
                parts.push(`   (${item.domain})`);
            }
            return parts.join("\n");
        }),
    ].join("\n");
}

export function buildExpandedSummaryPrompt(request: SectionDescriptionRequest): string {
    const items = request.items.map(compactItem);

    return [
        "You are a research assistant that extracts only final conclusions from a set of saved items.",
        "Analyze the section title and items below, then return a concise list of distinct conclusions.",
        "",
        "Extraction rules:",
        "- Focus ONLY on final claims, takeaways, findings, or recommendations.",
        "- Ignore background information, general summaries, minor details, examples, and anecdotes unless they directly express a conclusion.",
        "- Merge obviously duplicate conclusions but keep distinct points separate.",
        "- Each conclusion must be a single, self-contained sentence.",
        `- Return at most ${SECTION_DESCRIPTION_EXPANDED_MAX_CONCLUSIONS} conclusions.`,
        "- Do not add any preamble, commentary, or explanation.",
        "- Do not mention item counts, totals, or source platforms.",
        "",
        `Section title: ${request.sectionTitle}`,
        "Items:",
        ...items.map((item, index) => {
            const parts: string[] = [`${index + 1}. ${item.title}`];
            if (item.noteExcerpt) {
                parts.push(`   Note: ${item.noteExcerpt}`);
            }
            parts.push(`   ${item.primaryText}`);
            if (item.domain) {
                parts.push(`   (${item.domain})`);
            }
            return parts.join("\n");
        }),
    ].join("\n");
}

// --- Input Truncation ---

function estimateTokens(text: string): number {
    return Math.ceil(
        text.length / SECTION_DESCRIPTION_CHARS_PER_TOKEN_ESTIMATE
    );
}

/**
 * Truncates items to stay within the prompt token budget.
 *
 * Drops items from the end if the full set exceeds the budget, and
 * truncates text fields of the last included item when necessary.
 */
export function truncateSummaryContextItems(
    request: SectionDescriptionRequest,
    maxTokens: number = SECTION_DESCRIPTION_MAX_PROMPT_TOKENS
): SectionDescriptionRequest {
    const overhead = estimateTokens(
        buildSummaryPrompt({ items: [], sectionTitle: request.sectionTitle })
    );
    const availableTokens =
        maxTokens - overhead - SECTION_DESCRIPTION_PROMPT_OVERHEAD_TOKENS;

    if (availableTokens <= 0) {
        return {
            items: [],
            sectionTitle: request.sectionTitle,
        };
    }

    let currentTokens = 0;
    const truncatedItems: SectionDescriptionContextItem[] = [];

    for (const item of request.items) {
        const itemText = [
            item.title,
            item.primaryText,
            item.noteExcerpt,
            item.domain,
        ]
            .filter(Boolean)
            .join(" ");
        const itemTokens = estimateTokens(itemText);

        // If adding this item would exceed budget and we already have at least one item, stop
        if (
            currentTokens + itemTokens > availableTokens &&
            truncatedItems.length > 0
        ) {
            break;
        }

        // If a single item exceeds the remaining budget, truncate its text fields
        if (itemTokens > availableTokens - currentTokens) {
            const budget = availableTokens - currentTokens;
            const maxChars =
                budget * SECTION_DESCRIPTION_CHARS_PER_TOKEN_ESTIMATE;
            const titleBudget = Math.min(
                item.title.length,
                Math.floor(maxChars * 0.3)
            );
            const textBudget = Math.floor(maxChars * 0.7);

            truncatedItems.push({
                ...item,
                primaryText: item.primaryText.slice(0, textBudget).trimEnd(),
                title: item.title.slice(0, titleBudget).trimEnd(),
            });
            break;
        }

        truncatedItems.push(item);
        currentTokens += itemTokens;
    }

    return {
        items: truncatedItems,
        sectionTitle: request.sectionTitle,
    };
}

// --- Output Normalization ---

const WHITESPACE_PATTERN = /\s+/g;
const SUMMARY_PREFIX_PATTERN = /^summary:\s*/i;
const SURROUNDING_QUOTES_PATTERN = /^["']|["']$/g;
const FIRST_SENTENCE_PATTERN = /^.+?[.!?](?=\s|$)/;
const GRAMMATICALLY_COMPLETE_PATTERN = /[.!?]$/;

function firstSentence(value: string): string {
    const match = value.match(FIRST_SENTENCE_PATTERN);
    return match?.[0]?.trim() ?? value.trim();
}

function isGrammaticallyComplete(value: string): boolean {
    return GRAMMATICALLY_COMPLETE_PATTERN.test(value);
}

/**
 * Normalizes and validates a raw model summary.
 *
 * Returns the cleaned summary string, or null if the output is empty.
 */
export function normalizeSummary(value: string | undefined): string | null {
    const normalized = value
        ?.replace(WHITESPACE_PATTERN, " ")
        .replace(SUMMARY_PREFIX_PATTERN, "")
        .trim();
    const singleSentence = firstSentence(normalized ?? "");
    const cleaned = singleSentence
        .replace(SURROUNDING_QUOTES_PATTERN, "")
        .trim();

    if (cleaned.length === 0) {
        return null;
    }

    if (cleaned.length <= SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH) {
        return isGrammaticallyComplete(cleaned) ? cleaned : `${cleaned}.`;
    }

    return `${cleaned
        .slice(0, SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH - 3)
        .trimEnd()}...`;
}

// --- Expanded Output Normalization ---

const BULLET_PREFIX_PATTERN = /^[-*•]\s*/;

/**
 * Normalizes and validates a raw expanded model response.
 *
 * Expects either a JSON object with a `conclusions` array or a plain
 * bullet-list string. Returns the cleaned array of conclusion strings,
 * or null if the output is empty or malformed.
 */
export function normalizeExpandedSummary(
    value: string | undefined
): string[] | null {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);
        if (
            Array.isArray(parsed.conclusions) &&
            parsed.conclusions.every((c: unknown) => typeof c === "string")
        ) {
            const cleaned = parsed.conclusions
                .map((c: string) =>
                    c
                        .replace(WHITESPACE_PATTERN, " ")
                        .replace(BULLET_PREFIX_PATTERN, "")
                        .trim()
                )
                .filter((c: string) => c.length > 0);
            return cleaned.length > 0 ? cleaned : null;
        }
    } catch {
        // Not valid JSON — attempt to parse as a plain bullet list.
    }

    const lines = value
        .split("\n")
        .map((line) =>
            line
                .replace(WHITESPACE_PATTERN, " ")
                .replace(BULLET_PREFIX_PATTERN, "")
                .trim()
        )
        .filter((line) => line.length > 0);

    return lines.length > 0 ? lines : null;
}
