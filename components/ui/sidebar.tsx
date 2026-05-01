import { cn } from "@/lib/common/cn";
import type * as React from "react";

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
    return (
        <aside
            {...props}
            className={cn(
                "relative flex min-h-full w-full shrink-0 flex-col gap-8 px-8 py-7 lg:max-w-[400px] lg:justify-between",
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
                "no-scrollbar -mx-1 flex max-h-full min-h-0 w-full flex-col gap-6 overflow-auto overscroll-contain p-1 sm:max-h-[calc(100vh-(var(--spacing)*8))] lg:sticky lg:top-8",
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

function SidebarItem({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "flex h-8 max-h-8 min-h-8 flex-1 cursor-default select-none items-center gap-1.5 truncate rounded-lg px-2.5 text-left font-medium text-[13px] text-foreground leading-normal opacity-70 hover:bg-muted hover:opacity-100 focus-visible:opacity-100 active:bg-muted/80",
                className
            )}
            data-sidebar="item"
            data-slot="sidebar-item"
        />
    );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        // biome-ignore lint/a11y/useSemanticElements: Ignore
        <div
            {...props}
            className={cn(
                "relative flex w-full min-w-0 flex-col gap-px",
                className
            )}
            data-sidebar="group"
            data-slot="sidebar-group"
            role="group"
        />
    );
}

export { Sidebar, SidebarFooter, SidebarGroup, SidebarHeader, SidebarItem };
