import "server-only";

import { ApiError } from "@google/genai";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    generateExpandedSectionDescription,
    generateSectionDescription,
} from ".";
import { GenAiGenerationError, GenAiProtectionError } from "./error";
import { estimateGenAiTokens, protectGenAiRequest } from "./protection";
import {
    buildExpandedSummaryPrompt,
    buildSummaryPrompt,
    normalizeExpandedSummary,
    normalizeSummary,
    SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT,
    SECTION_DESCRIPTION_FALLBACK_TEXT,
    truncateSummaryContextItems,
    type SectionDescriptionRequest,
} from "./summary";

const log = createLogger("intelligence:service");

const OUTPUT_TOKEN_LIMIT = 96;

export interface GenerateCollectionSummaryInput {
    expanded?: boolean;
    items: SectionDescriptionRequest["items"];
    request: Request;
    sectionTitle: string;
    userId: string;
}

export interface GenerateCollectionSummaryResult {
    conclusions?: string[];
    summary: string;
}

/**
 * Generates a one-sentence summary for a collection section.
 *
 * Handles prompt building, token estimation, rate-limiting, AI generation,
 * and output normalization. Throws domain errors on failure so callers can
 * map to their own transport semantics.
 */
export async function generateCollectionSummary(
    input: GenerateCollectionSummaryInput
): Promise<GenerateCollectionSummaryResult> {
    const { expanded, items, request, sectionTitle, userId } = input;

    const truncatedRequest = truncateSummaryContextItems({
        items,
        sectionTitle,
    });

    if (expanded) {
        const prompt = buildExpandedSummaryPrompt(truncatedRequest);
        const requestedTokens = estimateGenAiTokens(
            prompt,
            SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT
        );

        log.debug("Generating expanded section description", {
            estimatedTokens: requestedTokens,
            itemCount: items.length,
            sectionTitle,
            truncatedItemCount: truncatedRequest.items.length,
            userId,
        });

        const span = log.time("generate-expanded-section-description", {
            itemCount: items.length,
            sectionTitle,
            userId,
        });

        try {
            await protectGenAiRequest({
                feature: "section_description_expanded",
                prompt,
                request,
                requestedTokens,
                userId,
            });

            const { rawConclusions } = await generateExpandedSectionDescription({
                prompt,
                requestedTokens,
            });

            const conclusions = normalizeExpandedSummary(rawConclusions);

            if (!conclusions || conclusions.length === 0) {
                log.warn(
                    "Expanded section description normalization rejected model output",
                    {
                        itemCount: items.length,
                        rawConclusions,
                        sectionTitle,
                        userId,
                    }
                );
            }

            return {
                conclusions: conclusions ?? undefined,
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            };
        } catch (error) {
            if (error instanceof GenAiProtectionError) {
                throw error;
            }

            const { message, status } = classifyApiError(error);

            log.warn("Failed to generate expanded library section description", {
                error: message,
                itemCount: items.length,
                sectionTitle,
                status,
                userId,
            });

            throw new GenAiGenerationError({
                message,
                operation: "generateCollectionSummary",
                status,
            });
        } finally {
            span.stop();
        }
    }

    const prompt = buildSummaryPrompt(truncatedRequest);
    const requestedTokens = estimateGenAiTokens(prompt, OUTPUT_TOKEN_LIMIT);

    log.debug("Generating section description", {
        estimatedTokens: requestedTokens,
        itemCount: items.length,
        sectionTitle,
        truncatedItemCount: truncatedRequest.items.length,
        userId,
    });

    const span = log.time("generate-section-description", {
        itemCount: items.length,
        sectionTitle,
        userId,
    });

    try {
        await protectGenAiRequest({
            feature: "section_description",
            prompt,
            request,
            requestedTokens,
            userId,
        });

        const { rawSummary } = await generateSectionDescription({
            prompt,
            requestedTokens,
        });

        const summary = normalizeSummary(rawSummary);

        if (!summary) {
            log.warn(
                "Section description normalization rejected model output",
                {
                    itemCount: items.length,
                    rawSummary,
                    sectionTitle,
                    userId,
                }
            );
        }

        return {
            summary: summary ?? SECTION_DESCRIPTION_FALLBACK_TEXT,
        };
    } catch (error) {
        if (error instanceof GenAiProtectionError) {
            throw error;
        }

        const { message, status } = classifyApiError(error);

        log.warn("Failed to generate library section description", {
            error: message,
            itemCount: items.length,
            sectionTitle,
            status,
            userId,
        });

        throw new GenAiGenerationError({
            message,
            operation: "generateCollectionSummary",
            status,
        });
    } finally {
        span.stop();
    }
}

/**
 * Classifies API errors into specific HTTP status codes and messages.
 *
 * Distinguishes timeouts, quota issues, safety blocks, and upstream failures
 * so the caller can react appropriately.
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
