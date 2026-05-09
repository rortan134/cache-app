import type { PlanType } from "@/lib/billing/prices";
import { isActiveSubscriptionStatus } from "@/lib/billing/subscription-status";
import type { Subscription } from "@better-auth/stripe";
import * as z from "zod";

const PlanLimitsSchema = z.object({
    fixedLimit: z.int(),
    rollingLimit: z.int(),
    rollingWindow: z.int(),
});

export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const QuotaSchema = z.object<{
    [key in PlanType]: z.ZodType<PlanLimits>;
}>({
    free: PlanLimitsSchema,
    monthly: PlanLimitsSchema,
    yearly: PlanLimitsSchema,
});

const ONE_HOUR_SECONDS = 60 * 60;

export const GEN_AI_QUOTAS = QuotaSchema.parse({
    free: {
        fixedLimit: 12_000,
        rollingLimit: 2000,
        rollingWindow: ONE_HOUR_SECONDS,
    },
    monthly: {
        fixedLimit: 120_000,
        rollingLimit: 20_000,
        rollingWindow: ONE_HOUR_SECONDS,
    },
    yearly: {
        fixedLimit: 120_000,
        rollingLimit: 20_000,
        rollingWindow: ONE_HOUR_SECONDS,
    },
});

export function getSubscriptionPlanCapabilities(subscription: Subscription) {
    const hasAccess = isActiveSubscriptionStatus(subscription?.status);

    return {
        canReview: hasAccess,
        canUseGenAI: true,
        canUseWorkflows: hasAccess,
    };
}
