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
    href: string;
    icon: React.ReactNode;
    shortcutKeys?: string;
}

export function SidebarNavigationItem({
    href,
    icon,
    onMouseDown: onMouseDownProp,
    shortcutKeys,
    children,
    ...props
}: SidebarNavigationItemProps) {
    const router = useRouter();

    const handleMouseDown = useStableCallback(
        (event: React.MouseEvent<HTMLAnchorElement>) => {
            onMouseDownProp?.(event);

            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey
            ) {
                return;
            }

            router.push(href);
        }
    );

    const handleShortcut = useStableCallback(() => {
        router.push(href);
    });

    useHotkeys(shortcutKeys ?? "", handleShortcut, {
        description: `Navigate to ${props["aria-label"]}`,
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
                                onMouseDown={handleMouseDown}
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
