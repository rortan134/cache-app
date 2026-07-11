"use client";

import {
    StackedBarChart,
    type StackedBarChartSegment,
} from "@/components/ui/stacked-bar-chart";
import { cn } from "@/lib/common/cn";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type * as React from "react";

export function MetricsPanel({
    className,
    render,
    ...props
}: useRender.ComponentProps<"div">) {
    const defaultProps = {
        className: cn("flex w-full min-w-56 flex-col gap-3", className),
        "data-slot": "metrics-panel",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export function MetricsPanelHeader({
    className,
    render,
    ...props
}: useRender.ComponentProps<"div">) {
    const defaultProps = {
        className: cn("flex flex-col gap-0.5", className),
        "data-slot": "metrics-panel-header",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export function MetricsPanelTitle({
    className,
    render,
    ...props
}: useRender.ComponentProps<"div">) {
    const defaultProps = {
        className: cn("font-regular text-muted-foreground text-xs", className),
        "data-slot": "metrics-panel-title",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export function MetricsPanelChart({
    className,
    segments,
    ...props
}: MetricsPanelChartProps) {
    return (
        <StackedBarChart
            {...props}
            className={className}
            data-slot="metrics-panel-chart"
            segments={segments}
        />
    );
}

export function MetricsDataList({
    className,
    render,
    ...props
}: useRender.ComponentProps<"dl">) {
    const defaultProps = {
        className: cn("mt-1 flex flex-col gap-1.5", className),
        "data-slot": "metrics-data-list",
    };

    return useRender({
        defaultTagName: "dl",
        props: mergeProps<"dl">(defaultProps, props),
        render,
    });
}

export function MetricsDataListItem({
    className,
    color,
    label,
    value,
    render,
    ...props
}: MetricsDataListItemProps) {
    const defaultProps = {
        children: (
            <>
                <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    {color ? (
                        <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                    ) : null}
                    <span className="truncate">{label}</span>
                </dt>
                <dd className="text-foreground tabular-nums">{value}</dd>
            </>
        ),
        className: cn(
            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs",
            className
        ),
        "data-slot": "metrics-data-list-item",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export interface MetricsPanelChartProps
    extends Omit<React.ComponentProps<typeof StackedBarChart>, "segments"> {
    segments: readonly StackedBarChartSegment[];
}

export interface MetricsDataListItemProps
    extends useRender.ComponentProps<"div"> {
    color?: string;
    label: React.ReactNode;
    value: React.ReactNode;
}
