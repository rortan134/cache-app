import { NamedError } from "@/lib/error";
import * as z from "zod";

export const PinterestApiError = NamedError.create(
    "PinterestApiError",
    z.object({
        message: z.string(),
        status: z.number(),
    })
);
