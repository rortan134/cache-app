import { authClient } from "@/lib/auth/client";
import { isActiveSubscriptionStatus } from "./subscription-status";

/**
 * Retrieves the currently active or trialing subscription for the user.
 *
 * @returns The active subscription object, or null if none found.
 * @throws Error if the subscription list cannot be fetched.
 */
export async function getActiveSubscription() {
    const { data: subscriptions, error } = await authClient.subscription.list();

    if (error) {
        throw new Error(error.message);
    }

    return (
        subscriptions?.find((sub) => isActiveSubscriptionStatus(sub.status)) ??
        null
    );
}
