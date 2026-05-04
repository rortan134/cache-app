"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

export function ActivePathname({
    href,
    match = "exact",
    reverse,
    children,
    ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
    href: string;
    match?: "exact" | "prefix";
    reverse?: boolean;
    children: React.ReactElement;
}) {
    const pathname = usePathname();
    const isPathnameActive =
        match === "prefix"
            ? pathname === String(href) ||
              pathname.startsWith(`${String(href)}/`)
            : pathname === String(href);

    return React.cloneElement(React.Children.only(children), {
        ...props,
        "aria-current": isPathnameActive ? "page" : undefined,
        "data-active": reverse ? !isPathnameActive : isPathnameActive,
    } as Record<string, unknown>);
}
