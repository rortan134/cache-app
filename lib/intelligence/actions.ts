"use server";

import { isUnauthenticated, requireActionUserId } from "@/lib/auth/session";
import { getValidationErrorMessage } from "@/lib/common/action";
import { createLogger } from "@/lib/common/logs/console/logger";
import { request as getArcjetRequest } from "@arcjet/next";
import {
    AskCacheRequestSchema,
    type AskCacheRequest,
    type AskCacheResult,
} from "./composer/ask-cache";
import { runAskCacheAgent } from "./composer/service";
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
    if (isUnauthenticated(auth)) {
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

export async function askCache(
    input: AskCacheRequest
): Promise<AskCacheResult> {
    const parsed = AskCacheRequestSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Enter a valid Ask Cache request."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId("Sign in again to ask Cache.");
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const result = await runAskCacheAgent({
            input: parsed.data,
            request: await getArcjetRequest(),
            userId: auth.userId,
        });

        return {
            markdown: result.markdown,
            operations: result.operations,
            status: "SUCCESS",
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
                markdown:
                    "Ask Cache could not complete that request. Please try again.",
                message: error.data.message,
                status: "ERROR",
            };
        }

        log.error("Failed to ask Cache", error);
        return {
            markdown:
                "Ask Cache could not complete that request. Please try again.",
            message: "We couldn't ask Cache right now.",
            status: "ERROR",
        };
    }
}
