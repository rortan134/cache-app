"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/common/cn";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import * as React from "react";

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

    const setOpen = useStableCallback((nextOpen: boolean) => {
        onOpenChange?.(nextOpen);

        if (openProp === undefined) {
            setUncontrolledOpen(nextOpen);
        }
    });

    const toggleSidebar = useStableCallback(() => {
        setOpen(!open);
    });

    React.useEffect(() => {
        const ownerWindow = globalThis.window;

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

    const value: SidebarContextValue = {
        open,
        setOpen,
        state: open ? "expanded" : "collapsed",
        toggleSidebar,
    };

    return <SidebarContext value={value}>{children}</SidebarContext>;
}

function useSidebar() {
    const context = React.use(SidebarContext);

    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.");
    }

    return context;
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
    const state = React.use(SidebarContext)?.state ?? "expanded";

    return (
        <aside
            {...props}
            className={cn(
                "group/sidebar relative flex min-h-full w-full shrink-0 flex-col gap-8 overscroll-contain px-8 py-7 transition-[width,padding] duration-200 ease-in-out lg:w-[400px] lg:max-w-[400px] lg:justify-between lg:data-[state=collapsed]:w-16 lg:data-[state=collapsed]:px-3 lg:data-[state=collapsed]:[&_[data-sidebar-collapsible]]:hidden lg:data-[state=collapsed]:[&_[data-sidebar-label]]:sr-only lg:data-[state=collapsed]:[&_[data-sidebar=item]]:justify-center lg:data-[state=collapsed]:[&_[data-sidebar=item]]:px-0",
                className
            )}
            data-slot="sidebar"
            data-state={state}
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
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            aria-pressed={!open}
            className={cn(
                "hidden h-8 min-h-8 w-full px-2.5 lg:inline-flex lg:group-data-[state=collapsed]/sidebar:w-8 lg:group-data-[state=collapsed]/sidebar:px-0",
                className
            )}
            onClick={(event) => {
                onClick?.(event);

                if (event.defaultPrevented) {
                    return;
                }

                toggleSidebar();
            }}
            size="icon-sm"
            variant="ghost"
        >
            {open ? (
                <PanelLeft
                    aria-hidden
                    className="inline-block size-3.5 shrink-0 opacity-80"
                    focusable="false"
                />
            ) : (
                <PanelLeftOpen
                    aria-hidden
                    className="inline-block size-3.5 shrink-0 opacity-80"
                    focusable="false"
                />
            )}
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
        // biome-ignore lint/a11y/useSemanticElements: this groups navigation controls without fieldset semantics.
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
    SidebarTrigger,
    useSidebar,
};
