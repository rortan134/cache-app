"use client";

import { cn } from "@/lib/common/cn";
import { ownerWindow } from "@base-ui/utils/owner";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const DEFAULT_DURATION_SECONDS = 9;
const MAX_SPEED_PX_PER_SECOND = 48;

interface TickerTrackStyle extends React.CSSProperties {
    "--animation-distance": string;
    "--duration": string;
}

export function Ticker({
    direction = "left",
    repeatInstances = 2,
    className,
    children,
    ...props
}: TickerProps) {
    const isHorizontal = direction === "left" || direction === "right";
    const isVertical = direction === "up" || direction === "down";
    const repeatCount = Math.max(1, Math.ceil(repeatInstances));
    const [trackSizePx, setTrackSizePx] = React.useState(0);
    const trackRef = React.useRef<HTMLSpanElement | null>(null);

    const measureTrackSize = useStableCallback(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        const trackRect = track.getBoundingClientRect();
        const nextTrackSizePx = isHorizontal
            ? trackRect.width
            : trackRect.height;

        setTrackSizePx((currentTrackSizePx) =>
            currentTrackSizePx === nextTrackSizePx
                ? currentTrackSizePx
                : nextTrackSizePx
        );
    });

    useIsoLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        measureTrackSize();

        const targetWindow = ownerWindow(track);
        if (!targetWindow.ResizeObserver) {
            return;
        }

        const observer = new targetWindow.ResizeObserver(() => {
            measureTrackSize();
        });
        observer.observe(track);

        return () => observer.disconnect();
    }, [isHorizontal, measureTrackSize]);

    const animationDistance = `${-100 / repeatCount}%`;
    const travelDistancePx = trackSizePx / repeatCount;
    const durationSeconds = getTickerDurationSeconds(travelDistancePx);
    const trackStyle: TickerTrackStyle = {
        "--animation-distance": animationDistance,
        "--duration": `${durationSeconds}s`,
    };

    return (
        <span
            className={cn(
                "group relative inline-flex size-full select-none overflow-clip p-px [--gap:1rem]",
                {
                    "flex-col": isVertical,
                    "flex-row": isHorizontal,
                    "overflow-fade-x pl-1.5": isHorizontal,
                    "overflow-fade-y": isVertical,
                },
                className
            )}
            {...props}
        >
            <span
                className={cn("group-hover:running paused flex shrink-0", {
                    "animate-marquee flex-row gap-(--gap)": isHorizontal,
                    "animate-marquee-vertical flex-col gap-(--gap)": isVertical,
                    "direction-[reverse]":
                        direction === "up" || direction === "right",
                })}
                ref={trackRef}
                style={trackStyle}
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

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "up" | "down" | "left" | "right";
    repeatInstances?: number;
}

function getTickerDurationSeconds(travelDistancePx: number) {
    if (travelDistancePx <= 0 || !Number.isFinite(travelDistancePx)) {
        return DEFAULT_DURATION_SECONDS;
    }

    const cappedDurationSeconds = travelDistancePx / MAX_SPEED_PX_PER_SECOND;

    return Math.max(
        DEFAULT_DURATION_SECONDS,
        Math.ceil(cappedDurationSeconds * 100) / 100
    );
}
