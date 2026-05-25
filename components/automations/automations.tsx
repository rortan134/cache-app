"use client";

import {
    AutomationComposerDialog,
    type AutomationCollectionOption,
    type AutomationComposerAutomation,
} from "@/components/automations/automation-composer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import {
    deleteAutomation,
    pauseAutomation,
    resumeAutomation,
} from "@/lib/intelligence/automations/actions";
import type { AutomationListItem } from "@/lib/intelligence/automations/service";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    Bot,
    CalendarClock,
    FolderSearch,
    Pause,
    Play,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

type AutomationRunListItem = Awaited<
    ReturnType<
        typeof import("@/lib/intelligence/automations/service").listAutomationRuns
    >
>[number];

const TEMPLATE_ICON = {
    smart_collections: FolderSearch,
    weekly_digest: CalendarClock,
} as const;

export function AutomationsList({
    automations,
    collections,
    runsByAutomationId,
}: AutomationsListProps) {
    if (automations.length === 0) {
        return (
            <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border border-dashed p-8 text-center">
                <Bot
                    aria-hidden
                    className="size-6 text-muted-foreground"
                    focusable="false"
                />
                <div className="flex flex-col gap-1">
                    <h2 className="font-medium text-foreground text-sm">
                        No automations yet
                    </h2>
                    <p className="max-w-md text-muted-foreground text-sm leading-6">
                        Create one to have Cache summarize or organize saved
                        content on a schedule.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="grid gap-3">
            {automations.map((automation) => (
                <AutomationCard
                    automation={automation}
                    collections={collections}
                    key={automation.id}
                    runs={runsByAutomationId[automation.id] ?? []}
                />
            ))}
        </section>
    );
}

interface AutomationsListProps {
    automations: AutomationListItem[];
    collections: AutomationCollectionOption[];
    runsByAutomationId: Record<string, AutomationRunListItem[]>;
}

function AutomationCard({
    automation,
    collections,
    runs,
}: AutomationCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const latestRun = runs[0] ?? automation.lastRun;

    const Icon =
        automation.templateKey && automation.templateKey in TEMPLATE_ICON
            ? TEMPLATE_ICON[automation.templateKey]
            : Bot;

    const handlePause = useStableCallback(() => {
        startTransition(async () => {
            await pauseAutomation({ automationId: automation.id });
            router.refresh();
        });
    });

    const handleResume = useStableCallback(() => {
        if (!isCompleteSchedule(automation)) {
            return;
        }
        startTransition(async () => {
            await resumeAutomation({
                automationId: automation.id,
                schedule: {
                    cadence: automation.cadence,
                    monthDay: automation.monthDay,
                    timeOfDayMinutes: automation.timeOfDayMinutes,
                    timezone: automation.timezone,
                    weekDay: automation.weekDay,
                },
            });
            router.refresh();
        });
    });

    const handleDelete = useStableCallback(() => {
        startTransition(async () => {
            await deleteAutomation({ automationId: automation.id });
            router.refresh();
        });
    });

    return (
        <article className="grid gap-4 rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-4">
                <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                    <Icon aria-hidden className="size-5" focusable="false" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium text-[15px] text-foreground">
                            {automation.title}
                        </h2>
                        <AutomationStatusBadge status={automation.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-sm leading-6">
                        {automation.prompt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-muted-foreground text-xs">
                        <span>{formatPayload(automation)}</span>
                        <span>{formatSchedule(automation)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <AutomationComposerDialog
                        automation={toComposerAutomation(automation)}
                        collections={collections}
                    />
                    {automation.status === "active" ? (
                        <Button
                            aria-label={`Pause ${automation.title}`}
                            disabled={isPending}
                            onClick={handlePause}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                        >
                            <Pause
                                aria-hidden
                                className="size-4"
                                focusable="false"
                            />
                        </Button>
                    ) : (
                        <Button
                            aria-label={`Resume ${automation.title}`}
                            disabled={
                                isPending || !isCompleteSchedule(automation)
                            }
                            onClick={handleResume}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                        >
                            <Play
                                aria-hidden
                                className="size-4"
                                focusable="false"
                            />
                        </Button>
                    )}
                    <Button
                        aria-label={`Delete ${automation.title}`}
                        disabled={isPending}
                        onClick={handleDelete}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                    >
                        <Trash2
                            aria-hidden
                            className="size-4"
                            focusable="false"
                        />
                    </Button>
                </div>
            </div>
            <div className="grid gap-2 border-border border-t pt-3">
                <h3 className="font-medium text-muted-foreground text-xs">
                    Recent runs
                </h3>
                {latestRun ? (
                    <div className="grid gap-2">
                        {runs.slice(0, 5).map((run) => (
                            <AutomationRunRow key={run.id} run={run} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        No runs yet.
                    </p>
                )}
            </div>
        </article>
    );
}

interface AutomationCardProps {
    automation: AutomationListItem;
    collections: AutomationCollectionOption[];
    runs: AutomationRunListItem[];
}

function AutomationRunRow({ run }: { run: AutomationRunListItem }) {
    const runMessage = getAutomationRunMessage(run);

    return (
        <div className="grid gap-1 rounded-md bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">
                    {formatDate(run.scheduledForUtc)}
                </span>
                <Badge
                    className="rounded-md px-2 text-[11px]"
                    variant="outline"
                >
                    {run.status}
                </Badge>
            </div>
            {runMessage}
        </div>
    );
}

function AutomationStatusBadge({ status }: { status: "active" | "paused" }) {
    return (
        <Badge
            className={cn(
                "rounded-md px-2 text-[11px]",
                status === "active"
                    ? "bg-success/8 text-success-foreground"
                    : "bg-muted text-muted-foreground"
            )}
            variant={status === "active" ? "success" : "secondary"}
        >
            {status === "active" ? "Active" : "Paused"}
        </Badge>
    );
}

function toComposerAutomation(
    automation: AutomationListItem
): AutomationComposerAutomation {
    return {
        cadence: automation.cadence ?? "weekly",
        collectionId: automation.collectionId ?? undefined,
        id: automation.id,
        monthDay: automation.monthDay ?? undefined,
        payloadScope: automation.payloadScope,
        prompt: automation.prompt,
        status: automation.status,
        timeOfDayMinutes: automation.timeOfDayMinutes ?? 9 * 60,
        timezone:
            automation.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        title: automation.title,
        weekDay: automation.weekDay ?? 1,
    };
}

function isCompleteSchedule(
    automation: AutomationListItem
): automation is AutomationListItem & {
    cadence: NonNullable<AutomationListItem["cadence"]>;
    timeOfDayMinutes: number;
    timezone: string;
} {
    return !!(
        automation.cadence &&
        automation.timezone &&
        automation.timeOfDayMinutes !== null
    );
}

function formatPayload(automation: AutomationListItem): string {
    if (automation.payloadScope === "collection") {
        return automation.collectionName
            ? `Collection: ${automation.collectionName}`
            : "Collection missing";
    }
    return "All library";
}

function formatSchedule(automation: AutomationListItem): string {
    if (!isCompleteSchedule(automation)) {
        return "Unscheduled";
    }
    const cadence = automation.cadence;
    const time = `${String(Math.floor(automation.timeOfDayMinutes / 60)).padStart(2, "0")}:${String(automation.timeOfDayMinutes % 60).padStart(2, "0")}`;
    if (cadence === "weekly") {
        return `Weekly at ${time}`;
    }
    if (cadence === "monthly") {
        return `Monthly at ${time}`;
    }
    return `Daily at ${time}`;
}

function formatDate(value: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getAutomationRunMessage(run: AutomationRunListItem) {
    if (run.summaryMarkdown) {
        return (
            <p className="line-clamp-3 text-foreground text-sm leading-6">
                {run.summaryMarkdown}
            </p>
        );
    }
    if (run.errorMessage) {
        return (
            <p className="text-destructive text-sm leading-6">
                {run.errorMessage}
            </p>
        );
    }
    return null;
}
