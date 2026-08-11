"use client";

import type { BaseUIEvent } from "@base-ui/react";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { T } from "gt-next";
import {
    AlertCircleIcon,
    ExternalLinkIcon,
    PanelRight,
    PanelRightOpen,
    XIcon,
} from "lucide-react";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerCreateHandle,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerTrigger,
    DrawerViewport,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/common/cn";
import { clamp } from "@/lib/common/numbers";
import type { Oembed } from "@/lib/common/oembed";
import { OembedSchema } from "@/lib/common/oembed";
import { parseValidUrl } from "@/lib/common/url";
import { MediaPlaceholder } from "../ui/media-placeholder";

const QUICK_LOOK_BLOCKED_URL = "about:blank";
const DEFAULT_TITLE = "Preview";
const DEFAULT_TIMEOUT_MS = 8000;
const ACTIVE_INDEX_STORAGE_KEY = "cache:quick-look:active-index";
const ITEMS_STORAGE_KEY = "cache:quick-look:items";
const OPEN_STORAGE_KEY = "cache:quick-look:open";
const QUEUE_LIMIT = 12;

const OEMBED_DIRECT_IFRAME_SANDBOX =
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation";
const OEMBED_IFRAME_SANDBOX =
    "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation";
const OEMBED_IFRAME_ALLOW =
    "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";
const QUICK_LOOK_IFRAME_SANDBOX =
    "allow-scripts allow-popups allow-popups-to-escape-sandbox";

const YOUTUBE_IFRAME_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
]);

const QUICK_LOOK_DRAWER_HANDLE = DrawerCreateHandle<QuickLookEntry>();

type IframeStatus = "pending" | "loaded" | "blocked";

type OembedStatus = "blocked" | "loaded" | "loading" | "oembed";

type OEmbedResolution =
    | {
          oembed: Oembed;
          resolution: "found";
      }
    | {
          resolution: "not-found" | "unsupported";
      };

interface QuickLookEntry {
    description?: string;
    title: string;
    url: string;
}

interface QuickLookQueueState {
    activeIndex: number;
    items: QuickLookEntry[];
}

interface QuickLookContextValue {
    entry: QuickLookEntry;
    triggerId: string;
}

interface QuickLookStore {
    activeIndex: number;
    isOpen: boolean;
    items: QuickLookEntry[];
    triggerId: string | null;
}

interface QuickLookActions {
    openWithEntry: (entry: QuickLookEntry, triggerId: string) => void;
    removeQueueItem: (index: number) => void;
    selectQueueIndex: (index: number) => void;
}

type QuickLookStoreActions = QuickLookActions &
    Record<string, (...args: never[]) => void>;

const QuickLookContext = React.createContext<QuickLookContextValue | null>(
    null
);

function useQuickLookContext(): QuickLookContextValue {
    const context = React.use(QuickLookContext);
    if (!context) {
        throw new Error(
            "QuickLook components must be used inside <QuickLookDrawer>."
        );
    }
    return context;
}

export function useIsQuickLookOpen(): boolean {
    const { isOpen } = useQuickLookStore();
    return isOpen;
}

function useQuickLookStatus(url: string | null, timeoutMs: number) {
    const oembedUrl = isQuickLookBlockedUrl(url) ? null : url;

    const { data, error } = useSWR(oembedUrl, resolveOembed, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
    });

    const [iframeStatus, setIframeStatus] =
        React.useState<IframeStatus>("pending");

    const timeout = useTimeout();

    const markAsBlocked = useStableCallback(() => {
        setIframeStatus((current) =>
            // Once loaded, an iframe stays loaded — internal navigation failures
            // after a successful load are not actionable and would flicker the
            // blocked view against a working preview. Only route non-loaded
            // states to blocked, mirroring the original `setStatus` guard.
            current === "loaded" ? "loaded" : "blocked"
        );
    });

    const markAsLoaded = useStableCallback(() => {
        // Unconditional: a late `onLoad` is allowed to resurrect the preview from
        // a timeout-induced blocked state, matching the original's behavior where
        // `markAsLoaded` always wrote "loaded" regardless of prior status.
        setIframeStatus("loaded");
    });

    // Reset the iframe lifecycle synchronously on URL change so the very first
    // render of the new URL never inherits the previous URL's terminal status.
    // Layout effects run after DOM commit but before paint, guaranteeing the
    // user never sees a "loaded"/"blocked" leftover from a prior preview.
    useIsoLayoutEffect(() => {
        setIframeStatus("pending");
    }, [url]);

    React.useEffect(() => {
        if (isQuickLookBlockedUrl(url)) {
            timeout.clear();
            return;
        }
        // The timeout bounds the *total* wait from the URL change, mirroring the
        // original 8-second deadline that spanned both the oEmbed fetch and the
        // iframe load. It can only cause a `pending → blocked` transition — once
        // the iframe has reached a terminal state, the callback no-ops.
        timeout.start(timeoutMs, () => {
            setIframeStatus((current) =>
                current === "pending" ? "blocked" : current
            );
        });
        return () => {
            timeout.clear();
        };
    }, [timeout, timeoutMs, url]);

    // Once SWR settles on an outcome that bypasses the iframe, the loading
    // timeout has no useful work left. Clearing avoids a wasteful re-render
    // (the timer would fire into a status the derivation already ignores).
    // `unsupported` is the exception: 404 means "no oEmbed provider for this
    // URL" — the vanilla iframe is still the user's best preview, and the
    // timeout must keep running to bound its load.
    React.useEffect(() => {
        if (
            data?.resolution === "found" ||
            data?.resolution === "not-found" ||
            error
        ) {
            timeout.clear();
        }
    }, [timeout, data, error]);

    const oembed = data?.resolution === "found" ? data.oembed : null;
    const status = parseOembedStatus(url, data, error, iframeStatus);

    return { markAsBlocked, markAsLoaded, oembed, status };
}

function parseOembedStatus(
    url: string | null,
    data: OEmbedResolution | undefined,
    error: Error | undefined,
    iframeStatus: IframeStatus
): OembedStatus {
    if (isQuickLookBlockedUrl(url)) {
        return "blocked";
    }

    // A successful oEmbed takes priority and supplants any iframe state — the
    // richer preview wins regardless of whether the iframe loaded in parallel.
    if (data?.resolution === "found") {
        return "oembed";
    }

    // `not-found` is the original "failed" path: the oEmbed endpoint reached the
    // server but couldn't produce a result (non-404 error, malformed JSON, etc.).
    // As in the original, surface blocked immediately and discard any pending
    // iframe result — a server-side oEmbed failure suggests the URL won't render
    // reliably as an iframe either, so don't make the user wait to find out.
    if (data?.resolution === "not-found") {
        return "blocked";
    }

    // SWR `error` means the fetcher threw (a genuine network failure, not an HTTP
    // status — those route to resolutions). Preserves the original's liveness
    // guard: a working iframe stays loaded; only `pending`/`blocked` fall back.
    // This matches `markAsBlocked`, which no-ops once the iframe has loaded.
    if (error && iframeStatus !== "loaded") {
        return "blocked";
    }

    if (iframeStatus === "blocked") {
        return "blocked";
    }

    if (iframeStatus === "loaded") {
        return "loaded";
    }

    // Either SWR is still loading (iframe mounts in parallel as a hedge against
    // an unsupported oEmbed outcome) or SWR resolved to `unsupported` and we're
    // waiting for that iframe's onLoad/onError. Either way, show the spinner.
    return "loading";
}

async function resolveOembed(url: string): Promise<OEmbedResolution> {
    const response = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/json" },
    });
    if (response.status === 404) {
        return { resolution: "unsupported" };
    }
    if (!response.ok) {
        return { resolution: "not-found" };
    }
    const data: unknown = await response.json();
    const parsed = OembedSchema.safeParse(data);
    return parsed.success
        ? { oembed: parsed.data, resolution: "found" }
        : { resolution: "not-found" };
}

function addQuickLookQueueEntry(
    { items }: QuickLookQueueState,
    entry: QuickLookEntry
): QuickLookQueueState {
    const existingEntry = items.find((item) => item.url === entry.url);
    if (existingEntry) {
        const existingIndex = items.indexOf(existingEntry);
        // Re-triggering the same entry is a no-op unless its content changed
        if (
            existingEntry.title === entry.title &&
            existingEntry.description === entry.description
        ) {
            return { activeIndex: existingIndex, items };
        }
        return {
            activeIndex: existingIndex,
            items: items.map((item, i) => (i === existingIndex ? entry : item)),
        };
    }

    const nextItems = [...items, entry].slice(-QUEUE_LIMIT);

    return { activeIndex: nextItems.length - 1, items: nextItems };
}

function isQuickLookBlockedUrl(url: string | null): boolean {
    return url === null || url === QUICK_LOOK_BLOCKED_URL;
}

function getOembedIframeSrc(oembed: Oembed): string | null {
    const doc = new DOMParser().parseFromString(oembed.html, "text/html");
    const src = doc.querySelector("iframe")?.getAttribute("src");
    const url = src ? parseValidUrl(src) : null;
    return url && isAllowedOembedIframeUrl(url, oembed.provider)
        ? url.href
        : null;
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

function buildOembedSrcDocument(html: string): string {
    return `<!doctype html>
<html>
<head>
<base target="_blank">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; script-src 'unsafe-inline' https:; frame-src https:;">
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

function clampActiveIndex(index: number, itemsLength: number): number {
    if (itemsLength === 0) {
        return 0;
    }
    return clamp(index, 0, itemsLength - 1);
}

const { actions: quickLookStoreActions, useStore: useQuickLookStore } =
    createStore<QuickLookStore, QuickLookStoreActions>(
        {
            activeIndex: storage(0, {
                storageKey: ACTIVE_INDEX_STORAGE_KEY,
            }),
            isOpen: storage(false, {
                storageKey: OPEN_STORAGE_KEY,
            }),
            items: storage<QuickLookEntry[]>([], {
                storageKey: ITEMS_STORAGE_KEY,
            }),
            triggerId: null,
        },
        ({ actions, getState }) => ({
            openWithEntry(entry: QuickLookEntry, triggerId: string) {
                const { isOpen, items, activeIndex } = getState();
                const queue = addQuickLookQueueEntry(
                    { activeIndex, items },
                    entry
                );

                actions.setItems(queue.items);
                actions.setActiveIndex(queue.activeIndex);
                actions.setTriggerId(triggerId);
                actions.setIsOpen(true);
                // Opening is a no-op while the drawer is already open — the
                // store update above already switched the active queue item.
                if (!isOpen) {
                    QUICK_LOOK_DRAWER_HANDLE.open(triggerId);
                }
            },
            removeQueueItem(index: number) {
                const { activeIndex, items } = getState();
                if (index < 0 || index >= items.length) {
                    return;
                }
                const nextItems = items.filter((_, i) => i !== index);
                actions.setItems(nextItems);
                // Removing a tab before the active one shifts the active tab
                // left; removing the active tab hands the slot to its follower.
                actions.setActiveIndex(
                    clampActiveIndex(
                        activeIndex - (index < activeIndex ? 1 : 0),
                        nextItems.length
                    )
                );
            },
            selectQueueIndex(index: number) {
                const { items } = getState();
                if (index < 0 || index >= items.length) {
                    return;
                }
                actions.setActiveIndex(index);
            },
        })
    );

export function openQuickLook(entry: QuickLookEntry, triggerId: string) {
    quickLookStoreActions.openWithEntry(entry, triggerId);
}

interface QuickLookDrawerProps extends React.PropsWithChildren {
    description?: string;
    title?: string;
    url: string;
}

export function QuickLookDrawer({
    description,
    title = DEFAULT_TITLE,
    url,
    children,
}: QuickLookDrawerProps) {
    const entry = { description, title, url };
    const triggerId = `quick-look-drawer-${React.useId()}`;
    const contextValue = { entry, triggerId };

    return <QuickLookContext value={contextValue}>{children}</QuickLookContext>;
}

export function QuickLookDrawerTrigger({
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof DrawerTrigger>) {
    const { entry, triggerId } = useQuickLookContext();

    const handleClick = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) => {
            onClickProp?.(event);
            if (event.defaultPrevented) {
                return;
            }
            openQuickLook(entry, triggerId);
            event.preventDefault();
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

interface QuickLookDrawerContentProps {
    container: HTMLDivElement | React.RefObject<HTMLDivElement | null> | null;
}

export function QuickLookDrawerContent({
    container,
}: QuickLookDrawerContentProps) {
    const {
        activeIndex,
        isOpen,
        items,
        removeQueueItem,
        selectQueueIndex,
        setIsOpen,
        setTriggerId,
        triggerId,
    } = useQuickLookStore();

    const safeActiveIndex = clampActiveIndex(activeIndex, items.length);
    const activeEntry = items[safeActiveIndex] ?? null;

    const handleOpenChange = useStableCallback((nextIsOpen: boolean) => {
        setIsOpen(nextIsOpen);
        if (!nextIsOpen) {
            setTriggerId(null);
        }
    });

    return (
        <>
            <QuickLookDrawerToggle />
            <Drawer
                disablePointerDismissal
                handle={QUICK_LOOK_DRAWER_HANDLE}
                modal={false}
                onOpenChange={handleOpenChange}
                open={isOpen}
                position="right"
                swipeDirection="right"
                triggerId={triggerId}
            >
                <DrawerViewport
                    className="lg:sticky lg:h-dvh"
                    portalProps={{
                        className: "lg:flex-1",
                        container,
                    }}
                    shouldShowBackdrop={false}
                >
                    <DrawerPopup className="max-w-full" variant="straight">
                        <DrawerHeader
                            className={cn("p-2 pr-11 pb-2!", {
                                "p-0 pb-0!": !activeEntry,
                            })}
                        >
                            <DrawerTitle className="sr-only">
                                Quick Look
                            </DrawerTitle>
                            <QuickLookList items={items}>
                                {(item, index) => (
                                    <QuickLookListItem
                                        index={index}
                                        isActive={index === safeActiveIndex}
                                        item={item}
                                        key={item.url}
                                        onRemove={removeQueueItem}
                                        onSelect={selectQueueIndex}
                                    />
                                )}
                            </QuickLookList>
                        </DrawerHeader>
                        <QuickLookDrawerPanel activeEntry={activeEntry} />
                    </DrawerPopup>
                </DrawerViewport>
            </Drawer>
        </>
    );
}

interface QuickLookDrawerPanelProps {
    activeEntry: QuickLookEntry | null;
}

function QuickLookDrawerPanel({ activeEntry }: QuickLookDrawerPanelProps) {
    const { markAsBlocked, markAsLoaded, oembed, status } = useQuickLookStatus(
        activeEntry?.url ?? null,
        DEFAULT_TIMEOUT_MS
    );

    const isLoading = status === "loading";
    const isLoaded = status === "loaded";
    const isBlocked = status === "blocked";
    const isOembed = status === "oembed";

    return (
        <DrawerPanel
            aria-busy={isLoading}
            className="relative p-0 pt-0!"
            isScrollable={false}
        >
            {activeEntry ? (
                <>
                    {isLoading ? <QuickLookLoading /> : null}
                    {isBlocked ? (
                        <QuickLookBlocked
                            canOpenUrlExternally={
                                !isQuickLookBlockedUrl(activeEntry.url)
                            }
                            url={activeEntry.url}
                        />
                    ) : null}
                    {isOembed && oembed ? (
                        <QuickLookOembedPreview oembed={oembed} />
                    ) : null}
                    {isLoaded && !isOembed ? (
                        <iframe
                            className="size-full border-0 bg-background"
                            key={activeEntry.url}
                            onError={markAsBlocked}
                            onLoad={markAsLoaded}
                            referrerPolicy="strict-origin-when-cross-origin"
                            sandbox={QUICK_LOOK_IFRAME_SANDBOX}
                            src={activeEntry.url}
                            title={`Preview of ${activeEntry.title}`}
                        />
                    ) : null}
                </>
            ) : (
                <QuickLookPanelEmpty />
            )}
        </DrawerPanel>
    );
}

function QuickLookPanelEmpty() {
    return <MediaPlaceholder className="bg-popover" />;
}

interface QuickLookOembedPreviewProps {
    oembed: Oembed;
}

function QuickLookOembedPreview({ oembed }: QuickLookOembedPreviewProps) {
    const src = getOembedIframeSrc(oembed);

    return (
        <iframe
            allow={src ? OEMBED_IFRAME_ALLOW : undefined}
            allowFullScreen={!!src}
            className="size-full border-0 bg-background"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={src ? OEMBED_DIRECT_IFRAME_SANDBOX : OEMBED_IFRAME_SANDBOX}
            src={src ?? undefined}
            srcDoc={src ? undefined : buildOembedSrcDocument(oembed.html)}
            title={oembed.title ?? `${oembed.provider} preview`}
        />
    );
}

interface QuickLookListProps
    extends Omit<React.ComponentProps<"ul">, "children"> {
    children: (item: QuickLookEntry, index: number) => React.ReactNode;
    items: QuickLookEntry[];
}

function QuickLookList({
    items,
    className,
    children,
    ...props
}: QuickLookListProps) {
    return (
        <ul
            {...props}
            className={cn("flex max-w-full items-center gap-1.5", className)}
        >
            {items.map(children)}
        </ul>
    );
}

interface QuickLookListItemProps {
    index: number;
    isActive: boolean;
    item: QuickLookEntry;
    onRemove: (index: number) => void;
    onSelect: (index: number) => void;
}

function QuickLookListItem({
    index,
    isActive,
    item,
    onRemove,
    onSelect,
}: QuickLookListItemProps) {
    const handleClick = useStableCallback(() => {
        onSelect(index);
    });

    const handleRemove = useStableCallback(() => {
        onRemove(index);
    });

    return (
        <li
            className={cn(
                "flex h-fit w-full min-w-0 max-w-48 items-center rounded-lg",
                isActive ? "bg-secondary" : "hover:bg-accent"
            )}
        >
            <Button
                aria-current={isActive ? "page" : undefined}
                className="min-w-0 flex-1 hover:bg-transparent"
                onClick={handleClick}
                size="sm"
                title={item.title}
                variant="ghost"
            >
                <span className="min-w-0 truncate font-medium">
                    {item.title}
                </span>
            </Button>
            <Button
                aria-label={`Close ${item.title}`}
                onClick={handleRemove}
                size="icon-sm"
                title={`Close ${item.title}`}
                variant="ghost"
            >
                <XIcon className="size-3.5 shrink-0" />
            </Button>
        </li>
    );
}

function QuickLookLoading() {
    return (
        <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/92 text-center backdrop-blur-sm"
            role="status"
        >
            <Spinner className="size-5 text-muted-foreground" />
            <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                    <T>Loading preview...</T>
                </p>
                <p className="max-w-sm text-balance text-muted-foreground text-sm">
                    <T>Opening the page.</T>
                </p>
            </div>
        </div>
    );
}

function QuickLookBlocked({
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
                    <T>Preview unavailable</T>
                </p>
                <p className="max-w-md text-balance text-muted-foreground text-sm">
                    <T>This site can't be previewed.</T>
                </p>
            </div>
            {canOpenUrlExternally ? (
                <Button
                    nativeButton={false}
                    render={
                        <a
                            href={url}
                            rel="noopener noreferrer"
                            target="_blank"
                        />
                    }
                    size="sm"
                >
                    <ExternalLinkIcon className="size-4" />
                    <T>Open in new tab</T>
                </Button>
            ) : null}
        </div>
    );
}

function QuickLookDrawerToggle({
    className,
    onClick,
    ...props
}: React.ComponentProps<typeof Button>) {
    const { isOpen, items, setIsOpen } = useQuickLookStore();

    const handleClick = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) => {
            onClick?.(event);
            if (event.defaultPrevented) {
                return;
            }
            setIsOpen(!isOpen);
        }
    );

    if (!isOpen && items.length === 0) {
        return null;
    }

    return (
        <Button
            {...props}
            aria-label={isOpen ? "Close preview" : "Open preview"}
            className={cn(
                "fixed top-2 right-2 z-60 hidden shrink-0 opacity-50 hover:opacity-100 lg:inline-flex",
                { "opacity-100": isOpen },
                className
            )}
            data-quick-look="toggle"
            data-slot="quick-look-toggle"
            onClick={handleClick}
            size="icon-sm"
            title={isOpen ? "Close preview" : "Open preview"}
            variant="ghost"
        >
            {isOpen ? (
                <PanelRight aria-hidden className="size-4" focusable="false" />
            ) : (
                <PanelRightOpen
                    aria-hidden
                    className="size-4"
                    focusable="false"
                />
            )}
        </Button>
    );
}
