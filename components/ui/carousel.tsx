"use client";

import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    BlossomCarousel,
    BlossomNext,
    BlossomPrev,
} from "@blossom-carousel/react";
import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { cn } from "@/lib/common/cn";
import "@blossom-carousel/react/style.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

interface CarouselContextValue {
    id: string;
}

type CarouselHandle = React.ComponentRef<typeof BlossomCarousel> | null;

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarouselContext() {
    const context = React.use(CarouselContext);
    if (!context) {
        throw new Error(
            "Carousel sub-components must be used within a Carousel provider"
        );
    }
    return context;
}

export function Carousel({ children }: React.PropsWithChildren) {
    const id = React.useId();
    const contextValue = { id };

    return <CarouselContext value={contextValue}>{children}</CarouselContext>;
}

interface CarouselPanelProps
    extends React.ComponentProps<typeof BlossomCarousel> {
    shouldScrollFade?: boolean;
    slideClassName?: string;
}

export function CarouselPanel({
    children,
    className,
    shouldScrollFade = false,
    slideClassName,
    ...props
}: CarouselPanelProps) {
    const { id } = useCarouselContext();

    const handleRef = React.useRef<CarouselHandle>(null);

    const slides = React.Children.toArray(children);

    useCarouselScrollOverflow({
        handleRef,
        isEnabled: shouldScrollFade,
        resetKey: slides.length,
    });

    return (
        <BlossomCarousel
            {...props}
            aria-roledescription="carousel"
            as="section"
            className={cn(
                "no-scrollbar relative w-full shrink-0 snap-x snap-mandatory scroll-smooth",
                shouldScrollFade &&
                    "mask-l-from-[calc(100%-min(var(--fade-size),var(--carousel-overflow-x-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--carousel-overflow-x-end)))] scroll-px-[calc(var(--fade-size)/2)] [--fade-size:0.5rem]",
                className
            )}
            id={id}
            ref={handleRef}
            role="region"
        >
            {slides.map((child, index) => {
                const childKey = React.isValidElement(child)
                    ? child.key
                    : undefined;
                return (
                    // biome-ignore lint/a11y/useSemanticElements: Group role
                    <section
                        aria-label={`${index + 1} of ${slides.length}`}
                        aria-roledescription="slide"
                        className={cn(
                            "inline-block shrink-0 snap-start",
                            slideClassName
                        )}
                        data-blossom-slide
                        key={childKey ?? index}
                        role="group"
                    >
                        {child}
                    </section>
                );
            })}
        </BlossomCarousel>
    );
}

export function CarouselControls() {
    const { id } = useCarouselContext();

    return (
        <Group>
            <Button
                className="rounded-full"
                render={
                    <BlossomPrev
                        aria-label="Previous"
                        disabled={undefined}
                        for={id}
                    >
                        <ChevronLeft
                            aria-hidden
                            className="size-5"
                            focusable="false"
                        />
                    </BlossomPrev>
                }
                size="icon"
                variant="secondary"
            />
            <Button
                className="rounded-full"
                render={
                    <BlossomNext
                        aria-label="Next"
                        disabled={undefined}
                        for={id}
                    >
                        <ChevronRight
                            aria-hidden
                            className="size-5"
                            focusable="false"
                        />
                    </BlossomNext>
                }
                size="icon"
                variant="secondary"
            />
        </Group>
    );
}

function useCarouselScrollOverflow({
    resetKey,
    isEnabled,
    handleRef,
}: {
    resetKey: unknown;
    isEnabled: boolean;
    handleRef: React.RefObject<CarouselHandle>;
}) {
    const updateOverflow = useStableCallback(() => {
        const scrollableEl = handleRef.current?.element;
        if (!scrollableEl?.isConnected) {
            return;
        }
        const maxScrollLeft = Math.max(
            0,
            scrollableEl.scrollWidth - scrollableEl.clientWidth
        );
        const scrollLeft = Math.max(
            0,
            Math.min(scrollableEl.scrollLeft, maxScrollLeft)
        );
        scrollableEl.style.setProperty(
            "--carousel-overflow-x-start",
            `${scrollLeft}px`
        );
        scrollableEl.style.setProperty(
            "--carousel-overflow-x-end",
            `${maxScrollLeft - scrollLeft}px`
        );
    });

    useIsoLayoutEffect(() => {
        if (!isEnabled) {
            return;
        }

        const scrollableElement = handleRef.current?.element;
        if (!scrollableElement) {
            return;
        }

        updateOverflow();

        const observer =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(updateOverflow);
        observer?.observe(scrollableElement);

        scrollableElement.addEventListener("scroll", updateOverflow, {
            passive: true,
        });

        return () => {
            observer?.disconnect();
            scrollableElement.removeEventListener("scroll", updateOverflow);
            scrollableElement.style.removeProperty(
                "--carousel-overflow-x-start"
            );
            scrollableElement.style.removeProperty("--carousel-overflow-x-end");
        };
    }, [isEnabled, resetKey]);
}
