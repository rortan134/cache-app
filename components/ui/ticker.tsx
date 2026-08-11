"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { cn } from "@/lib/common/cn";

const DEFAULT_DURATION_SECONDS = 5;
const MAX_SPEED_PX_PER_SECOND = 92;
const MARQUEE_REPEAT_KEYS = ["primary", "clone"] as const;
const MARQUEE_REPEAT_COUNT = MARQUEE_REPEAT_KEYS.length;

interface TickerTrackStyle extends React.CSSProperties {
    "--animation-distance": string;
    "--duration": string;
}

function getTickerDurationSeconds(travelDistancePx: number) {
    if (travelDistancePx <= 0 || !Number.isFinite(travelDistancePx)) {
        return DEFAULT_DURATION_SECONDS;
    }
    const cappedDurationSeconds = travelDistancePx / MAX_SPEED_PX_PER_SECOND;
    // Round up to a centisecond so the marquee never exceeds the speed cap
    return Math.max(
        DEFAULT_DURATION_SECONDS,
        Math.ceil(cappedDurationSeconds * 100) / 100
    );
}

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "left" | "right";
}

export function Ticker({
    direction = "left",
    className,
    children,
    ...props
}: TickerProps) {
    const [contentWidthPx, setContentWidthPx] = React.useState(0);

    const setTrackRef = useStableCallback((track: HTMLSpanElement | null) => {
        if (!track) {
            return;
        }
        const content = track.firstElementChild?.firstElementChild;
        if (!(content instanceof HTMLElement)) {
            return;
        }
        const contentWidth = content.offsetWidth;
        const trackWidth = track.offsetWidth;
        setContentWidthPx(contentWidth > trackWidth ? contentWidth : 0);
    });

    const isOverflowing = contentWidthPx > 0;

    const trackStyle: TickerTrackStyle = {
        // Translate by exactly one copy width so the loop restarts seamlessly.
        "--animation-distance": `${-100 / MARQUEE_REPEAT_COUNT}%`,
        "--duration": `${getTickerDurationSeconds(contentWidthPx)}s`,
    };

    const repeatCount = isOverflowing ? MARQUEE_REPEAT_COUNT : 1;

    return (
        <span
            {...props}
            className={cn(
                "group inline-flex w-full min-w-0 overflow-clip",
                className
            )}
            ref={setTrackRef}
        >
            <span
                className={cn(
                    "flex shrink-0 select-none",
                    isOverflowing &&
                        "paused group-hover:running hover:running group-hover:animate-marquee",
                    direction === "right" && "direction-reverse"
                )}
                style={trackStyle}
            >
                {MARQUEE_REPEAT_KEYS.slice(0, repeatCount).map(
                    (repeatKey, index) => (
                        <span
                            aria-hidden={index > 0 || undefined}
                            className="shrink-0 p-px pr-4"
                            key={repeatKey}
                        >
                            {children}
                        </span>
                    )
                )}
            </span>
        </span>
    );
}
