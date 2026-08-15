import "server-only";

import type { ArcjetNextRequest } from "@arcjet/next";
import { ApiError } from "@google/genai";
import { cacheLife } from "next/cache";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    generateCollectionDescription as generateCollectionDescriptionText,
    generateExpandedSectionDescription,
    generateSectionDescription,
} from ".";
import { GenAiGenerationError, GenAiProtectionError } from "./error";
import {
    buildCollectionDescriptionPrompt,
    buildExpandedSummaryPrompt,
    buildOverviewPrompt,
    COLLECTION_DESCRIPTION_TITLE_MAX_LENGTH,
    type DescriptionRequest,
    normalizeExpandedSummary,
    normalizeSummary,
    SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT,
    SECTION_DESCRIPTION_FALLBACK_TEXT,
    truncateContextItems,
} from "./overview";
import { estimateGenAiTokens, protectGenAiRequest } from "./protection";

const log = createLogger("intelligence:service");

const OUTPUT_TOKEN_LIMIT = 96;

export interface GenerateCollectionSummaryInput {
    expanded?: boolean;
    items: DescriptionRequest["items"];
    request: ArcjetNextRequest;
    sectionTitle: string;
    userId: string;
}

export interface GenerateCollectionSummaryResult {
    summary: string;
}

export interface GenerateCollectionDescriptionInput {
    collectionTitle: string;
    request: ArcjetNextRequest;
    userId: string;
}

export interface GenerateCollectionDescriptionResult {
    description: string;
}

/**
 * Generates a short overview for a collection section.
 *
 * Handles prompt building, token estimation, rate-limiting, AI generation,
 * and output normalization. Throws domain errors on failure so callers can
 * map to their own transport semantics.
 */
export async function generateCollectionSummary(
    input: GenerateCollectionSummaryInput
): Promise<GenerateCollectionSummaryResult> {
    const { expanded, items, sectionTitle, userId } = input;

    const truncatedRequest = truncateContextItems({
        items,
        sectionTitle,
    });

    if (expanded) {
        const summary = await executeGeneration({
            debugLogLabel: "expanded section description",
            errorLogLabel: "expanded library section description",
            feature: "section_description_expanded",
            generate: (args) =>
                generateCachedExpandedSectionDescription({
                    prompt: args.prompt,
                    userId,
                }),
            input,
            logContext: {
                itemCount: items.length,
                sectionTitle,
                truncatedItemCount: truncatedRequest.items.length,
            },
            normalize: normalizeExpandedSummary,
            operation: "generateCollectionSummary",
            prompt: buildExpandedSummaryPrompt(truncatedRequest),
            spanName: "generate-expanded-section-description",
            tokenLimit: SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT,
            warnLogLabel: "Expanded section description",
        });

        return {
            summary: summary ?? SECTION_DESCRIPTION_FALLBACK_TEXT,
        };
    }

    const summary = await executeGeneration({
        debugLogLabel: "section description",
        errorLogLabel: "library section description",
        feature: "section_description",
        generate: (args) =>
            generateCachedSectionDescription({
                prompt: args.prompt,
                userId,
            }),
        input,
        logContext: {
            itemCount: items.length,
            sectionTitle,
            truncatedItemCount: truncatedRequest.items.length,
        },
        normalize: normalizeSummary,
        operation: "generateCollectionSummary",
        prompt: buildOverviewPrompt(truncatedRequest),
        spanName: "generate-section-description",
        tokenLimit: OUTPUT_TOKEN_LIMIT,
        warnLogLabel: "Section description",
    });

    return {
        summary: summary ?? SECTION_DESCRIPTION_FALLBACK_TEXT,
    };
}

export async function generateCollectionDescription(
    input: GenerateCollectionDescriptionInput
): Promise<GenerateCollectionDescriptionResult> {
    const collectionTitle = input.collectionTitle
        .trim()
        .slice(0, COLLECTION_DESCRIPTION_TITLE_MAX_LENGTH);
    if (collectionTitle.length === 0) {
        return { description: "" };
    }

    const description = await executeGeneration({
        debugLogLabel: "collection description",
        errorLogLabel: "collection description",
        feature: "collection_description",
        generate: (args) =>
            generateCachedCollectionDescription({
                prompt: args.prompt,
                userId: input.userId,
            }),
        input,
        logContext: { collectionTitle },
        normalize: normalizeSummary,
        operation: "generateCollectionDescription",
        prompt: buildCollectionDescriptionPrompt({ title: collectionTitle }),
        spanName: "generate-collection-description",
        tokenLimit: OUTPUT_TOKEN_LIMIT,
        warnLogLabel: "Collection description",
    });

    return {
        description: description ?? "",
    };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface GenerationConfig<T> {
    debugLogLabel: string;
    errorLogLabel: string;
    feature: string;
    generate: (args: { prompt: string }) => Promise<string | undefined>;
    input: {
        request: ArcjetNextRequest;
        userId: string;
    };
    logContext: Record<string, unknown>;
    normalize: (raw: string | undefined) => T | null;
    operation: string;
    prompt: string;
    spanName: string;
    tokenLimit: number;
    warnLogLabel: string;
}

async function generateCachedSectionDescription(args: {
    prompt: string;
    userId: string;
}): Promise<string | undefined> {
    "use cache";
    cacheLife("minutes");

    const result = await generateSectionDescription({ prompt: args.prompt });
    return result.rawSummary;
}

async function generateCachedExpandedSectionDescription(args: {
    prompt: string;
    userId: string;
}): Promise<string | undefined> {
    "use cache";
    cacheLife("minutes");

    const result = await generateExpandedSectionDescription({
        prompt: args.prompt,
    });
    return result.rawSummary;
}

async function generateCachedCollectionDescription(args: {
    prompt: string;
    userId: string;
}): Promise<string | undefined> {
    "use cache";
    cacheLife("minutes");

    const result = await generateCollectionDescriptionText({
        prompt: args.prompt,
    });
    return result.rawDescription;
}

/**
 * Executes a single protected generation pipeline.
 *
 * Builds the prompt, estimates tokens, enforces rate limits, calls the
 * model, normalizes output, and maps errors to domain failures.
 */
async function executeGeneration<T>(
    config: GenerationConfig<T>
): Promise<T | null> {
    const {
        debugLogLabel,
        errorLogLabel,
        feature,
        generate,
        input,
        logContext,
        normalize,
        operation,
        prompt,
        spanName,
        tokenLimit,
        warnLogLabel,
    } = config;
    const { request, userId } = input;
    const requestedTokens = estimateGenAiTokens(prompt, tokenLimit);

    log.debug(`Generating ${debugLogLabel}`, {
        estimatedTokens: requestedTokens,
        ...logContext,
        userId,
    });

    const span = log.time(spanName, {
        ...logContext,
        userId,
    });

    try {
        await protectGenAiRequest({
            feature,
            request,
            requestedTokens,
            userId,
        });

        const generatedContent = await generate({ prompt });
        const normalized = normalize(generatedContent);

        if (!normalized) {
            log.warn(`${warnLogLabel} normalization rejected model output`, {
                ...logContext,
                raw: generatedContent,
                userId,
            });
        }

        return normalized;
    } catch (error) {
        if (GenAiProtectionError.isInstance(error)) {
            throw error;
        }

        log.error(`Error generating ${errorLogLabel}`, {
            errorMessage:
                error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
        });

        const { message, status } = classifyApiError(error);

        log.warn(`Failed to generate ${errorLogLabel}`, {
            error: message,
            ...logContext,
            status,
            userId,
        });

        throw new GenAiGenerationError(
            {
                message,
                operation,
                status,
            },
            { cause: error }
        );
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

        if (message.includes("timeout") || message.includes("deadline")) {
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

        return { message: error.message, status: error.status ?? 500 };
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

    return { message: "Unknown error", status: 500 };
}
