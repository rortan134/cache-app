import type { Subscription } from "@better-auth/stripe";
import * as z from "zod";
import type { PriceType } from "./prices";
import { isActiveSubscriptionStatus } from "./subscription-status";

const PlanLimitsSchema = z.object({
    fixedLimit: z.int(),
    rollingLimit: z.int(),
    rollingWindow: z.int(),
});

export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const QuotaSchema = z.strictObject<{
    [key in PriceType]: z.ZodType<PlanLimits>;
}>({
    free: PlanLimitsSchema,
    monthly: PlanLimitsSchema,
    yearly: PlanLimitsSchema,
});

export type Quota = z.infer<typeof QuotaSchema>;

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
} as const satisfies Quota);

export const Capabilities = {
    CanReview: "canReview",
    CanUseAutomations: "canUseAutomations",
    CanUseGenAI: "canUseGenAI",
} as const;

export type Capability = (typeof Capabilities)[keyof typeof Capabilities];

type PlanCapabilities = Record<Capability, boolean>;

export function getSubscriptionPlanCapabilities(
    subscription: Subscription
): PlanCapabilities {
    const hasAccess = isActiveSubscriptionStatus(subscription?.status);

    return {
        [Capabilities.CanReview]: hasAccess,
        [Capabilities.CanUseAutomations]: hasAccess,
        [Capabilities.CanUseGenAI]: true,
    } satisfies PlanCapabilities;
}
