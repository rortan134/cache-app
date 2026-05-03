import { getSmartCollectionsPreference } from "@/lib/collections/actions";
import useSWR from "swr";

interface SmartCollectionsPreferenceData {
    disabled: boolean;
}

async function fetchSmartCollectionsPreference(): Promise<SmartCollectionsPreferenceData> {
    const result = await getSmartCollectionsPreference();

    if (result.status !== "OK") {
        throw new Error(result.message);
    }

    return { disabled: result.disabled };
}

/**
 * Fetches the user's Smart Collections preference client-side.
 *
 * Returns `true` when the user has disabled Smart Collections. Falls back to
 * `false` on error so the feature stays enabled by default.
 */
export function useSmartCollectionsPreference() {
    const { data, error, isLoading, mutate } = useSWR(
        "smart-collections-preference",
        fetchSmartCollectionsPreference,
        { keepPreviousData: true }
    );

    return {
        disabled: data?.disabled ?? false,
        error,
        isLoading,
        mutate,
    };
}
