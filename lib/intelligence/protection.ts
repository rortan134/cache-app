import "server-only";

import { serverEnv } from "@/env/server";
import { getUserPlanType } from "@/lib/auth/subscription-access";
import { GEN_AI_QUOTAS, type PlanType } from "@/lib/billing/prices";
import { NamedError } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import arcjet, {
    detectPromptInjection,
    shield,
    tokenBucket,
} from "@arcjet/next";
import type { ArcjetDecision } from "arcjet";
import * as z from "zod";

const log = createLogger("intelligence:protection");
const USER_ID_CHARACTERISTIC = "userId";
const CHARS_PER_TOKEN_ESTIMATE = 4;

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

export function estimateGenAiTokens(
    input: string,
    outputTokenLimit: number
): number {
    return Math.max(
        1,
        Math.ceil(input.length / CHARS_PER_TOKEN_ESTIMATE) + outputTokenLimit
    );
}

function createPlanClient(plan: PlanType, key: string) {
    const quota = GEN_AI_QUOTAS[plan];

    return arcjet({
        key,
        rules: [
            shield({
                mode: "LIVE",
            }),
            detectPromptInjection({
                mode: "LIVE",
            }),
            tokenBucket({
                capacity: quota.fixedLimit,
                characteristics: [USER_ID_CHARACTERISTIC],
                interval: quota.rollingWindow,
                mode: "LIVE",
                refillRate: quota.rollingLimit,
            }),
        ],
    });
}

function denialReason(decision: ArcjetDecision) {
    if (decision.reason.isRateLimit()) {
        return "quota_exceeded";
    }
    if (decision.reason.isPromptInjection()) {
        return "prompt_injection";
    }
    return "forbidden";
}

function denialMessage(reason: ReturnType<typeof denialReason>): string {
    switch (reason) {
        case "quota_exceeded":
            return "Your AI usage quota has been reached. Please try again later.";
        case "prompt_injection":
            return "The request was blocked because it looks like prompt injection.";
        case "forbidden":
            return "The AI request was blocked.";
        default:
            return "The AI request was blocked.";
    }
}

export async function protectGenAiRequest(args: {
    feature: string;
    prompt: string;
    request: Request;
    requestedTokens: number;
    userId: string;
}): Promise<void> {
    if (!serverEnv.ARCJET_KEY) {
        log.warn(
            "Skipping Gen AI Arcjet protection because ARCJET_KEY is not configured",
            {
                feature: args.feature,
                userId: args.userId,
            }
        );
        return;
    }

    const plan = await getUserPlanType(args.userId);
    const decision = await createPlanClient(plan, serverEnv.ARCJET_KEY).protect(
        args.request,
        {
            detectPromptInjectionMessage: args.prompt,
            requested: args.requestedTokens,
            userId: args.userId,
        }
    );

    if (!decision.isDenied()) {
        return;
    }

    const reason = denialReason(decision);
    log.warn("Gen AI request denied by Arcjet", {
        conclusion: decision.conclusion,
        feature: args.feature,
        plan,
        reason,
        requestedTokens: args.requestedTokens,
        userId: args.userId,
    });

    throw new GenAiProtectionError({
        feature: args.feature,
        message: denialMessage(reason),
        operation: "protectGenAiRequest",
        plan,
        reason,
        requestedTokens: args.requestedTokens,
        userId: args.userId,
    });
}
