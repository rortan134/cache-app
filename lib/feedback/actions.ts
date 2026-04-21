"use server";

import { getServerSession } from "@/lib/auth/server";
import { FeedbackError } from "@/lib/feedback/error";
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

    const session = await getServerSession();

    try {
        await submitFeedback({
            ...parsed.data,
            userId: session?.user?.id ?? null,
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
