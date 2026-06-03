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
    DrawerViewport,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/common/cn";
import { parseDisplayUrl } from "@/lib/common/url";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";

const PEEK_BLOCKED_URL = "about:blank";
const DEFAULT_PEEK_TITLE = "Preview";
const DEFAULT_PEEK_TIMEOUT_MS = 8000;

type PeekDrawerStatus = "blocked" | "loaded" | "loading";

interface PeekDrawerContextValue {
    description?: string;
    open: boolean;
    title: string;
    url: string;
}

interface PeekDrawerProps {
    children: React.ReactNode;
    description?: string;
    title?: string;
    url: string;
}

interface PeekDrawerLinkButtonProps
    extends Omit<React.ComponentProps<typeof Button>, "render"> {
    href: string;
}

const PeekDrawerContext = React.createContext<PeekDrawerContextValue | null>(
    null
);

function usePeekDrawerContext(): PeekDrawerContextValue {
    const context = React.use(PeekDrawerContext);
    if (!context) {
        throw new Error(
            "PeekDrawer components must be used inside <PeekDrawer>."
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
function usePeekStatus(open: boolean, url: string, timeoutMs: number) {
    const [status, setStatus] = React.useState<PeekDrawerStatus>("loading");
    const blockedTimeout = useTimeout();

    const markAsBlocked = useStableCallback(() => {
        setStatus((current) => {
            if (current !== "loading") {
                return current;
            }
            return "blocked";
        });
    });

    const markAsLoaded = useStableCallback(() => {
        if (url === PEEK_BLOCKED_URL) {
            return;
        }
        setStatus("loaded");
    });

    React.useEffect(() => {
        if (!open) {
            blockedTimeout.clear();
            setStatus("loading");
            return;
        }

        if (url === PEEK_BLOCKED_URL) {
            blockedTimeout.clear();
            setStatus("blocked");
            return;
        }

        setStatus("loading");
        blockedTimeout.start(timeoutMs, markAsBlocked);

        return blockedTimeout.clear;
    }, [blockedTimeout, markAsBlocked, open, timeoutMs, url]);

    return {
        markAsBlocked,
        markAsLoaded,
        status,
    };
}

/**
 * Button that renders as an external anchor so users can open the target
 * in a new tab with the correct `rel` and `target` attributes.
 */
function PeekDrawerLinkButton({ href, ...props }: PeekDrawerLinkButtonProps) {
    return (
        <Button
            // biome-ignore lint/a11y/useAnchorContent: Ignore
            render={<a href={href} rel="noopener noreferrer" target="_blank" />}
            {...props}
        />
    );
}

/**
 * Root wrapper for the peek drawer.
 *
 * Lets Base UI own the drawer state while mirroring whether the preview is
 * open so iframe status can reset at the right time.
 */
export function PeekDrawer({
    description,
    title = DEFAULT_PEEK_TITLE,
    url,
    children,
}: PeekDrawerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <PeekDrawerContext
            value={{
                description,
                open,
                title,
                url,
            }}
        >
            <Drawer onOpenChange={setOpen}>{children}</Drawer>
        </PeekDrawerContext>
    );
}

/**
 * Button that opens the peek drawer.
 *
 * Delegates directly to `DrawerTrigger`. Render inside `<PeekDrawer>`.
 */
export const PeekDrawerTrigger = DrawerTrigger;

/**
 * Popup content that renders the iframe, loading spinner, error state,
 * and footer actions.
 *
 * Remounts the iframe whenever `open` or `url` changes so previews always
 * start from a fresh state instead of showing stale cached content.
 */
export function PeekDrawerContent() {
    const { description, open, title, url } = usePeekDrawerContext();
    const { markAsBlocked, markAsLoaded, status } = usePeekStatus(
        open,
        url,
        DEFAULT_PEEK_TIMEOUT_MS
    );
    const canOpenInNewTab = url !== PEEK_BLOCKED_URL;
    const shouldRenderPreview = canOpenInNewTab && status !== "blocked";
    const iframeRemountKey = `${open ? "open" : "closed"}-${url}`;

    return (
        <DrawerViewport>
            <DrawerPopup
                className="h-[min(88vh,58rem)] w-full sm:mx-auto sm:h-[min(82vh,56rem)] sm:max-w-[min(96vw,78rem)]"
                showBar
                showCloseButton
                variant="inset"
            >
                <DrawerHeader className="border-border/70 border-b pb-4">
                    <DrawerTitle className="truncate text-lg sm:text-xl">
                        {title}
                    </DrawerTitle>
                    <DrawerDescription className="line-clamp-2 text-sm">
                        {description ?? parseDisplayUrl(url)}
                    </DrawerDescription>
                </DrawerHeader>
                <DrawerPanel
                    allowSelection={false}
                    className="p-0"
                    scrollable={false}
                >
                    <div
                        aria-busy={status === "loading"}
                        className="relative flex size-full min-h-0"
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
                                        Loading preview...
                                    </p>
                                    <p className="max-w-sm text-balance text-muted-foreground text-sm">
                                        We&apos;re trying to open the page...
                                    </p>
                                </div>
                            </div>
                        )}
                        {status === "blocked" && (
                            <div
                                aria-live="polite"
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
                                        This site can't be previewed here. It
                                        may block embedding inside other sites
                                        or be taking too long to load.
                                    </p>
                                </div>
                                {canOpenInNewTab && (
                                    <PeekDrawerLinkButton href={url} size="sm">
                                        <ExternalLinkIcon className="size-4" />
                                        Open in new tab
                                    </PeekDrawerLinkButton>
                                )}
                            </div>
                        )}
                        {shouldRenderPreview && (
                            <iframe
                                className="size-full border-0 bg-background"
                                key={iframeRemountKey}
                                onError={markAsBlocked}
                                onLoad={markAsLoaded}
                                referrerPolicy="strict-origin-when-cross-origin"
                                src={url}
                                title={`Preview of ${title}`}
                            />
                        )}
                    </div>
                </DrawerPanel>
                <DrawerFooter
                    className={cn(
                        "items-stretch gap-2 border-border/70 border-t sm:items-center",
                        canOpenInNewTab && "sm:justify-between"
                    )}
                >
                    {canOpenInNewTab && (
                        <PeekDrawerLinkButton
                            className="justify-start sm:justify-center"
                            href={url}
                            size="sm"
                            variant="link"
                        >
                            <GlobeIcon className="size-4" />
                            Open in new tab
                        </PeekDrawerLinkButton>
                    )}
                    <DrawerClose
                        render={<Button size="sm" variant="outline" />}
                    >
                        Close
                    </DrawerClose>
                </DrawerFooter>
            </DrawerPopup>
        </DrawerViewport>
    );
}
