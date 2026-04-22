import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const XApiError = NamedError.create(
    "XApiError",
    z.object({
        message: z.string(),
        status: z.number(),
    })
);
export type XApiError = InstanceType<typeof XApiError>;
