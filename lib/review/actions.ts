"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
    requireActionUserId,
} from "@/lib/common/procedure";
import { markLibraryItemAsReviewed as markLibraryItemAsReviewedService } from "./service";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { ReviewError } from "./error";

const log = createLogger("library:actions:review");

const MarkAsReviewedInputSchema = z.object({
    itemId: z.string().trim().min(1, "A saved item is required."),
});

export type MarkAsReviewedResult =
    | { status: "REVIEWED" }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export async function markLibraryItemAsReviewed(
    itemId: string
): Promise<MarkAsReviewedResult> {
    const parsed = MarkAsReviewedInputSchema.safeParse({ itemId });
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "A saved item is required."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to review saved items."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        await markLibraryItemAsReviewedService({
            itemId: parsed.data.itemId,
            userId: auth.userId,
        });

        revalidatePath("/review");
        return { status: "REVIEWED" };
    } catch (error) {
        return handleActionError({
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: ReviewError,
            fallbackMessage:
                "We couldn't mark this item as reviewed right now.",
            log,
        });
    }
}
