import * as z from "zod";
import { NamedError } from "@/lib/common/error";

export const PickerNotReadyError = NamedError.create(
    "PickerNotReadyError",
    z.object({
        pollIntervalMs: z.number(),
    })
);
