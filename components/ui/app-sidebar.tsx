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

interface AppSidebarNavigationItemProps {
    children: React.ReactNode;
    href: string;
    icon: LucideIcon;
}

export function AppSidebar() {
    return (
        <SidebarGroup>
            <AppSidebarNavigationItem href="/library" icon={House}>
                <T>Library</T>
            </AppSidebarNavigationItem>
            <AppSidebarNavigationItem href="/review" icon={Compass}>
                <T>Review</T>
            </AppSidebarNavigationItem>
            <AppSidebarNavigationItem href="/workflows" icon={Workflow}>
                <T>Workflows</T>
            </AppSidebarNavigationItem>
            <AppSidebarNavigationItem href="/activity" icon={History}>
                <T>Activity</T>
            </AppSidebarNavigationItem>
        </SidebarGroup>
    );
}

function AppSidebarNavigationItem({
    children,
    href,
    icon: Icon,
}: AppSidebarNavigationItemProps) {
    return (
        <Link className="contents" href={href} prefetch>
            <ActivePathname
                href={href}
                render={
                    <SidebarItem>
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
