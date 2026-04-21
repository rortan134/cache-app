import { authClient } from "@/lib/auth/client";
import useSWR from "swr";

const { useSession } = authClient;

async function getActiveSubscription() {
    const { data: subscriptions, error } = await authClient.subscription.list();
    if (error) {
        throw new Error(error.message);
    }
    return (
        subscriptions?.find(
            (sub) => sub.status === "active" || sub.status === "trialing"
        ) ?? null
    );
}

function useAccess() {
    const {
        data: session,
        error: sessionError,
        isPending,
        refetch: mutate,
    } = useSession();

    // Let error boundary catch
    if (sessionError) {
        throw sessionError;
    }

    const { data: subscription, isLoading: isSubscriptionLoading } = useSWR<
        Awaited<ReturnType<typeof getActiveSubscription>>
    >(
        session?.user?.id ? `subscription-${session.user.id}` : null,
        getActiveSubscription,
        {
            keepPreviousData: true,
            refreshWhenHidden: true,
            refreshWhenOffline: true,
            revalidateOnMount: false,
        }
    );

    const hasAccess = !!subscription;
    const isLoading = isPending || isSubscriptionLoading;

    return { hasAccess, isLoading, mutate, session, subscription };
}

export { useAccess };
