import {
    type EnabledAutomation,
    useEnabledAutomations,
} from "@/hooks/queries/use-enabled-automations";

export function isSmartCollectionsAutomation(automation: EnabledAutomation) {
    return automation.templateKey === "smart_collections";
}

export function pauseSmartCollectionsAutomations(
    automations: EnabledAutomation[]
) {
    return automations.map((automation) =>
        isSmartCollectionsAutomation(automation)
            ? { ...automation, status: "paused" as const }
            : automation
    );
}

export function useSmartCollectionsPreference() {
    const { automations, error, isLoading, mutate } = useEnabledAutomations();
    const isSmartCollectionsEnabled = automations.some(
        (automation) =>
            isSmartCollectionsAutomation(automation) &&
            automation.status === "active"
    );

    return {
        disabled: !isSmartCollectionsEnabled,
        error,
        isLoading,
        mutate,
    };
}
