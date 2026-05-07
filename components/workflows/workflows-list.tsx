import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/common/cn";
import { CalendarClock, FolderSearch } from "lucide-react";
import type * as React from "react";

const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
    {
        description:
            "Automatically groups saved items into useful collections as your library grows.",
        Icon: FolderSearch,
        id: "smart-collections",
        isEnabled: true,
        title: "Smart collections",
    },
    {
        description:
            "Packages the week's most relevant saves into a focused review.",
        Icon: CalendarClock,
        id: "weekly-digest",
        isEnabled: true,
        title: "Weekly digest",
    },
];

type WorkflowIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface WorkflowDefinition {
    description: string;
    Icon: WorkflowIcon;
    id: string;
    isEnabled: boolean;
    title: string;
}

export function WorkflowsList() {
    return (
        <section className="flex flex-col gap-4">
            <WorkflowsListHeader />
            <div className="grid gap-3">
                {DEFAULT_WORKFLOWS.map((workflow) => (
                    <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
            </div>
        </section>
    );
}

function WorkflowsListHeader() {
    return (
        <div className="flex flex-col gap-1">
            <h2 className="font-medium text-foreground text-sm">Available</h2>
            <p className="text-muted-foreground text-sm leading-6">
                Lightweight automations that keep saved content moving.
            </p>
        </div>
    );
}

function WorkflowCard({ workflow }: { workflow: WorkflowDefinition }) {
    return (
        <article className="flex items-start gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/40">
            <WorkflowCardIcon workflow={workflow} />
            <WorkflowCardContent workflow={workflow} />
            <WorkflowCardStatus isEnabled={workflow.isEnabled} />
        </article>
    );
}

function WorkflowCardIcon({ workflow }: { workflow: WorkflowDefinition }) {
    const { Icon } = workflow;

    return (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Icon aria-hidden className="size-5" focusable="false" />
        </div>
    );
}

function WorkflowCardContent({ workflow }: { workflow: WorkflowDefinition }) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="font-medium text-[15px] text-foreground">
                {workflow.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
                {workflow.description}
            </p>
        </div>
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
