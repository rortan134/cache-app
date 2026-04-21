import { authClient } from "@/lib/auth/client";
import { getActiveSubscription } from "@/lib/auth/subscriptions";
import useSWR from "swr";

const { useSession } = authClient;

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

    const {
        data: subscription,
        isLoading: isSubscriptionLoading,
        mutate: mutateSubscription,
    } = useSWR(
        session?.user?.id ? `subscription-${session.user.id}` : null,
        getActiveSubscription,
        {
            keepPreviousData: true,
        }
    );

    const hasAccess = !!subscription;
    const isLoading = isPending || isSubscriptionLoading;

    const mutateAll = async () => {
        await mutate();
        await mutateSubscription();
    };

    return { hasAccess, isLoading, mutate: mutateAll, session, subscription };
}

export { useAccess };
