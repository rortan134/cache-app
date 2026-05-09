"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { usePathname } from "next/navigation";

/**
 * Adds pathname-aware active state to a rendered element.
 *
 * `aria-current="page"` is emitted for the actual active route, while
 * `data-active` is provided as a styling hook that can optionally be inverted
 * with `reverse`.
 */
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

    const baseProps = {
        "aria-current": isPathnameActive ? "page" : undefined,
        "data-active": reverse ? !isPathnameActive : isPathnameActive,
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps(baseProps, props),
        render,
    });
}

export interface ActivePathnameProps extends useRender.ComponentProps<"div"> {
    /**
     * Pathname that should be considered active.
     *
     * Keep this value normalized the same way Next.js exposes pathnames through
     * `usePathname()`, including any locale or base path handling configured by
     * the app.
     */
    href: string;
    /**
     * Matching strategy for `href`.
     *
     * Use `prefix` for section-level navigation items where descendants should
     * stay active, such as `/settings` matching `/settings/profile`.
     */
    match?: "exact" | "prefix";
    /**
     * Inverts only the `data-active` flag.
     *
     * `aria-current` still follows the real pathname match so assistive
     * technology receives the semantic current-page state. This is useful for
     * styling inactive alternatives without lying to accessibility APIs.
     */
    reverse?: boolean;
}
