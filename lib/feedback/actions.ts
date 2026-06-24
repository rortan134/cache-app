"use server";

import { isUnauthenticated, requireActionUserId } from "@/lib/auth/session";
import { getValidationErrorMessage } from "@/lib/common/action";
import { FeedbackError } from "@/lib/feedback/error";
import {
    FeedbackInputSchema,
    type FeedbackActionState,
} from "@/lib/feedback/schema";
import * as service from "./service";

export async function createFeedback(
    _previousState: FeedbackActionState,
    formData: FormData
): Promise<FeedbackActionState> {
    const auth = await requireActionUserId("Sign in again to submit feedback.");
    if (isUnauthenticated(auth)) {
        return { message: auth.message, status: "error" };
    }

    const rawContext = formData.get("context");
    const context =
        typeof rawContext === "string" && rawContext.length > 0
            ? rawContext
            : undefined;

    const parsed = FeedbackInputSchema.safeParse({
        context,
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

    try {
        await service.submitFeedback({
            ...parsed.data,
            context: parsed.data.context ?? null,
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
