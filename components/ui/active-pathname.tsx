"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

const ActivePathname = ({
    href,
    match = "exact",
    reverse,
    ...props
}: React.ComponentProps<"div"> & {
    href: string;
    match?: "exact" | "prefix";
    reverse?: boolean;
}) => {
    const pathname = usePathname();
    const normalizedHref = String(href);
    const isPathnameActive =
        match === "prefix"
            ? pathname === normalizedHref ||
              pathname.startsWith(`${normalizedHref}/`)
            : pathname === normalizedHref;
    const _active = reverse ? !isPathnameActive : isPathnameActive;

    const arr = React.Children.toArray(props.children);
    const single =
        arr.length === 1 && React.isValidElement(arr[0]) ? arr[0] : null;

    if (single) {
        return React.cloneElement(single, {
            ...props,
            "aria-current": isPathnameActive ? "page" : undefined,
            "data-active": _active,
        } as Record<string, unknown>);
    }

    return (
        <span
            aria-current={isPathnameActive ? "page" : undefined}
            data-active={_active}
            {...props}
            style={
                { display: "contents", ...props.style } as React.CSSProperties
            }
        />
    );
};

export { ActivePathname };
