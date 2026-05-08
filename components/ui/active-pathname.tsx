"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { usePathname } from "next/navigation";

export interface ActivePathnameProps extends useRender.ComponentProps<"div"> {
    href: string;
    match?: "exact" | "prefix";
    reverse?: boolean;
}

export function ActivePathname({
    href,
    match = "exact",
    reverse,
    render,
    ...props
}: ActivePathnameProps) {
    const pathname = usePathname();
    const isPathnameActive =
        match === "prefix"
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === href;

    const extraProps = {
        "aria-current": isPathnameActive ? "page" : undefined,
        "data-active": reverse ? !isPathnameActive : isPathnameActive,
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps(extraProps, props) as typeof props,
        render,
    });
}
