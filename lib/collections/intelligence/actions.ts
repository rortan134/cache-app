"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    requireActionUserId,
} from "@/lib/common/procedure";
import { request as getArcjetRequest } from "@arcjet/next";
import { GenAiGenerationError, GenAiProtectionError } from "./error";
import {
    SECTION_DESCRIPTION_FALLBACK_TEXT,
    SectionDescriptionRequestSchema,
    type DescriptionRequest,
} from "./overview";
import { generateCollectionSummary } from "./service";

const log = createLogger("intelligence:actions");

export type SectionDescriptionResult =
    | {
          status: "SUCCESS";
          summary: string;
      }
    | {
          message: string;
          status:
              | "ERROR"
              | "FORBIDDEN"
              | "INVALID"
              | "QUOTA_EXCEEDED"
              | "UNAUTHORIZED";
          summary?: string;
      };

export async function getSectionDescription(
    input: DescriptionRequest
): Promise<SectionDescriptionResult> {
    const parsed = SectionDescriptionRequestSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Enter valid overview context."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to generate an overview."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const result = await generateCollectionSummary({
            expanded: parsed.data.expanded ?? false,
            items: parsed.data.items,
            request: await getArcjetRequest(),
            sectionTitle: parsed.data.sectionTitle,
            userId: auth.userId,
        });

        return {
            status: "SUCCESS",
            summary: result.summary,
        };
    } catch (error) {
        if (GenAiProtectionError.isInstance(error)) {
            return {
                message: error.data.message,
                status:
                    error.data.reason === "quota_exceeded"
                        ? "QUOTA_EXCEEDED"
                        : "FORBIDDEN",
            };
        }

        if (GenAiGenerationError.isInstance(error)) {
            return {
                message: error.data.message,
                status: "ERROR",
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            };
        }

        log.error("Failed to generate library overview", error);
        return {
            message: "We couldn't generate this overview right now.",
            status: "ERROR",
            summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
        };
    }
}
