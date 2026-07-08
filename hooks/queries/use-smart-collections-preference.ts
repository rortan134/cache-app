import { getSmartCollectionsPreference } from "@/lib/collections/actions";
import useSWR from "swr";

const SMART_COLLECTIONS_PREFERENCE_KEY = "smart-collections-preference";

interface SmartCollectionsPreference {
    disabled: boolean;
}

async function fetchSmartCollectionsPreference(): Promise<SmartCollectionsPreference> {
    const result = await getSmartCollectionsPreference();
    if (result.status !== "SUCCESS") {
        throw new Error(result.message);
    }
    return { disabled: result.disabled };
}

/**
 * Reads the user's smart collections preference from the server.
 *
 * Smart collections is a library preference backed by
 * `User.smartCollectionsEnabled`; there is no automation involved. The
 * `disabled` flag is the inverse of that column (`disabled === true` means
 * the user has opted out of auto-tagging on save).
 *
 * To change the preference, callers should use the
 * `setSmartCollectionsPreference` server action and then call `mutate()` to
 * revalidate the SWR cache. Keeping the write call in the consumer (rather
 * than hiding it inside this hook) ensures optimistic UI and the actual
 * server write stay in the same scope — the previous design briefly drifted
 * away from the server because the optimistic helper flipped a flag the
 * server didn't yet know about.
 */
export function useSmartCollectionsPreference() {
    const { data, error, isLoading, mutate } = useSWR(
        SMART_COLLECTIONS_PREFERENCE_KEY,
        fetchSmartCollectionsPreference,
        { keepPreviousData: true }
    );

    return {
        disabled: data?.disabled ?? true,
        error,
        isLoading,
        mutate,
    };
}
