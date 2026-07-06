"use client";

import { ActivePathname } from "@/components/ui/active-pathname";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import { SidebarItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SidebarNavigationItemProps extends React.ComponentProps<typeof Link> {
    href: string;
    icon: React.ReactNode;
    shortcutKeys: string;
}

export function SidebarNavigationItem({
    children,
    href,
    shortcutKeys,
    icon,
    ...props
}: SidebarNavigationItemProps) {
    const router = useRouter();

    useHotkeys(shortcutKeys, () => router.push(href), {
        description: `Navigate to ${props["aria-label"]}`,
        preventDefault: true,
    });

    return (
        <li className="list-none">
            <ActivePathname
                href={href}
                render={
                    <SidebarItem
                        className="group"
                        render={
                            <Link
                                {...props}
                                href={href}
                                prefetch
                                tabIndex={0}
                            />
                        }
                    >
                        {icon}
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
                            {shortcutKeys.split("+").pop()}
                        </Kbd>
                    </SidebarItem>
                }
            />
        </li>
    );
}
