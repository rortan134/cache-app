import { auth } from "@/lib/auth/server";
import { GenAiProtectionError } from "@/lib/collections/intelligence/error";
import { generateSectionDescription } from "@/lib/collections/intelligence";
import {
    estimateGenAiTokens,
    protectGenAiRequest,
} from "@/lib/collections/intelligence/protection";
import {
    buildSummaryPrompt,
    normalizeSummary,
    SECTION_DESCRIPTION_FALLBACK_TEXT,
    SectionDescriptionRequestSchema,
    truncateSummaryContextItems,
} from "@/lib/collections/intelligence/summary";
import { createLogger } from "@/lib/common/logs/console/logger";
import { ApiError } from "@google/genai";
import { headers } from "next/headers";

const log = createLogger("api:library:summary");

const OUTPUT_TOKEN_LIMIT = 96;

/**
 * Classifies API errors into specific HTTP status codes and messages.
 *
 * Distinguishes timeouts, quota issues, safety blocks, and upstream failures
 * so the client can react appropriately.
 */
function classifyApiError(error: unknown): { message: string; status: number } {
    if (error instanceof ApiError) {
        const message = error.message.toLowerCase();

        if (
            message.includes("timeout") ||
            message.includes("deadline exceeded")
        ) {
            return {
                message: "Request timed out. Please try again.",
                status: 408,
            };
        }
        if (
            error.status === 429 ||
            message.includes("quota") ||
            message.includes("rate limit")
        ) {
            return {
                message: "AI service quota exceeded. Please try again later.",
                status: 429,
            };
        }
        if (
            error.status === 400 &&
            (message.includes("safety") || message.includes("content"))
        ) {
            return {
                message:
                    "Content could not be processed due to safety settings.",
                status: 400,
            };
        }
        if (error.status >= 500) {
            return {
                message: "AI service temporarily unavailable.",
                status: 502,
            };
        }

        return {
            message: error.message,
            status: error.status ?? 500,
        };
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("timeout") || message.includes("abort")) {
            return {
                message: "Request timed out. Please try again.",
                status: 408,
            };
        }
    }

    return {
        message: "Unknown error",
        status: 500,
    };
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
            { status: 400 }
        );
    }

    const parsedBody = SectionDescriptionRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
        return Response.json(
            { error: "Invalid request payload." },
            { status: 400 }
        );
    }

    const { items, sectionTitle } = parsedBody.data;

    const truncatedRequest = truncateSummaryContextItems(parsedBody.data);
    const prompt = buildSummaryPrompt(truncatedRequest);
    const estimatedTokens = estimateGenAiTokens(prompt, OUTPUT_TOKEN_LIMIT);

    log.debug("Generating section description", {
        estimatedTokens,
        itemCount: items.length,
        sectionTitle,
        truncatedItemCount: truncatedRequest.items.length,
        userId: session.user.id,
    });

    const span = log.time("generate-section-description", {
        itemCount: items.length,
        sectionTitle,
        userId: session.user.id,
    });

    try {
        await protectGenAiRequest({
            feature: "section_description",
            prompt,
            request,
            requestedTokens: estimatedTokens,
            userId: session.user.id,
        });

        const { rawSummary } = await generateSectionDescription({
            prompt,
            requestedTokens: estimatedTokens,
        });

        const summary = normalizeSummary(rawSummary);

        if (!summary) {
            log.warn(
                "Section description normalization rejected model output",
                {
                    itemCount: items.length,
                    rawSummary,
                    sectionTitle,
                    userId: session.user.id,
                }
            );
        }

        return Response.json({
            summary: summary ?? SECTION_DESCRIPTION_FALLBACK_TEXT,
        });
    } catch (error) {
        if (error instanceof GenAiProtectionError) {
            const status = error.data.reason === "quota_exceeded" ? 429 : 403;
            return Response.json(
                {
                    error: error.data.message,
                    reason: error.data.reason,
                },
                { status }
            );
        }

        const { message, status } = classifyApiError(error);

        log.warn("Failed to generate library section description", {
            error: message,
            itemCount: items.length,
            sectionTitle,
            status,
            userId: session.user.id,
        });

        return Response.json(
            {
                error: message,
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            },
            { status }
        );
    } finally {
        span.stop();
    }
}
