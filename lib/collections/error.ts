import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const LibraryCollectionError = NamedError.create(
    "LibraryCollectionError",
    z.object({
        code: z.enum(["duplicate_name", "invalid_name", "not_found"]),
        message: z.string(),
        operation: z.string(),
    })
);
