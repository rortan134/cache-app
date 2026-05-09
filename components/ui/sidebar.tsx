"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { PanelLeft, PanelLeftOpen } from "lucide-react";
import * as React from "react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    state: SidebarState;
    toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function SidebarProvider({
    defaultOpen = true,
    open: openProp,
    onOpenChange,
    children,
}: {
    children: React.ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const open = openProp ?? uncontrolledOpen;

    const setOpen = useStableCallback(
        (value: boolean | ((value: boolean) => boolean)) => {
            const nextOpen = typeof value === "function" ? value(open) : value;
            onOpenChange?.(nextOpen);

            if (openProp === undefined) {
                setUncontrolledOpen(nextOpen);
            }

            // This sets the cookie to keep the sidebar state.
            getOwnerDocument().cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        }
    );

    const toggleSidebar = useStableCallback(() => {
        setOpen((prev) => !prev);
    });

    React.useEffect(() => {
        const ownerWindow = getOwnerWindow();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.defaultPrevented ||
                event.isComposing ||
                !ownerWindow.matchMedia(SIDEBAR_DESKTOP_MEDIA_QUERY).matches ||
                !isSidebarKeyboardShortcut(event) ||
                isTextEntryTarget(event.target, ownerWindow)
            ) {
                return;
            }

            event.preventDefault();
            toggleSidebar();
        };

        ownerWindow.addEventListener("keydown", handleKeyDown);
        return () => {
            ownerWindow.removeEventListener("keydown", handleKeyDown);
        };
    }, [toggleSidebar]);

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed";

    return (
        <SidebarContext
            value={{
                open,
                setOpen,
                state,
                toggleSidebar,
            }}
        >
            {children}
        </SidebarContext>
    );
}

function useSidebar() {
    const context = React.use(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.");
    }
    return context;
}

function Sidebar({
    className,
    side = "left",
    ...props
}: React.ComponentProps<"aside"> & { side?: "left" | "right" }) {
    const state = useSidebar()?.state ?? "expanded";

    return (
        <aside
            {...props}
            className={cn(
                "peer group/sidebar relative inset-y-0 flex min-h-full w-full shrink-0 flex-col gap-8 overscroll-contain px-8 py-7 transition-[left,right,width,padding] duration-200 ease-in-out data-[side=right]:right-0 data-[side=left]:left-0 lg:w-[400px] lg:max-w-[400px] lg:justify-between lg:data-[state=collapsed]:w-16 lg:data-[state=collapsed]:px-3 lg:data-[state=collapsed]:[&_[data-sidebar-collapsible]]:hidden lg:data-[state=collapsed]:[&_[data-sidebar-label]]:sr-only lg:data-[state=collapsed]:[&_[data-sidebar=item]]:justify-center lg:data-[state=collapsed]:[&_[data-sidebar=item]]:px-0",
                className
            )}
            data-collapsible="icon"
            data-side={side}
            data-slot="sidebar"
            data-state={state}
        />
    );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
    const { toggleSidebar, open } = useSidebar();

    return (
        <button
            className={cn(
                "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-s-1/2 after:inset-y-0 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
                "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
                "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                "group-data-[collapsible=offcanvas]:translate-x-0 hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full",
                "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
                className
            )}
            data-sidebar="rail"
            data-slot="sidebar-rail"
            onClick={toggleSidebar}
            tabIndex={-1}
            title={open ? "Close sidebar" : "Open sidebar"}
            {...props}
        />
    );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "no-scrollbar -mx-1 flex max-h-full min-h-0 w-full flex-col gap-6 overflow-auto p-1 sm:max-h-[calc(100vh-(var(--spacing)*8))] lg:sticky lg:top-8",
                className
            )}
            data-sidebar="header"
            data-slot="sidebar-header"
        />
    );
}

function SidebarTrigger({
    className,
    onClick,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { open, toggleSidebar } = useSidebar();

    return (
        <Button
            {...props}
            className={cn(
                "hidden h-8 min-h-8 min-w-8 lg:inline-flex",
                open ? "cursor-w-resize" : "cursor-e-resize",
                className
            )}
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            onClick={(event) => {
                onClick?.(event);
                if (event.defaultPrevented) {
                    return;
                }
                toggleSidebar();
            }}
            size="icon-sm"
            title={open ? "Close sidebar" : "Open sidebar"}
            variant="ghost"
        >
            {open ? (
                <PanelLeft
                    aria-hidden
                    className="inline-block size-4 shrink-0 opacity-80"
                    focusable="false"
                />
            ) : (
                <PanelLeftOpen
                    aria-hidden
                    className="inline-block size-4 shrink-0 opacity-80"
                    focusable="false"
                />
            )}
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "flex w-full flex-col gap-6 lg:sticky lg:bottom-8",
                className
            )}
            data-sidebar="footer"
            data-slot="sidebar-footer"
        />
    );
}

export type SidebarItemProps = useRender.ComponentProps<"div">;

function SidebarItem({ className, render, ...props }: SidebarItemProps) {
    const defaultProps = {
        className: cn(
            "group relative flex h-8 max-h-8 min-h-8 flex-1 cursor-default select-none items-center gap-1.5 truncate rounded-lg px-2.5 text-left font-medium text-[13px] text-foreground leading-normal opacity-70 before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-muted before:opacity-0 before:transition-transform before:will-change-transform hover:opacity-100 hover:before:opacity-100 focus-visible:opacity-100 active:before:scale-x-[0.99] active:before:scale-y-[0.97] active:before:opacity-80! data-[active=true]:before:opacity-100",
            className
        ),
        "data-sidebar": "item",
        "data-slot": "sidebar-item",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        // biome-ignore lint/a11y/useSemanticElements: groups navigation controls without fieldset semantics.
        <div
            {...props}
            className={cn(
                "relative flex w-full min-w-0 flex-col gap-px",
                className
            )}
            data-sidebar="group"
            data-slot="sidebar-group"
            role="group"
        />
    );
}

function isSidebarKeyboardShortcut(event: KeyboardEvent): boolean {
    return (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        !event.altKey &&
        (event.metaKey || event.ctrlKey)
    );
}

function isTextEntryTarget(
    target: EventTarget | null,
    ownerWindow: Window & typeof globalThis
): boolean {
    return (
        target instanceof ownerWindow.HTMLElement &&
        (target.isContentEditable ||
            Boolean(
                target.closest('input, textarea, select, [role="textbox"]')
            ))
    );
}

export {
    Sidebar,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
};
