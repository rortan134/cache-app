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
import { isAbortError } from "@/lib/common/abort";
import { parseDisplayUrl } from "@/lib/common/url";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";

const PEEK_BLOCKED_URL = "about:blank";
const DEFAULT_PEEK_TITLE = "Preview";
const DEFAULT_PEEK_TIMEOUT_MS = 8000;
const OEMBED_DIRECT_IFRAME_SANDBOX =
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation";
const OEMBED_IFRAME_SANDBOX =
    "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation";
const OEMBED_IFRAME_ALLOW =
    "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";
const YOUTUBE_IFRAME_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
]);
const VIMEO_IFRAME_HOST = "player.vimeo.com";
const SPOTIFY_IFRAME_HOST = "open.spotify.com";
const SOUNDCLOUD_IFRAME_HOST = "w.soundcloud.com";
const CODEPEN_IFRAME_HOST = "codepen.io";
const CODESANDBOX_IFRAME_HOST = "codesandbox.io";
const FIGMA_IFRAME_HOST = "www.figma.com";

type PeekDrawerStatus = "blocked" | "loaded" | "loading" | "oembed";

type PeekOembedResult =
    | {
          oembed: PeekDrawerOembed;
          status: "found";
      }
    | {
          status: "failed" | "unsupported";
      };

interface PeekDrawerOembed {
    html: string;
    provider: string;
    title: string | null;
}

interface PeekDrawerProps {
    children: React.ReactNode;
    description?: string;
    title?: string;
    url: string;
}

interface PeekDrawerContextValue {
    description?: string;
    isOpen: boolean;
    title: string;
    url: string;
}

interface PeekDrawerLinkButtonProps
    extends Omit<React.ComponentProps<typeof Button>, "render"> {
    href: string;
}

const PeekDrawerContext = React.createContext<PeekDrawerContextValue | null>(
    null
);

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
                    <PeekDrawerContent />
                </DrawerVirtualKeyboardProvider>
            </Drawer>
        </PeekDrawerContext>
    );
}

export const PeekDrawerTrigger = DrawerTrigger;

function PeekDrawerContent() {
    const { description, isOpen, title, url } = usePeekDrawerContext();
    const { markAsBlocked, markAsLoaded, oembed, status } = usePeekStatus(
        isOpen,
        url,
        DEFAULT_PEEK_TIMEOUT_MS
    );
    const canOpenUrlExternally = url !== PEEK_BLOCKED_URL;
    const shouldRenderPreview =
        isOpen &&
        canOpenUrlExternally &&
        status !== "blocked" &&
        status !== "oembed";

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
                        {status === "loading" ? (
                            <PeekDrawerLoadingState />
                        ) : null}
                        {status === "blocked" ? (
                            <PeekDrawerBlockedState
                                canOpenUrlExternally={canOpenUrlExternally}
                                url={url}
                            />
                        ) : null}
                        {status === "oembed" && oembed ? (
                            <PeekDrawerOembedPreview oembed={oembed} />
                        ) : null}
                        {shouldRenderPreview ? (
                            <iframe
                                className="size-full border-0 bg-background"
                                key={`${isOpen ? "open" : "closed"}-${url}`}
                                onError={markAsBlocked}
                                onLoad={markAsLoaded}
                                referrerPolicy="strict-origin-when-cross-origin"
                                src={url}
                                title={`Preview of ${title}`}
                            />
                        ) : null}
                    </div>
                </DrawerPanel>
            </DrawerPopup>
        </DrawerViewport>
    );
}

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
 * Enforces a timeout so users aren't left waiting indefinitely for sites
 * that refuse to embed.
 */
function usePeekStatus(isOpen: boolean, url: string, timeoutMs: number) {
    const [status, setStatus] = React.useState<PeekDrawerStatus>("loading");
    const [oembed, setOembed] = React.useState<PeekDrawerOembed | null>(null);
    const blockedTimeout = useTimeout();

    const markAsBlocked = useStableCallback(() => {
        setStatus((current) => (current === "loading" ? "blocked" : current));
    });

    const markAsLoaded = useStableCallback(() => {
        setStatus("loaded");
    });

    React.useEffect(() => {
        const controller = new AbortController();

        if (!isOpen) {
            blockedTimeout.clear();
            setOembed(null);
            setStatus("loading");
            return () => {
                controller.abort();
            };
        }

        if (url === PEEK_BLOCKED_URL) {
            blockedTimeout.clear();
            setOembed(null);
            setStatus("blocked");
            return () => {
                controller.abort();
            };
        }

        const oembedPromise = resolvePeekOembed(url, controller.signal);
        oembedPromise
            .then((result) => {
                if (controller.signal.aborted) {
                    return;
                }
                if (result.status === "failed") {
                    blockedTimeout.clear();
                    setOembed(null);
                    setStatus("blocked");
                    return;
                }
                if (result.status === "unsupported") {
                    return;
                }
                blockedTimeout.clear();
                if (result.status !== "found") {
                    setOembed(null);
                    setStatus("blocked");
                    return;
                }
                setOembed(result.oembed);
                setStatus("oembed");
            })
            .catch((error: unknown) => {
                if (isAbortError(error)) {
                    return;
                }
                if (!controller.signal.aborted) {
                    setOembed(null);
                }
            });

        setOembed(null);
        setStatus("loading");
        blockedTimeout.start(timeoutMs, markAsBlocked);

        return () => {
            controller.abort();
            blockedTimeout.clear();
        };
    }, [blockedTimeout, isOpen, markAsBlocked, timeoutMs, url]);

    return {
        markAsBlocked,
        markAsLoaded,
        oembed,
        status,
    };
}

async function resolvePeekOembed(
    url: string,
    signal: AbortSignal
): Promise<PeekOembedResult> {
    const response = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`, {
        headers: {
            Accept: "application/json",
        },
        signal,
    });
    if (response.status === 404) {
        return { status: "unsupported" };
    }
    if (!response.ok) {
        return { status: "failed" };
    }
    const data: unknown = await response.json();
    const oembed = parsePeekOembed(data);
    return oembed ? { oembed, status: "found" } : { status: "failed" };
}

function parsePeekOembed(data: unknown): PeekDrawerOembed | null {
    if (!data || typeof data !== "object") {
        return null;
    }
    if (!("html" in data) || typeof data.html !== "string") {
        return null;
    }
    if (!("provider" in data) || typeof data.provider !== "string") {
        return null;
    }
    const title =
        "title" in data && typeof data.title === "string" ? data.title : null;

    return {
        html: data.html,
        provider: data.provider,
        title,
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

function PeekDrawerOembedPreview({ oembed }: { oembed: PeekDrawerOembed }) {
    const iframeSrc = getOembedIframeSrc(oembed);
    if (iframeSrc) {
        return (
            <iframe
                allow={OEMBED_IFRAME_ALLOW}
                allowFullScreen
                className="size-full border-0 bg-background"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox={OEMBED_DIRECT_IFRAME_SANDBOX}
                src={iframeSrc}
                title={oembed.title ?? `${oembed.provider} preview`}
            />
        );
    }

    return (
        <iframe
            className="size-full border-0 bg-background"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={OEMBED_IFRAME_SANDBOX}
            srcDoc={buildOembedSrcDoc(oembed.html)}
            title={oembed.title ?? `${oembed.provider} preview`}
        />
    );
}

function getOembedIframeSrc(oembed: PeekDrawerOembed): string | null {
    const document = new DOMParser().parseFromString(oembed.html, "text/html");
    const iframe = document.querySelector("iframe");
    const rawSrc = iframe?.getAttribute("src");
    if (!rawSrc) {
        return null;
    }
    try {
        const url = new URL(rawSrc);
        return isAllowedOembedIframeUrl(url, oembed.provider) ? url.href : null;
    } catch {
        return null;
    }
}

function isAllowedOembedIframeUrl(url: URL, provider: string): boolean {
    if (url.protocol !== "https:") {
        return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (provider === "youtube") {
        return (
            YOUTUBE_IFRAME_HOSTS.has(hostname) &&
            url.pathname.startsWith("/embed/")
        );
    }
    if (provider === "vimeo") {
        return (
            hostname === VIMEO_IFRAME_HOST && url.pathname.startsWith("/video/")
        );
    }
    if (provider === "spotify") {
        return (
            hostname === SPOTIFY_IFRAME_HOST &&
            url.pathname.startsWith("/embed/")
        );
    }
    if (provider === "soundcloud") {
        return hostname === SOUNDCLOUD_IFRAME_HOST;
    }
    if (provider === "codepen") {
        return hostname === CODEPEN_IFRAME_HOST;
    }
    if (provider === "codesandbox") {
        return hostname === CODESANDBOX_IFRAME_HOST;
    }
    if (provider === "figma") {
        return hostname === FIGMA_IFRAME_HOST && url.pathname === "/embed";
    }
    return false;
}

function buildOembedSrcDoc(html: string): string {
    return `<!doctype html>
<html>
<head>
<base target="_blank">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,
body {
    align-items: center;
    background: transparent;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    margin: 0;
    min-height: 100%;
    height: 100%;
    width: 100%;
    padding: 0;
}
*,
*::before,
*::after {
    box-sizing: inherit;
}
iframe {
    border: 0;
    max-height: calc(100vh - 24px);
    max-width: 100%;
}
blockquote {
    max-width: 100%;
    height: 100%;
}
</style>
</head>
<body>${html}</body>
</html>`;
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
            {canOpenUrlExternally ? (
                <PeekDrawerLinkButton href={url} size="sm">
                    <ExternalLinkIcon className="size-4" />
                    Open in new tab
                </PeekDrawerLinkButton>
            ) : null}
        </div>
    );
}
