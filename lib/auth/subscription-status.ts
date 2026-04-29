export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export function isActiveSubscriptionStatus(
    status: string | null | undefined
): boolean {
    return status
        ? ACTIVE_SUBSCRIPTION_STATUSES.some((entry) => entry === status)
        : false;
}
