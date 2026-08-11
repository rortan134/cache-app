import useSWR from "swr";
import { getSmartCollectionsPreference } from "@/lib/collections/actions";

const SMART_COLLECTIONS_PREFERENCE_KEY = "smart-collections-preference";

async function fetchSmartCollectionsPreference() {
    const result = await getSmartCollectionsPreference();
    if (result.status !== "SUCCESS") {
        throw new Error(result.message);
    }
    return { disabled: result.disabled };
}

export function useSmartCollectionsPreference() {
    const { data, error, isLoading, mutate } = useSWR(
        SMART_COLLECTIONS_PREFERENCE_KEY,
        fetchSmartCollectionsPreference,
        { keepPreviousData: true }
    );

    return {
        disabled: data?.disabled,
        error,
        isLoading,
        mutate,
    };
}
