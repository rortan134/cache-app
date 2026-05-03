import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const ReviewError = NamedError.create(
    "ReviewError",
    z.object({
        code: z.enum(["not_found"]),
        message: z.string(),
        operation: z.string(),
    })
);
