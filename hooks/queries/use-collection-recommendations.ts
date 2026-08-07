import type { CollectionTemplateOption } from "@/lib/collections/templates";
import { getCollectionRecommendations } from "@/lib/intelligence/actions";
import useSWR from "swr";

const COLLECTION_RECOMMENDATIONS_KEY = "collection-recommendations";

async function fetchCollectionRecommendations(): Promise<
    CollectionTemplateOption[]
> {
    const result = await getCollectionRecommendations();

    if (result.status !== "SUCCESS") {
        throw new Error(result.message);
    }

    return result.recommendations;
}

export function useCollectionRecommendations() {
    const { data, error, isLoading, mutate } = useSWR(
        COLLECTION_RECOMMENDATIONS_KEY,
        fetchCollectionRecommendations,
        { dedupingInterval: 60_000, keepPreviousData: true }
    );

    return {
        error,
        isLoading,
        items: data ?? [],
        mutate,
    };
}
