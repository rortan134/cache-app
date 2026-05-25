import { NamedError } from "@/lib/common/error";
import * as z from "zod";

export const GenAiProtectionError = NamedError.create(
    "GenAiProtectionError",
    z.object({
        feature: z.string(),
        message: z.string(),
        operation: z.string(),
        plan: z.enum(["free", "monthly", "yearly"]),
        reason: z.enum(["quota_exceeded", "prompt_injection", "forbidden"]),
        requestedTokens: z.int().positive(),
        userId: z.string(),
    })
);

export const GenAiGenerationError = NamedError.create(
    "GenAiGenerationError",
    z.object({
        message: z.string(),
        operation: z.string(),
        status: z.number().optional(),
    })
);
