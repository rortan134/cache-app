"use client";

import { cn } from "@/lib/common/cn";
import "@blossom-carousel/core/style.css";
// @ts-expect-error Types not being found for some reason
import { BlossomCarousel } from "@blossom-carousel/react";
import * as React from "react";

interface CarouselProps
    extends Omit<React.ComponentProps<typeof BlossomCarousel>, "children"> {
    children: React.ReactNode;
    slideClassName?: string;
    spaceBetween?: number | string;
}

export function Carousel({
    children,
    className,
    slideClassName,
    spaceBetween,
    ...props
}: CarouselProps) {
    const slides = React.Children.toArray(children);

    return (
        <BlossomCarousel
            aria-roledescription="carousel"
            className={cn(
                "relative size-full snap-x snap-mandatory",
                className
            )}
            role="region"
            {...props}
        >
            {slides.map((child, index) => {
                const isLastSlide = index === slides.length - 1;

                return (
                    <div
                        className={cn(
                            "inline-block shrink-0 snap-start",
                            slideClassName
                        )}
                        key={index}
                        style={getSlideStyle(spaceBetween, isLastSlide)}
                    >
                        {child}
                    </div>
                );
            })}
        </BlossomCarousel>
    );
}

function getSlideStyle(
    spaceBetween: number | string | undefined,
    isLastSlide: boolean
): React.CSSProperties | undefined {
    if (spaceBetween === undefined || isLastSlide) {
        return;
    }

    return {
        marginInlineEnd:
            typeof spaceBetween === "number"
                ? `${spaceBetween}px`
                : spaceBetween,
    };
}
