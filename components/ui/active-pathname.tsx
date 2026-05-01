"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

const ActivePathname = ({
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
}) => {
    const pathname = usePathname();
    const normalizedHref = String(href);
    const isPathnameActive =
        match === "prefix"
            ? pathname === normalizedHref ||
              pathname.startsWith(`${normalizedHref}/`)
            : pathname === normalizedHref;
    const _active = reverse ? !isPathnameActive : isPathnameActive;

    const child = React.Children.only(children);

    return React.cloneElement(child, {
        ...props,
        "aria-current": isPathnameActive ? "page" : undefined,
        "data-active": _active,
    } as Record<string, unknown>);
};

export { ActivePathname };
