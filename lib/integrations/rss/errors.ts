import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const RssFeedError = NamedError.create(
    "RssFeedError",
    z.object({
        feedId: z.string().optional(),
        kind: z.enum([
            "already_exists",
            "fetch_failed",
            "invalid_url",
            "not_found",
            "parse_failed",
        ]),
        message: z.string(),
    })
);
export type RssFeedError = InstanceType<typeof RssFeedError>;
