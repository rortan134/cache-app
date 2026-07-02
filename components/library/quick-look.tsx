"use client";

import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerCreateHandle,
    DrawerDescription,
    DrawerFooter,
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
import { T } from "gt-next";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const QUICK_LOOK_BLOCKED_URL = "about:blank";
const DEFAULT_QUICK_LOOK_TITLE = "Preview";
const DEFAULT_QUICK_LOOK_TIMEOUT_MS = 8000;
const QUICK_LOOK_DRAWER_ACTIVE_INDEX_STORAGE_KEY =
    "cache:quick-look:active-index";
const QUICK_LOOK_DRAWER_ITEMS_STORAGE_KEY = "cache:quick-look:items";
const QUICK_LOOK_DRAWER_OPEN_STORAGE_KEY = "cache:quick-look:open";
const QUICK_LOOK_DRAWER_QUEUE_LIMIT = 12;

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

type QuickLookDrawerStatus = "blocked" | "loaded" | "loading" | "oembed";

type QuickLookOembedResult =
    | {
          oembed: QuickLookDrawerOembed;
          status: "found";
      }
    | {
          status: "failed" | "unsupported";
      };

interface QuickLookDrawerOembed {
    html: string;
    provider: string;
    title: string | null;
}

interface QuickLookDrawerProps {
    children: React.ReactNode;
    description?: string;
    title?: string;
    url: string;
}

interface QuickLookDrawerEntry {
    description?: string;
    title: string;
    url: string;
}

interface QuickLookDrawerQueueState {
    activeIndex: number;
    items: QuickLookDrawerEntry[];
}

interface QuickLookDrawerContextValue {
    entry: QuickLookDrawerEntry;
    triggerId: string;
}

interface QuickLookDrawerLinkButtonProps
    extends Omit<React.ComponentProps<typeof Button>, "render"> {
    href: string;
}

type QuickLookDrawerTriggerProps = React.ComponentProps<typeof DrawerTrigger>;
type QuickLookDrawerTriggerClickEvent = Parameters<
    NonNullable<QuickLookDrawerTriggerProps["onClick"]>
>[0];

interface QuickLookDrawerStore {
    activeIndex: number;
    isOpen: boolean;
    items: QuickLookDrawerEntry[];
    triggerId: string | null;
}

const QuickLookDrawerContext =
    React.createContext<QuickLookDrawerContextValue | null>(null);

const QUICK_LOOK_DRAWER_HANDLE = DrawerCreateHandle<QuickLookDrawerEntry>();

const {
    actions: quickLookDrawerStoreActions,
    batchUpdates: batchQuickLookDrawerStoreUpdates,
    getState: getQuickLookDrawerState,
    useStore: useQuickLookDrawerStore,
} = createStore<QuickLookDrawerStore>({
    activeIndex: storage(0, {
        storageKey: QUICK_LOOK_DRAWER_ACTIVE_INDEX_STORAGE_KEY,
    }),
    isOpen: storage(false, {
        storageKey: QUICK_LOOK_DRAWER_OPEN_STORAGE_KEY,
    }),
    items: storage<QuickLookDrawerEntry[]>([], {
        storageKey: QUICK_LOOK_DRAWER_ITEMS_STORAGE_KEY,
    }),
    triggerId: null,
});

export function QuickLookDrawer({
    description,
    title = DEFAULT_QUICK_LOOK_TITLE,
    url,
    children,
}: QuickLookDrawerProps) {
    const entry = { description, title, url };
    const triggerId = `quick-look-drawer-${React.useId()}`;

    return (
        <QuickLookDrawerContext value={{ entry, triggerId }}>
            {children}
        </QuickLookDrawerContext>
    );
}

export function QuickLookDrawerTrigger({
    onClick,
    ...props
}: QuickLookDrawerTriggerProps) {
    const { entry, triggerId } = useQuickLookDrawerContext();

    const handleClick = useStableCallback(
        (event: QuickLookDrawerTriggerClickEvent) => {
            onClick?.(event);
            if (!event.defaultPrevented) {
                openQuickLookDrawer(entry, triggerId);
                event.preventDefault();
            }
        }
    );

    return (
        <DrawerTrigger
            {...props}
            handle={QUICK_LOOK_DRAWER_HANDLE}
            id={triggerId}
            onClick={handleClick}
            payload={entry}
        />
    );
}

export function QuickLookDrawerSurface() {
    const {
        activeIndex,
        isOpen,
        items,
        setActiveIndex,
        setIsOpen,
        setTriggerId,
        triggerId,
    } = useQuickLookDrawerStore();

    const safeActiveIndex =
        items.length === 0
            ? 0
            : Math.min(Math.max(activeIndex, 0), items.length - 1);
    const activeEntry = items[safeActiveIndex] ?? null;

    const handleOpenChange = useStableCallback((nextIsOpen: boolean) => {
        setIsOpen(nextIsOpen);
        if (!nextIsOpen) {
            setTriggerId(null);
        }
    });

    React.useEffect(() => {
        if (isOpen && items.length === 0) {
            setIsOpen(false);
            setTriggerId(null);
            QUICK_LOOK_DRAWER_HANDLE.close();
        }
        if (items.length > 0 && safeActiveIndex !== activeIndex) {
            setActiveIndex(safeActiveIndex);
        }
    }, [
        activeIndex,
        isOpen,
        items.length,
        safeActiveIndex,
        setActiveIndex,
        setIsOpen,
        setTriggerId,
    ]);

    return (
        <Drawer
            handle={QUICK_LOOK_DRAWER_HANDLE}
            onOpenChange={handleOpenChange}
            open={isOpen}
            triggerId={triggerId}
        >
            <DrawerVirtualKeyboardProvider>
                {activeEntry ? (
                    <QuickLookDrawerContent
                        activeEntry={activeEntry}
                        activeIndex={safeActiveIndex}
                        items={items}
                        onSelectQueueIndex={selectQuickLookQueueIndex}
                    />
                ) : null}
            </DrawerVirtualKeyboardProvider>
        </Drawer>
    );
}

function useQuickLookDrawerContext(): QuickLookDrawerContextValue {
    const context = React.use(QuickLookDrawerContext);
    if (!context) {
        throw new Error(
            "QuickLookDrawer components must be used inside <QuickLookDrawer>."
        );
    }
    return context;
}

function openQuickLookDrawer(entry: QuickLookDrawerEntry, triggerId: string) {
    const { activeIndex, isOpen, items } = getQuickLookDrawerState();
    const queue = isOpen
        ? addQuickLookQueueEntry({ activeIndex, items }, entry)
        : { activeIndex: 0, items: [entry] };

    batchQuickLookDrawerStoreUpdates(() => {
        quickLookDrawerStoreActions.setItems(queue.items);
        quickLookDrawerStoreActions.setActiveIndex(queue.activeIndex);
        quickLookDrawerStoreActions.setTriggerId(triggerId);
        quickLookDrawerStoreActions.setIsOpen(true);
    });
    QUICK_LOOK_DRAWER_HANDLE.open(triggerId);
}

function addQuickLookQueueEntry(
    { items }: QuickLookDrawerQueueState,
    entry: QuickLookDrawerEntry
): QuickLookDrawerQueueState {
    const idx = items.findIndex((item) => item.url === entry.url);
    if (idx >= 0) {
        return {
            activeIndex: idx,
            items: items.map((item, i) => (i === idx ? entry : item)),
        };
    }
    const nextItems = [...items, entry].slice(-QUICK_LOOK_DRAWER_QUEUE_LIMIT);
    return {
        activeIndex: nextItems.length - 1,
        items: nextItems,
    };
}

function selectQuickLookQueueIndex(index: number) {
    const { items } = getQuickLookDrawerState();
    if (index >= 0 && index < items.length) {
        quickLookDrawerStoreActions.setActiveIndex(index);
    }
}

function useQuickLookStatus(isOpen: boolean, url: string, timeoutMs: number) {
    const [status, setStatus] =
        React.useState<QuickLookDrawerStatus>("loading");
    const [oembed, setOembed] = React.useState<QuickLookDrawerOembed | null>(
        null
    );
    const blockedTimeout = useTimeout();

    const markAsBlocked = useStableCallback(() => {
        setStatus((curr) => (curr === "loading" ? "blocked" : curr));
    });

    const markAsLoaded = useStableCallback(() => {
        setStatus("loaded");
    });

    React.useEffect(() => {
        if (!isOpen || url === QUICK_LOOK_BLOCKED_URL) {
            blockedTimeout.clear();
            setOembed(null);
            setStatus(url === QUICK_LOOK_BLOCKED_URL ? "blocked" : "loading");
            return;
        }

        const controller = new AbortController();
        setStatus("loading");
        setOembed(null);
        blockedTimeout.start(timeoutMs, markAsBlocked);

        resolveQuickLookOembed(url, controller.signal)
            .then((res) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (res.status === "failed") {
                    blockedTimeout.clear();
                    setStatus("blocked");
                } else if (res.status === "found" && res.oembed) {
                    blockedTimeout.clear();
                    setOembed(res.oembed);
                    setStatus("oembed");
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setOembed(null);
                }
            });

        return () => {
            controller.abort();
            blockedTimeout.clear();
        };
    }, [blockedTimeout, isOpen, markAsBlocked, timeoutMs, url]);

    return { markAsBlocked, markAsLoaded, oembed, status };
}

async function resolveQuickLookOembed(
    url: string,
    signal: AbortSignal
): Promise<QuickLookOembedResult> {
    const response = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/json" },
        signal,
    });
    if (response.status === 404) {
        return { status: "unsupported" };
    }
    if (!response.ok) {
        return { status: "failed" };
    }
    const data: unknown = await response.json();
    const oembed = parseQuickLookOembed(data);
    return oembed ? { oembed, status: "found" } : { status: "failed" };
}

function parseQuickLookOembed(data: unknown): QuickLookDrawerOembed | null {
    if (
        data &&
        typeof data === "object" &&
        "html" in data &&
        typeof data.html === "string" &&
        "provider" in data &&
        typeof data.provider === "string"
    ) {
        return {
            html: data.html,
            provider: data.provider,
            title:
                "title" in data && typeof data.title === "string"
                    ? data.title
                    : null,
        };
    }
    return null;
}

function isAllowedOembedIframeUrl(url: URL, provider: string): boolean {
    if (url.protocol !== "https:") {
        return false;
    }
    const hostname = url.hostname.toLowerCase();
    const isPath = (p: string) => url.pathname.startsWith(p);

    switch (provider) {
        case "youtube":
            return YOUTUBE_IFRAME_HOSTS.has(hostname) && isPath("/embed/");
        case "vimeo":
            return hostname === "player.vimeo.com" && isPath("/video/");
        case "spotify":
            return hostname === "open.spotify.com" && isPath("/embed/");
        case "soundcloud":
            return hostname === "w.soundcloud.com";
        case "codepen":
            return hostname === "codepen.io";
        case "codesandbox":
            return hostname === "codesandbox.io";
        case "figma":
            return hostname === "www.figma.com" && url.pathname === "/embed";
        default:
            return false;
    }
}

function getOembedIframeSrc(oembed: QuickLookDrawerOembed): string | null {
    const doc = new DOMParser().parseFromString(oembed.html, "text/html");
    const src = doc.querySelector("iframe")?.getAttribute("src");
    if (!src) {
        return null;
    }
    try {
        const url = new URL(src);
        return isAllowedOembedIframeUrl(url, oembed.provider) ? url.href : null;
    } catch {
        return null;
    }
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

function QuickLookDrawerContent({
    activeEntry,
    activeIndex,
    items,
    onSelectQueueIndex,
}: {
    activeEntry: QuickLookDrawerEntry;
    activeIndex: number;
    items: QuickLookDrawerEntry[];
    onSelectQueueIndex: (index: number) => void;
}) {
    const { description, title, url } = activeEntry;
    const { markAsBlocked, markAsLoaded, oembed, status } = useQuickLookStatus(
        true,
        url,
        DEFAULT_QUICK_LOOK_TIMEOUT_MS
    );
    const canOpenUrlExternally = url !== QUICK_LOOK_BLOCKED_URL;
    const shouldRenderPreview =
        canOpenUrlExternally && status !== "blocked" && status !== "oembed";

    return (
        <DrawerViewport shouldShowBackdrop={false}>
            <DrawerPopup
                className="sm:max-w-[min(96vw,78rem)]"
                shouldShowBar
                shouldShowCloseButton
            >
                <DrawerHeader className="border-border/70 border-b pb-4">
                    <DrawerTitle className="truncate text-lg sm:text-xl">
                        {title}
                    </DrawerTitle>
                    <DrawerDescription>
                        {description ?? parseDisplayUrl(url)}
                        <span className="ml-2 text-muted-foreground">·</span>
                        <QuickLookDrawerLinkButton
                            href={url}
                            size="sm"
                            variant="link"
                        >
                            <GlobeIcon className="size-4" />
                            <T>Open in new tab</T>
                        </QuickLookDrawerLinkButton>
                    </DrawerDescription>
                </DrawerHeader>
                <DrawerPanel
                    allowSelection={false}
                    className="flex min-h-full flex-col p-0"
                    isScrollable={false}
                >
                    <div
                        aria-busy={status === "loading"}
                        className="relative flex size-full min-h-0"
                    >
                        {status === "loading" ? (
                            <QuickLookDrawerLoadingState />
                        ) : null}
                        {status === "blocked" ? (
                            <QuickLookDrawerBlockedState
                                canOpenUrlExternally={canOpenUrlExternally}
                                url={url}
                            />
                        ) : null}
                        {status === "oembed" && oembed ? (
                            <QuickLookDrawerOembedPreview oembed={oembed} />
                        ) : null}
                        {shouldRenderPreview ? (
                            <iframe
                                className="size-full border-0 bg-background"
                                key={url}
                                onError={markAsBlocked}
                                onLoad={markAsLoaded}
                                referrerPolicy="strict-origin-when-cross-origin"
                                src={url}
                                title={`Preview of ${title}`}
                            />
                        ) : null}
                    </div>
                </DrawerPanel>
                {items.length > 1 ? (
                    <QuickLookDrawerQueueFooter
                        activeIndex={activeIndex}
                        items={items}
                        onSelect={onSelectQueueIndex}
                    />
                ) : null}
            </DrawerPopup>
        </DrawerViewport>
    );
}

function QuickLookDrawerQueueFooter({
    activeIndex,
    items,
    onSelect,
}: {
    activeIndex: number;
    items: QuickLookDrawerEntry[];
    onSelect: (index: number) => void;
}) {
    return (
        <DrawerFooter
            allowSelection={false}
            className="flex-col items-stretch gap-2 px-4 sm:flex-col sm:justify-start"
        >
            <div className="flex items-center justify-between gap-3 text-muted-foreground text-xs">
                <span className="font-medium uppercase">Quick look</span>
                <span className="tabular-nums">
                    {activeIndex + 1}/{items.length}
                </span>
            </div>
            <ul className="flex gap-2 overflow-x-auto pb-1">
                {items.map((item, index) => (
                    <QuickLookDrawerQueueItem
                        index={index}
                        isActive={index === activeIndex}
                        item={item}
                        key={item.url}
                        onSelect={onSelect}
                    />
                ))}
            </ul>
        </DrawerFooter>
    );
}

function QuickLookDrawerQueueItem({
    index,
    isActive,
    item,
    onSelect,
}: {
    index: number;
    isActive: boolean;
    item: QuickLookDrawerEntry;
    onSelect: (index: number) => void;
}) {
    const handleClick = useStableCallback(() => {
        onSelect(index);
    });

    return (
        <li>
            <Button
                aria-current={isActive ? "page" : undefined}
                className="h-auto min-w-44 max-w-64 justify-start px-3 py-2 text-left"
                onClick={handleClick}
                size="sm"
                variant={isActive ? "secondary" : "ghost"}
            >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="max-w-full truncate font-medium">
                        {item.title}
                    </span>
                    <span className="max-w-full truncate text-muted-foreground text-xs">
                        {item.description ?? parseDisplayUrl(item.url)}
                    </span>
                </span>
            </Button>
        </li>
    );
}

function QuickLookDrawerLoadingState() {
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
                    Opening the page...
                </p>
            </div>
        </div>
    );
}

function QuickLookDrawerOembedPreview({
    oembed,
}: {
    oembed: QuickLookDrawerOembed;
}) {
    const iframeSrc = getOembedIframeSrc(oembed);

    return (
        <iframe
            allow={iframeSrc ? OEMBED_IFRAME_ALLOW : undefined}
            allowFullScreen={!!iframeSrc}
            className="size-full border-0 bg-background"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={
                iframeSrc ? OEMBED_DIRECT_IFRAME_SANDBOX : OEMBED_IFRAME_SANDBOX
            }
            src={iframeSrc ?? undefined}
            srcDoc={iframeSrc ? undefined : buildOembedSrcDoc(oembed.html)}
            title={oembed.title ?? `${oembed.provider} preview`}
        />
    );
}

function QuickLookDrawerBlockedState({
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
                    This site doesn't allow previews. It blocks embedding or is
                    taking too long to load.
                </p>
            </div>
            {canOpenUrlExternally ? (
                <QuickLookDrawerLinkButton href={url} size="sm">
                    <ExternalLinkIcon className="size-4" />
                    Open in new tab
                </QuickLookDrawerLinkButton>
            ) : null}
        </div>
    );
}

function QuickLookDrawerLinkButton({
    href,
    ...props
}: QuickLookDrawerLinkButtonProps) {
    return (
        <Button
            {...props}
            render={<a href={href} rel="noopener noreferrer" target="_blank" />}
        />
    );
}
