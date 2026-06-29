"use client";

import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
    UserMenuPopup,
    UserMenuTrigger,
} from "@/components/auth/user-menu";
import { ActivePathname } from "@/components/ui/active-pathname";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { Compass, type LucideIcon, Workflow } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function ApplicationSidebar({ children }: React.PropsWithChildren) {
    return (
        <Sidebar>
            <SidebarHeader className="gap-3 pb-4">
                <div className="flex items-center justify-between gap-1">
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
                        icon={Compass}
                        shortcutKeys="mod+h"
                        title="Go to Library"
                    >
                        <T>Library</T>
                    </SidebarNavigationItem>
                    <SidebarNavigationItem
                        aria-label="Automations"
                        href="/automations"
                        icon={Workflow}
                        shortcutKeys="mod+z"
                        title="Go to Automations"
                    >
                        <T>Automations</T>
                    </SidebarNavigationItem>
                </SidebarGroup>
                {children}
            </SidebarHeader>
            <SidebarRail />
        </Sidebar>
    );
}

interface SidebarNavigationItemProps extends React.ComponentProps<typeof Link> {
    href: string;
    icon: LucideIcon;
    shortcutKeys: string;
}

function SidebarNavigationItem({
    children,
    href,
    shortcutKeys,
    icon: Icon,
    ...props
}: SidebarNavigationItemProps) {
    const router = useRouter();

    const handleNavigate = useStableCallback(() => {
        router.push(href);
    });

    useHotkeys(shortcutKeys, handleNavigate, {
        description: `Navigate to ${props["aria-label"]}`,
        preventDefault: true,
    });

    return (
        <li className="list-none">
            <Link
                {...props}
                className="w-full max-w-full"
                href={href}
                prefetch
                tabIndex={0}
            >
                <ActivePathname
                    href={href}
                    render={
                        <SidebarItem className="group">
                            <Icon
                                aria-hidden
                                className="inline-block size-4 shrink-0"
                                focusable="false"
                            />
                            <div
                                className="flex min-w-0 grow items-center"
                                data-sidebar-label=""
                            >
                                <span className="truncate">{children}</span>
                            </div>
                            <Kbd
                                className="ml-auto bg-transparent opacity-0 group-hover:opacity-50"
                                data-sidebar-label=""
                            >
                                <CmdKbd />
                                {shortcutKeys.split("+")[1]}
                            </Kbd>
                        </SidebarItem>
                    }
                />
            </Link>
        </li>
    );
}
