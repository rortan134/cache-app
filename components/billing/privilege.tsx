"use client";

import { useSession } from "@/lib/auth/client";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import type { PropsWithChildren, ReactNode } from "react";
import useSWR from "swr";

/**
 * Returns the user's subscription access status, derived from session and
 * active subscription data. Throws session errors to be caught by error boundaries.
 */
function useAccess() {
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

type AccessData = ReturnType<typeof useAccess>;

function WithSubscription({
    children,
    loadingRender = null,
}: {
    children: (subscription: AccessData["subscription"]) => ReactNode;
    loadingRender?: ReactNode;
}) {
    const { isLoading, subscription } = useAccess();

    if (isLoading) {
        return loadingRender;
    }

    return children(subscription);
}

function SubscriptionOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? children : null;
}

function UnsubscribedOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? null : children;
}

export { SubscriptionOnly, UnsubscribedOnly, useAccess, WithSubscription };
