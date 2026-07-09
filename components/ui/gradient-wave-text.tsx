"use client";

import { cn } from "@/lib/common/cn";
import { useAnimationFrame } from "@base-ui/utils/useAnimationFrame";
import * as React from "react";

type Align = "left" | "center" | "right";

const DEFAULT_COLORS = [
    "#ff3b30",
    "#ff5e5b",
    "#ff8c42",
    "#ffd166",
    "#ff6fb5",
    "#c77dff",
];

const FRAME_DURATION_MS = 16.6667;
const GRADIENT_PROGRESS_INITIAL = -25;
const GRADIENT_PROGRESS_RANGE = 200;
const MAX_FRAME_DELTA_MS = 64;

const JUSTIFY_CONTENT_BY_ALIGN: Record<
    Align,
    React.CSSProperties["justifyContent"]
> = {
    center: "center",
    left: "flex-start",
    right: "flex-end",
};

type GradientWaveContainerStyle = React.CSSProperties & {
    "--gi": number;
};

interface GradientWaveTextProps {
    align?: Align;
    ariaLabel: string;
    bandCount?: number;
    bandGap?: number;
    bottomOffset?: number;
    children?: React.ReactNode;
    className?: string;
    customColors?: string[];
    delay?: number;
    isPaused?: boolean;
    isRadial?: boolean;
    shouldPlayOnce?: boolean;
    shouldRepeat?: boolean;
    shouldRequireInView?: boolean;
    speed?: number;
}

export function GradientWaveText({
    children,
    align = "left",
    className,
    speed = 1.6,
    isPaused = false,
    delay = 0,
    shouldRepeat = false,
    shouldRequireInView = false,
    shouldPlayOnce = true,
    isRadial = true,
    bottomOffset = 20,
    bandGap = 5,
    bandCount = 8,
    customColors,
    ariaLabel,
}: GradientWaveTextProps) {
    const elRef = React.useRef<HTMLDivElement | null>(null);
    const tRef = React.useRef(0);
    const cyclesDoneRef = React.useRef(0);
    const finishedRef = React.useRef(false);
    const startedRef = React.useRef(false);
    const startAtRef = React.useRef(0);
    const hasPlayedRef = React.useRef(false);
    const animationFrame = useAnimationFrame();

    const [isInView, setIsInView] = React.useState(!shouldRequireInView);

    React.useEffect(() => {
        if (!shouldRequireInView) {
            setIsInView(true);
            return;
        }

        const node = elRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        if (shouldPlayOnce && hasPlayedRef.current) {
                            return;
                        }
                        setIsInView(true);
                        hasPlayedRef.current = true;
                    } else if (!shouldPlayOnce) {
                        setIsInView(false);
                    }
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [shouldRequireInView, shouldPlayOnce]);

    const stops = (() => {
        const resolvedColors = customColors?.length
            ? customColors
            : DEFAULT_COLORS;
        const colorStops: string[] = [];
        const baseColor = "var(--gradient-wave-base, rgb(29,29,31))";
        colorStops.push(`${baseColor} calc((var(--gi) + 0) * 1%)`);
        for (
            let i = 0;
            i < bandCount && i < resolvedColors.length * 2;
            i += 1
        ) {
            const color = resolvedColors[i % resolvedColors.length];
            const offset = (i + 2) * bandGap;
            colorStops.push(`${color} calc((var(--gi) + ${offset}) * 1%)`);
        }
        const endOffset = (bandCount + 2) * bandGap;
        colorStops.push(`${baseColor} calc((var(--gi) + ${endOffset}) * 1%)`);
        return colorStops.join(", ");
    })();

    const gradient = isRadial
        ? `radial-gradient(circle at left top, ${stops})`
        : `linear-gradient(to bottom right, ${stops})`;

    React.useEffect(() => {
        if (!isInView) {
            return;
        }

        const node = elRef.current;
        if (!node) {
            return;
        }

        tRef.current = GRADIENT_PROGRESS_INITIAL;
        cyclesDoneRef.current = 0;
        finishedRef.current = false;
        startedRef.current = false;
        startAtRef.current = now() + Math.max(0, (delay ?? 0) * 1000);
        node.style.setProperty("--gi", String(GRADIENT_PROGRESS_INITIAL));
    }, [isInView, delay]);

    React.useEffect(() => {
        const node = elRef.current;
        if (!(node && isInView)) {
            return;
        }

        const cycles = shouldRepeat ? 0 : 1;
        let last = now();

        const tick = () => {
            const now_ = now();
            if (finishedRef.current) {
                return;
            }

            if (!startedRef.current) {
                if (now_ >= startAtRef.current) {
                    startedRef.current = true;
                    last = now_;
                } else {
                    animationFrame.request(tick);
                    return;
                }
            }

            const dt = Math.min(MAX_FRAME_DELTA_MS, now_ - last);
            last = now_;

            if (!isPaused) {
                const increment = (dt * speed) / FRAME_DURATION_MS;
                let next = tRef.current + increment;

                if (cycles === 0) {
                    if (next >= GRADIENT_PROGRESS_RANGE) {
                        next %= GRADIENT_PROGRESS_RANGE;
                    }
                    tRef.current = next;
                    node.style.setProperty("--gi", String(next));
                } else {
                    while (
                        next >= GRADIENT_PROGRESS_RANGE &&
                        cyclesDoneRef.current < cycles
                    ) {
                        next -= GRADIENT_PROGRESS_RANGE;
                        cyclesDoneRef.current += 1;
                    }

                    if (cyclesDoneRef.current >= cycles) {
                        tRef.current = GRADIENT_PROGRESS_RANGE;
                        node.style.setProperty(
                            "--gi",
                            String(GRADIENT_PROGRESS_RANGE)
                        );
                        finishedRef.current = true;
                        return;
                    }
                    tRef.current = next;
                    node.style.setProperty("--gi", String(next));
                }
            }

            animationFrame.request(tick);
        };

        animationFrame.request(tick);
        return animationFrame.cancel;
    }, [animationFrame, speed, isPaused, shouldRepeat, isInView]);

    const spanStyle: React.CSSProperties = {
        backfaceVisibility: "hidden",
        backgroundClip: "text",
        backgroundImage: gradient,
        color: "transparent",
        display: "inline-block",
        MozOsxFontSmoothing: "grayscale",
        marginBottom: `-${bottomOffset}%`,
        marginInline: -1,
        paddingBottom: `${bottomOffset}%`,
        paddingInline: 1,
        textAlign: align,
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
        WebkitBackgroundClip: "text",
        WebkitFontSmoothing: "antialiased",
        WebkitTextFillColor: "transparent",
    };

    const containerStyle: GradientWaveContainerStyle = {
        "--gi": GRADIENT_PROGRESS_INITIAL,
        justifyContent: JUSTIFY_CONTENT_BY_ALIGN[align],
    };

    return (
        <div
            aria-label={ariaLabel}
            className={cn(
                "flex size-full items-center [--gradient-wave-base:rgb(29,29,31)]",
                className
            )}
            ref={elRef}
            role="img"
            style={containerStyle}
        >
            <span style={spanStyle}>{children}</span>
        </div>
    );
}

function now(): number {
    return globalThis.performance.now();
}
