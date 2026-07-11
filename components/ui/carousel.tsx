"use client";

import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { cn } from "@/lib/common/cn";
import {
    BlossomCarousel,
    BlossomNext,
    BlossomPrev,
} from "@blossom-carousel/react";
import "@blossom-carousel/react/style.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

interface CarouselContextValue {
    id: string;
}

interface CarouselPanelProps
    extends React.ComponentProps<typeof BlossomCarousel> {
    slideClassName?: string;
}

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
    return <CarouselContext value={{ id }}>{children}</CarouselContext>;
}

export function CarouselPanel({
    children,
    className,
    slideClassName,
    ...props
}: CarouselPanelProps) {
    const { id } = useCarouselContext();
    const slideCount = React.Children.count(children);

    return (
        <BlossomCarousel
            {...props}
            aria-roledescription="carousel"
            as="section"
            className={cn(
                "no-scrollbar relative w-full shrink-0 snap-x snap-mandatory scroll-smooth",
                className
            )}
            id={id}
            role="region"
        >
            {React.Children.map(children, (child, index) => (
                // biome-ignore lint/a11y/useSemanticElements: Group role
                <section
                    aria-label={`${index + 1} of ${slideCount}`}
                    aria-roledescription="slide"
                    className={cn(
                        "inline-block shrink-0 snap-start",
                        slideClassName
                    )}
                    data-blossom-slide
                    role="group"
                >
                    {child}
                </section>
            ))}
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
