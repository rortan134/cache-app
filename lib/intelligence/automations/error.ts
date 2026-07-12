import { NamedError } from "@/lib/common/error";
import * as z from "zod";

type AutomationErrorCode =
    | "forbidden"
    | "invalid_schedule"
    | "missing_collection"
    | "must_be_paused"
    | "not_found"
    | "quota_unavailable"
    | "start_failed"
    | "unauthorized";

export const AutomationError = NamedError.create(
    "AutomationError",
    z.object({
        code: z.enum([
            "forbidden",
            "invalid_schedule",
            "missing_collection",
            "must_be_paused",
            "not_found",
            "quota_unavailable",
            "start_failed",
            "unauthorized",
        ]),
        message: z.string(),
        operation: z.string(),
    })
);

export function createAutomationError(args: {
    code: AutomationErrorCode;
    message: string;
    operation: string;
}): InstanceType<typeof AutomationError> {
    return new AutomationError(args);
}
