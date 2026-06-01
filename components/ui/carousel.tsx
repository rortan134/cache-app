"use client";

import { cn } from "@/lib/common/cn";
import "@blossom-carousel/core/style.css";
// @ts-expect-error @blossom-carousel/react does not ship type definitions
import { BlossomCarousel } from "@blossom-carousel/react";
import * as React from "react";

interface CarouselProps extends React.ComponentProps<"div"> {
    children: React.ReactNode[];
    slideClassName?: string;
}

export function Carousel({
    children,
    className,
    slideClassName,
    ...props
}: CarouselProps) {
    const slides = React.Children.toArray(children);

    return (
        <BlossomCarousel
            aria-roledescription="carousel"
            as="section"
            className={cn(
                "no-scrollbar relative w-full shrink-0 snap-x snap-mandatory scroll-smooth",
                className
            )}
            role="region"
            {...props}
        >
            {slides.map((child, index) => (
                // biome-ignore lint/a11y/useSemanticElements: Group role
                <div
                    aria-roledescription="slide"
                    className={cn(
                        "inline-block shrink-0 snap-start",
                        slideClassName
                    )}
                    key={index}
                    role="group"
                >
                    {child}
                </div>
            ))}
        </BlossomCarousel>
    );
}
