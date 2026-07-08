import {
    executeReadOnlyAutomationRun,
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

    await executeReadOnlyAutomationRun(prepared);
    return { status: "succeeded" };
}
