"use client";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useEffect, useId, useState } from "react";

type PreviewDrawerPosition = "bottom" | "left" | "right" | "top";
type PreviewDrawerStatus = "blocked" | "loaded" | "loading";
const WWW_PREFIX_RE = /^www\./;

interface PreviewDrawerContextValue {
    description?: string;
    open: boolean;
    title: string;
    url: string;
}

const PreviewDrawerContext = createContext<PreviewDrawerContextValue | null>(
    null
);

function usePreviewDrawerContext(): PreviewDrawerContextValue {
    const value = useContext(PreviewDrawerContext);

    if (!value) {
        throw new Error(
            "PreviewDrawer components must be used inside <PreviewDrawer>."
        );
    }

    return value;
}

function externalLinkProps(url: string) {
    return {
        href: url,
        rel: "noopener noreferrer",
        target: "_blank",
    } as const;
}

export function PreviewDrawer({
    children,
    defaultOpen = false,
    description,
    onOpenChange,
    open,
    title = "Preview",
    url,
}: {
    children: ReactNode;
    defaultOpen?: boolean;
    description?: string;
    onOpenChange?: React.ComponentProps<typeof Drawer>["onOpenChange"];
    open?: React.ComponentProps<typeof Drawer>["open"];
    title?: string;
    url: string;
}): ReactElement {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : uncontrolledOpen;

    const handleOpenChange: React.ComponentProps<
        typeof Drawer
    >["onOpenChange"] = (nextOpen, eventDetails) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen, eventDetails);
    };

    return (
        <PreviewDrawerContext.Provider
            value={{
                description,
                open: resolvedOpen ?? false,
                title,
                url,
            }}
        >
            <Drawer modal onOpenChange={handleOpenChange} open={resolvedOpen}>
                {children}
            </Drawer>
        </PreviewDrawerContext.Provider>
    );
}

export function PreviewDrawerTrigger(
    props: React.ComponentProps<typeof DrawerTrigger>
): ReactElement {
    return <DrawerTrigger {...props} />;
}

export function PreviewDrawerContent({
    className,
    errorDescription = "This site can't be previewed here. It may block embedding inside other sites or be taking too long to load.",
    footerClassName,
    heightClassName,
    loadingLabel = "Loading preview...",
    popupClassName,
    position = "bottom",
    timeoutMs = 8000,
}: {
    className?: string;
    errorDescription?: string;
    footerClassName?: string;
    heightClassName?: string;
    loadingLabel?: string;
    popupClassName?: string;
    position?: PreviewDrawerPosition;
    timeoutMs?: number;
}): ReactElement {
    const { description, open, title, url } = usePreviewDrawerContext();
    const iframeKey = useId();
    const [status, setStatus] = useState<PreviewDrawerStatus>("loading");

    useEffect(() => {
        if (!open) {
            setStatus("loading");
            return;
        }

        if (url === "about:blank") {
            setStatus("blocked");
            return;
        }

        setStatus("loading");

        const timeoutId = window.setTimeout(() => {
            setStatus((currentStatus) =>
                currentStatus === "loading" ? "blocked" : currentStatus
            );
        }, timeoutMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [open, timeoutMs, url]);

    return (
        <DrawerPopup
            className={cn(
                "h-[min(88vh,58rem)] sm:h-[min(82vh,56rem)]",
                position === "bottom" &&
                    "w-full sm:mx-auto sm:max-w-[min(96vw,78rem)]",
                position === "right" &&
                    "w-[min(96vw,68rem)] max-w-none sm:w-[min(92vw,72rem)]",
                popupClassName
            )}
            position={position}
            showBar={position === "bottom"}
            showCloseButton
            variant="inset"
        >
            <DrawerHeader className="gap-1 border-border/70 border-b pb-4">
                <DrawerTitle className="truncate text-lg sm:text-xl">
                    {title}
                </DrawerTitle>
                <DrawerDescription className="line-clamp-2 text-sm">
                    {description ??
                        new URL(url).hostname.replace(WWW_PREFIX_RE, "")}
                </DrawerDescription>
            </DrawerHeader>
            <DrawerPanel
                allowSelection={false}
                className={cn("min-h-0 flex-1 p-0", heightClassName)}
                scrollable={false}
            >
                <div
                    className={cn("relative flex size-full min-h-0", className)}
                >
                    {status === "loading" ? (
                        <div
                            aria-live="polite"
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/92 text-center backdrop-blur-xs"
                        >
                            <Spinner className="size-5 text-muted-foreground" />
                            <div className="space-y-1">
                                <p className="font-medium text-foreground text-sm">
                                    {loadingLabel}
                                </p>
                                <p className="max-w-sm text-balance text-muted-foreground text-sm">
                                    We&apos;re trying to open the page inside
                                    the drawer.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    {status === "blocked" ? (
                        <div className="flex size-full flex-col items-center justify-center gap-4 bg-muted/20 px-6 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertCircleIcon className="size-5" />
                            </div>
                            <div className="space-y-2">
                                <p className="font-medium text-base text-foreground">
                                    Preview unavailable
                                </p>
                                <p className="max-w-md text-balance text-muted-foreground text-sm">
                                    {errorDescription}
                                </p>
                            </div>
                            <Button
                                render={<a {...externalLinkProps(url)} />}
                                size="sm"
                            >
                                <ExternalLinkIcon className="size-4" />
                                Open in new tab
                            </Button>
                        </div>
                    ) : null}

                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: iframe load and error events are required to track preview readiness. */}
                    <iframe
                        className={cn(
                            "size-full border-0 bg-background",
                            status === "blocked" && "hidden"
                        )}
                        key={`${iframeKey}-${open ? "open" : "closed"}-${url}`}
                        onError={() => {
                            setStatus("blocked");
                        }}
                        onLoad={() => {
                            setStatus("loaded");
                        }}
                        referrerPolicy="strict-origin-when-cross-origin"
                        src={url}
                        title={`Preview of ${title}`}
                    />
                </div>
            </DrawerPanel>
            <DrawerFooter
                className={cn(
                    "items-stretch gap-2 border-border/70 border-t sm:items-center sm:justify-between",
                    footerClassName
                )}
            >
                <Button
                    className="justify-start sm:justify-center"
                    render={<a {...externalLinkProps(url)} />}
                    size="sm"
                    variant="link"
                >
                    <GlobeIcon className="size-4" />
                    Open in new tab
                </Button>
                <DrawerClose render={<Button size="sm" variant="outline" />}>
                    Close
                </DrawerClose>
            </DrawerFooter>
        </DrawerPopup>
    );
}
