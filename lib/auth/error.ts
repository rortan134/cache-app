import * as z from "zod";
import { NamedError } from "@/lib/common/error";

export const SessionError = NamedError.create(
    "SessionError",
    z.object({
        message: z.string(),
        operation: z.string(),
    })
);
