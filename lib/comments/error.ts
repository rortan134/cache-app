import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const CommentError = NamedError.create(
    "CommentError",
    z.object({
        code: z.enum(["invalid_kind", "not_found"]),
        message: z.string(),
        operation: z.string(),
    })
);
