import { NamedError } from "@/lib/error";
import * as z from "zod";

export const StripeError = NamedError.create(
    "StripeError",
    z.object({
        cause: z.unknown().optional(),
        message: z.string(),
        operation: z.string(),
    })
);
