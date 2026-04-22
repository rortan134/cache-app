import { cn } from "@/lib/common/cn";
import type * as React from "react";

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
    return (
        <aside
            {...props}
            className={cn(
                "relative flex min-h-full w-full shrink-0 flex-col gap-8 p-8 lg:max-w-[400px] lg:justify-between",
                className
            )}
            data-slot="sidebar"
        />
    );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "no-scrollbar flex max-h-full min-h-0 w-full flex-col gap-6 overflow-auto px-0.5 sm:max-h-[calc(100vh-7.5rem)] lg:sticky lg:top-8",
                className
            )}
            data-sidebar="header"
            data-slot="sidebar-header"
        />
    );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "flex w-full flex-col gap-6 lg:sticky lg:bottom-8",
                className
            )}
            data-sidebar="footer"
            data-slot="sidebar-footer"
        />
    );
}

export { Sidebar, SidebarFooter, SidebarHeader };
