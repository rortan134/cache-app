import useSWR from "swr";
import { listAutomations } from "@/lib/intelligence/automations/actions";

const ENABLED_AUTOMATIONS_KEY = "enabled-automations";

async function fetchEnabledAutomations() {
    const result = await listAutomations();

    if (result.status !== "SUCCESS") {
        throw new Error(result.message);
    }

    return result.automations.filter(
        (automation) => automation.status === "active"
    );
}

export function useEnabledAutomations() {
    const { data, error, isLoading, mutate } = useSWR(
        ENABLED_AUTOMATIONS_KEY,
        fetchEnabledAutomations,
        { keepPreviousData: true }
    );

    return {
        automations: data ?? [],
        error,
        isLoading,
        mutate,
    };
}
