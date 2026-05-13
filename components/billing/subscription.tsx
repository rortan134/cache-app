"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { CrownFilledIcon } from "@/components/ui/icons";
import { authClient, useSession } from "@/lib/auth/client";
import { isActiveSubscriptionStatus } from "@/lib/billing/subscription-status";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, useLocale, Var } from "gt-next";
import useSWR from "swr";
import * as React from "react";

/**
 * Derives the current user's paid access from the live auth session and active
 * subscription record.
 *
 * Session failures are thrown so route error boundaries handle auth outages
 * consistently. Subscription polling is intentionally short-lived client state:
 * checkout and billing portal redirects can update Stripe state outside this
 * tab, so the UI refreshes without requiring a full reload.
 */
function useSubscriptionAccess() {
    const {
        data: session,
        error: sessionError,
        isPending,
        refetch: refreshSession,
    } = useSession();
    const sessionUserId = session?.user?.id;

    // We explicitly let the error boundary catch such errors
    if (sessionError) {
        throw sessionError;
    }

    const {
        data: subscription,
        isLoading: isSubscriptionLoading,
        mutate: refreshSubscription,
    } = useSWR(
        sessionUserId ? ["subscription", sessionUserId] : null,
        getActiveSubscription,
        {
            keepPreviousData: true,
            refreshInterval: 60_000,
        }
    );

    const hasAccess = isActiveSubscriptionStatus(subscription?.status);
    const isLoading = isPending || isSubscriptionLoading;

    const refreshAccess = useStableCallback(async () => {
        await refreshSession();

        if (sessionUserId) {
            await refreshSubscription();
        }
    });

    return {
        hasAccess,
        isLoading,
        mutate: refreshAccess,
        session,
        subscription,
    };
}

type AccessData = ReturnType<typeof useSubscriptionAccess>;

/**
 * Provides the current subscription, including `undefined` for a resolved free
 * user, to a render function.
 *
 * Prefer this over calling `useSubscriptionAccess` at leaf sites that only need
 * the subscription object; it keeps loading treatment consistent.
 */
function WithSubscriptionOnly({
    children,
    loadingRender = null,
}: WithSubscriptionProps) {
    const { isLoading, subscription } = useSubscriptionAccess();

    if (isLoading) {
        return loadingRender;
    }

    return children(subscription);
}

interface WithSubscriptionProps {
    children: (subscription: AccessData["subscription"]) => React.ReactNode;
    loadingRender?: React.ReactNode;
}

/**
 * Renders children only for users with an active subscription record.
 *
 * This is a UI gate for affordances, not an entitlement check. Server actions
 * that unlock paid behavior must verify subscription state on the server.
 */
function SubscribedOnly({
    children,
    loadingRender = null,
}: React.PropsWithChildren<{ loadingRender?: React.ReactNode }>) {
    const { hasAccess, isLoading } = useSubscriptionAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? children : null;
}

/**
 * Renders children for signed-in users without active paid access.
 *
 * While billing is loading, this withholds upgrade prompts by default so users
 * do not see free-plan messaging while their subscription status is unresolved.
 */
function UnsubscribedOnly({
    children,
    loadingRender = null,
}: React.PropsWithChildren<{ loadingRender?: React.ReactNode }>) {
    const { hasAccess, isLoading } = useSubscriptionAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? null : children;
}

/**
 * Compact account-menu badge for the resolved subscription state.
 *
 * The badge handles the Stripe states users most commonly need to understand:
 * free, cancelling at period end, trialing, active, and fallback statuses. Keep
 * this label conservative because it appears in dense navigation surfaces.
 */
function SubscriptionStatusBadge() {
    return (
        <WithSubscriptionOnly>
            {(subscription) => {
                if (!subscription) {
                    return (
                        <SubscriptionBadge>
                            <T context="Free plan label">Free plan</T>
                        </SubscriptionBadge>
                    );
                }

                const planLabel = subscriptionPlanLabel(subscription.plan);

                if (subscription.cancelAtPeriodEnd) {
                    return (
                        <SubscriptionBadge className="bg-amber-100 text-amber-900">
                            <T context="Subscription ends message">
                                <Var>{planLabel}</Var> ends{" "}
                                <Var>
                                    {subscriptionPeriodEndLabel(
                                        subscription.periodEnd
                                    ) ?? <T>soon</T>}
                                </Var>
                            </T>
                        </SubscriptionBadge>
                    );
                }

                if (subscription.status === "trialing") {
                    return (
                        <SubscriptionBadge className="bg-primary/10 text-primary">
                            <T context="Trialing status label">
                                <Var>{planLabel}</Var> trial, then{" "}
                                <Var>
                                    {subscriptionBillingIntervalLabel(
                                        subscription.billingInterval
                                    )}
                                </Var>
                            </T>
                        </SubscriptionBadge>
                    );
                }

                if (subscription.status === "active") {
                    return (
                        <SubscriptionBadge className="bg-primary/10 text-primary">
                            <GradientWaveText align="center" ariaLabel="Status">
                                <T context="Active status label">
                                    <Var>{planLabel}</Var>{" "}
                                    <Var>
                                        {subscriptionBillingIntervalLabel(
                                            subscription.billingInterval
                                        )}
                                    </Var>
                                </T>
                            </GradientWaveText>
                        </SubscriptionBadge>
                    );
                }

                return (
                    <SubscriptionBadge>
                        <T context="Other subscription status">
                            <Var>{planLabel}</Var>{" "}
                            <Var>
                                {subscriptionStatusLabel(subscription.status)}
                            </Var>
                        </T>
                    </SubscriptionBadge>
                );
            }}
        </WithSubscriptionOnly>
    );
}

/**
 * Starts a checkout upgrade flow for the Pro plan and returns the user to the
 * localized library route afterwards.
 */
function SubscriptionUpgradeButton({
    variant = "ghost",
    ...props
}: React.ComponentProps<typeof Button>) {
    const returnUrl = useLibraryReturnUrl();

    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.upgrade({
                cancelUrl: returnUrl,
                plan: "pro",
                successUrl: returnUrl,
            }),
        <T>We couldn't open checkout right now.</T>
    );

    return (
        <>
            <Button
                {...props}
                loading={isPending}
                onClick={execute}
                variant={variant}
            />
            <SubscriptionErrorMessage>{errorMessage}</SubscriptionErrorMessage>
        </>
    );
}

/**
 * Opens Stripe's hosted billing portal for the current customer.
 */
function SubscriptionBillingPortalButton({
    variant = "ghost",
    ...props
}: React.ComponentProps<typeof Button>) {
    const returnUrl = useLibraryReturnUrl();

    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.billingPortal({
                returnUrl,
            }),
        <T>We couldn't open billing right now.</T>
    );

    return (
        <>
            <Button
                {...props}
                loading={isPending}
                onClick={execute}
                variant={variant}
            />
            <SubscriptionErrorMessage>{errorMessage}</SubscriptionErrorMessage>
        </>
    );
}

/**
 * Builds the post-Stripe return URL from the active locale.
 *
 * The empty server-side origin keeps this hook render-safe during SSR; callers
 * execute the redirect action only from client events where `window` exists.
 */
/* @internal */
function useLibraryReturnUrl() {
    const locale = useLocale();
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/${locale}/library`;
}

/* @internal */
function getStringField(value: unknown, field: string): string | undefined {
    if (!value || typeof value !== "object" || !(field in value)) {
        return;
    }
    const result = Reflect.get(value, field);
    return typeof result === "string" ? result : undefined;
}

/* @internal */
function subscriptionErrorMessage(error: unknown): string | undefined {
    return getStringField(error, "message");
}

/* @internal */
function subscriptionRedirectUrl(data: unknown): string | undefined {
    const url = getStringField(data, "url");
    return url && url.length > 0 ? url : undefined;
}

/**
 * Wraps a hosted billing request with pending state, redirect handling, and a
 * user-facing fallback error.
 *
 * The request shape is deliberately narrow so checkout and portal buttons share
 * identical failure behavior without depending on a specific better-auth method
 * type.
 */
/* @internal */
function useSubscriptionRedirectAction(
    request: () => Promise<{ data?: unknown; error?: unknown }>,
    fallbackMessage: React.ReactNode
) {
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] =
        React.useState<React.ReactNode | null>(null);

    const execute = useStableCallback(() => {
        startTransition(async () => {
            setErrorMessage(null);
            try {
                const { data, error } = await request();

                if (error) {
                    setErrorMessage(
                        subscriptionErrorMessage(error) ?? fallbackMessage
                    );
                    return;
                }

                const url = subscriptionRedirectUrl(data);
                if (url) {
                    window.location.assign(url);
                    return;
                }

                setErrorMessage(fallbackMessage);
            } catch {
                setErrorMessage(fallbackMessage);
            }
        });
    });

    return { errorMessage, execute, isPending };
}

/* @internal */
function subscriptionPlanLabel(plan: string | null | undefined) {
    if (!plan) {
        return <T>Subscription</T>;
    }

    return `${plan[0]?.toUpperCase()}${plan.slice(1)}`;
}

/* @internal */
function subscriptionBillingIntervalLabel(
    billingInterval: string | null | undefined
) {
    if (billingInterval === "year") {
        return <T>yearly</T>;
    }

    if (billingInterval === "month") {
        return <T>monthly</T>;
    }

    return null;
}

/* @internal */
function subscriptionPeriodEndLabel(
    periodEnd: string | Date | null | undefined
) {
    if (!periodEnd) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
    }).format(new Date(periodEnd));
}

/* @internal */
function subscriptionStatusLabel(status: string | null | undefined) {
    return status?.replaceAll("_", " ") ?? <T>Unknown</T>;
}

/* @internal */
function SubscriptionBadge({
    className,
    children,
    variant = "secondary",
    ...props
}: React.ComponentProps<typeof Badge>) {
    return (
        <Badge
            {...props}
            className={cn("h-6! w-full", className)}
            variant={variant}
        >
            <CrownFilledIcon />
            {children}
        </Badge>
    );
}

/**
 * Announces checkout and billing portal failures without reserving layout space
 * during the happy path.
 */
/* @internal */
function SubscriptionErrorMessage(props: React.ComponentProps<"p">) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            aria-live="polite"
            className="px-2 text-destructive text-xs"
            role="status"
            {...props}
        />
    );
}

export {
    SubscribedOnly,
    SubscriptionBillingPortalButton,
    SubscriptionStatusBadge,
    SubscriptionUpgradeButton,
    UnsubscribedOnly,
    useSubscriptionAccess,
    WithSubscriptionOnly,
};
