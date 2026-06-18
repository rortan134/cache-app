"use client";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerDescription,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerTrigger,
    DrawerViewport,
    DrawerVirtualKeyboardProvider,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
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
    isOpen: boolean;
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
function usePeekStatus(isOpen: boolean, url: string, timeoutMs: number) {
    const [status, setStatus] = React.useState<PeekDrawerStatus>("loading");
    const blockedTimeout = useTimeout();

    const markAsBlocked = useStableCallback(() => {
        setStatus((current) => (current === "loading" ? "blocked" : current));
    });

    const markAsLoaded = useStableCallback(() => {
        setStatus("loaded");
    });

    React.useEffect(() => {
        if (!isOpen) {
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
    }, [blockedTimeout, isOpen, markAsBlocked, timeoutMs, url]);

    return {
        markAsBlocked,
        markAsLoaded,
        status,
    };
}

function PeekDrawerLinkButton({ href, ...props }: PeekDrawerLinkButtonProps) {
    return (
        <Button
            {...props}
            // biome-ignore lint/a11y/useAnchorContent: Ignore
            render={<a href={href} rel="noopener noreferrer" target="_blank" />}
        />
    );
}

export function PeekDrawer({
    description,
    title = DEFAULT_PEEK_TITLE,
    url,
    children,
}: PeekDrawerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <PeekDrawerContext value={{ description, isOpen, title, url }}>
            <Drawer onOpenChange={setIsOpen}>
                <DrawerVirtualKeyboardProvider>
                    {children}
                </DrawerVirtualKeyboardProvider>
            </Drawer>
        </PeekDrawerContext>
    );
}

export const PeekDrawerTrigger = DrawerTrigger;

export function PeekDrawerContent() {
    const { description, isOpen, title, url } = usePeekDrawerContext();
    const { markAsBlocked, markAsLoaded, status } = usePeekStatus(
        isOpen,
        url,
        DEFAULT_PEEK_TIMEOUT_MS
    );
    const canOpenUrlExternally = url !== PEEK_BLOCKED_URL;
    const shouldRenderPreview = canOpenUrlExternally && status !== "blocked";
    const iframeRemountKey = `${isOpen ? "open" : "closed"}-${url}`;

    return (
        <DrawerViewport>
            <DrawerPopup
                className="h-[min(calc(88vh-var(--drawer-keyboard-inset,0px)),58rem)] sm:mx-auto sm:max-w-[min(96vw,78rem)]"
                position="bottom"
                showBar
                showCloseButton
            >
                <DrawerHeader className="border-border/70 border-b pb-4">
                    <DrawerTitle className="truncate text-lg sm:text-xl">
                        {title}
                    </DrawerTitle>
                    <DrawerDescription>
                        {description ?? parseDisplayUrl(url)}
                        <span className="ml-2 text-muted-foreground">·</span>
                        <PeekDrawerLinkButton
                            href={url}
                            size="sm"
                            variant="link"
                        >
                            <GlobeIcon className="size-4" />
                            Open in new tab
                        </PeekDrawerLinkButton>
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
                        {status === "loading" && <PeekDrawerLoadingState />}
                        {status === "blocked" && (
                            <PeekDrawerBlockedState
                                canOpenUrlExternally={canOpenUrlExternally}
                                url={url}
                            />
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
            </DrawerPopup>
        </DrawerViewport>
    );
}

function PeekDrawerLoadingState() {
    return (
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
    );
}

function PeekDrawerBlockedState({
    canOpenUrlExternally,
    url,
}: {
    canOpenUrlExternally: boolean;
    url: string;
}) {
    return (
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
                    This site can't be previewed here. It may block embedding
                    inside other sites or be taking too long to load.
                </p>
            </div>
            {canOpenUrlExternally && (
                <PeekDrawerLinkButton href={url} size="sm">
                    <ExternalLinkIcon className="size-4" />
                    Open in new tab
                </PeekDrawerLinkButton>
            )}
        </div>
    );
}
