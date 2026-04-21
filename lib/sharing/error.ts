import { NamedError } from "@/lib/error";
import * as z from "zod";

export const CollectionShareError = NamedError.create(
    "CollectionShareError",
    z.object({
        code: z.enum(["not_found", "share_generation_failed"]),
        message: z.string(),
        operation: z.string(),
    })
);
