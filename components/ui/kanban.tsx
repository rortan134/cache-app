"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";

const ROOT_NAME = "Kanban";
const BOARD_NAME = "KanbanBoard";
const COLUMN_NAME = "KanbanColumn";
const ITEM_NAME = "KanbanItem";

interface KanbanProps {
    children: React.ReactNode;
    orientation?: "horizontal" | "vertical";
}

interface KanbanContextValue {
    orientation: "horizontal" | "vertical";
}

const KanbanContext = React.createContext<KanbanContextValue | null>(null);

const KanbanBoardContext = React.createContext<boolean>(false);

function Kanban(props: KanbanProps) {
    const { children, orientation = "horizontal" } = props;
    const contextValue: KanbanContextValue = {
        orientation,
    };

    return <KanbanContext value={contextValue}>{children}</KanbanContext>;
}

interface KanbanBoardProps extends React.ComponentProps<"div"> {
    children: React.ReactNode;
}

function KanbanBoard(props: KanbanBoardProps) {
    const { className, ref, ...boardProps } = props;

    const context = useKanbanContext(BOARD_NAME);

    return (
        <KanbanBoardContext value={true}>
            <div
                data-orientation={context.orientation}
                data-slot="kanban-board"
                {...boardProps}
                className={cn(
                    "flex size-full gap-4",
                    context.orientation === "horizontal"
                        ? "flex-row"
                        : "flex-col",
                    className
                )}
                ref={ref}
            />
        </KanbanBoardContext>
    );
}

interface KanbanColumnProps extends React.ComponentProps<"div"> {
    children: React.ReactNode;
    disabled?: boolean;
}

function KanbanColumn(props: KanbanColumnProps) {
    const { disabled, className, ref, ...columnProps } = props;
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
            {...columnProps}
            className={cn(
                "flex size-full shrink-0 flex-col gap-2 rounded-lg bg-muted/80 p-3 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                {
                    "pointer-events-none opacity-50": disabled,
                },
                className
            )}
            ref={ref}
        />
    );
}

interface KanbanItemProps extends React.ComponentProps<"div"> {
    disabled?: boolean;
}

function KanbanItem(props: KanbanItemProps) {
    const { disabled, className, ref, ...itemProps } = props;
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
            {...itemProps}
            className={cn(
                "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
                {
                    "pointer-events-none opacity-50": disabled,
                },
                className
            )}
            ref={ref}
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

export { Kanban, KanbanBoard, KanbanColumn, KanbanItem, type KanbanProps };
