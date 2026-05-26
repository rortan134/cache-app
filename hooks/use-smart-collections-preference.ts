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
