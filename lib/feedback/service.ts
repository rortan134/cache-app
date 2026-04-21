import { createLogger } from "@/lib/logs/console/logger";
import { prisma } from "@/prisma";
import { FeedbackError } from "./error";

const logger = createLogger("feedback:submit");

export interface SubmitFeedbackInput {
    message: string;
    pagePath: string;
    userId: string | null;
}

export async function submitFeedback({
    message,
    pagePath,
    userId,
}: SubmitFeedbackInput): Promise<void> {
    try {
        await prisma.feedback.create({
            data: {
                message,
                pagePath,
                userId,
            },
        });

        logger.info("Feedback saved", {
            pagePath,
            userId,
        });
    } catch (error) {
        logger.error("Failed to save feedback", error, {
            pagePath,
            userId,
        });

        throw new FeedbackError(
            {
                message: "Could not save feedback right now.",
                operation: "submit",
            },
            { cause: error }
        );
    }
}
