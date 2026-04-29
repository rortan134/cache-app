import { cn } from "@/lib/common/cn";
import type * as React from "react";

interface TickerProps extends React.ComponentProps<"div"> {
    direction?: "up" | "down" | "left" | "right";
    repeatInstances?: number;
}

function Ticker({
    direction = "left",
    repeatInstances = 2,
    className,
    children,
    ...props
}: TickerProps) {
    const isHorizontal = direction === "left" || direction === "right";
    const isVertical = direction === "up" || direction === "down";
    const repeatCount = Math.max(1, Math.ceil(repeatInstances));
    const animationDistance = `${-100 / repeatCount}%`;

    return (
        <span
            {...props}
            className={cn(
                "group relative inline-flex size-full select-none overflow-hidden [--duration:9s] [--gap:1rem]",
                {
                    "flex-col": isVertical,
                    "flex-row": isHorizontal,
                    "overflow-fade-x pl-1": isHorizontal,
                    "overflow-fade-y": isVertical,
                },
                className
            )}
        >
            <span
                className={cn("group-hover:running paused flex shrink-0", {
                    "animate-marquee flex-row gap-(--gap)": isHorizontal,
                    "animate-marquee-vertical flex-col gap-(--gap)": isVertical,
                    "direction-[reverse]":
                        direction === "up" || direction === "right",
                })}
                style={
                    {
                        "--animation-distance": animationDistance,
                    } as React.CSSProperties
                }
            >
                {Array.from({ length: repeatCount }, (_, index) => (
                    <span
                        className={cn("flex shrink-0 gap-(--gap)", {
                            "flex-col": isVertical,
                            "flex-row": isHorizontal,
                        })}
                        key={index}
                    >
                        {children}
                    </span>
                ))}
            </span>
        </span>
    );
}

export { Ticker };
