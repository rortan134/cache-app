import "server-only";

import type { PlanType } from "@/lib/billing/prices";
import { SORT_DESC } from "@/lib/common/constants";
import { prisma } from "@/prisma";
import { cacheLife } from "next/cache";
import { isActiveSubscriptionStatus } from "./subscription-status";

export async function userHasActiveSubscription(
    userId: string
): Promise<boolean> {
    "use cache";
    cacheLife("hours");
    const subscription = await prisma.subscription.findFirst({
        orderBy: {
            periodEnd: SORT_DESC,
        },
        select: {
            status: true,
        },
        where: {
            referenceId: userId,
        },
    });

    return isActiveSubscriptionStatus(subscription?.status);
}

export async function getUserPlanType(userId: string): Promise<PlanType> {
    const subscription = await prisma.subscription.findFirst({
        orderBy: {
            periodEnd: SORT_DESC,
        },
        select: {
            billingInterval: true,
            status: true,
        },
        where: {
            referenceId: userId,
        },
    });

    if (!(subscription && isActiveSubscriptionStatus(subscription.status))) {
        return "free";
    }

    return subscription.billingInterval === "year" ? "yearly" : "monthly";
}
