"use client";

import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
    UserMenuPopup,
    UserMenuTrigger,
} from "@/components/auth/user-menu";
import {
    SubscriptionUpgradeButton,
    UnsubscribedOnly,
} from "@/components/billing/subscription";
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
                    <UnsubscribedOnly>
                        <SubscriptionUpgradeButton
                            className="rounded-full"
                            data-sidebar-collapsible=""
                            size="xs"
                            variant="outline"
                        >
                            <T>Upgrade</T>
                        </SubscriptionUpgradeButton>
                    </UnsubscribedOnly>
                    <SidebarTrigger />
                </div>
                <SidebarGroup>
                    <SidebarNavigationItem
                        aria-label="Library"
                        href="/library"
                        icon={Compass}
                        shortcutKeys="mod+h"
                    >
                        <T>Library</T>
                    </SidebarNavigationItem>
                    <SidebarNavigationItem
                        aria-label="Automations"
                        href="/automations"
                        icon={Workflow}
                        shortcutKeys="mod+z"
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

    useHotkeys(
        shortcutKeys,
        () => {
            router.push(href);
        },
        {
            description: `Navigate to ${props["aria-label"]}`,
            preventDefault: true,
        }
    );

    return (
        <Link className="contents" href={href} prefetch tabIndex={0} {...props}>
            <ActivePathname
                href={href}
                render={
                    <SidebarItem className="group" render={<li />}>
                        <Icon
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">{children}</span>
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
    );
}
