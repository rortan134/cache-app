import { authClient } from "@/lib/auth/client";
import useSWR from "swr";

const { useSession } = authClient;

async function getActiveSubscription(email: string | undefined) {
    if (!email) {
        return null;
    }
    const { data: subscriptions, error } = await authClient.subscription.list();
    if (error) {
        throw new Error(error.message);
    }
    const activeSubscription = subscriptions.find(
        (sub) => sub.status === "active" || sub.status === "trialing"
    );
    return activeSubscription ?? null;
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

    const { data: subscription, isLoading: _isLoading } = useSWR<
        Awaited<ReturnType<typeof getActiveSubscription>>
    >(session?.user.email, getActiveSubscription, {
        keepPreviousData: true,
        refreshWhenHidden: true,
        refreshWhenOffline: true,
        revalidateOnMount: false,
    });

    const hasAccess =
        subscription?.status === "active" ||
        subscription?.status === "trialing";

    const isLoading = isPending || _isLoading;

    return { hasAccess, isLoading, mutate, session, subscription };
}

export { useAccess };
