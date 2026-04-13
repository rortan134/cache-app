import { cn } from "@/lib/utils";
import type * as React from "react";

const Ticker = ({
    direction = "left",
    repeatInstances = 2,
    className,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    direction?: "up" | "down" | "left" | "right";
    repeatInstances?: number;
}) => {
    const isHorizontal = direction === "left" || direction === "right";
    const isVertical = direction === "up" || direction === "down";

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
                        "--animation-distance": `${-100 / repeatInstances}%`,
                    } as React.CSSProperties
                }
            >
                {[...(new Array(repeatInstances) as never[])].map((_, i) => (
                    <span
                        className={cn("flex shrink-0 gap-(--gap)", {
                            "flex-col": isVertical,
                            "flex-row": isHorizontal,
                        })}
                        key={i}
                    >
                        {children}
                    </span>
                ))}
            </span>
        </span>
    );
};

export { Ticker };
