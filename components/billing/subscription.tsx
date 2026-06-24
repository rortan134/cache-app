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
import * as React from "react";
import useSWR from "swr";

/**
 * Returns user subscription status and access checks, unifying auth session
 * and active Stripe records. This prevents desync bugs where the local session
 * claims active status but Stripe has canceled or suspended the account.
 */
function useSubscriptionAccess() {
    const {
        data: session,
        error: sessionError,
        isPending,
        refetch: refreshSession,
    } = useSession();
    const sessionUserId = session?.user?.id;

    if (sessionError) {
        // Delegate authentication-critical errors to the nearest React error boundary
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
 * Renders UI dependent on subscription data once resolved. Prevents rendering
 * intermediate states (such as flashing "Free Plan" before active Stripe data returns)
 * by deferring child execution until the subscription status is fully loaded.
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
 * Restricts rendering to users with active subscriptions. Use this to hide
 * premium features or promotional copy from non-paying users.
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
 * Restricts rendering to unsubscribed users. Defers rendering during initial load
 * to prevent flashing upgrade prompts or free-tier UI while the subscription status
 * is still being verified.
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
 * Renders the compact account-menu status badge. Consolidates Stripe subscription
 * states (free, cancelling, trialing, active) into concise labels to ensure they
 * fit without breaking layout in dense, localized navigation headers.
 */
function SubscriptionStatusBadge() {
    return (
        <WithSubscriptionOnly>
            {(subscription) => {
                if (!subscription) {
                    return (
                        <SubscriptionBadge hideIcon>
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
 * Triggers Stripe Checkout redirection for the premium Pro plan.
 */
function SubscriptionUpgradeButton({
    annual = false,
    variant = "ghost",
    ...props
}: React.ComponentProps<typeof Button> & { annual?: boolean }) {
    const returnUrl = useLibraryReturnUrl();

    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.upgrade({
                annual,
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
 * Directs the customer to the Stripe billing portal to update payments, view
 * historical invoices, or manage subscription cycles.
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
 * Resolves the localized callback URL for Stripe redirections. Defers origin
 * check to client-side interaction to prevent hydration mismatches during SSR.
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
 * Unified action wrapper for Stripe redirects. Standardizes loading states, URL
 * assignment, and accessibility-compliant failure notifications for checkout
 * and portal actions.
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
    hideIcon,
    variant = "secondary",
    ...props
}: React.ComponentProps<typeof Badge> & { hideIcon?: boolean }) {
    return (
        <Badge
            {...props}
            className={cn("h-7! w-full", className)}
            variant={variant}
        >
            {hideIcon ? null : <CrownFilledIcon />}
            {children}
        </Badge>
    );
}

/**
 * Accessible error announcement for billing operations. Avoids layout shift by
 * returning null on the happy path, while exposing proper ARIA alerts if errors occur.
 */
/* @internal */
function SubscriptionErrorMessage(props: React.ComponentProps<"p">) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            {...props}
            aria-atomic="true"
            aria-live="assertive"
            className="px-2 text-destructive text-xs"
            role="alert"
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
