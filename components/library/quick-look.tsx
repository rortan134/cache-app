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
import { type Oembed, OembedSchema } from "@/lib/common/oembed";
import { parseValidUrl } from "@/lib/common/url";
import { MediaPlaceholder } from "../ui/media-placeholder";

const QUICK_LOOK_BLOCKED_URL = "about:blank";
const DEFAULT_TITLE = "Preview";
const DEFAULT_TIMEOUT_MS = 8000;
const ACTIVE_INDEX_STORAGE_KEY = "cache:quick-look:active-index";
const ITEMS_STORAGE_KEY = "cache:quick-look:items";
const OPEN_STORAGE_KEY = "cache:quick-look:open";
const QUEUE_LIMIT = 12;

const OEMBED_IFRAME_SANDBOX =
    "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation";
const OEMBED_DIRECT_IFRAME_SANDBOX = `${OEMBED_IFRAME_SANDBOX} allow-same-origin`;
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

type IframeStatus = "pending" | "loaded" | "blocked";

type OembedStatus = "blocked" | "loaded" | "loading" | "oembed";

type OembedResolution =
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

const QUICK_LOOK_DRAWER_HANDLE = DrawerCreateHandle<QuickLookEntry>();

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

    // `loaded` is terminal: a late internal navigation failure must not
    // flicker the blocked view over a working preview.
    const markAsBlocked = useStableCallback(() => {
        setIframeStatus((current) =>
            current === "loaded" ? "loaded" : "blocked"
        );
    });

    // A late `onLoad` may resurrect a timeout-induced blocked state.
    const markAsLoaded = useStableCallback(() => {
        setIframeStatus("loaded");
    });

    // Reset the iframe lifecycle before the first paint of a new URL so it
    // never inherits the previous URL's terminal status.
    useIsoLayoutEffect(() => {
        setIframeStatus("pending");
    }, [url]);

    React.useEffect(() => {
        if (isQuickLookBlockedUrl(url)) {
            timeout.clear();
            return;
        }
        // Bounds the whole wait for the URL — oEmbed fetch plus iframe load.
        // It only ever moves the iframe from `pending` to `blocked`.
        timeout.start(timeoutMs, () => {
            setIframeStatus((current) =>
                current === "pending" ? "blocked" : current
            );
        });
        return () => {
            timeout.clear();
        };
    }, [timeout, timeoutMs, url]);

    // Once SWR settles on an outcome that bypasses the iframe, the timer has
    // no useful work left. `unsupported` is the exception: no oEmbed provider
    // means the vanilla iframe is still the preview, so the timer keeps
    // bounding its load.
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
    data: OembedResolution | undefined,
    error: Error | undefined,
    iframeStatus: IframeStatus
): OembedStatus {
    if (isQuickLookBlockedUrl(url)) {
        return "blocked";
    }

    // A resolved oEmbed always wins over any parallel iframe state.
    if (data?.resolution === "found") {
        return "oembed";
    }

    // `not-found`: the server answered but couldn't produce an oEmbed (non-404
    // error, malformed payload). Fail fast — such URLs rarely render as an
    // iframe either, so don't make the user wait to find out.
    if (data?.resolution === "not-found") {
        return "blocked";
    }

    // SWR `error` is a genuine network failure (HTTP statuses route to
    // resolutions). A working iframe stays loaded, matching `markAsBlocked`.
    if (error && iframeStatus !== "loaded") {
        return "blocked";
    }

    if (iframeStatus === "blocked") {
        return "blocked";
    }

    if (iframeStatus === "loaded") {
        return "loaded";
    }

    // SWR is still loading, or resolved `unsupported` and we're waiting on the
    // parallel iframe's onLoad/onError. Show the spinner either way.
    return "loading";
}

async function resolveOembed(url: string): Promise<OembedResolution> {
    const response = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/json" },
    });
    if (response.status === 404) {
        return { resolution: "unsupported" };
    }
    if (!response.ok) {
        return { resolution: "not-found" };
    }
    const parsed = OembedSchema.safeParse(await response.json());
    return parsed.success
        ? { oembed: parsed.data, resolution: "found" }
        : { resolution: "not-found" };
}

function addQuickLookQueueEntry(
    items: QuickLookEntry[],
    entry: QuickLookEntry
): QuickLookQueueState {
    const existingIndex = items.findIndex((item) => item.url === entry.url);
    const existingEntry = items[existingIndex];

    if (existingEntry) {
        // Re-triggering an unchanged entry is a no-op; only an updated entry
        // replaces its queue item.
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
                const { isOpen, items } = getState();
                const queue = addQuickLookQueueEntry(items, entry);

                actions.setItems(queue.items);
                actions.setActiveIndex(queue.activeIndex);
                actions.setTriggerId(triggerId);
                actions.setIsOpen(true);
                // While the drawer is already open, the store update above
                // already switched the active queue item.
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
            <QuickLookDrawerToggle />
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
                        <QuickLookBlocked url={activeEntry.url} />
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

function QuickLookBlocked({ url }: { url: string }) {
    const canOpenUrlExternally = !isQuickLookBlockedUrl(url);
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

    const toggleLabel = isOpen ? "Close preview" : "Open preview";

    return (
        <Button
            {...props}
            aria-label={toggleLabel}
            className={cn(
                "fixed top-2 right-2 z-60 hidden shrink-0 opacity-50 hover:opacity-100 lg:inline-flex",
                { "opacity-100": isOpen },
                className
            )}
            data-quick-look="toggle"
            data-slot="quick-look-toggle"
            onClick={handleClick}
            size="icon-sm"
            title={toggleLabel}
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
