"use server";

import { FeedbackError } from "@/lib/feedback/error";
import {
    FeedbackInputSchema,
    type FeedbackActionState,
} from "@/lib/feedback/schema";
import {
    getValidationErrorMessage,
    requireActionUserId,
} from "@/lib/common/procedure";
import * as service from "./service";

export async function createFeedback(
    _previousState: FeedbackActionState,
    formData: FormData
): Promise<FeedbackActionState> {
    const parsed = FeedbackInputSchema.safeParse({
        message: formData.get("message"),
        pagePath: formData.get("pagePath"),
    });

    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Please enter a bit of feedback before sending."
            ),
            status: "error",
        };
    }

    const auth = await requireActionUserId("Sign in again to submit feedback.");
    if ("status" in auth) {
        return { message: auth.message, status: "error" };
    }

    try {
        await service.submitFeedback({
            ...parsed.data,
            userId: auth.userId,
        });

        return {
            message: "Thanks for the feedback.",
            status: "success",
        };
    } catch (error) {
        if (error instanceof FeedbackError) {
            return {
                message: error.data.message,
                status: "error",
            };
        }
        return {
            message: "We couldn't save your feedback. Please try again.",
            status: "error",
        };
    }
}
