import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const PinterestApiError = NamedError.create(
    "PinterestApiError",
    z.object({
        message: z.string(),
        status: z.number(),
    })
);
export type PinterestApiError = InstanceType<typeof PinterestApiError>;
