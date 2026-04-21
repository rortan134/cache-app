"use server";

import {
    FeedbackInputSchema,
    type FeedbackActionState,
} from "@/lib/feedback/schema";
import { submitFeedback } from "@/lib/feedback/service";

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
            message: "Please enter a bit of feedback before sending.",
            status: "error",
        };
    }

    try {
        await submitFeedback(parsed.data);

        return {
            message: "Thanks for the feedback.",
            status: "success",
        };
    } catch {
        return {
            message: "We couldn't save your feedback. Please try again.",
            status: "error",
        };
    }
}
