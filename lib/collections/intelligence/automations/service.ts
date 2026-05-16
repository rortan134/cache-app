import "server-only";

import { serverEnv } from "@/env/server";
import { userHasActiveSubscription } from "@/lib/billing/service";
import { createLogger } from "@/lib/common/logs/console/logger";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import {
    AutomationPayloadScope,
    AutomationRunStatus,
    AutomationStatus,
    type AutomationCadence,
    type AutomationTemplateKey,
} from "@/prisma/client/enums";
import { randomUUID } from "node:crypto";
import {
    AUTOMATION_DUE_BATCH_LIMIT,
    AUTOMATION_LEASE_DURATION_MS,
    AUTOMATION_RUNNING_TIMEOUT_MS,
    AUTOMATION_TEMPLATE_DEFINITIONS,
} from "./constants";
import { createAutomationError } from "./error";
import {
    buildScheduleSnapshot,
    computeNextRunAtUtc,
    validateAutomationSchedule,
    type AutomationScheduleInput,
} from "./schedule";

const log = createLogger("automations:service");

type AutomationTransaction = Prisma.TransactionClient;
type AutomationRunClaimResult =
    | { leaseId: string; status: "claimed" }
    | { status: "skipped" }
    | null;

const AUTOMATION_SELECT = {
    activatedAtUtc: true,
    cadence: true,
    collection: {
        select: {
            id: true,
            name: true,
        },
    },
    collectionId: true,
    collectionNameSnapshot: true,
    createdAt: true,
    id: true,
    lastFailureCode: true,
    lastRunAtUtc: true,
    lastSucceededAtUtc: true,
    monthDay: true,
    nextRunAtUtc: true,
    payloadScope: true,
    prompt: true,
    runs: {
        orderBy: {
            createdAt: "desc",
        },
        select: {
            createdAt: true,
            errorCode: true,
            errorMessage: true,
            finishedAt: true,
            id: true,
            scheduledForUtc: true,
            startedAt: true,
            status: true,
            summaryMarkdown: true,
        },
        take: 1,
    },
    status: true,
    templateKey: true,
    timeOfDayMinutes: true,
    timezone: true,
    title: true,
    updatedAt: true,
    userId: true,
    weekDay: true,
} satisfies Prisma.AutomationSelect;

export interface AutomationScheduleData extends AutomationScheduleInput {}

export interface AutomationInput {
    collectionId?: string | null;
    payloadScope: AutomationPayloadScope;
    prompt: string;
    schedule: AutomationScheduleData;
    title: string;
}

export type AutomationListItem = ReturnType<typeof toAutomationListItem>;

export async function seedBuiltInAutomationsForUser(userId: string) {
    await prisma.$transaction(async (tx) => {
        for (const definition of AUTOMATION_TEMPLATE_DEFINITIONS) {
            await tx.automation.upsert({
                create: {
                    payloadScope: AutomationPayloadScope.all_library_items,
                    prompt: definition.prompt,
                    status: AutomationStatus.paused,
                    templateKey: definition.templateKey,
                    title: definition.title,
                    userId,
                },
                update: {},
                where: {
                    userId_templateKey: {
                        templateKey: definition.templateKey,
                        userId,
                    },
                },
            });
        }
    });
}

export async function listAutomations(args: {
    userId: string;
}): Promise<AutomationListItem[]> {
    const automations = await prisma.automation.findMany({
        orderBy: [{ templateKey: "asc" }, { createdAt: "desc" }],
        select: AUTOMATION_SELECT,
        where: {
            userId: args.userId,
        },
    });

    return automations.map(toAutomationListItem);
}

export async function listAutomationRuns(args: {
    automationId: string;
    limit?: number;
    userId: string;
}) {
    const automation = await requireAutomationOwned(prisma, {
        automationId: args.automationId,
        operation: "listAutomationRuns",
        userId: args.userId,
    });

    const runs = await prisma.automationRun.findMany({
        orderBy: {
            createdAt: "desc",
        },
        select: {
            createdAt: true,
            errorCode: true,
            errorMessage: true,
            finishedAt: true,
            id: true,
            scheduledForUtc: true,
            sources: true,
            startedAt: true,
            status: true,
            summaryMarkdown: true,
            usage: true,
        },
        take: Math.min(args.limit ?? 20, 50),
        where: {
            automationId: automation.id,
            userId: args.userId,
        },
    });

    return runs;
}

export async function createAutomation(args: {
    input: AutomationInput;
    userId: string;
}): Promise<AutomationListItem> {
    await requireCanUseAutomations(args.userId, "createAutomation");

    return prisma.$transaction(async (tx) => {
        const now = new Date();
        const normalized = await normalizeAutomationInput(tx, {
            input: args.input,
            operation: "createAutomation",
            userId: args.userId,
        });
        const nextRunAtUtc = computeNextRunAtUtc({
            afterUtc: now,
            schedule: normalized.schedule,
        });

        const automation = await tx.automation.create({
            data: {
                activatedAtUtc: now,
                cadence: normalized.schedule.cadence,
                collectionId: normalized.collectionId,
                collectionNameSnapshot: normalized.collectionNameSnapshot,
                monthDay: normalized.schedule.monthDay,
                nextRunAtUtc,
                payloadScope: normalized.payloadScope,
                prompt: normalized.prompt,
                status: AutomationStatus.active,
                timeOfDayMinutes: normalized.schedule.timeOfDayMinutes,
                timezone: normalized.schedule.timezone,
                title: normalized.title,
                userId: args.userId,
                weekDay: normalized.schedule.weekDay,
            },
            select: AUTOMATION_SELECT,
        });

        await createPendingRun(tx, automation, nextRunAtUtc);

        return toAutomationListItem(automation);
    });
}

export async function updateAutomation(args: {
    automationId: string;
    input: AutomationInput;
    userId: string;
}): Promise<AutomationListItem> {
    const automation = await prisma.$transaction(async (tx) => {
        const current = await requireAutomationOwned(tx, {
            automationId: args.automationId,
            operation: "updateAutomation",
            userId: args.userId,
        });
        if (current.status === AutomationStatus.active) {
            await requireCanUseAutomations(args.userId, "updateAutomation");
        }

        const normalized = await normalizeAutomationInput(tx, {
            input: args.input,
            operation: "updateAutomation",
            userId: args.userId,
        });
        const nextRunAtUtc =
            current.status === AutomationStatus.active
                ? computeNextRunAtUtc({
                      afterUtc: new Date(),
                      schedule: normalized.schedule,
                  })
                : null;

        const automation = await tx.automation.update({
            data: {
                cadence: normalized.schedule.cadence,
                collectionId: normalized.collectionId,
                collectionNameSnapshot: normalized.collectionNameSnapshot,
                monthDay: normalized.schedule.monthDay,
                nextRunAtUtc,
                payloadScope: normalized.payloadScope,
                prompt: normalized.prompt,
                timeOfDayMinutes: normalized.schedule.timeOfDayMinutes,
                timezone: normalized.schedule.timezone,
                title: normalized.title,
                weekDay: normalized.schedule.weekDay,
            },
            select: AUTOMATION_SELECT,
            where: {
                id: current.id,
            },
        });

        await tx.automationRun.deleteMany({
            where: {
                automationId: automation.id,
                status: AutomationRunStatus.pending,
            },
        });
        if (automation.status === AutomationStatus.active && nextRunAtUtc) {
            await createPendingRun(tx, automation, nextRunAtUtc);
        }

        return toAutomationListItem(automation);
    });
    return automation;
}

export async function resumeAutomation(args: {
    automationId: string;
    schedule: AutomationScheduleData;
    userId: string;
}): Promise<AutomationListItem> {
    await requireCanUseAutomations(args.userId, "resumeAutomation");
    if (!validateAutomationSchedule(args.schedule)) {
        throw createAutomationError({
            code: "invalid_schedule",
            message: "Choose a valid automation schedule.",
            operation: "resumeAutomation",
        });
    }

    return prisma.$transaction(async (tx) => {
        const current = await requireAutomationOwned(tx, {
            automationId: args.automationId,
            operation: "resumeAutomation",
            userId: args.userId,
        });
        const now = new Date();
        const nextRunAtUtc = computeNextRunAtUtc({
            afterUtc: now,
            schedule: args.schedule,
        });

        const automation = await tx.automation.update({
            data: {
                activatedAtUtc: now,
                cadence: args.schedule.cadence,
                lastFailureCode: null,
                monthDay: args.schedule.monthDay,
                nextRunAtUtc,
                status: AutomationStatus.active,
                timeOfDayMinutes: args.schedule.timeOfDayMinutes,
                timezone: args.schedule.timezone,
                weekDay: args.schedule.weekDay,
            },
            select: AUTOMATION_SELECT,
            where: {
                id: current.id,
            },
        });

        await tx.automationRun.deleteMany({
            where: {
                automationId: automation.id,
                status: AutomationRunStatus.pending,
            },
        });
        await createPendingRun(tx, automation, nextRunAtUtc);

        return toAutomationListItem(automation);
    });
}

export async function pauseAutomation(args: {
    automationId: string;
    userId: string;
}): Promise<AutomationListItem> {
    const automation = await prisma.$transaction(async (tx) => {
        const current = await requireAutomationOwned(tx, {
            automationId: args.automationId,
            operation: "pauseAutomation",
            userId: args.userId,
        });

        const automation = await tx.automation.update({
            data: {
                nextRunAtUtc: null,
                status: AutomationStatus.paused,
            },
            select: AUTOMATION_SELECT,
            where: {
                id: current.id,
            },
        });

        await tx.automationRun.deleteMany({
            where: {
                automationId: automation.id,
                status: AutomationRunStatus.pending,
            },
        });

        return toAutomationListItem(automation);
    });
    return automation;
}

export async function deleteAutomation(args: {
    automationId: string;
    userId: string;
}): Promise<{ id: string }> {
    const automation = await requireAutomationOwned(prisma, {
        automationId: args.automationId,
        operation: "deleteAutomation",
        userId: args.userId,
    });
    await prisma.automation.delete({
        where: {
            id: automation.id,
        },
    });

    return { id: automation.id };
}

export async function recoverStaleAutomationRuns(now = new Date()) {
    const starting = await prisma.automationRun.updateMany({
        data: {
            leaseExpiresAt: null,
            leaseId: null,
            status: AutomationRunStatus.pending,
            workflowRunId: null,
        },
        where: {
            leaseExpiresAt: {
                lt: now,
            },
            status: AutomationRunStatus.starting,
        },
    });

    const runningStartedBefore = new Date(
        now.getTime() - AUTOMATION_RUNNING_TIMEOUT_MS
    );
    const running = await prisma.automationRun.updateMany({
        data: {
            errorCode: "run_timeout",
            errorMessage: "The automation run exceeded its execution timeout.",
            finishedAt: now,
            status: AutomationRunStatus.failed,
        },
        where: {
            startedAt: {
                lt: runningStartedBefore,
            },
            status: AutomationRunStatus.running,
        },
    });

    return {
        recovered: starting.count,
        timedOut: running.count,
    };
}

export async function claimDueAutomationRuns(
    args: { limit?: number; now?: Date } = {}
) {
    const now = args.now ?? new Date();
    const limit = Math.min(args.limit ?? AUTOMATION_DUE_BATCH_LIMIT, 50);
    const dueRuns = await prisma.automationRun.findMany({
        orderBy: {
            scheduledForUtc: "asc",
        },
        select: {
            automationId: true,
            id: true,
        },
        take: limit,
        where: {
            scheduledForUtc: {
                lte: now,
            },
            status: AutomationRunStatus.pending,
        },
    });

    const claimed: Array<{ leaseId: string; runId: string }> = [];
    let skipped = 0;

    for (const dueRun of dueRuns) {
        const result = await claimAutomationRun({
            now,
            runId: dueRun.id,
        });
        if (result?.status === "claimed") {
            claimed.push({
                leaseId: result.leaseId,
                runId: dueRun.id,
            });
            continue;
        }
        if (result?.status === "skipped") {
            skipped += 1;
        }
    }

    return {
        claimed,
        skipped,
    };
}

export async function attachWorkflowRunId(args: {
    runId: string;
    workflowRunId: string;
}) {
    await prisma.automationRun.updateMany({
        data: {
            workflowRunId: args.workflowRunId,
        },
        where: {
            id: args.runId,
            status: AutomationRunStatus.starting,
        },
    });
}

export async function markAutomationRunStartFailed(args: {
    message: string;
    runId: string;
}) {
    await prisma.automationRun.update({
        data: {
            errorCode: "workflow_start_failed",
            errorMessage: args.message,
            finishedAt: new Date(),
            leaseExpiresAt: null,
            leaseId: null,
            status: AutomationRunStatus.failed,
        },
        where: {
            id: args.runId,
        },
    });
}

export async function markAutomationRunRunning(args: {
    runId: string;
    workflowRunId: string;
}) {
    "use step";

    const now = new Date();
    const run = await prisma.automationRun.findUnique({
        include: {
            automation: true,
        },
        where: {
            id: args.runId,
        },
    });

    if (!run || run.status !== AutomationRunStatus.starting) {
        return null;
    }

    const automation = run.automation;
    if (automation.payloadScope === AutomationPayloadScope.collection) {
        const collectionId =
            automation.collectionId ?? run.collectionIdSnapshot;
        if (!collectionId) {
            await pauseAutomationForMissingCollection({
                automationId: automation.id,
                runId: run.id,
            });
            return null;
        }

        const collection = await prisma.collection.findFirst({
            select: { id: true },
            where: {
                id: collectionId,
                userId: automation.userId,
            },
        });
        if (!collection) {
            await pauseAutomationForMissingCollection({
                automationId: automation.id,
                runId: run.id,
            });
            return null;
        }
    }

    const updated = await prisma.automationRun.update({
        data: {
            startedAt: now,
            status: AutomationRunStatus.running,
            workflowRunId: args.workflowRunId,
        },
        include: {
            automation: true,
        },
        where: {
            id: run.id,
        },
    });

    return {
        automationId: updated.automationId,
        collectionId: updated.collectionIdSnapshot,
        modelId: serverEnv.AUTOMATION_AGENT_MODEL ?? null,
        payloadScope: updated.payloadScopeSnapshot,
        prompt: updated.promptSnapshot,
        runId: updated.id,
        scheduledForUtc: updated.scheduledForUtc.toISOString(),
        templateKey: updated.templateKeySnapshot,
        userId: updated.userId,
    };
}

export async function finishAutomationRun(args: {
    errorCode?: string;
    errorMessage?: string;
    runId: string;
    sources?: Prisma.InputJsonValue;
    status:
        | typeof AutomationRunStatus.succeeded
        | typeof AutomationRunStatus.failed;
    summaryMarkdown?: string;
    usage?: Prisma.InputJsonValue;
}) {
    "use step";

    const now = new Date();
    const run = await prisma.automationRun.update({
        data: {
            errorCode: args.errorCode,
            errorMessage: args.errorMessage,
            finishedAt: now,
            leaseExpiresAt: null,
            leaseId: null,
            sources: args.sources,
            status: args.status,
            summaryMarkdown: args.summaryMarkdown,
            usage: args.usage,
        },
        select: {
            automationId: true,
            id: true,
            scheduledForUtc: true,
        },
        where: {
            id: args.runId,
        },
    });

    await prisma.automation.update({
        data: {
            lastFailureCode:
                args.status === AutomationRunStatus.failed
                    ? (args.errorCode ?? "run_failed")
                    : null,
            lastRunAtUtc: now,
            lastSucceededAtUtc:
                args.status === AutomationRunStatus.succeeded ? now : undefined,
        },
        where: {
            id: run.automationId,
        },
    });
}

export async function getSmartCollectionItemIdsForRun(args: { runId: string }) {
    "use step";

    const run = await prisma.automationRun.findUnique({
        include: {
            automation: true,
        },
        where: {
            id: args.runId,
        },
    });
    if (!run) {
        return [];
    }

    const baseline =
        run.automation.lastSucceededAtUtc ??
        run.automation.activatedAtUtc ??
        run.scheduledForUtc;

    const items = await prisma.libraryItem.findMany({
        orderBy: {
            createdAt: "asc",
        },
        select: {
            id: true,
        },
        where: {
            createdAt: {
                gt: baseline,
                lte: run.scheduledForUtc,
            },
            userId: run.userId,
        },
    });

    return items.map((item) => item.id);
}

async function requireAutomationOwned(
    tx: Pick<AutomationTransaction, "automation">,
    args: {
        automationId: string;
        operation: string;
        userId: string;
    }
) {
    const automation = await tx.automation.findFirst({
        where: {
            id: args.automationId,
            userId: args.userId,
        },
    });

    if (!automation) {
        throw createAutomationError({
            code: "not_found",
            message: "That automation is no longer available.",
            operation: args.operation,
        });
    }

    return automation;
}

async function requireCanUseAutomations(
    userId: string,
    operation: string
): Promise<void> {
    if (await userHasActiveSubscription(userId)) {
        return;
    }

    throw createAutomationError({
        code: "forbidden",
        message: "Upgrade to schedule automations.",
        operation,
    });
}

async function normalizeAutomationInput(
    tx: AutomationTransaction,
    args: {
        input: AutomationInput;
        operation: string;
        userId: string;
    }
) {
    if (!validateAutomationSchedule(args.input.schedule)) {
        throw createAutomationError({
            code: "invalid_schedule",
            message: "Choose a valid automation schedule.",
            operation: args.operation,
        });
    }

    if (args.input.payloadScope === AutomationPayloadScope.all_library_items) {
        return {
            collectionId: null,
            collectionNameSnapshot: null,
            payloadScope: args.input.payloadScope,
            prompt: args.input.prompt.trim(),
            schedule: args.input.schedule,
            title: args.input.title.trim(),
        };
    }

    const collection = await tx.collection.findFirst({
        select: {
            id: true,
            name: true,
        },
        where: {
            id: args.input.collectionId ?? "",
            userId: args.userId,
        },
    });

    if (!collection) {
        throw createAutomationError({
            code: "missing_collection",
            message: "Choose a valid collection for this automation.",
            operation: args.operation,
        });
    }

    return {
        collectionId: collection.id,
        collectionNameSnapshot: collection.name,
        payloadScope: args.input.payloadScope,
        prompt: args.input.prompt.trim(),
        schedule: args.input.schedule,
        title: args.input.title.trim(),
    };
}

async function createPendingRun(
    tx: AutomationTransaction,
    automation: AutomationForRunSnapshot,
    scheduledForUtc: Date
) {
    const schedule = getAutomationSchedule(automation);
    await tx.automationRun.create({
        data: {
            automationId: automation.id,
            collectionIdSnapshot: automation.collectionId,
            collectionNameSnapshot:
                automation.collection?.name ??
                automation.collectionNameSnapshot ??
                null,
            payloadScopeSnapshot: automation.payloadScope,
            promptSnapshot: automation.prompt,
            scheduledForUtc,
            scheduleSnapshot: buildScheduleSnapshot({
                nextRunAtUtc: scheduledForUtc,
                schedule,
            }) as unknown as Prisma.InputJsonValue,
            status: AutomationRunStatus.pending,
            templateKeySnapshot: automation.templateKey,
            userId: automation.userId,
        },
    });
}

interface AutomationForRunSnapshot {
    cadence: AutomationCadence | null;
    collection?: { id: string; name: string } | null;
    collectionId: string | null;
    collectionNameSnapshot: string | null;
    id: string;
    monthDay: number | null;
    payloadScope: AutomationPayloadScope;
    prompt: string;
    templateKey: AutomationTemplateKey | null;
    timeOfDayMinutes: number | null;
    timezone: string | null;
    userId: string;
    weekDay: number | null;
}

function getAutomationSchedule(
    automation: Pick<
        AutomationForRunSnapshot,
        "cadence" | "monthDay" | "timeOfDayMinutes" | "timezone" | "weekDay"
    >
): AutomationScheduleData {
    if (
        !(
            automation.cadence &&
            automation.timezone &&
            automation.timeOfDayMinutes !== null
        )
    ) {
        throw new Error("Automation is missing schedule data.");
    }

    return {
        cadence: automation.cadence,
        monthDay: automation.monthDay,
        timeOfDayMinutes: automation.timeOfDayMinutes,
        timezone: automation.timezone,
        weekDay: automation.weekDay,
    };
}

async function claimAutomationRun(args: {
    now: Date;
    runId: string;
}): Promise<AutomationRunClaimResult> {
    const claim = await prisma.$transaction<AutomationRunClaimResult>(
        async (tx) => {
            const run = await tx.automationRun.findUnique({
                include: {
                    automation: {
                        include: {
                            collection: true,
                        },
                    },
                },
                where: {
                    id: args.runId,
                },
            });
            if (!run || run.status !== AutomationRunStatus.pending) {
                return null;
            }
            if (run.automation.status !== AutomationStatus.active) {
                await tx.automationRun.update({
                    data: {
                        errorCode: "automation_paused",
                        errorMessage: "The automation is paused.",
                        finishedAt: args.now,
                        status: AutomationRunStatus.skipped,
                    },
                    where: { id: run.id },
                });
                return { status: "skipped" };
            }

            const activeRun = await tx.automationRun.findFirst({
                select: { id: true },
                where: {
                    automationId: run.automationId,
                    id: { not: run.id },
                    status: {
                        in: [
                            AutomationRunStatus.starting,
                            AutomationRunStatus.running,
                        ],
                    },
                },
            });

            if (activeRun) {
                await tx.automationRun.update({
                    data: {
                        errorCode: "overlapping_run",
                        errorMessage:
                            "Skipped because the previous automation run was still active.",
                        finishedAt: args.now,
                        status: AutomationRunStatus.skipped,
                    },
                    where: { id: run.id },
                });
                await materializeNextRunAfterClaim(
                    tx,
                    run.automation,
                    args.now
                );
                return { status: "skipped" };
            }

            const leaseId = randomUUID();
            const updated = await tx.automationRun.updateMany({
                data: {
                    leaseExpiresAt: new Date(
                        args.now.getTime() + AUTOMATION_LEASE_DURATION_MS
                    ),
                    leaseId,
                    status: AutomationRunStatus.starting,
                },
                where: {
                    id: run.id,
                    status: AutomationRunStatus.pending,
                },
            });

            if (updated.count !== 1) {
                return null;
            }

            await materializeNextRunAfterClaim(tx, run.automation, args.now);

            return { leaseId, status: "claimed" };
        }
    );
    return claim;
}

async function materializeNextRunAfterClaim(
    tx: AutomationTransaction,
    automation: AutomationForRunSnapshot,
    now: Date
) {
    const nextRunAtUtc = computeNextRunAtUtc({
        afterUtc: now,
        schedule: getAutomationSchedule(automation),
    });

    const updated = await tx.automation.update({
        data: {
            nextRunAtUtc,
        },
        include: {
            collection: true,
        },
        where: {
            id: automation.id,
        },
    });

    await tx.automationRun.createMany({
        data: [
            {
                automationId: updated.id,
                collectionIdSnapshot: updated.collectionId,
                collectionNameSnapshot:
                    updated.collection?.name ?? updated.collectionNameSnapshot,
                payloadScopeSnapshot: updated.payloadScope,
                promptSnapshot: updated.prompt,
                scheduledForUtc: nextRunAtUtc,
                scheduleSnapshot: buildScheduleSnapshot({
                    nextRunAtUtc,
                    schedule: getAutomationSchedule(updated),
                }) as unknown as Prisma.InputJsonValue,
                status: AutomationRunStatus.pending,
                templateKeySnapshot: updated.templateKey,
                userId: updated.userId,
            },
        ],
        skipDuplicates: true,
    });
}

async function pauseAutomationForMissingCollection(args: {
    automationId: string;
    runId: string;
}) {
    const now = new Date();
    await prisma.$transaction([
        prisma.automation.update({
            data: {
                lastFailureCode: "missing_collection",
                nextRunAtUtc: null,
                status: AutomationStatus.paused,
            },
            where: { id: args.automationId },
        }),
        prisma.automationRun.update({
            data: {
                errorCode: "missing_collection",
                errorMessage:
                    "The collection targeted by this automation no longer exists.",
                finishedAt: now,
                status: AutomationRunStatus.failed,
            },
            where: { id: args.runId },
        }),
        prisma.automationRun.deleteMany({
            where: {
                automationId: args.automationId,
                status: AutomationRunStatus.pending,
            },
        }),
    ]);
}

function toAutomationListItem(automation: {
    activatedAtUtc: Date | null;
    cadence: AutomationCadence | null;
    collection: { id: string; name: string } | null;
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
    runs: Array<{
        createdAt: Date;
        errorCode: string | null;
        errorMessage: string | null;
        finishedAt: Date | null;
        id: string;
        scheduledForUtc: Date;
        startedAt: Date | null;
        status: AutomationRunStatus;
        summaryMarkdown: string | null;
    }>;
    status: AutomationStatus;
    templateKey: AutomationTemplateKey | null;
    timeOfDayMinutes: number | null;
    timezone: string | null;
    title: string;
    updatedAt: Date;
    weekDay: number | null;
}) {
    return {
        activatedAtUtc: automation.activatedAtUtc,
        cadence: automation.cadence,
        collectionId: automation.collectionId,
        collectionName:
            automation.collection?.name ?? automation.collectionNameSnapshot,
        createdAt: automation.createdAt,
        id: automation.id,
        lastFailureCode: automation.lastFailureCode,
        lastRun: automation.runs[0] ?? null,
        lastRunAtUtc: automation.lastRunAtUtc,
        lastSucceededAtUtc: automation.lastSucceededAtUtc,
        monthDay: automation.monthDay,
        nextRunAtUtc: automation.nextRunAtUtc,
        payloadScope: automation.payloadScope,
        prompt: automation.prompt,
        status: automation.status,
        templateKey: automation.templateKey,
        timeOfDayMinutes: automation.timeOfDayMinutes,
        timezone: automation.timezone,
        title: automation.title,
        updatedAt: automation.updatedAt,
        weekDay: automation.weekDay,
    };
}

export function logAutomationServiceError(message: string, error: unknown) {
    log.error(message, error);
}
