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
    Menu,
    MenuLinkItem,
    MenuPopup,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { T } from "gt-next";
import { Compass, Ellipsis, History, LayoutGrid, Workflow } from "lucide-react";
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
                    <li>
                        <Menu>
                            <MenuTrigger openOnHover render={<SidebarItem />}>
                                <Ellipsis
                                    aria-hidden
                                    className="inline-block size-4 shrink-0"
                                    focusable="false"
                                />
                                <div
                                    className="flex min-w-0 grow items-center"
                                    data-sidebar-label=""
                                >
                                    <span className="truncate">
                                        <T context="sidebar.more-menu">More</T>
                                    </span>
                                </div>
                            </MenuTrigger>
                            <MenuPopup side="right">
                                <MenuLinkItem href="/collections">
                                    <LayoutGrid
                                        aria-hidden
                                        className="inline-block size-4 shrink-0"
                                        focusable="false"
                                    />
                                    <span className="truncate">
                                        <T>All collections</T>
                                    </span>
                                </MenuLinkItem>
                                <MenuLinkItem href="/recently-deleted">
                                    <History
                                        aria-hidden
                                        className="inline-block size-4 shrink-0"
                                        focusable="false"
                                    />
                                    <span className="truncate">
                                        <T>Recently deleted</T>
                                    </span>
                                </MenuLinkItem>
                            </MenuPopup>
                        </Menu>
                    </li>
                </SidebarGroup>
                {children}
            </SidebarHeader>
            <SidebarRail />
        </Sidebar>
    );
}
