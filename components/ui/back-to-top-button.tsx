"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const SCROLL_THRESHOLD = 800;

export function BackToTopButton({
    className,
    ...props
}: React.ComponentProps<typeof Button>) {
    const [isVisible, setIsVisible] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = useStableCallback(() => {
        const ownerDoc = getOwnerDocument(containerRef.current);
        setIsVisible(
            ownerDoc.body.scrollTop > SCROLL_THRESHOLD ||
                ownerDoc.documentElement.scrollTop > SCROLL_THRESHOLD
        );
    });

    React.useEffect(() => {
        const ownerWindow = getOwnerWindow(containerRef.current);
        // Initial render
        handleScroll();
        ownerWindow.addEventListener("scroll", handleScroll, { passive: true });
        return () => ownerWindow.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const scrollToTop = useStableCallback(() => {
        getOwnerWindow(containerRef.current).scrollTo({
            behavior: "smooth",
            top: 0,
        });
    });

    return (
        <div
            className={cn(
                "fixed right-8 bottom-8 z-40 transition-opacity duration-300",
                { "pointer-events-none opacity-0": !isVisible },
                className
            )}
            data-slot="back-to-top-button"
            ref={containerRef}
        >
            <Button
                {...props}
                aria-hidden={isVisible ? undefined : true}
                aria-label="Back to top"
                onClick={scrollToTop}
                size="sm"
                tabIndex={isVisible ? undefined : -1}
            />
        </div>
    );
}
