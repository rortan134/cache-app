import { ActivePathname } from "@/components/ui/active-pathname";
import { SidebarGroup, SidebarItem } from "@/components/ui/sidebar";
import { T } from "gt-next";
import { Compass, History, House, Workflow } from "lucide-react";
import Link from "next/link";

export function AppSidebarNavigation() {
    return (
        <SidebarGroup>
            <Link className="contents" href="/library" prefetch>
                <ActivePathname href="/library">
                    <SidebarItem>
                        <House
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">
                            <T>Library</T>
                        </span>
                    </SidebarItem>
                </ActivePathname>
            </Link>
            <Link className="contents" href="/review" prefetch>
                <ActivePathname href="/review">
                    <SidebarItem>
                        <Compass
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">
                            <T>Review</T>
                        </span>
                    </SidebarItem>
                </ActivePathname>
            </Link>
            <Link className="contents" href="/workflows" prefetch>
                <ActivePathname href="/workflows">
                    <SidebarItem>
                        <Workflow
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">
                            <T>Workflows</T>
                        </span>
                    </SidebarItem>
                </ActivePathname>
            </Link>
            <Link className="contents" href="/activity" prefetch>
                <ActivePathname href="/activity">
                    <SidebarItem>
                        <History
                            aria-hidden
                            className="inline-block size-4 shrink-0"
                            focusable="false"
                        />
                        <span data-sidebar-label="">
                            <T>Activity</T>
                        </span>
                    </SidebarItem>
                </ActivePathname>
            </Link>
        </SidebarGroup>
    );
}
