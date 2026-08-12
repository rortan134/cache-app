import useSWR from "swr";
import { listAutomations } from "@/lib/intelligence/automations/actions";
import type { AutomationListItem } from "@/lib/intelligence/automations/service";

const ENABLED_AUTOMATIONS_KEY = "enabled-automations";

async function fetchEnabledAutomations() {
    try {
        const result = await listAutomations();

        if (result.status !== "SUCCESS") {
            throw new Error(result.message);
        }

        return result.automations.filter(
            (automation) => automation.status === "active"
        );
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(
            typeof error === "string" ? error : "Failed to load automations",
            { cause: error }
        );
    }
}

export function useEnabledAutomations() {
    const {
        data = [],
        error,
        isLoading,
        mutate,
    } = useSWR<AutomationListItem[], Error>(
        ENABLED_AUTOMATIONS_KEY,
        fetchEnabledAutomations,
        {
            keepPreviousData: true,
        }
    );

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
