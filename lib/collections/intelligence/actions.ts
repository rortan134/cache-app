"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    requireActionUserId,
} from "@/lib/common/procedure";
import { GenAiGenerationError, GenAiProtectionError } from "./error";
import { generateCollectionSummary } from "./service";
import {
    SectionDescriptionRequestSchema,
    SECTION_DESCRIPTION_FALLBACK_TEXT,
} from "./summary";

const log = createLogger("intelligence:actions");

export type GenerateSectionDescriptionResult =
    | { status: "SUCCESS"; summary: string }
    | {
          message: string;
          status:
              | "ERROR"
              | "FORBIDDEN"
              | "INVALID"
              | "QUOTA_EXCEEDED"
              | "TIMEOUT"
              | "UNAUTHORIZED";
          summary?: string;
      };

/**
 * Generates a section description for the authenticated user.
 *
 * Validates input, guards with user context, and delegates to the
 * intelligence service. Returns a serializable result so callers can
 * handle errors without catching.
 */
export async function generateSummaryAction(
    input: unknown
): Promise<GenerateSectionDescriptionResult> {
    const parsed = SectionDescriptionRequestSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Invalid request payload."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to generate summaries."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const result = await generateCollectionSummary({
            items: parsed.data.items,
            request: new Request(
                "https://cache.local/internal/section-description"
            ),
            sectionTitle: parsed.data.sectionTitle,
            userId: auth.userId,
        });

        return {
            status: "SUCCESS",
            summary: result.summary,
        };
    } catch (error) {
        if (GenAiProtectionError.isInstance(error)) {
            const status =
                error.data.reason === "quota_exceeded"
                    ? "QUOTA_EXCEEDED"
                    : "FORBIDDEN";
            return {
                message: error.data.message,
                status,
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            };
        }

        if (GenAiGenerationError.isInstance(error)) {
            return {
                message: error.data.message,
                status: mapHttpStatusToActionStatus(error.data.status),
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            };
        }

        log.error("Unexpected error generating section description", error);
        return {
            message: "Unknown error",
            status: "ERROR",
            summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
        };
    }
}

function mapHttpStatusToActionStatus(
    status: number | undefined
): GenerateSectionDescriptionResult["status"] {
    if (status === 408) {
        return "TIMEOUT";
    }
    if (status === 429) {
        return "QUOTA_EXCEEDED";
    }
    return "ERROR";
}
