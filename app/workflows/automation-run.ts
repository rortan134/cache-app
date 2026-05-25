import {
    executeReadOnlyAutomationRun,
    executeSmartCollectionsAutomationRun,
    prepareAutomationRunForWorkflow,
} from "@/lib/intelligence/automations/workflow";
import { getWorkflowMetadata } from "workflow";

export async function automationRunWorkflow(runId: string) {
    "use workflow";

    const { workflowRunId } = getWorkflowMetadata();
    const prepared = await prepareAutomationRunForWorkflow({
        runId,
        workflowRunId,
    });

    if (!prepared) {
        return { status: "skipped" };
    }

    if (prepared.templateKey === "smart_collections") {
        await executeSmartCollectionsAutomationRun({
            runId: prepared.runId,
            userId: prepared.userId,
        });
        return { status: "succeeded" };
    }

    await executeReadOnlyAutomationRun(prepared);
    return { status: "succeeded" };
}
