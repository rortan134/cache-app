import { listAutomations } from "@/lib/intelligence/automations/actions";
import useSWR from "swr";

const ENABLED_AUTOMATIONS_KEY = "enabled-automations";

type ListAutomationsResult = Awaited<ReturnType<typeof listAutomations>>;

export type EnabledAutomation = Extract<
    ListAutomationsResult,
    { status: "SUCCESS" }
>["automations"][number];

async function fetchEnabledAutomations(): Promise<EnabledAutomation[]> {
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
