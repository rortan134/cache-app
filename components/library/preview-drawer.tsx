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
import { cn } from "@/lib/common/cn";
import { parseDisplayUrl } from "@/lib/common/url";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import * as React from "react";

type PreviewDrawerPosition = NonNullable<
    React.ComponentProps<typeof DrawerPopup>["position"]
>;
type PreviewDrawerStatus = "blocked" | "loaded" | "loading";
type PreviewDrawerOpenChange = React.ComponentProps<
    typeof Drawer
>["onOpenChange"];

interface PreviewDrawerContextValue {
    description?: string;
    open: boolean;
    title: string;
    url: string;
}

interface PreviewDrawerProps
    extends Omit<React.ComponentProps<typeof Drawer>, "children" | "modal"> {
    children: ReactNode;
    description?: string;
    title?: string;
    url: string;
}

interface PreviewDrawerContentProps
    extends Omit<
        React.ComponentProps<typeof DrawerPopup>,
        "children" | "showBar" | "showCloseButton" | "variant"
    > {
    bodyClassName?: string;
    errorDescription?: string;
    footerClassName?: string;
    loadingLabel?: string;
    panelClassName?: string;
    timeoutMs?: number;
}

interface PreviewDrawerLinkButtonProps
    extends Omit<React.ComponentProps<typeof Button>, "render"> {
    url: string;
}

const PREVIEW_BLOCKED_URL = "about:blank";
const DEFAULT_PREVIEW_TITLE = "Preview";
const DEFAULT_PREVIEW_LOADING_LABEL = "Loading preview...";
const DEFAULT_PREVIEW_TIMEOUT_MS = 8000;
const DEFAULT_PREVIEW_ERROR_DESCRIPTION =
    "This site can't be previewed here. It may block embedding inside other sites or be taking too long to load.";

const PREVIEW_POPUP_POSITION_CLASSES: Record<PreviewDrawerPosition, string> = {
    bottom: "w-full sm:mx-auto sm:max-w-[min(96vw,78rem)]",
    left: "w-[min(96vw,68rem)] max-w-none sm:w-[min(92vw,72rem)]",
    right: "w-[min(96vw,68rem)] max-w-none sm:w-[min(92vw,72rem)]",
    top: "w-full sm:mx-auto sm:max-w-[min(96vw,78rem)]",
};

const EXTERNAL_LINK_ATTRIBUTES = {
    rel: "noopener noreferrer",
    target: "_blank",
} as const;

const PreviewDrawerContext =
    React.createContext<PreviewDrawerContextValue | null>(null);

function usePreviewDrawerContext(): PreviewDrawerContextValue {
    const context = React.use(PreviewDrawerContext);
    if (!context) {
        throw new Error(
            "PreviewDrawer components must be used inside <PreviewDrawer>."
        );
    }
    return context;
}

/**
 * Track whether the iframe preview has loaded, is still loading, or is
 * blocked (X-Frame-Options / CSP / timeout).
 *
 * Enforces a timeout so users aren't left waiting indefinitely for sites
 * that refuse to embed.
 */
function usePreviewStatus(open: boolean, url: string, timeoutMs: number) {
    const [status, setStatus] = React.useState<PreviewDrawerStatus>("loading");

    React.useEffect(() => {
        if (!open) {
            setStatus("loading");
            return;
        }

        if (url === PREVIEW_BLOCKED_URL) {
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

    return {
        markAsBlocked: () => {
            setStatus("blocked");
        },
        markAsLoaded: () => {
            setStatus("loaded");
        },
        status,
    };
}

/**
 * Button that renders as an external anchor so users can open the target
 * in a new tab with the correct `rel` and `target` attributes.
 */
function PreviewDrawerLinkButton({
    url,
    ...props
}: PreviewDrawerLinkButtonProps): ReactElement {
    return (
        <Button
            render={<a href={url} {...EXTERNAL_LINK_ATTRIBUTES} />}
            {...props}
        />
    );
}

/**
 * Root controller for the preview drawer.
 *
 * Supports both controlled and uncontrolled open state. Provides the
 * preview context (title, URL, description) to child components.
 */
export function PreviewDrawer({
    defaultOpen = false,
    description,
    onOpenChange,
    open,
    title = DEFAULT_PREVIEW_TITLE,
    url,
    ...props
}: PreviewDrawerProps): ReactElement {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = open !== undefined;
    const isOpen = open ?? uncontrolledOpen;

    const handleOpenChange: PreviewDrawerOpenChange = (
        nextOpen,
        eventDetails
    ) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen, eventDetails);
    };

    return (
        <PreviewDrawerContext
            value={{
                description,
                open: isOpen,
                title,
                url,
            }}
        >
            <Drawer onOpenChange={handleOpenChange} open={isOpen} {...props} />
        </PreviewDrawerContext>
    );
}

/**
 * Button that opens the preview drawer.
 *
 * Delegates directly to `DrawerTrigger`. Render inside `<PreviewDrawer>`.
 */
export const PreviewDrawerTrigger = DrawerTrigger;

/**
 * Popup content that renders the iframe, loading spinner, error state,
 * and footer actions.
 *
 * Remounts the iframe whenever `open` or `url` changes so previews always
 * start from a fresh state instead of showing stale cached content.
 */
export function PreviewDrawerContent({
    bodyClassName,
    className,
    errorDescription = DEFAULT_PREVIEW_ERROR_DESCRIPTION,
    footerClassName,
    loadingLabel = DEFAULT_PREVIEW_LOADING_LABEL,
    panelClassName,
    position = "bottom",
    timeoutMs = DEFAULT_PREVIEW_TIMEOUT_MS,
    ...popupProps
}: PreviewDrawerContentProps): ReactElement {
    const { description, open, title, url } = usePreviewDrawerContext();
    const iframeKey = React.useId();
    const { markAsBlocked, markAsLoaded, status } = usePreviewStatus(
        open,
        url,
        timeoutMs
    );
    const canOpenInNewTab = url !== PREVIEW_BLOCKED_URL;

    return (
        <DrawerPopup
            className={cn(
                "h-[min(88vh,58rem)] sm:h-[min(82vh,56rem)]",
                PREVIEW_POPUP_POSITION_CLASSES[position],
                className
            )}
            position={position}
            showBar={position === "bottom" || position === "top"}
            showCloseButton
            variant="inset"
            {...popupProps}
        >
            <DrawerHeader className="gap-1 border-border/70 border-b pb-4">
                <DrawerTitle className="truncate text-lg sm:text-xl">
                    {title}
                </DrawerTitle>
                <DrawerDescription className="line-clamp-2 text-sm">
                    {description ?? parseDisplayUrl(url)}
                </DrawerDescription>
            </DrawerHeader>
            <DrawerPanel
                allowSelection={false}
                className={cn("min-h-0 flex-1 p-0", panelClassName)}
                scrollable={false}
            >
                <div
                    aria-busy={status === "loading"}
                    className={cn(
                        "relative flex size-full min-h-0",
                        bodyClassName
                    )}
                >
                    {status === "loading" && (
                        <div
                            aria-live="polite"
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/92 text-center backdrop-blur-xs"
                            role="status"
                        >
                            <Spinner className="size-5 text-muted-foreground" />
                            <div className="space-y-1">
                                <p className="font-medium text-foreground text-sm">
                                    {loadingLabel}
                                </p>
                                <p className="max-w-sm text-balance text-muted-foreground text-sm">
                                    We&apos;re trying to open the page...
                                </p>
                            </div>
                        </div>
                    )}
                    {status === "blocked" && (
                        <div
                            className="flex size-full flex-col items-center justify-center gap-4 bg-muted/20 px-6 text-center"
                            role="alert"
                        >
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
                            {canOpenInNewTab && (
                                <PreviewDrawerLinkButton size="sm" url={url}>
                                    <ExternalLinkIcon className="size-4" />
                                    Open in new tab
                                </PreviewDrawerLinkButton>
                            )}
                        </div>
                    )}
                    {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: iframe load and error events are required to track preview readiness. */}
                    <iframe
                        className={cn(
                            "size-full border-0 bg-background",
                            status === "blocked" && "hidden"
                        )}
                        // Remount the iframe whenever the drawer opens or the
                        // target URL changes so the preview always starts fresh.
                        key={`${iframeKey}-${open ? "open" : "closed"}-${url}`}
                        onError={markAsBlocked}
                        onLoad={markAsLoaded}
                        referrerPolicy="strict-origin-when-cross-origin"
                        src={url}
                        title={`Preview of ${title}`}
                    />
                </div>
            </DrawerPanel>
            <DrawerFooter
                className={cn(
                    "items-stretch gap-2 border-border/70 border-t sm:items-center",
                    canOpenInNewTab && "sm:justify-between",
                    footerClassName
                )}
            >
                {canOpenInNewTab && (
                    <PreviewDrawerLinkButton
                        className="justify-start sm:justify-center"
                        size="sm"
                        url={url}
                        variant="link"
                    >
                        <GlobeIcon className="size-4" />
                        Open in new tab
                    </PreviewDrawerLinkButton>
                )}
                <DrawerClose render={<Button size="sm" variant="outline" />}>
                    Close
                </DrawerClose>
            </DrawerFooter>
        </DrawerPopup>
    );
}
