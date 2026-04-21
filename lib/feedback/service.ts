import { getServerSession } from "@/lib/auth/server";
import { createLogger } from "@/lib/logs/console/logger";
import { prisma } from "@/prisma";
import { FeedbackError } from "./error";

const logger = createLogger("feedback:submit");

export interface SubmitFeedbackInput {
    message: string;
    pagePath: string;
}

export async function submitFeedback({
    message,
    pagePath,
}: SubmitFeedbackInput): Promise<void> {
    const session = await getServerSession();

    try {
        await prisma.feedback.create({
            data: {
                message,
                pagePath,
                userId: session?.user?.id ?? null,
            },
        });

        logger.info("Feedback saved", {
            pagePath,
            userId: session?.user?.id ?? null,
        });
    } catch (error) {
        logger.error("Failed to save feedback", error, {
            pagePath,
            userId: session?.user?.id ?? null,
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
