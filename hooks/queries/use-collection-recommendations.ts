import { getCollectionRecommendations } from "@/lib/intelligence/actions";
import type { CollectionTemplateOption } from "@/lib/collections/templates";
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
        { keepPreviousData: true }
    );

    return {
        error,
        isLoading,
        items: data ?? [],
        mutate,
    };
}
