import * as z from "zod";
import { NamedError } from "@/lib/common/error";

export const FeedbackError = NamedError.create(
    "FeedbackError",
    z.object({
        message: z.string(),
        operation: z.string(),
    })
);
