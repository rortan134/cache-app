import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
    UserMenuPopup,
    UserMenuTrigger,
} from "@/components/auth/user-menu";
import { ActivePathname } from "@/components/ui/active-pathname";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
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

export function ApplicationSidebar({ children }: React.PropsWithChildren) {
    return (
        <Sidebar>
            <SidebarHeader className="gap-3">
                <div className="flex items-center justify-between">
                    <UserMenu>
                        <SidebarItem
                            className="px-2 opacity-100 data-popup-open:before:opacity-100"
                            data-sidebar-collapsible=""
                            render={<UserMenuTrigger />}
                        />
                        <UserMenuPopup>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenuPopup>
                    </UserMenu>
                    <SidebarTrigger />
                </div>
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
                {children}
            </SidebarHeader>
            <SidebarRail />
        </Sidebar>
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
