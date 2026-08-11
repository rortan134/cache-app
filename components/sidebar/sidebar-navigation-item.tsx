"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ActivePathname } from "@/components/ui/active-pathname";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import { SidebarItem, SidebarItemValue } from "@/components/ui/sidebar";

interface SidebarNavigationItemProps extends React.ComponentProps<typeof Link> {
    "aria-label": string;
    href: string;
    icon: React.ReactNode;
    shortcutKeys?: string;
}

export function SidebarNavigationItem({
    "aria-label": ariaLabel,
    href,
    icon,
    shortcutKeys,
    children,
    ...props
}: SidebarNavigationItemProps) {
    const router = useRouter();

    const handleShortcut = useStableCallback(() => {
        router.push(href);
    });

    useHotkeys(shortcutKeys ?? "", handleShortcut, {
        description: `Navigate to ${ariaLabel}`,
        enabled: !!shortcutKeys,
        preventDefault: true,
    });

    return (
        <li>
            <ActivePathname
                href={href}
                render={
                    <SidebarItem
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
                        <SidebarItemValue>{children}</SidebarItemValue>
                        {shortcutKeys ? (
                            <Kbd
                                className="ml-auto bg-transparent opacity-0 transition-none! group-hover:opacity-50"
                                data-sidebar-label=""
                            >
                                <CmdKbd />
                                {shortcutKeys.split("+").pop()}
                            </Kbd>
                        ) : null}
                    </SidebarItem>
                }
            />
        </li>
    );
}
