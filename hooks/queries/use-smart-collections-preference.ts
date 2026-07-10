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
