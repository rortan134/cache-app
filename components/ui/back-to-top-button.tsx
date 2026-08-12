"use client";

import type { BaseUIEvent } from "@base-ui/react";
import { useAnimationFrame } from "@base-ui/utils/useAnimationFrame";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useReducedMotion } from "motion/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { getOwnerWindow } from "@/lib/common/dom";

const SCROLL_THRESHOLD = 800;

export function BackToTopButton({
    className,
    onClick,
    ...props
}: React.ComponentProps<typeof Button>) {
    const prefersReducedMotion = useReducedMotion();
    const animationFrame = useAnimationFrame();
    const [isVisible, setIsVisible] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = useStableCallback(() => {
        animationFrame.request(() => {
            const ownerWindow = getOwnerWindow(containerRef.current);
            setIsVisible(ownerWindow.scrollY > SCROLL_THRESHOLD);
        });
    });

    const scrollToTop = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) => {
            onClick?.(event);
            getOwnerWindow(containerRef.current).scrollTo({
                behavior: prefersReducedMotion ? "auto" : "smooth",
                top: 0,
            });
        }
    );

    React.useEffect(() => {
        const ownerWindow = getOwnerWindow(containerRef.current);
        handleScroll();
        ownerWindow.addEventListener("scroll", handleScroll, { passive: true });
        return () => ownerWindow.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    return (
        <div
            className={cn(
                "fixed right-8 bottom-8 z-40 transition-opacity duration-300",
                !isVisible && "pointer-events-none opacity-0",
                className
            )}
            data-slot="back-to-top-button"
            inert={!isVisible}
            ref={containerRef}
        >
            <Button
                {...props}
                aria-label="Back to top"
                onClick={scrollToTop}
                size="sm"
            />
        </div>
    );
}
