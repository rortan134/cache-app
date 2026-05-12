"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { ArrowUpIcon } from "lucide-react";
import * as React from "react";

const SCROLL_THRESHOLD = 300;

export function BackToTopButton({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const [isVisible, setIsVisible] = React.useState(false);

    const handleScroll = useStableCallback(() => {
        setIsVisible(
            document.body.scrollTop > SCROLL_THRESHOLD ||
                document.documentElement.scrollTop > SCROLL_THRESHOLD
        );
    });

    React.useEffect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const scrollToTop = useStableCallback(() => {
        window.scrollTo({ behavior: "smooth", top: 0 });
    });

    return (
        <div
            {...props}
            className={cn(
                "fixed top-3 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
                isVisible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0",
                className
            )}
        >
            <Button
                aria-label="Back to top"
                className="backdrop-blur-xs"
                onClick={scrollToTop}
                size="xs"
                variant="secondary"
            >
                Back to top
                <ArrowUpIcon className="size-3.5 opacity-50" />
            </Button>
        </div>
    );
}
