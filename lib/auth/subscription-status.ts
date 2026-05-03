export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export function isActiveSubscriptionStatus(
    status: string | null | undefined
): boolean {
    return ACTIVE_SUBSCRIPTION_STATUSES.some((s) => s === status);
}
