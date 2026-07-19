import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
    UserMenuPopup,
    UserMenuTrigger,
} from "@/components/auth/user-menu";
import { SidebarNavigationItem } from "@/components/sidebar/sidebar-navigation-item";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { T } from "gt-next";
import { Compass, History, Workflow } from "lucide-react";
import type * as React from "react";

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
                        icon={
                            <Compass
                                aria-hidden
                                className="inline-block size-4 shrink-0"
                                focusable="false"
                            />
                        }
                        shortcutKeys="mod+h"
                        title="Go to Library"
                    >
                        <T>Library</T>
                    </SidebarNavigationItem>
                    <SidebarNavigationItem
                        aria-label="Automations"
                        href="/automations"
                        icon={
                            <Workflow
                                aria-hidden
                                className="inline-block size-4 shrink-0"
                                focusable="false"
                            />
                        }
                        shortcutKeys="mod+z"
                        title="Go to Automations"
                    >
                        <T>Automations</T>
                    </SidebarNavigationItem>
                    <SidebarNavigationItem
                        aria-label="Recently deleted"
                        href="/recently-deleted"
                        icon={
                            <History
                                aria-hidden
                                className="inline-block size-4 shrink-0"
                                focusable="false"
                            />
                        }
                        title="Go to Recently deleted"
                    >
                        <T>Deleted</T>
                    </SidebarNavigationItem>
                </SidebarGroup>
                {children}
            </SidebarHeader>
            <SidebarRail />
        </Sidebar>
    );
}
