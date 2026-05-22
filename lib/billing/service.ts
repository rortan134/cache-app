import "server-only";

import type { PlanType } from "@/lib/billing/prices";
import { prisma } from "@/prisma";
import { isActiveSubscriptionStatus } from "./subscription-status";

export async function getUserActiveSubscriptionStatus(userId: string) {
    "use cache: remote";

    const subscription = await prisma.subscription.findFirst({
        orderBy: {
            periodEnd: "desc",
        },
        select: {
            billingInterval: true,
            status: true,
        },
        where: {
            referenceId: userId,
        },
    });

    return subscription ?? null;
}

export async function userHasActiveSubscription(
    userId: string
): Promise<boolean> {
    "use cache: remote";

    const subscription = await getUserActiveSubscriptionStatus(userId);

    return isActiveSubscriptionStatus(subscription?.status);
}

export async function getUserPlanType(userId: string): Promise<PlanType> {
    "use cache: remote";

    const subscription = await getUserActiveSubscriptionStatus(userId);

    if (!(subscription && isActiveSubscriptionStatus(subscription.status))) {
        return "free";
    }

    return subscription.billingInterval === "year" ? "yearly" : "monthly";
}
