import { NamedError } from "@/lib/error";
import * as z from "zod";

export const LibraryNoteError = NamedError.create(
    "LibraryNoteError",
    z.object({
        code: z.enum(["invalid_note", "not_found"]),
        message: z.string(),
        operation: z.string(),
    })
);
