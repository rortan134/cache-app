import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const PickerNotReadyError = NamedError.create(
    "PickerNotReadyError",
    z.object({
        pollIntervalMs: z.number(),
    })
);
