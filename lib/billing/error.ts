import * as z from "zod";
import { NamedError } from "@/lib/common/error";

export const StripeError = NamedError.create(
    "StripeError",
    z.object({
        message: z.string(),
        operation: z.string(),
    })
);
