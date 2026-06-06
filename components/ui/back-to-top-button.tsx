"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const SCROLL_THRESHOLD = 500;

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
                "fixed top-12 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
                isVisible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0",
                className
            )}
            ref={containerRef}
        >
            <Button
                {...props}
                aria-label="Back to top"
                onClick={scrollToTop}
                size="sm"
                variant="secondary"
            />
        </div>
    );
}
