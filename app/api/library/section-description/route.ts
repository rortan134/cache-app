import { serverEnv } from "@/env/server";
import { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/logs/console/logger";
import { ApiError, GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { z } from "zod";

const log = createLogger("api:library:section-description");
const SECTION_DESCRIPTION_MODEL = "gemini-2.5-flash-lite";
const SECTION_DESCRIPTION_MAX_CONTEXT_ITEMS = 20;
const SECTION_DESCRIPTION_OUTPUT_TOKEN_LIMIT = 96;
const SECTION_DESCRIPTION_TIMEOUT_MS = 12_000;
const SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH = 220;
const SECTION_DESCRIPTION_FALLBACK_TEXT =
    "A brief summary is unavailable right now.";
const SECTION_DESCRIPTION_DISALLOWED_START_PATTERN =
    /^(?:this\s+(?:library|collection|section)\s+contains|these\s+items|the\s+items)\b/i;
const SECTION_DESCRIPTION_DISALLOWED_PLATFORM_PATTERN =
    /\b(?:youtube|x|twitter|instagram|pinterest|github|google\s+photos|chrome\s+bookmarks?)\b/i;
const SECTION_DESCRIPTION_DISALLOWED_COUNT_PATTERN =
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozen|several|many|multiple)\s+(?:saved\s+)?(?:items?|entries|bookmarks?|results|links?)\b/i;

const SectionDescriptionRequestSchema = z.object({
    items: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(SECTION_DESCRIPTION_MAX_CONTEXT_ITEMS),
    sectionTitle: z.string().trim().min(1).max(120),
});

type SectionDescriptionRequest = z.infer<
    typeof SectionDescriptionRequestSchema
>;

function buildPrompt({
    items,
    sectionTitle,
}: SectionDescriptionRequest): string {
    return [
        `Section title: ${sectionTitle}`,
        "Write one brief sentence that summarizes the shared themes and intent.",
        "Output rules:",
        "- Return only the summary sentence and nothing else.",
        "- Keep it high-level, neutral, and easy to skim.",
        "- Keep it under 22 words.",
        "- Do not mention counts, totals, quantities, or how many entries exist.",
        "- Do not mention source platforms or platform names.",
        "- Do not start with: \"This library contains\", \"This collection contains\", \"This section contains\", \"These items\", or \"The items\".",
        "- Do not use markdown, bullets, headings, labels, or code fences.",
        "",
        "Item context JSON:",
        JSON.stringify(
            {
                items,
            },
            null,
            2,
        ),
    ].join("\n");
}
function firstSentence(value: string): string {
    const match = value.match(/^.+?[.!?](?=\s|$)/);
    return match?.[0]?.trim() ?? value.trim();
}

function hasDisallowedSummaryContent(value: string): boolean {
    return (
        SECTION_DESCRIPTION_DISALLOWED_START_PATTERN.test(value) ||
        SECTION_DESCRIPTION_DISALLOWED_PLATFORM_PATTERN.test(value) ||
        SECTION_DESCRIPTION_DISALLOWED_COUNT_PATTERN.test(value)
    );
}

function normalizeSummary(value: string | undefined): string | null {
    const normalized = value
        ?.replace(/\s+/g, " ")
        .replace(/^summary:\s*/i, "")
        .trim();
    const singleSentence = firstSentence(normalized ?? "");
    const cleaned = singleSentence.replace(/^["']|["']$/g, "").trim();

    if (hasDisallowedSummaryContent(cleaned)) {
        return null;
    }
    if (cleaned.length === 0) {
        return null;
    }
    if (cleaned.length <= SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH) {
        return cleaned;
        return normalized;
    }

    const truncated = `${cleaned.slice(0, SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH - 3).trimEnd()}...`;
    if (hasDisallowedSummaryContent(truncated)) {
        return null;
    }
    return truncated;
}

export async function POST(request: Request): Promise<Response> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON payload." },
            { status: 400 },
        );
    }

    const parsedBody = SectionDescriptionRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
        return Response.json(
            { error: "Invalid request payload." },
            { status: 400 },
        );
    }

    const { items, sectionTitle } = parsedBody.data;

    try {
        const ai = new GoogleGenAI({
            apiKey: serverEnv.GEMINI_API_KEY,
        });
        const modelResponse = await ai.models.generateContent({
            config: {
                httpOptions: {
                    retryOptions: {
                        attempts: 2,
                    },
                    timeout: SECTION_DESCRIPTION_TIMEOUT_MS,
                },
                maxOutputTokens: SECTION_DESCRIPTION_OUTPUT_TOKEN_LIMIT,
                systemInstruction:
                    "You write one-sentence UI summaries. Return plain text only, with no preamble. Never mention item counts or platform names, and avoid stock lead-ins.",
                temperature: 0.2,
            },
            contents: buildPrompt(parsedBody.data),
            model: SECTION_DESCRIPTION_MODEL,
        });

        return Response.json({
            summary:
                normalizeSummary(modelResponse.text) ??
                SECTION_DESCRIPTION_FALLBACK_TEXT,
        });
    } catch (error) {
        const message =
            error instanceof ApiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : "Unknown error";

        log.warn("Failed to generate library section description", {
            error: message,
            itemCount: items.length,
            sectionTitle,
            userId: session.user.id,
        });

        return Response.json({
            summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
        });
    }
}
