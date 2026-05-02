"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    requireActionUserId,
} from "@/lib/common/procedure";
import { prisma } from "@/prisma";
import * as z from "zod";

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
        const result = await prisma.libraryItem.updateMany({
            data: {
                reviewedAt: new Date(),
            },
            where: {
                id: parsed.data.itemId,
                userId: auth.userId,
            },
        });

        if (result.count === 0) {
            return {
                message: "Saved item not found.",
                status: "NOT_FOUND",
            };
        }

        return { status: "REVIEWED" };
    } catch (error) {
        log.error("Failed to mark item as reviewed", error);
        return {
            message: "We couldn't mark this item as reviewed right now.",
            status: "ERROR",
        };
    }
}
