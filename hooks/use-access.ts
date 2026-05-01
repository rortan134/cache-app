import { useSession } from "@/lib/auth/client";
import { getActiveSubscription } from "@/lib/auth/subscriptions";
import useSWR from "swr";

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

export { useAccess };
