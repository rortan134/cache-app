"use client";

import {
    AutomationComposerDialog,
    type AutomationCollectionOption,
    type AutomationComposerAutomation,
} from "@/components/automations/automation-composer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/ui/client-only";
import { cn } from "@/lib/common/cn";
import {
    DEFAULT_TIME_OF_DAY_MINUTES,
    formatTimeOfDayMinutes,
} from "@/lib/common/time";
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
    Pause,
    Pencil,
    Play,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

type AutomationRunListItem = AutomationListItem["recentRuns"][number];

const TEMPLATE_ICON: Record<string, LucideIcon> = {
    weekly_digest: CalendarClock,
};

const DEFAULT_WEEK_DAY = 1;
const DEFAULT_CADENCE = "weekly" as const;
const WEEK_DAY_LABELS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;

function getTemplateIcon(templateKey: AutomationListItem["templateKey"]) {
    if (templateKey) {
        const icon = TEMPLATE_ICON[templateKey];
        if (icon) {
            return icon;
        }
    }
    return Bot;
}

function toComposerAutomation(
    automation: AutomationListItem
): AutomationComposerAutomation {
    return {
        cadence: automation.cadence ?? DEFAULT_CADENCE,
        collectionId: automation.collectionId ?? undefined,
        id: automation.id,
        monthDay: automation.monthDay ?? undefined,
        payloadScope: automation.payloadScope,
        prompt: automation.prompt,
        status: automation.status,
        timeOfDayMinutes:
            automation.timeOfDayMinutes ?? DEFAULT_TIME_OF_DAY_MINUTES,
        timezone:
            automation.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        title: automation.title,
        weekDay: automation.weekDay ?? DEFAULT_WEEK_DAY,
    };
}

function isCompleteSchedule(
    automation: AutomationListItem
): automation is AutomationListItem & {
    cadence: NonNullable<AutomationListItem["cadence"]>;
    timeOfDayMinutes: number;
    timezone: string;
} {
    if (
        !(
            automation.cadence &&
            automation.timezone &&
            automation.timeOfDayMinutes !== null
        )
    ) {
        return false;
    }
    if (automation.cadence === "weekly" && automation.weekDay === null) {
        return false;
    }
    if (automation.cadence === "monthly" && automation.monthDay === null) {
        return false;
    }
    return true;
}

function formatPayload(automation: AutomationListItem): string {
    if (automation.payloadScope === "collection") {
        if (!automation.collectionId) {
            return "Collection missing";
        }
        return automation.collectionName ?? "Collection missing";
    }
    return "All library";
}

function formatSchedule(automation: AutomationListItem): string {
    if (!isCompleteSchedule(automation)) {
        return "Unscheduled";
    }

    const time = formatTimeOfDayMinutes(automation.timeOfDayMinutes);

    if (automation.cadence === "weekly") {
        const weekDayLabel =
            automation.weekDay === null
                ? null
                : WEEK_DAY_LABELS[automation.weekDay];
        if (weekDayLabel) {
            return `${weekDayLabel}s at ${time}`;
        }
        return `Weekly at ${time}`;
    }

    if (automation.cadence === "monthly") {
        if (automation.monthDay) {
            return `Monthly on the ${getMonthDayLabel(automation.monthDay)} at ${time}`;
        }
        return `Monthly at ${time}`;
    }

    return `Daily at ${time}`;
}

function getMonthDayLabel(monthDay: number): string {
    const suffix =
        monthDay >= 11 && monthDay <= 13
            ? "th"
            : (["th", "st", "nd", "rd"][monthDay % 10] ?? "th");
    return `${monthDay}${suffix}`;
}

function getAutomationRunMessage(run: AutomationRunListItem) {
    if (run.summaryMarkdown) {
        return (
            <p className="line-clamp-2 text-muted-foreground text-xs leading-5">
                {run.summaryMarkdown}
            </p>
        );
    }
    if (run.errorMessage) {
        return (
            <p className="line-clamp-2 text-destructive text-xs leading-5">
                {run.errorMessage}
            </p>
        );
    }
    return null;
}

export function AutomationsList({
    automations,
    collections,
}: AutomationsListProps) {
    if (automations.length === 0) {
        return (
            <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border border-dashed p-8 text-center">
                <Bot
                    aria-hidden
                    className="size-5 text-muted-foreground"
                    focusable="false"
                />
                <div className="flex flex-col gap-1">
                    <h2 className="font-medium text-foreground text-sm">
                        No automations yet
                    </h2>
                    <p className="max-w-sm text-muted-foreground text-sm leading-6">
                        Create one to summarize or organize saved content on a
                        schedule.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="flex flex-col gap-2">
            {automations.map((automation) => (
                <AutomationCard
                    automation={automation}
                    collections={collections}
                    key={automation.id}
                />
            ))}
        </section>
    );
}

interface AutomationsListProps {
    automations: AutomationListItem[];
    collections: AutomationCollectionOption[];
}

function AutomationCard({ automation, collections }: AutomationCardProps) {
    const runs = automation.recentRuns;
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();
    const [actionErrorMessage, setActionErrorMessage] = React.useState<
        string | null
    >(null);
    const isActive = automation.status === "active";
    const canDelete = !isActive;
    const Icon = getTemplateIcon(automation.templateKey);
    const metaParts = [formatPayload(automation), formatSchedule(automation)];

    const handlePause = useStableCallback(() => {
        setActionErrorMessage(null);
        startTransition(async () => {
            const result = await pauseAutomation({
                automationId: automation.id,
            });
            if (result.status !== "SUCCESS") {
                setActionErrorMessage(result.message);
                return;
            }
            router.refresh();
        });
    });

    const handleResume = useStableCallback(() => {
        if (!isCompleteSchedule(automation)) {
            return;
        }
        setActionErrorMessage(null);
        startTransition(async () => {
            const result = await resumeAutomation({
                automationId: automation.id,
                schedule: {
                    cadence: automation.cadence,
                    monthDay: automation.monthDay,
                    timeOfDayMinutes: automation.timeOfDayMinutes,
                    timezone: automation.timezone,
                    weekDay: automation.weekDay,
                },
            });
            if (result.status !== "SUCCESS") {
                setActionErrorMessage(result.message);
                return;
            }
            router.refresh();
        });
    });

    const handleDelete = useStableCallback(() => {
        if (!canDelete) {
            return;
        }
        setActionErrorMessage(null);
        startTransition(async () => {
            const result = await deleteAutomation({
                automationId: automation.id,
            });
            if (result.status !== "SUCCESS") {
                setActionErrorMessage(result.message);
                return;
            }
            router.refresh();
        });
    });

    return (
        <article className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon aria-hidden className="size-4" focusable="false" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="truncate font-medium text-foreground text-sm">
                            {automation.title}
                        </h2>
                        <AutomationStatusBadge status={automation.status} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs leading-5">
                        {automation.prompt}
                    </p>
                    <p className="mt-1.5 text-muted-foreground text-xs">
                        {metaParts.join(" · ")}
                    </p>
                    {actionErrorMessage ? (
                        <p
                            aria-live="polite"
                            className="mt-1.5 text-destructive text-xs leading-5"
                            role="status"
                        >
                            {actionErrorMessage}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <AutomationComposerDialog
                        automation={toComposerAutomation(automation)}
                        collections={collections}
                        trigger={
                            <Button
                                aria-label={`Edit ${automation.title}`}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                            />
                        }
                    >
                        <Pencil
                            aria-hidden
                            className="size-4"
                            focusable="false"
                        />
                    </AutomationComposerDialog>
                    {isActive ? (
                        <AutomationIconButton
                            aria-label={`Pause ${automation.title}`}
                            disabled={isPending}
                            icon={Pause}
                            onClick={handlePause}
                        />
                    ) : (
                        <AutomationIconButton
                            aria-disabled={
                                isPending || !isCompleteSchedule(automation)
                            }
                            aria-label={
                                isCompleteSchedule(automation)
                                    ? `Resume ${automation.title}`
                                    : `Set a complete schedule to resume ${automation.title}`
                            }
                            disabled={isPending}
                            icon={Play}
                            onClick={
                                isCompleteSchedule(automation)
                                    ? handleResume
                                    : undefined
                            }
                            title={
                                isCompleteSchedule(automation)
                                    ? undefined
                                    : "Set a complete schedule to resume"
                            }
                        />
                    )}
                    <AutomationIconButton
                        aria-disabled={isPending || !canDelete}
                        aria-label={
                            canDelete
                                ? `Delete ${automation.title}`
                                : `Pause ${automation.title} before deleting`
                        }
                        disabled={isPending}
                        icon={Trash2}
                        onClick={canDelete ? handleDelete : undefined}
                        title={
                            canDelete
                                ? undefined
                                : "Pause this automation before deleting"
                        }
                    />
                </div>
            </div>
            {runs.length > 0 ? (
                <div className="mt-3 border-border border-t pt-3">
                    <h3 className="mb-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                        Recent runs
                    </h3>
                    <div className="flex flex-col gap-1">
                        {runs.map((run) => (
                            <AutomationRunRow key={run.id} run={run} />
                        ))}
                    </div>
                </div>
            ) : null}
        </article>
    );
}

interface AutomationCardProps {
    automation: AutomationListItem;
    collections: AutomationCollectionOption[];
}

function AutomationIconButton({
    icon: Icon,
    ...buttonProps
}: { icon: LucideIcon } & React.ComponentProps<typeof Button>) {
    return (
        <Button {...buttonProps} size="icon-sm" type="button" variant="ghost">
            <Icon aria-hidden className="size-4" focusable="false" />
        </Button>
    );
}

const DATE_TIME_INTL = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
});

function getRunStatusClassName(status: AutomationRunListItem["status"]) {
    if (status === "failed") {
        return "bg-destructive/8 text-destructive";
    }
    if (status === "succeeded") {
        return "bg-success/8 text-success-foreground";
    }
    return "bg-muted text-muted-foreground";
}

function AutomationRunRow({ run }: { run: AutomationRunListItem }) {
    const runMessage = getAutomationRunMessage(run);

    return (
        <div className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 hover:bg-muted/40">
            <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">
                    <ClientOnly>
                        {DATE_TIME_INTL.format(run.scheduledForUtc)}
                    </ClientOnly>
                </span>
                <span
                    className={cn(
                        "rounded-full px-1.5 py-0.5 font-medium text-[10px] capitalize",
                        getRunStatusClassName(run.status)
                    )}
                >
                    {run.status}
                </span>
            </div>
            {runMessage}
        </div>
    );
}

function AutomationStatusBadge({ status }: { status: "active" | "paused" }) {
    const isActive = status === "active";
    return (
        <Badge
            className={cn(
                "rounded-full px-1.5 py-0 text-[10px]",
                isActive
                    ? "bg-success/8 text-success-foreground"
                    : "bg-muted text-muted-foreground"
            )}
            variant={isActive ? "success" : "secondary"}
        >
            {isActive ? "Active" : "Paused"}
        </Badge>
    );
}
