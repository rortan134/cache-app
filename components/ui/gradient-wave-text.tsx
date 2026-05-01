"use client";

import { cn } from "@/lib/common/cn";
import { useEffect, useRef, useState } from "react";

type Align = "left" | "center" | "right";

const defaultColors = [
    "#ff3b30",
    "#ff5e5b",
    "#ff8c42",
    "#ffd166",
    "#ff6fb5",
    "#c77dff",
];

const justifyContentByAlign: Record<
    Align,
    React.CSSProperties["justifyContent"]
> = {
    center: "center",
    left: "flex-start",
    right: "flex-end",
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
    inView?: boolean;
    once?: boolean;
    paused?: boolean;
    radial?: boolean;
    repeat?: boolean;
    speed?: number;
}

function GradientWaveText({
    children,
    align = "left",
    className,
    speed = 1.6,
    paused = false,
    delay = 0,
    repeat = false,
    inView = false,
    once = true,
    radial = true,
    bottomOffset = 20,
    bandGap = 5,
    bandCount = 8,
    customColors,
    ariaLabel,
}: GradientWaveTextProps) {
    const elRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef(0);
    const tRef = useRef(0);
    const cyclesDoneRef = useRef(0);
    const finishedRef = useRef(false);
    const startedRef = useRef(false);
    const startAtRef = useRef(0);
    const hasPlayedRef = useRef(false);

    const [isInView, setIsInView] = useState(!inView);

    const cycles = repeat ? 0 : 1;

    useEffect(() => {
        if (!inView) {
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
                        if (once && hasPlayedRef.current) {
                            return;
                        }
                        setIsInView(true);
                        hasPlayedRef.current = true;
                    } else if (!once) {
                        setIsInView(false);
                    }
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [inView, once]);

    const resolvedColors = customColors?.length ? customColors : defaultColors;

    const stops = (() => {
        const arr: string[] = [];
        const baseColor = "var(--gradient-wave-base, rgb(29,29,31))";
        arr.push(`${baseColor} calc((var(--gi) + 0) * 1%)`);
        for (let i = 0; i < bandCount && i < resolvedColors.length * 2; i++) {
            const color = resolvedColors[i % resolvedColors.length];
            const offset = (i + 2) * bandGap;
            arr.push(`${color} calc((var(--gi) + ${offset}) * 1%)`);
        }
        const endOffset = (bandCount + 2) * bandGap;
        arr.push(`${baseColor} calc((var(--gi) + ${endOffset}) * 1%)`);
        return arr.join(", ");
    })();

    const gradient = radial
        ? `radial-gradient(circle at left top, ${stops})`
        : `linear-gradient(to bottom right, ${stops})`;

    useEffect(() => {
        if (!isInView) {
            return;
        }

        const node = elRef.current;
        if (!node) {
            return;
        }

        tRef.current = -25;
        cyclesDoneRef.current = 0;
        finishedRef.current = false;
        startedRef.current = false;
        startAtRef.current =
            performance.now() + Math.max(0, (delay ?? 0) * 1000);
        node.style.setProperty("--gi", "-25");
    }, [isInView, delay]);

    useEffect(() => {
        const node = elRef.current;
        if (!(node && isInView)) {
            return;
        }

        const RANGE = 200;
        let last = performance.now();

        const tick = (now: number) => {
            if (finishedRef.current) {
                return;
            }

            if (!startedRef.current) {
                if (now >= startAtRef.current) {
                    startedRef.current = true;
                    last = now;
                } else {
                    rafRef.current = requestAnimationFrame(tick);
                    return;
                }
            }

            const dt = Math.min(64, now - last);
            last = now;

            const shouldAnimate = !paused;

            if (shouldAnimate) {
                const increment = (dt * speed) / 16.6667;
                let next = tRef.current + increment;

                if (cycles === 0) {
                    if (next >= RANGE) {
                        next %= RANGE;
                    }
                    tRef.current = next;
                    node.style.setProperty("--gi", String(next));
                } else {
                    while (next >= RANGE && cyclesDoneRef.current < cycles) {
                        next -= RANGE;
                        cyclesDoneRef.current += 1;
                    }

                    if (cyclesDoneRef.current >= cycles) {
                        tRef.current = RANGE;
                        node.style.setProperty("--gi", String(RANGE));
                        finishedRef.current = true;
                        return;
                    }
                    tRef.current = next;
                    node.style.setProperty("--gi", String(next));
                }
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [speed, paused, cycles, isInView]);

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

    return (
        <div
            aria-label={ariaLabel}
            className={cn(
                "flex size-full items-center [--gradient-wave-base:rgb(29,29,31)]",
                className
            )}
            ref={elRef}
            role="img"
            style={
                {
                    "--gi": -25,
                    justifyContent: justifyContentByAlign[align],
                } as React.CSSProperties
            }
        >
            <span style={spanStyle}>{children}</span>
        </div>
    );
}

export { GradientWaveText };
