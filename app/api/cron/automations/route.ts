import { automationRunWorkflow } from "@/app/workflows/automation-run";
import { serverEnv } from "@/env/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { withRetry } from "@/lib/common/retry";
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

    // Recover must finish before claim: recovered runs go `starting → pending`
    // and would otherwise wait until the next cron tick to be picked up.
    const recovered = await recoverStaleAutomationRuns();
    const claimed = await claimDueAutomationRuns();
    // Starts are independent per claimed run; parallelize so a slow
    // workflow/api start does not serialize the whole cron tick.
    // Each mapper always resolves so one mark/attach failure cannot 500 a
    // partially successful tick or drop accurate started/failed counts.
    const startOutcomes = await Promise.all(
        claimed.claimed.map(async (run) => {
            let workflowRunId: string;
            try {
                const workflowRun = await start(automationRunWorkflow, [
                    run.runId,
                ]);
                workflowRunId = workflowRun.runId;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                log.error("Failed to start automation workflow", {
                    error: message,
                    runId: run.runId,
                });
                try {
                    await markAutomationRunStartFailed({
                        message,
                        runId: run.runId,
                    });
                } catch (markError) {
                    log.error("Failed to mark automation run start-failed", {
                        error:
                            markError instanceof Error
                                ? markError.message
                                : String(markError),
                        runId: run.runId,
                    });
                }
                return false;
            }

            // start() already launched the workflow. Never mark failed on
            // attach errors — that would race markAutomationRunRunning and
            // leave recovery free to double-start the same run. Retry attach
            // so a transient DB blip does not leave starting without
            // workflowRunId until the workflow's own mark-running step.
            try {
                await withRetry(
                    () =>
                        attachWorkflowRunId({
                            runId: run.runId,
                            workflowRunId,
                        }),
                    { attempts: 3, delayMs: 50 }
                );
            } catch (error) {
                log.error("Failed to attach workflow run id", {
                    error:
                        error instanceof Error ? error.message : String(error),
                    runId: run.runId,
                    workflowRunId,
                });
            }
            return true;
        })
    );
    const started = startOutcomes.filter(Boolean).length;
    const failedToStart = startOutcomes.length - started;

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
        log.warn("CRON_SECRET is not set.");
        return false;
    }

    const authorization = request.headers.get("authorization");
    return authorization === `Bearer ${expected}`;
}
