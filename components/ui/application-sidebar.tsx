import { ActivePathname } from "@/components/ui/active-pathname";
import { SidebarGroup, SidebarItem } from "@/components/ui/sidebar";
import { T } from "gt-next";
import {
    Compass,
    History,
    House,
    type LucideIcon,
    Workflow,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";

export function ApplicationSidebar() {
    return (
        <SidebarGroup>
            <SidebarNavigationItem
                aria-label="Library"
                href="/library"
                icon={House}
            >
                <T>Library</T>
            </SidebarNavigationItem>
            <SidebarNavigationItem
                aria-label="Review"
                href="/review"
                icon={Compass}
            >
                <T>Review</T>
            </SidebarNavigationItem>
            <SidebarNavigationItem
                aria-label="Workflows"
                href="/workflows"
                icon={Workflow}
            >
                <T>Workflows</T>
            </SidebarNavigationItem>
            <SidebarNavigationItem
                aria-label="Activity"
                href="/activity"
                icon={History}
            >
                <T>Activity</T>
            </SidebarNavigationItem>
        </SidebarGroup>
    );
}

interface SidebarNavigationItemProps extends React.ComponentProps<typeof Link> {
    children: React.ReactNode;
    href: string;
    icon: LucideIcon;
}

function SidebarNavigationItem({
    children,
    href,
    icon: Icon,
}: SidebarNavigationItemProps) {
    return (
        <Link className="contents" href={href} prefetch tabIndex={0}>
            <ActivePathname
                href={href}
                render={
                    <SidebarItem render={<li />}>
                        <Icon
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">{children}</span>
                    </SidebarItem>
                }
            />
        </Link>
    );
}
