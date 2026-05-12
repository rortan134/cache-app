"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";

const ROOT_NAME = "Kanban";
const BOARD_NAME = "KanbanBoard";
const COLUMN_NAME = "KanbanColumn";
const ITEM_NAME = "KanbanItem";

type Orientation = "horizontal" | "vertical";

interface KanbanContextValue {
    orientation: Orientation;
}

const KanbanContext = React.createContext<KanbanContextValue | null>(null);

const KanbanBoardContext = React.createContext<boolean>(false);

export function Kanban({
    children,
    orientation = "horizontal",
}: React.PropsWithChildren<KanbanContextValue>) {
    const value = {
        orientation,
    } satisfies KanbanContextValue;
    return <KanbanContext value={value}>{children}</KanbanContext>;
}

interface KanbanBoardProps extends React.ComponentProps<"div"> {}

export function KanbanBoard({ className, ...props }: KanbanBoardProps) {
    const context = useKanbanContext(BOARD_NAME);

    return (
        <KanbanBoardContext value={true}>
            <div
                data-orientation={context.orientation}
                data-slot="kanban-board"
                {...props}
                className={cn(
                    "flex size-full gap-4",
                    context.orientation === "horizontal"
                        ? "flex-row"
                        : "flex-col",
                    className
                )}
            />
        </KanbanBoardContext>
    );
}

interface KanbanColumnProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
}

export function KanbanColumn({
    disabled,
    className,
    ...props
}: KanbanColumnProps) {
    const inBoard = React.use(KanbanBoardContext);

    if (!inBoard) {
        throw new Error(
            `\`${COLUMN_NAME}\` must be used within \`${BOARD_NAME}\``
        );
    }

    return (
        <div
            aria-disabled={disabled}
            data-disabled={disabled}
            data-slot="kanban-column"
            {...props}
            className={cn(
                "flex size-full shrink-0 flex-col gap-2 rounded-lg bg-muted/80 p-3 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                {
                    "pointer-events-none opacity-50": disabled,
                },
                className
            )}
        />
    );
}

interface KanbanItemProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
}

export function KanbanItem({ disabled, className, ...props }: KanbanItemProps) {
    const inBoard = React.use(KanbanBoardContext);

    if (!inBoard) {
        throw new Error(
            `\`${ITEM_NAME}\` must be used within \`${BOARD_NAME}\``
        );
    }

    return (
        <div
            aria-disabled={disabled}
            data-disabled={disabled}
            data-slot="kanban-item"
            {...props}
            className={cn(
                "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
                {
                    "pointer-events-none opacity-50": disabled,
                },
                className
            )}
        />
    );
}

function useKanbanContext(consumerName: string) {
    const context = React.use(KanbanContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ROOT_NAME}\``
        );
    }
    return context;
}
