"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { CrownFilledIcon } from "@/components/ui/icons";
import { authClient, useSession } from "@/lib/auth/client";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { T, useLocale, Var } from "gt-next";
import * as React from "react";
import useSWR from "swr";

/**
 * Returns the user's subscription access status, derived from session and
 * active subscription data. Throws session errors to be caught by error boundaries.
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
        { keepPreviousData: true, refreshInterval: 30_000 }
    );

    const hasAccess = !!subscription;
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

function WithSubscription({
    children,
    loadingRender = null,
}: {
    children: (subscription: AccessData["subscription"]) => React.ReactNode;
    loadingRender?: React.ReactNode;
}) {
    const { isLoading, subscription } = useSubscriptionAccess();

    if (isLoading) {
        return loadingRender;
    }

    return children(subscription);
}

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

                const planLabel = subscription.plan
                    ? subscription.plan[0]?.toUpperCase() +
                      subscription.plan.slice(1)
                    : "Subscription";

                let intervalLabel: React.ReactNode | null = null;
                if (subscription.billingInterval === "year") {
                    intervalLabel = <T>yearly</T>;
                } else if (subscription.billingInterval === "month") {
                    intervalLabel = <T>monthly</T>;
                }

                const expiresAt = subscription.periodEnd
                    ? new Intl.DateTimeFormat(undefined, {
                          day: "numeric",
                          month: "short",
                      }).format(new Date(subscription.periodEnd))
                    : null;

                if (subscription.cancelAtPeriodEnd) {
                    return (
                        <Badge
                            className="h-6! w-full bg-amber-100 text-amber-900"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Subscription ends message">
                                <Var>{planLabel}</Var> ends{" "}
                                <Var>{expiresAt ?? "soon"}</Var>
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
                                <Var>{intervalLabel}</Var>
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
                                    <Var>{intervalLabel}</Var>
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
                                {subscription.status?.replaceAll("_", " ") ??
                                    "Unknown"}
                            </Var>
                        </T>
                    </Badge>
                );
            }}
        </WithSubscription>
    );
}

function SubscriptionUpgradeButton({
    variant = "ghost",
    children,
}: React.ComponentProps<typeof Button>) {
    const locale = useLocale();
    const returnUrl = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/library`;

    const CHECKOUT_ERROR = "We couldn't open checkout right now.";
    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.upgrade({
                cancelUrl: returnUrl,
                plan: "pro",
                successUrl: returnUrl,
            }),
        CHECKOUT_ERROR
    );

    return (
        <>
            <Button loading={isPending} onClick={execute} variant={variant}>
                {children}
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="px-2 text-destructive text-xs"
                    role="status"
                >
                    {errorMessage}
                </p>
            ) : null}
        </>
    );
}

function BillingPortalButton() {
    const locale = useLocale();
    const returnUrl = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/library`;

    const BILLING_ERROR = "We couldn't open billing right now.";
    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.billingPortal({
                returnUrl,
            }),
        BILLING_ERROR
    );

    return (
        <>
            <Button
                className="justify-start"
                loading={isPending}
                onClick={execute}
                variant="ghost"
            >
                <T>Billing</T>
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="px-2 text-destructive text-xs"
                    role="status"
                >
                    {errorMessage}
                </p>
            ) : null}
        </>
    );
}

function subscriptionErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== "object" || !("message" in error)) {
        return;
    }
    const message = Reflect.get(error, "message");
    return typeof message === "string" ? message : undefined;
}

function subscriptionRedirectUrl(data: unknown): string | undefined {
    if (!data || typeof data !== "object" || !("url" in data)) {
        return;
    }
    const url = Reflect.get(data, "url");
    return typeof url === "string" && url.length > 0 ? url : undefined;
}

function useSubscriptionRedirectAction(
    request: () => Promise<{ data?: unknown; error?: unknown }>,
    fallbackMessage: string
) {
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const execute = () => {
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
    };

    return { errorMessage, execute, isPending };
}

export {
    BillingPortalButton,
    SubscribedOnly,
    SubscriptionStatusBadge,
    SubscriptionUpgradeButton,
    UnsubscribedOnly,
    useSubscriptionAccess,
    WithSubscription,
};
