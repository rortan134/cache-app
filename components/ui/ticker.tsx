"use client";

import { useAnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import * as React from "react";
import { cn } from "@/lib/common/cn";

const DEFAULT_DURATION_SECONDS = 5;
const MAX_SPEED_PX_PER_SECOND = 92;

const REPEAT_KEYS = ["primary", "clone"];
const REPEAT_COUNT = REPEAT_KEYS.length;

function getDurationInSeconds(travelDistancePx: number) {
    if (travelDistancePx <= 0 || !Number.isFinite(travelDistancePx)) {
        return DEFAULT_DURATION_SECONDS;
    }
    const durationSeconds = travelDistancePx / MAX_SPEED_PX_PER_SECOND;
    // Round up to a centisecond so the marquee never exceeds the speed cap
    return Math.max(
        DEFAULT_DURATION_SECONDS,
        Math.ceil(durationSeconds * 100) / 100
    );
}

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "left" | "right";
}

export function Ticker({
    direction = "left",
    className,
    children,
    ref,
    ...props
}: TickerProps) {
    const animationFrame = useAnimationFrame();
    const [contentWidthPx, setContentWidthPx] = React.useState(0);

    const trackRef = React.useRef<HTMLSpanElement | null>(null);
    const mergedRef = useMergedRefs(ref, trackRef);

    useIsoLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        const content = track.firstElementChild?.firstElementChild;
        if (!content) {
            return;
        }

        let _trackWidthPx = 0;
        let _contentWidthPx = 0;

        const resizeObserver = new ResizeObserver((entries) =>
            animationFrame.request(() => {
                for (const entry of entries) {
                    const sizePx =
                        entry.contentBoxSize?.[0]?.inlineSize ??
                        entry.borderBoxSize?.[0]?.inlineSize ??
                        entry.contentRect.width ??
                        0;

                    if (entry.target === track) {
                        _trackWidthPx = sizePx;
                    } else {
                        _contentWidthPx = sizePx; // only two targets observed
                    }
                }

                setContentWidthPx(
                    _contentWidthPx > _trackWidthPx ? _contentWidthPx : 0
                );
            })
        );

        resizeObserver.observe(track);
        resizeObserver.observe(content);

        return () => {
            resizeObserver.disconnect();
            animationFrame.cancel();
        };
    }, []);

    const trackStyle = {
        // Translate by exactly one copy width so the loop restarts seamlessly.
        "--animation-distance": `${-100 / REPEAT_COUNT}%`,
        "--duration": `${getDurationInSeconds(contentWidthPx)}s`,
    } as React.CSSProperties;
    const isOverflowing = contentWidthPx > 0;
    const repeatCount = isOverflowing ? REPEAT_COUNT : 1;

    return (
        <span
            {...props}
            className={cn(
                "group inline-flex w-full min-w-0 overflow-clip",
                className
            )}
            ref={mergedRef}
        >
            <span
                className={cn(
                    "flex shrink-0 select-none",
                    isOverflowing &&
                        "paused group-hover:running hover:running group-hover:animate-marquee group-hover:delay-200",
                    direction === "right" && "direction-reverse"
                )}
                style={trackStyle}
            >
                {REPEAT_KEYS.slice(0, repeatCount).map((repeatKey, index) => (
                    <span
                        aria-hidden={index > 0 || undefined}
                        className="shrink-0 p-px pr-4"
                        key={repeatKey}
                    >
                        {children}
                    </span>
                ))}
            </span>
        </span>
    );
}
