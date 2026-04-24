import { serverEnv } from "@/env/server";
import { withStripe } from "@/lib/billing/client";
import { StripeError } from "@/lib/billing/error";

export type PlanType = "monthly" | "yearly";

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
