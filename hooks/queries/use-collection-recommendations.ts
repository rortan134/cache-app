import useSWR from "swr";
import type { CollectionTemplateOption } from "@/lib/collections/templates";
import { getCollectionRecommendations } from "@/lib/intelligence/actions";

const COLLECTION_RECOMMENDATIONS_KEY = "collection-recommendations";

async function fetchCollectionRecommendations() {
    try {
        const result = await getCollectionRecommendations();
        if (result.status !== "SUCCESS") {
            throw new Error(result.message);
        }
        return result.recommendations;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(
            typeof error === "string"
                ? error
                : "Failed to load collection recommendations",
            { cause: error }
        );
    }
}

export function useCollectionRecommendations() {
    const {
        data = [],
        error,
        isLoading,
        mutate,
    } = useSWR<CollectionTemplateOption[], Error>(
        COLLECTION_RECOMMENDATIONS_KEY,
        fetchCollectionRecommendations,
        {
            dedupingInterval: 60_000,
            keepPreviousData: true,
        }
    );

    return {
        error,
        isLoading,
        items: data,
        mutate,
    };
}
