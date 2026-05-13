"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { CrownFilledIcon } from "@/components/ui/icons";
import { authClient, useSession } from "@/lib/auth/client";
import { isActiveSubscriptionStatus } from "@/lib/billing/subscription-status";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, useLocale, Var } from "gt-next";
import * as React from "react";
import useSWR from "swr";

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

    const refreshAccess = async () => {
        await refreshSession();

        if (sessionUserId) {
            await refreshSubscription();
        }
    };

    return {
        hasAccess,
        isLoading,
        mutate: refreshAccess,
        session,
        subscription,
    };
}

type AccessData = ReturnType<typeof useSubscriptionAccess>;

interface WithSubscriptionProps {
    children: (subscription: AccessData["subscription"]) => React.ReactNode;
    loadingRender?: React.ReactNode;
}

/**
 * Provides the current subscription, including `undefined` for a resolved free
 * user, to a render function.
 *
 * Prefer this over calling `useSubscriptionAccess` at leaf sites that only need
 * the subscription object; it keeps loading treatment consistent.
 */
function WithSubscription({
    children,
    loadingRender = null,
}: WithSubscriptionProps) {
    const { isLoading, subscription } = useSubscriptionAccess();

    if (isLoading) {
        return loadingRender;
    }

    return children(subscription);
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
        <WithSubscription>
            {(subscription) => {
                if (!subscription) {
                    return (
                        <Badge className="h-6! w-full" variant="secondary">
                            <T context="Free plan label">Free plan</T>
                        </Badge>
                    );
                }

                const planLabel = subscriptionPlanLabel(subscription.plan);

                if (subscription.cancelAtPeriodEnd) {
                    return (
                        <Badge
                            className="h-6! w-full bg-amber-100 text-amber-900"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Subscription ends message">
                                <Var>{planLabel}</Var> ends{" "}
                                <Var>
                                    {subscriptionPeriodEndLabel(
                                        subscription.periodEnd
                                    ) ?? <T>soon</T>}
                                </Var>
                            </T>
                        </Badge>
                    );
                }

                if (subscription.status === "trialing") {
                    return (
                        <Badge
                            className="h-6! w-full bg-primary/10 text-primary"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Trialing status label">
                                <Var>{planLabel}</Var> trial, then{" "}
                                <Var>
                                    {subscriptionBillingIntervalLabel(
                                        subscription.billingInterval
                                    )}
                                </Var>
                            </T>
                        </Badge>
                    );
                }

                if (subscription.status === "active") {
                    return (
                        <Badge
                            className="h-6! w-full bg-primary/10 text-primary"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
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
                        </Badge>
                    );
                }

                return (
                    <Badge
                        className="h-6! w-full bg-muted text-muted-foreground"
                        variant="secondary"
                    >
                        <CrownFilledIcon />
                        <T context="Other subscription status">
                            <Var>{planLabel}</Var>{" "}
                            <Var>
                                {subscriptionStatusLabel(subscription.status)}
                            </Var>
                        </T>
                    </Badge>
                );
            }}
        </WithSubscription>
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
function useLibraryReturnUrl() {
    const locale = useLocale();
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/${locale}/library`;
}

/**
 * Extracts a displayable message from better-auth subscription errors.
 */
function subscriptionErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== "object" || !("message" in error)) {
        return;
    }
    const message = Reflect.get(error, "message");
    return typeof message === "string" ? message : undefined;
}

/**
 * Extracts a hosted Stripe URL from better-auth redirect responses.
 */
function subscriptionRedirectUrl(data: unknown): string | undefined {
    if (!data || typeof data !== "object" || !("url" in data)) {
        return;
    }
    const url = Reflect.get(data, "url");
    return typeof url === "string" && url.length > 0 ? url : undefined;
}

/**
 * Wraps a hosted billing request with pending state, redirect handling, and a
 * user-facing fallback error.
 *
 * The request shape is deliberately narrow so checkout and portal buttons share
 * identical failure behavior without depending on a specific better-auth method
 * type.
 */
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

function subscriptionPlanLabel(plan: string | null | undefined) {
    if (!plan) {
        return <T>Subscription</T>;
    }

    return `${plan[0]?.toUpperCase()}${plan.slice(1)}`;
}

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

function subscriptionStatusLabel(status: string | null | undefined) {
    return status?.replaceAll("_", " ") ?? <T>Unknown</T>;
}

/**
 * Announces checkout and billing portal failures without reserving layout space
 * during the happy path.
 */
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
    WithSubscription,
};
