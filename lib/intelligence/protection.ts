import "server-only";

import { serverEnv } from "@/env/server";
import type { PriceType } from "@/lib/billing/prices";
import { GEN_AI_QUOTAS } from "@/lib/billing/quotas";
import { getUserPlanType } from "@/lib/billing/service";
import { createLogger } from "@/lib/common/logs/console/logger";
import { GenAiProtectionError } from "@/lib/intelligence/error";
import type { ArcjetNextRequest } from "@arcjet/next";
import arcjet, {
    detectPromptInjection,
    shield,
    tokenBucket,
} from "@arcjet/next";
import type { ArcjetDecision } from "arcjet";

const log = createLogger("intelligence:protection");
const CHARACTERISTIC_USER_ID = "userId";
const CHARS_PER_TOKEN_ESTIMATE = 4;

export function estimateGenAiTokens(
    input: string,
    outputTokenLimit: number
): number {
    return Math.max(
        1,
        Math.ceil(input.length / CHARS_PER_TOKEN_ESTIMATE) + outputTokenLimit
    );
}

function createPlanClient(plan: PriceType, key: string) {
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
                characteristics: [CHARACTERISTIC_USER_ID],
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
        default:
            return "The AI request was blocked.";
    }
}

export async function protectGenAiRequest(args: {
    feature: string;
    prompt: string;
    request: ArcjetNextRequest;
    requestedTokens: number;
    userId: string;
}): Promise<void> {
    const { feature, prompt, request, requestedTokens, userId } = args;

    if (!serverEnv.ARCJET_KEY) {
        log.warn(
            "Skipping Gen AI Arcjet protection because ARCJET_KEY is not configured",
            { feature, userId }
        );
        return;
    }

    const plan = await getUserPlanType(userId);
    const decision = await createPlanClient(plan, serverEnv.ARCJET_KEY).protect(
        request,
        {
            detectPromptInjectionMessage: prompt,
            requested: requestedTokens,
            userId,
        }
    );

    if (!decision.isDenied()) {
        return;
    }

    const reason = denialReason(decision);
    log.warn("Gen AI request denied by Arcjet", {
        conclusion: decision.conclusion,
        feature,
        plan,
        reason,
        requestedTokens,
        userId,
    });

    throw new GenAiProtectionError({
        feature,
        message: denialMessage(reason),
        operation: "protectGenAiRequest",
        plan,
        reason,
        requestedTokens,
        userId,
    });
}
