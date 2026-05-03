"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

function ActivePathname({
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
    const href_ = String(href);
    const isPathnameActive =
        match === "prefix"
            ? pathname === href_ || pathname.startsWith(`${href_}/`)
            : pathname === href_;

    return React.cloneElement(React.Children.only(children), {
        ...props,
        "aria-current": isPathnameActive ? "page" : undefined,
        "data-active": reverse ? !isPathnameActive : isPathnameActive,
    } as Record<string, unknown>);
}

export { ActivePathname };
