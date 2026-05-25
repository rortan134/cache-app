import { automationRunWorkflow } from "@/app/workflows/automation-run";
import { serverEnv } from "@/env/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    attachWorkflowRunId,
    claimDueAutomationRuns,
    markAutomationRunStartFailed,
    recoverStaleAutomationRuns,
} from "@/lib/intelligence/automations/service";
import { start } from "workflow/api";

const log = createLogger("automations:cron");

export async function GET(request: Request) {
    if (!isAuthorizedCronRequest(request)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recovered = await recoverStaleAutomationRuns();
    const claimed = await claimDueAutomationRuns();
    let started = 0;
    let failedToStart = 0;

    for (const run of claimed.claimed) {
        try {
            const workflowRun = await start(automationRunWorkflow, [run.runId]);
            await attachWorkflowRunId({
                runId: run.runId,
                workflowRunId: workflowRun.runId,
            });
            started += 1;
        } catch (error) {
            failedToStart += 1;
            const message =
                error instanceof Error ? error.message : String(error);
            log.error("Failed to start automation workflow", {
                error: message,
                runId: run.runId,
            });
            await markAutomationRunStartFailed({
                message,
                runId: run.runId,
            });
        }
    }

    return Response.json({
        claimed: claimed.claimed.length,
        failedToStart,
        recovered: recovered.recovered,
        skipped: claimed.skipped,
        started,
        timedOut: recovered.timedOut,
    });
}

function isAuthorizedCronRequest(request: Request): boolean {
    if (!serverEnv.CRON_SECRET && serverEnv.NODE_ENV !== "production") {
        return true;
    }

    const expected = serverEnv.CRON_SECRET;
    if (!expected) {
        return false;
    }

    const authorization = request.headers.get("authorization");
    return authorization === `Bearer ${expected}`;
}
