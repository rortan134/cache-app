import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const StripeError = NamedError.create(
    "StripeError",
    z.object({
        message: z.string(),
        operation: z.string(),
    })
);
