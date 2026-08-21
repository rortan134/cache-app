"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { normalizePathname } from "@/lib/common/url";

interface ActivePathnameProps extends useRender.ComponentProps<"div"> {
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
    shouldReverseActive?: boolean;
}

/**
 * Adds pathname-aware active state to a rendered element.
 *
 * `aria-current="page"` is emitted for the actual active route, while
 * `data-active` is provided as a styling hook that can optionally be inverted
 * with `shouldReverseActive`. The attribute is emitted as `"true"` when active
 * and omitted otherwise, so both existence (`data-[active]:`) and value
 * (`data-[active=true]:`) selectors work.
 */
export function ActivePathname({
    href,
    match = "exact",
    shouldReverseActive,
    render,
    ...props
}: ActivePathnameProps) {
    const pathname = usePathname();

    const isActive = isPathnameActive(pathname, href, match);
    const isDataActive = shouldReverseActive ? !isActive : isActive;

    const defaultProps: React.AriaAttributes & { "data-active"?: "true" } = {
        "aria-current": isActive ? "page" : undefined,
        "data-active": isDataActive ? "true" : undefined,
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

function isPathnameActive(
    pathname: string,
    href: string,
    match: "exact" | "prefix" = "exact"
): boolean {
    const normalizedPathname = normalizePathname(pathname);
    const normalizedHref = normalizePathname(href);

    if (match === "prefix") {
        if (normalizedHref === "/") {
            return normalizedPathname === "/";
        }
        return (
            normalizedPathname === normalizedHref ||
            normalizedPathname.startsWith(`${normalizedHref}/`)
        );
    }

    return normalizedPathname === normalizedHref;
}
