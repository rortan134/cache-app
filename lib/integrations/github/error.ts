import { NamedError } from "@/lib/error";
import * as z from "zod";

export const GitHubApiError = NamedError.create(
    "GitHubApiError",
    z.object({
        message: z.string(),
        status: z.number(),
    })
);
export type GitHubApiError = InstanceType<typeof GitHubApiError>;
