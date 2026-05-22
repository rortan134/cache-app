import { serverEnv } from "@/env/server";
import { withStripe } from "@/lib/billing/client";
import { StripeError } from "@/lib/billing/error";

export type PriceType = "free" | "monthly" | "yearly";

export type PriceInterval = "day" | "week" | "month" | "year";

export interface PlanPrice {
    amountCents: number; // integer cents
    currency: string; // ISO 4217 uppercase (e.g., EUR)
    id: string;
    interval: PriceInterval;
    nickname?: string | null;
}

export async function getPlanPriceById(
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
    if (price.unit_amount === null) {
        throw new StripeError({
            message: `Configured price '${priceId}' has no unit amount.`,
            operation: "prices::retrievePriceById",
        });
    }

    return {
        amountCents: price.unit_amount,
        currency,
        id: price.id,
        interval: price.recurring.interval,
        nickname: price.nickname ?? null,
    } satisfies PlanPrice;
}

export function getPlanPriceIds(): { monthly: string; yearly: string } {
    return {
        monthly: serverEnv.STRIPE_PRICE_ID_MONTHLY,
        yearly: serverEnv.STRIPE_PRICE_ID_YEARLY,
    };
}

export async function getPlanPrices(): Promise<{
    monthly: PlanPrice | null;
    yearly: PlanPrice | null;
}> {
    const prices = getPlanPriceIds();
    const [monthly, yearly] = await Promise.all([
        getPlanPriceById(prices.monthly),
        getPlanPriceById(prices.yearly),
    ]);

    return { monthly, yearly };
}

const STRIPE_FEE_PERCENT = 0.044;
const STRIPE_FEE_FLAT_CENTS = 30;
const STRIPE_FEE_NET_MULTIPLIER = 1 - STRIPE_FEE_PERCENT;

export function calculatePriceFeeInCents(x: number) {
    // math: x = total - (total * STRIPE_FEE_PERCENT + STRIPE_FEE_FLAT_CENTS)
    // math: x = total * STRIPE_FEE_NET_MULTIPLIER - STRIPE_FEE_FLAT_CENTS
    // math: (x + STRIPE_FEE_FLAT_CENTS) / STRIPE_FEE_NET_MULTIPLIER = total
    return Math.round(
        ((x + STRIPE_FEE_FLAT_CENTS) / STRIPE_FEE_NET_MULTIPLIER) *
            STRIPE_FEE_PERCENT +
            STRIPE_FEE_FLAT_CENTS
    );
}
