import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type {
    AutomationCadence,
    AutomationPayloadScope,
    AutomationRunStatus,
    AutomationStatus,
    AutomationTemplateKey,
} from "@/prisma/client/enums";

interface TestCollection {
    id: string;
    name: string;
    userId: string;
}

interface TestAutomation {
    activatedAtUtc: Date | null;
    cadence: AutomationCadence | null;
    collection: TestCollection | null;
    collectionId: string | null;
    collectionNameSnapshot: string | null;
    createdAt: Date;
    id: string;
    lastFailureCode: string | null;
    lastRunAtUtc: Date | null;
    lastSucceededAtUtc: Date | null;
    monthDay: number | null;
    nextRunAtUtc: Date | null;
    payloadScope: AutomationPayloadScope;
    prompt: string;
    status: AutomationStatus;
    templateKey: AutomationTemplateKey | null;
    timeOfDayMinutes: number | null;
    timezone: string | null;
    title: string;
    updatedAt: Date;
    userId: string;
    weekDay: number | null;
}

interface TestAutomationRun {
    automationId: string;
    collectionIdSnapshot: string | null;
    collectionNameSnapshot: string | null;
    createdAt: Date;
    errorCode: string | null;
    errorMessage: string | null;
    finishedAt: Date | null;
    id: string;
    leaseExpiresAt: Date | null;
    leaseId: string | null;
    payloadScopeSnapshot: AutomationPayloadScope;
    promptSnapshot: string;
    scheduledForUtc: Date;
    scheduleSnapshot: unknown;
    sources: unknown;
    startedAt: Date | null;
    status: AutomationRunStatus;
    summaryMarkdown: string | null;
    templateKeySnapshot: AutomationTemplateKey | null;
    updatedAt: Date;
    usage: unknown;
    userId: string;
    workflowRunId: string | null;
}

interface TestAutomationRunWhere {
    automationId?: string;
    id?: string | { not: string };
    leaseExpiresAt?: { lt: Date };
    scheduledForUtc?: { lte: Date };
    startedAt?: { lt: Date };
    status?: AutomationRunStatus | { in: AutomationRunStatus[] };
}

interface TestAutomationRunQuery {
    select?: {
        automationId?: true;
        id?: true;
    };
    take?: number;
    where?: TestAutomationRunWhere;
}

interface TestAutomationRunFindUniqueQuery {
    include?: {
        automation?: {
            include?: {
                collection?: true;
            };
        };
    };
    select?: Record<string, true | Record<string, unknown>>;
    where: {
        id: string;
    };
}

interface TestAutomationUpdateQuery {
    data: Partial<TestAutomation>;
    include?: {
        collection?: true;
    };
    where: {
        id: string;
    };
}

interface TestAutomationRunUpdateQuery {
    data: Partial<TestAutomationRun>;
    include?: {
        automation?: true;
    };
    select?: Record<string, true>;
    where: {
        id: string;
    };
}

interface TestAutomationRunUpdateManyQuery {
    data: Partial<TestAutomationRun>;
    where: TestAutomationRunWhere;
}

interface TestAutomationRunCreateManyQuery {
    data: Omit<
        TestAutomationRun,
        | "createdAt"
        | "errorCode"
        | "errorMessage"
        | "finishedAt"
        | "id"
        | "leaseExpiresAt"
        | "leaseId"
        | "sources"
        | "startedAt"
        | "summaryMarkdown"
        | "updatedAt"
        | "usage"
        | "workflowRunId"
    >[];
    skipDuplicates?: boolean;
}

interface TestCollectionFindFirstQuery {
    where: {
        id: string;
        userId: string;
    };
}

interface TestPrisma {
    $transaction: (
        operation:
            | ((tx: TestPrisma) => Promise<unknown> | unknown)
            | (Promise<unknown> | unknown)[]
    ) => Promise<unknown>;
    automation: {
        update: (query: TestAutomationUpdateQuery) => TestAutomation;
    };
    automationRun: {
        createMany: (query: TestAutomationRunCreateManyQuery) => {
            count: number;
        };
        deleteMany: () => { count: number };
        findFirst: (query: TestAutomationRunQuery) => { id: string } | null;
        findMany: (
            query: TestAutomationRunQuery
        ) => { automationId: string; id: string }[];
        findUnique: (
            query: TestAutomationRunFindUniqueQuery
        ) => (TestAutomationRun & { automation?: TestAutomation }) | null;
        update: (query: TestAutomationRunUpdateQuery) =>
            | TestAutomationRun
            | (TestAutomationRun & {
                  automation: TestAutomation;
              });
        updateMany: (query: TestAutomationRunUpdateManyQuery) => {
            count: number;
        };
    };
    collection: {
        findFirst: (
            query: TestCollectionFindFirstQuery
        ) => { id: string } | null;
    };
}

const AUTOMATION_CREATED_AT = new Date("2026-05-20T00:00:00.000Z");
const NOW = new Date("2026-05-25T10:00:00.000Z");
const USER_ID = "user-1";

const automations = new Map<string, TestAutomation>();
const automationRuns = new Map<string, TestAutomationRun>();
const collections = new Map<string, TestCollection>();

const fakePrisma: TestPrisma = {
    $transaction: async (operation) => {
        if (typeof operation === "function") {
            return await operation(fakePrisma);
        }
        return await Promise.all(operation);
    },
    automation: {
        update: (query: TestAutomationUpdateQuery) => {
            const automation = automations.get(query.where.id);
            if (!automation) {
                throw new Error(`Missing automation ${query.where.id}`);
            }
            applyDefinedValues(automation, query.data);
            return copyAutomation(automation);
        },
    },
    automationRun: {
        createMany: (query: TestAutomationRunCreateManyQuery) => {
            let count = 0;
            for (const runData of query.data) {
                const duplicate = [...automationRuns.values()].find(
                    (run) =>
                        run.automationId === runData.automationId &&
                        run.scheduledForUtc.getTime() ===
                            runData.scheduledForUtc.getTime()
                );
                if (duplicate && query.skipDuplicates) {
                    continue;
                }

                const run: TestAutomationRun = {
                    ...runData,
                    createdAt: NOW,
                    errorCode: null,
                    errorMessage: null,
                    finishedAt: null,
                    id: `generated-run-${automationRuns.size + 1}`,
                    leaseExpiresAt: null,
                    leaseId: null,
                    sources: null,
                    startedAt: null,
                    summaryMarkdown: null,
                    updatedAt: NOW,
                    usage: null,
                    workflowRunId: null,
                };
                automationRuns.set(run.id, run);
                count += 1;
            }
            return { count };
        },
        deleteMany: () => ({ count: 0 }),
        findFirst: (query: TestAutomationRunQuery) => {
            const run = [...automationRuns.values()].find((candidate) =>
                matchesAutomationRunWhere(candidate, query.where)
            );
            return run ? { id: run.id } : null;
        },
        findMany: (query: TestAutomationRunQuery) => {
            const orderedRuns = [...automationRuns.values()]
                .filter((run) => matchesAutomationRunWhere(run, query.where))
                .sort(
                    (left, right) =>
                        left.scheduledForUtc.getTime() -
                        right.scheduledForUtc.getTime()
                );
            return orderedRuns.slice(0, query.take).map((run) => ({
                automationId: run.automationId,
                id: run.id,
            }));
        },
        findUnique: (query: TestAutomationRunFindUniqueQuery) => {
            const run = automationRuns.get(query.where.id);
            if (!run) {
                return null;
            }
            const automation = automations.get(run.automationId);
            if (query.include?.automation && automation) {
                return {
                    ...copyRun(run),
                    automation: copyAutomation(automation),
                };
            }
            return copyRun(run);
        },
        update: (query: TestAutomationRunUpdateQuery) => {
            const run = automationRuns.get(query.where.id);
            if (!run) {
                throw new Error(`Missing run ${query.where.id}`);
            }
            applyDefinedValues(run, query.data);
            if (query.include?.automation) {
                const automation = automations.get(run.automationId);
                if (!automation) {
                    throw new Error(`Missing automation ${run.automationId}`);
                }
                return {
                    ...copyRun(run),
                    automation: copyAutomation(automation),
                };
            }
            return copyRun(run);
        },
        updateMany: (query: TestAutomationRunUpdateManyQuery) => {
            let count = 0;
            for (const run of automationRuns.values()) {
                if (matchesAutomationRunWhere(run, query.where)) {
                    applyDefinedValues(run, query.data);
                    count += 1;
                }
            }
            return { count };
        },
    },
    collection: {
        findFirst: (query: TestCollectionFindFirstQuery) => {
            const collection = collections.get(query.where.id);
            if (collection?.userId === query.where.userId) {
                return { id: collection.id };
            }
            return null;
        },
    },
};

mock.module("server-only", () => ({}));
mock.module("@/env/server", () => ({
    serverEnv: {
        AUTOMATION_AGENT_MODEL: "test-model",
    },
}));
mock.module("@/lib/billing/service", () => ({
    userHasActiveSubscription: mock(() => Promise.resolve(true)),
}));
mock.module("@/prisma", () => ({
    prisma: fakePrisma,
}));

let service: typeof import("./service");

beforeAll(async () => {
    service = await import("./service");
});

beforeEach(() => {
    resetAutomationState();
});

describe("automation service run lifecycle", () => {
    test("claims due runs, skips unsafe runs, and materializes the next occurrence", async () => {
        addAutomation({
            id: "active-automation",
            nextRunAtUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "active",
        });
        addRun({
            automationId: "active-automation",
            id: "active-run",
            scheduledForUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "pending",
        });
        addAutomation({
            id: "paused-automation",
            nextRunAtUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "paused",
        });
        addRun({
            automationId: "paused-automation",
            id: "paused-run",
            scheduledForUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "pending",
        });
        addAutomation({
            id: "overlap-automation",
            nextRunAtUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "active",
        });
        addRun({
            automationId: "overlap-automation",
            id: "overlap-run",
            scheduledForUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "pending",
        });
        addRun({
            automationId: "overlap-automation",
            id: "still-running-run",
            scheduledForUtc: new Date("2026-05-24T09:00:00.000Z"),
            status: "running",
        });

        const result = await service.claimDueAutomationRuns({
            limit: 10,
            now: NOW,
        });

        expect(result.claimed).toHaveLength(1);
        expect(result.claimed[0]?.runId).toBe("active-run");
        expect(result.claimed[0]?.leaseId).toBeString();
        expect(result.skipped).toBe(2);
        expect(automationRuns.get("active-run")?.status).toBe("starting");
        expect(
            automationRuns.get("active-run")?.leaseExpiresAt?.toISOString()
        ).toBe("2026-05-25T10:10:00.000Z");
        expect(automationRuns.get("paused-run")?.status).toBe("skipped");
        expect(automationRuns.get("paused-run")?.errorCode).toBe(
            "automation_paused"
        );
        expect(automationRuns.get("overlap-run")?.status).toBe("skipped");
        expect(automationRuns.get("overlap-run")?.errorCode).toBe(
            "overlapping_run"
        );
        expect(
            automations.get("active-automation")?.nextRunAtUtc?.toISOString()
        ).toBe("2026-05-26T09:00:00.000Z");
        expect(
            findRunBySchedule("active-automation", "2026-05-26T09:00:00.000Z")
        ).toMatchObject({
            payloadScopeSnapshot: "all_library_items",
            promptSnapshot: "Summarize saved items",
            scheduleSnapshot: {
                cadence: "daily",
                nextRunAtUtc: "2026-05-26T09:00:00.000Z",
                timeOfDayMinutes: 9 * 60,
                timezone: "UTC",
            },
            status: "pending",
        });
        expect(
            findRunBySchedule("paused-automation", "2026-05-26T09:00:00.000Z")
        ).toBeUndefined();
    });

    test("recovers expired starting leases and times out long-running runs", async () => {
        addAutomation({ id: "automation", status: "active" });
        addRun({
            automationId: "automation",
            id: "expired-starting-run",
            leaseExpiresAt: new Date("2026-05-25T09:59:59.000Z"),
            leaseId: "lease-old",
            status: "starting",
            workflowRunId: "workflow-old",
        });
        addRun({
            automationId: "automation",
            id: "fresh-starting-run",
            leaseExpiresAt: new Date("2026-05-25T10:01:00.000Z"),
            leaseId: "lease-fresh",
            status: "starting",
        });
        addRun({
            automationId: "automation",
            id: "timed-out-run",
            startedAt: new Date("2026-05-25T09:14:59.000Z"),
            status: "running",
        });
        addRun({
            automationId: "automation",
            id: "running-run",
            startedAt: new Date("2026-05-25T09:15:01.000Z"),
            status: "running",
        });

        const result = await service.recoverStaleAutomationRuns(NOW);

        expect(result).toEqual({ recovered: 1, timedOut: 1 });
        expect(automationRuns.get("expired-starting-run")).toMatchObject({
            leaseExpiresAt: null,
            leaseId: null,
            status: "pending",
            workflowRunId: null,
        });
        expect(automationRuns.get("fresh-starting-run")?.status).toBe(
            "starting"
        );
        expect(automationRuns.get("timed-out-run")).toMatchObject({
            errorCode: "run_timeout",
            finishedAt: NOW,
            status: "failed",
        });
        expect(automationRuns.get("running-run")?.status).toBe("running");
    });

    test("moves a claimed run to running with immutable run snapshots", async () => {
        addAutomation({
            collectionId: "collection-1",
            collectionNameSnapshot: "Research",
            id: "automation",
            payloadScope: "collection",
            status: "active",
        });
        addRun({
            automationId: "automation",
            collectionIdSnapshot: "collection-1",
            id: "claimed-run",
            payloadScopeSnapshot: "collection",
            promptSnapshot: "Use the original prompt",
            scheduledForUtc: new Date("2026-05-25T09:00:00.000Z"),
            status: "starting",
            templateKeySnapshot: "weekly_digest",
        });

        const prepared = await service.markAutomationRunRunning({
            runId: "claimed-run",
            workflowRunId: "workflow-1",
        });

        expect(prepared).toEqual({
            automationId: "automation",
            collectionId: "collection-1",
            modelId: "test-model",
            payloadScope: "collection",
            prompt: "Use the original prompt",
            runId: "claimed-run",
            scheduledForUtc: "2026-05-25T09:00:00.000Z",
            templateKey: "weekly_digest",
            userId: USER_ID,
        });
        expect(automationRuns.get("claimed-run")).toMatchObject({
            status: "running",
            workflowRunId: "workflow-1",
        });
        expect(automationRuns.get("claimed-run")?.startedAt).toBeInstanceOf(
            Date
        );
    });

    test("finishes runs and records success or failure on the automation", async () => {
        addAutomation({
            id: "automation",
            lastFailureCode: "previous_failure",
            status: "active",
        });
        addRun({
            automationId: "automation",
            id: "successful-run",
            leaseExpiresAt: new Date("2026-05-25T10:10:00.000Z"),
            leaseId: "lease-1",
            status: "running",
        });

        await service.finishAutomationRun({
            runId: "successful-run",
            sources: { itemIds: ["item-1"] },
            status: "succeeded",
            summaryMarkdown: "Done",
            usage: { totalTokens: 10 },
        });

        expect(automationRuns.get("successful-run")).toMatchObject({
            leaseExpiresAt: null,
            leaseId: null,
            sources: { itemIds: ["item-1"] },
            status: "succeeded",
            summaryMarkdown: "Done",
            usage: { totalTokens: 10 },
        });
        expect(automations.get("automation")?.lastFailureCode).toBeNull();
        expect(automations.get("automation")?.lastRunAtUtc).toBeInstanceOf(
            Date
        );
        expect(
            automations.get("automation")?.lastSucceededAtUtc
        ).toBeInstanceOf(Date);

        addRun({
            automationId: "automation",
            id: "failed-run",
            status: "running",
        });

        await service.finishAutomationRun({
            errorCode: "agent_failed",
            errorMessage: "model error",
            runId: "failed-run",
            status: "failed",
            summaryMarkdown: "Failed",
        });

        expect(automationRuns.get("failed-run")).toMatchObject({
            errorCode: "agent_failed",
            errorMessage: "model error",
            status: "failed",
            summaryMarkdown: "Failed",
        });
        expect(automations.get("automation")?.lastFailureCode).toBe(
            "agent_failed"
        );
    });
});

function resetAutomationState() {
    automations.clear();
    automationRuns.clear();
    collections.clear();
}

function addAutomation(
    overrides: Partial<TestAutomation> & { id: string }
): TestAutomation {
    const { id, ...automationOverrides } = overrides;
    const automation: TestAutomation = {
        activatedAtUtc: AUTOMATION_CREATED_AT,
        cadence: "daily",
        collection: null,
        collectionId: null,
        collectionNameSnapshot: null,
        createdAt: AUTOMATION_CREATED_AT,
        id,
        lastFailureCode: null,
        lastRunAtUtc: null,
        lastSucceededAtUtc: null,
        monthDay: null,
        nextRunAtUtc: new Date("2026-05-25T09:00:00.000Z"),
        payloadScope: "all_library_items",
        prompt: "Summarize saved items",
        status: "active",
        templateKey: "weekly_digest",
        timeOfDayMinutes: 9 * 60,
        timezone: "UTC",
        title: "Weekly digest",
        updatedAt: AUTOMATION_CREATED_AT,
        userId: USER_ID,
        weekDay: null,
        ...automationOverrides,
    };
    if (automation.collectionId) {
        const collection = {
            id: automation.collectionId,
            name: automation.collectionNameSnapshot ?? "Collection",
            userId: automation.userId,
        };
        collections.set(collection.id, collection);
        automation.collection = collection;
    }
    automations.set(automation.id, automation);
    return automation;
}

function addRun(
    overrides: Partial<TestAutomationRun> & {
        automationId: string;
        id: string;
    }
): TestAutomationRun {
    const { automationId, id, ...runOverrides } = overrides;
    const automation = automations.get(automationId);
    if (!automation) {
        throw new Error(`Missing automation ${automationId}`);
    }

    const run: TestAutomationRun = {
        automationId,
        collectionIdSnapshot: automation.collectionId,
        collectionNameSnapshot: automation.collectionNameSnapshot,
        createdAt: AUTOMATION_CREATED_AT,
        errorCode: null,
        errorMessage: null,
        finishedAt: null,
        id,
        leaseExpiresAt: null,
        leaseId: null,
        payloadScopeSnapshot: automation.payloadScope,
        promptSnapshot: automation.prompt,
        scheduledForUtc: new Date("2026-05-25T09:00:00.000Z"),
        scheduleSnapshot: {},
        sources: null,
        startedAt: null,
        status: "pending",
        summaryMarkdown: null,
        templateKeySnapshot: automation.templateKey,
        updatedAt: AUTOMATION_CREATED_AT,
        usage: null,
        userId: automation.userId,
        workflowRunId: null,
        ...runOverrides,
    };
    automationRuns.set(run.id, run);
    return run;
}

function copyAutomation(automation: TestAutomation): TestAutomation {
    return {
        ...automation,
        collection: automation.collection ? { ...automation.collection } : null,
    };
}

function copyRun(run: TestAutomationRun): TestAutomationRun {
    return { ...run };
}

function applyDefinedValues<T extends object>(
    target: T,
    data: Partial<T>
): void {
    for (const key in data) {
        if (!Object.hasOwn(data, key)) {
            continue;
        }

        const value = data[key];
        if (value !== undefined) {
            target[key] = value;
        }
    }
}

function matchesAutomationRunWhere(
    run: TestAutomationRun,
    where: TestAutomationRunWhere = {}
): boolean {
    return (
        matchesScalarOrNot(run.automationId, where.automationId) &&
        matchesScalarOrNot(run.id, where.id) &&
        matchesStatus(run.status, where.status) &&
        matchesDateLessThan(run.leaseExpiresAt, where.leaseExpiresAt) &&
        matchesDateLessThan(run.startedAt, where.startedAt) &&
        matchesDateLessThanOrEqual(run.scheduledForUtc, where.scheduledForUtc)
    );
}

function matchesScalarOrNot(
    value: string,
    condition: string | { not: string } | undefined
): boolean {
    if (!condition) {
        return true;
    }
    if (typeof condition === "string") {
        return value === condition;
    }
    return value !== condition.not;
}

function matchesStatus(
    status: AutomationRunStatus,
    condition: AutomationRunStatus | { in: AutomationRunStatus[] } | undefined
): boolean {
    if (!condition) {
        return true;
    }
    if (typeof condition === "string") {
        return status === condition;
    }
    return condition.in.includes(status);
}

function matchesDateLessThan(
    value: Date | null,
    condition: { lt: Date } | undefined
): boolean {
    if (!condition) {
        return true;
    }
    return value !== null && value.getTime() < condition.lt.getTime();
}

function matchesDateLessThanOrEqual(
    value: Date,
    condition: { lte: Date } | undefined
): boolean {
    if (!condition) {
        return true;
    }
    return value.getTime() <= condition.lte.getTime();
}

function findRunBySchedule(
    automationId: string,
    scheduledForUtc: string
): TestAutomationRun | undefined {
    return [...automationRuns.values()].find(
        (run) =>
            run.automationId === automationId &&
            run.scheduledForUtc.toISOString() === scheduledForUtc
    );
}
