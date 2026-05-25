import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

interface CronEnv {
    CRON_SECRET?: string;
    NODE_ENV: "development" | "test" | "production";
}

interface RouteModule {
    GET: (request: Request) => Promise<Response>;
}

const serverEnv: CronEnv = {
    NODE_ENV: "test",
};
const mockRecoverStaleAutomationRuns =
    mock<() => Promise<{ recovered: number; timedOut: number }>>();
const mockClaimDueAutomationRuns =
    mock<
        () => Promise<{
            claimed: Array<{ leaseId: string; runId: string }>;
            skipped: number;
        }>
    >();
const mockAttachWorkflowRunId =
    mock<(args: { runId: string; workflowRunId: string }) => Promise<void>>();
const mockMarkAutomationRunStartFailed =
    mock<(args: { message: string; runId: string }) => Promise<void>>();
const mockStart =
    mock<
        (
            workflow: { name: string },
            args: string[]
        ) => Promise<{ runId: string }>
    >();

mock.module("@/env/server", () => ({
    serverEnv,
}));
mock.module("@/lib/common/logs/console/logger", () => ({
    createLogger: () => ({
        error: mock(() => undefined),
    }),
}));
mock.module("@/lib/intelligence/automations/service", () => ({
    attachWorkflowRunId: mockAttachWorkflowRunId,
    claimDueAutomationRuns: mockClaimDueAutomationRuns,
    markAutomationRunStartFailed: mockMarkAutomationRunStartFailed,
    recoverStaleAutomationRuns: mockRecoverStaleAutomationRuns,
}));
mock.module("@/app/workflows/automation-run", () => ({
    automationRunWorkflow: { name: "automation-run-workflow" },
}));
mock.module("workflow/api", () => ({
    start: mockStart,
}));

let route: RouteModule;

beforeAll(async () => {
    route = await import("./route");
});

beforeEach(() => {
    serverEnv.CRON_SECRET = undefined;
    serverEnv.NODE_ENV = "test";
    mockRecoverStaleAutomationRuns.mockReset();
    mockClaimDueAutomationRuns.mockReset();
    mockAttachWorkflowRunId.mockReset();
    mockMarkAutomationRunStartFailed.mockReset();
    mockStart.mockReset();
});

describe("automation cron route", () => {
    test("rejects requests without the configured bearer token", async () => {
        serverEnv.CRON_SECRET = "cron-secret";
        serverEnv.NODE_ENV = "production";

        const response = await route.GET(
            new Request("https://cache.local/api/cron/automations")
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
        expect(mockRecoverStaleAutomationRuns).not.toHaveBeenCalled();
        expect(mockClaimDueAutomationRuns).not.toHaveBeenCalled();
        expect(mockStart).not.toHaveBeenCalled();
    });

    test("starts claimed workflows and records start failures", async () => {
        serverEnv.CRON_SECRET = "cron-secret";
        serverEnv.NODE_ENV = "production";
        mockRecoverStaleAutomationRuns.mockResolvedValue({
            recovered: 1,
            timedOut: 2,
        });
        mockClaimDueAutomationRuns.mockResolvedValue({
            claimed: [
                { leaseId: "lease-1", runId: "run-1" },
                { leaseId: "lease-2", runId: "run-2" },
            ],
            skipped: 3,
        });
        mockStart
            .mockResolvedValueOnce({ runId: "workflow-1" })
            .mockRejectedValueOnce(new Error("workflow unavailable"));
        mockAttachWorkflowRunId.mockResolvedValue();
        mockMarkAutomationRunStartFailed.mockResolvedValue();

        const response = await route.GET(
            new Request("https://cache.local/api/cron/automations", {
                headers: {
                    authorization: "Bearer cron-secret",
                },
            })
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            claimed: 2,
            failedToStart: 1,
            recovered: 1,
            skipped: 3,
            started: 1,
            timedOut: 2,
        });
        expect(mockStart).toHaveBeenNthCalledWith(
            1,
            { name: "automation-run-workflow" },
            ["run-1"]
        );
        expect(mockStart).toHaveBeenNthCalledWith(
            2,
            { name: "automation-run-workflow" },
            ["run-2"]
        );
        expect(mockAttachWorkflowRunId).toHaveBeenCalledWith({
            runId: "run-1",
            workflowRunId: "workflow-1",
        });
        expect(mockMarkAutomationRunStartFailed).toHaveBeenCalledWith({
            message: "workflow unavailable",
            runId: "run-2",
        });
    });
});
