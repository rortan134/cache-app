import { serverEnv } from "@/env/server";
import { withStripe } from "@/lib/billing/client";
import { StripeError } from "@/lib/billing/error";
import * as z from "zod";

export type PlanType = "free" | "monthly" | "yearly";

export interface PlanLimits {
    fixedLimit: number;
    rollingLimit: number;
    rollingWindow: number;
}

export const QuotaSchema = z.object<{
    [key in PlanType]: z.ZodType<PlanLimits>;
}>({
    free: z.object({
        fixedLimit: z.int(),
        rollingLimit: z.int(),
        rollingWindow: z.int(),
    }),
    monthly: z.object({
        fixedLimit: z.int(),
        rollingLimit: z.int(),
        rollingWindow: z.int(),
    }),
    yearly: z.object({
        fixedLimit: z.int(),
        rollingLimit: z.int(),
        rollingWindow: z.int(),
    }),
});

export const GEN_AI_QUOTAS = QuotaSchema.parse({
    free: {
        fixedLimit: 12_000,
        rollingLimit: 2000,
        rollingWindow: 60 * 60,
    },
    monthly: {
        fixedLimit: 120_000,
        rollingLimit: 20_000,
        rollingWindow: 60 * 60,
    },
    yearly: {
        fixedLimit: 120_000,
        rollingLimit: 20_000,
        rollingWindow: 60 * 60,
    },
});

export interface PlanPrice {
    amountCents: number; // integer cents
    currency: string; // ISO 4217 uppercase (e.g., EUR)
    id: string;
    interval: "month" | "year";
    nickname?: string | null;
}

export async function retrievePriceById(
    priceId: string
): Promise<PlanPrice | null> {
    const price = await withStripe((stripe) => stripe.prices.retrieve(priceId));
    if (!price) {
        return null;
    }

    if (price.type !== "recurring" || !price.recurring?.interval) {
        throw new StripeError({
            message: `Configured price '${priceId}' is not recurring (type=${price.type}).`,
            operation: "prices::retrievePriceById",
        });
    }

    const currency = price.currency.toUpperCase();
    const amountCents = price.unit_amount ?? 0;

    return {
        amountCents,
        currency,
        id: price.id,
        interval: price.recurring.interval as "month" | "year",
        nickname: price.nickname ?? null,
    } satisfies PlanPrice;
}

export async function getPlanPrices(): Promise<{
    monthly: PlanPrice | null;
    yearly: PlanPrice | null;
}> {
    const [monthly, yearly] = await Promise.all([
        retrievePriceById(serverEnv.STRIPE_PRICE_ID_MONTHLY),
        retrievePriceById(serverEnv.STRIPE_PRICE_ID_YEARLY),
    ]);
    return { monthly, yearly };
}

export function calculateFeeInCents(x: number) {
    // math: x = total - (total * 0.044 + 0.30)
    // math: x = total * (1-0.044) - 0.30
    // math: (x + 0.30) / 0.956 = total
    return Math.round(((x + 30) / 0.956) * 0.044 + 30);
}
