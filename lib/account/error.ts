import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const AccountError = NamedError.create(
    "AccountError",
    z.object({
        message: z.string(),
        operation: z.string(),
    })
);
