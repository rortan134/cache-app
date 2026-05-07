import { Badge } from "@/components/ui/badge";
import {
    WorkflowComposerDialog,
    type WorkflowComposerWorkflow,
} from "@/components/workflows/workflow-composer-dialog";
import { cn } from "@/lib/common/cn";
import {
    Bell,
    CalendarClock,
    FileOutput,
    FolderSearch,
    Link2Off,
    ListChecks,
    SearchCheck,
    Tags,
} from "lucide-react";
import type * as React from "react";

const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
    {
        description:
            "Automatically groups saved items into useful collections as your library grows.",
        Icon: FolderSearch,
        id: "smart-collections",
        isEnabled: true,
        schedule: "daily",
        title: "Smart collections",
    },
    {
        description:
            "Packages the week's most relevant saves into a focused review.",
        Icon: CalendarClock,
        id: "weekly-digest",
        isEnabled: true,
        schedule: "weekly",
        title: "Weekly digest",
    },
];

const COMING_SOON_WORKFLOWS: WorkflowDefinition[] = [
    {
        description:
            "Finds duplicate saves and keeps the clearest copy attached to every collection.",
        Icon: SearchCheck,
        id: "duplicate-cleanup",
        isEnabled: false,
        schedule: "weekly",
        title: "Duplicate cleanup",
    },
    {
        description:
            "Checks saved links for stale, redirected, or unavailable pages before you need them.",
        Icon: Link2Off,
        id: "link-health-monitor",
        isEnabled: false,
        schedule: "monthly",
        title: "Link health monitor",
    },
    {
        description:
            "Sends chosen collections, notes, and summaries into Notion on a recurring schedule.",
        Icon: FileOutput,
        id: "notion-handoff",
        isEnabled: false,
        schedule: "weekly",
        title: "Notion handoff",
    },
    {
        description:
            "Builds a short queue from high-signal saves you have not opened yet.",
        Icon: ListChecks,
        id: "reading-queue",
        isEnabled: false,
        schedule: "daily",
        title: "Reading queue",
    },
    {
        description:
            "Applies consistent tags from source, topic, and intent so search keeps getting sharper.",
        Icon: Tags,
        id: "auto-tagging",
        isEnabled: false,
        schedule: "daily",
        title: "Auto tagging",
    },
    {
        description:
            "Notifies you when a new save matches topics, people, or projects you care about.",
        Icon: Bell,
        id: "topic-alerts",
        isEnabled: false,
        schedule: "daily",
        title: "Topic alerts",
    },
];

type WorkflowIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface WorkflowDefinition extends WorkflowComposerWorkflow {
    description: string;
    Icon: WorkflowIcon;
    id: string;
    isEnabled: boolean;
    title: string;
}

export function WorkflowsList() {
    return (
        <div className="flex flex-col gap-8">
            <WorkflowsListSection
                description="Lightweight automations that keep saved content moving."
                title="Available"
                workflows={DEFAULT_WORKFLOWS}
            />
            <WorkflowsListSection
                canEdit={false}
                cardClassName="opacity-50"
                description="More ways to clean up, route, and rediscover the things you save."
                title="Coming soon"
                workflows={COMING_SOON_WORKFLOWS}
            />
        </div>
    );
}

function WorkflowsListSection({
    canEdit = true,
    cardClassName,
    description,
    title,
    workflows,
}: WorkflowsListSectionProps) {
    return (
        <section className="flex flex-col gap-4">
            <WorkflowsListHeader description={description} title={title} />
            <div className="grid gap-3 md:grid-cols-2">
                {workflows.map((workflow) => (
                    <WorkflowCard
                        canEdit={canEdit}
                        className={cardClassName}
                        key={workflow.id}
                        workflow={workflow}
                    />
                ))}
            </div>
        </section>
    );
}

interface WorkflowsListSectionProps {
    canEdit?: boolean;
    cardClassName?: string;
    description: string;
    title: string;
    workflows: WorkflowDefinition[];
}

function WorkflowsListHeader({
    description,
    title,
}: Pick<WorkflowsListSectionProps, "description" | "title">) {
    return (
        <div className="flex flex-col gap-1">
            <h2 className="font-medium text-foreground text-sm">{title}</h2>
            <p className="text-muted-foreground text-sm leading-6">
                {description}
            </p>
        </div>
    );
}

function WorkflowCard({ canEdit, className, workflow }: WorkflowCardProps) {
    const content = (
        <>
            <WorkflowCardIcon workflow={workflow} />
            <WorkflowCardContent workflow={workflow} />
            <WorkflowCardStatus isEnabled={workflow.isEnabled} />
        </>
    );

    if (!canEdit) {
        return (
            <div
                aria-disabled="true"
                className={cn(
                    "flex items-start gap-4 rounded-lg border border-border bg-background p-4 text-left",
                    className
                )}
            >
                {content}
            </div>
        );
    }

    return (
        <WorkflowComposerDialog
            trigger={
                <button
                    aria-label={`Edit ${workflow.title}`}
                    className={cn(
                        "flex items-start gap-4 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        className
                    )}
                    type="button"
                />
            }
            workflow={{
                description: workflow.description,
                schedule: workflow.schedule,
                title: workflow.title,
            }}
        >
            {content}
        </WorkflowComposerDialog>
    );
}

interface WorkflowCardProps {
    canEdit: boolean;
    className?: string;
    workflow: WorkflowDefinition;
}

function WorkflowCardIcon({ workflow }: { workflow: WorkflowDefinition }) {
    const { Icon } = workflow;

    return (
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            <Icon aria-hidden className="size-5" focusable="false" />
        </span>
    );
}

function WorkflowCardContent({ workflow }: { workflow: WorkflowDefinition }) {
    return (
        <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-medium text-[15px] text-foreground">
                {workflow.title}
            </span>
            <span className="text-muted-foreground text-sm leading-6">
                {workflow.description}
            </span>
        </span>
    );
}

function WorkflowCardStatus({ isEnabled }: { isEnabled: boolean }) {
    return (
        <Badge
            className={cn(
                "mt-0.5 rounded-md px-2 text-[11px]",
                isEnabled
                    ? "bg-success/8 text-success-foreground"
                    : "bg-muted text-muted-foreground"
            )}
            variant={isEnabled ? "success" : "secondary"}
        >
            {isEnabled ? "Active" : "Inactive"}
        </Badge>
    );
}
