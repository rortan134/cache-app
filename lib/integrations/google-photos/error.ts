import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const GooglePhotosPickerApiError = NamedError.create(
    "GooglePhotosPickerApiError",
    z.object({
        message: z.string(),
        status: z.number(),
    })
);

export const PickerNotReadyError = NamedError.create(
    "PickerNotReadyError",
    z.object({
        pollIntervalMs: z.number(),
    })
);
