"use client";

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
    DrawerVirtualKeyboardProvider,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/common/cn";
import type { BaseUIEvent } from "@base-ui/react";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { AlertCircleIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";
import useSWR from "swr";

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

type OembedStatus = "blocked" | "loaded" | "loading" | "oembed";

type OEmbedResolution =
    | {
          oembed: Oembed;
          resolution: "found";
      }
    | {
          resolution: "not-found" | "unsupported";
      };

interface Oembed {
    html: string;
    provider: string;
    title: string | null;
}

interface QuickLookDrawerProps extends React.PropsWithChildren {
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

interface QuickLookDrawerStore {
    activeIndex: number;
    isOpen: boolean;
    items: QuickLookDrawerEntry[];
    triggerId: string | null;
}

interface QuickLookDrawerActions {
    openWithEntry: (entry: QuickLookDrawerEntry, triggerId: string) => void;
    removeQueueItem: (index: number) => void;
    selectQueueIndex: (index: number) => void;
}

// stan-js@1.9's `CustomActions` constraint is `Record<string, (...args: never[]) => void>`,
// which is too narrow to accept parameterised functions. Intersecting with that shape
// satisfies the constraint without weakening our typed signatures. Soundness leans on
// `noUncheckedIndexedAccess` (tsconfig.json): the index signature resolves to `... | undefined`,
// so unknown action keys are rejected at call sites. Do not disable that flag.
type QuickLookDrawerStanActions = QuickLookDrawerActions &
    Record<string, (...args: never[]) => void>;

function clampActiveIndex(index: number, itemsLength: number): number {
    if (itemsLength === 0) {
        return 0;
    }
    return Math.min(Math.max(index, 0), itemsLength - 1);
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

const QUICK_LOOK_DRAWER_HANDLE = DrawerCreateHandle<QuickLookDrawerEntry>();

const QuickLookDrawerContext =
    React.createContext<QuickLookDrawerContextValue | null>(null);

const { actions: quickLookDrawerStoreActions, useStore: useQuickLookStore } =
    createStore<QuickLookDrawerStore, QuickLookDrawerStanActions>(
        {
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
        },
        ({ actions, getState }) => ({
            openWithEntry(entry: QuickLookDrawerEntry, triggerId: string) {
                const { isOpen, items, activeIndex } = getState();
                const queue = isOpen
                    ? addQuickLookQueueEntry({ activeIndex, items }, entry)
                    : { activeIndex: 0, items: [entry] };

                actions.setItems(queue.items);
                actions.setActiveIndex(
                    clampActiveIndex(queue.activeIndex, queue.items.length)
                );
                actions.setTriggerId(triggerId);
                actions.setIsOpen(true);
                QUICK_LOOK_DRAWER_HANDLE.open(triggerId);
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
                if (nextItems.length === 0) {
                    actions.setIsOpen(false);
                    actions.setTriggerId(null);
                }
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

export function openQuickLookDrawer(
    entry: QuickLookDrawerEntry,
    triggerId: string
) {
    quickLookDrawerStoreActions.openWithEntry(entry, triggerId);
}

export function useIsQuickLookDrawerOpen(): boolean {
    const { isOpen } = useQuickLookStore();
    return isOpen;
}

function parseOembedStatus(
    url: string | null,
    data: OEmbedResolution | undefined,
    error: Error | undefined,
    iframeStatus: "pending" | "loaded" | "blocked"
): OembedStatus {
    if (url === null || url === QUICK_LOOK_BLOCKED_URL) {
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
    const oembed = parseOembed(data);
    return oembed
        ? { oembed, resolution: "found" }
        : { resolution: "not-found" };
}

function parseOembed(data: unknown): Oembed | null {
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

function getOembedIframeSrc(oembed: Oembed): string | null {
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

function useQuickLookDrawerContext(): QuickLookDrawerContextValue {
    const context = React.use(QuickLookDrawerContext);
    if (!context) {
        throw new Error(
            "QuickLookDrawer components must be used inside <QuickLookDrawer>."
        );
    }
    return context;
}

function useQuickLookStatus(url: string | null, timeoutMs: number) {
    const getterKey =
        url === null || url === QUICK_LOOK_BLOCKED_URL ? null : url;

    const { data, error } = useSWR(getterKey, resolveOembed, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
    });

    const [iframeStatus, setIframeStatus] = React.useState<
        "pending" | "loaded" | "blocked"
    >("pending");

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
        if (url === null || url === QUICK_LOOK_BLOCKED_URL) {
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

    return {
        markAsBlocked,
        markAsLoaded,
        oembed,
        status,
    };
}

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
    onClick: onClickProp,
    ...props
}: React.ComponentProps<typeof DrawerTrigger>) {
    const { entry, triggerId } = useQuickLookDrawerContext();

    const handleClick = useStableCallback(
        (event: BaseUIEvent<React.MouseEvent<HTMLButtonElement>>) => {
            onClickProp?.(event);
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

export function QuickLookDrawerContent({
    container,
}: {
    container: HTMLDivElement | React.RefObject<HTMLDivElement | null> | null;
}) {
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
            <DrawerVirtualKeyboardProvider>
                <DrawerViewport
                    className="overscroll-contain lg:relative lg:h-full"
                    portalProps={{
                        className: "lg:flex-1",
                        container,
                    }}
                    shouldShowBackdrop={false}
                >
                    <DrawerPopup className="max-w-2xl" variant="straight">
                        <DrawerHeader className="p-2 pb-1!">
                            <DrawerTitle className="sr-only">
                                Quick Look
                            </DrawerTitle>
                            <QuickLookDrawerList items={items}>
                                {(item, index) => (
                                    <QuickLookDrawerListItem
                                        index={index}
                                        isActive={index === safeActiveIndex}
                                        item={item}
                                        key={item.url}
                                        onRemove={removeQueueItem}
                                        onSelect={selectQueueIndex}
                                    />
                                )}
                            </QuickLookDrawerList>
                        </DrawerHeader>
                        <QuickLookDrawerPanel activeEntry={activeEntry} />
                    </DrawerPopup>
                </DrawerViewport>
            </DrawerVirtualKeyboardProvider>
        </Drawer>
    );
}

function QuickLookDrawerPanel({
    activeEntry,
}: {
    activeEntry: QuickLookDrawerEntry | null;
}) {
    const { markAsBlocked, markAsLoaded, oembed, status } = useQuickLookStatus(
        activeEntry?.url ?? null,
        DEFAULT_QUICK_LOOK_TIMEOUT_MS
    );
    const isLoading = status === "loading";

    return (
        <DrawerPanel className="p-0" isScrollable={false}>
            <div
                aria-busy={isLoading}
                className="relative flex size-full min-h-0"
            >
                {activeEntry ? (
                    <>
                        {isLoading ? <QuickLookDrawerLoading /> : null}
                        {status === "blocked" ? (
                            <QuickLookDrawerBlocked
                                canOpenUrlExternally={
                                    activeEntry.url !== QUICK_LOOK_BLOCKED_URL
                                }
                                url={activeEntry.url}
                            />
                        ) : null}
                        {status === "oembed" && oembed ? (
                            <QuickLookDrawerOembedPreview oembed={oembed} />
                        ) : null}
                        {status !== "blocked" &&
                        status !== "oembed" &&
                        activeEntry.url !== QUICK_LOOK_BLOCKED_URL ? (
                            <iframe
                                className="size-full border-0 bg-background"
                                key={activeEntry.url}
                                onError={markAsBlocked}
                                onLoad={markAsLoaded}
                                referrerPolicy="strict-origin-when-cross-origin"
                                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                                src={activeEntry.url}
                                title={`Preview of ${activeEntry.title}`}
                            />
                        ) : null}
                    </>
                ) : null}
            </div>
        </DrawerPanel>
    );
}

function QuickLookDrawerOembedPreview({ oembed }: { oembed: Oembed }) {
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
            srcDoc={iframeSrc ? undefined : buildOembedSrcDocument(oembed.html)}
            title={oembed.title ?? `${oembed.provider} preview`}
        />
    );
}

interface QuickLookDrawerListProps<T>
    extends Omit<React.ComponentProps<"ul">, "children"> {
    children: (item: T, index: number) => React.ReactNode;
    items: QuickLookDrawerEntry[];
}

function QuickLookDrawerList({
    items,
    className,
    children,
    ...props
}: QuickLookDrawerListProps<QuickLookDrawerEntry>) {
    return (
        <ul
            {...props}
            className={cn("flex max-w-full items-center gap-2", className)}
        >
            {items.map(children)}
        </ul>
    );
}

function QuickLookDrawerListItem({
    index,
    isActive,
    item,
    onRemove,
    onSelect,
}: {
    index: number;
    isActive: boolean;
    item: QuickLookDrawerEntry;
    onRemove: (index: number) => void;
    onSelect: (index: number) => void;
}) {
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

function QuickLookDrawerLoading() {
    return (
        <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/92 text-center backdrop-blur-sm"
            role="status"
        >
            <Spinner className="size-5 text-muted-foreground" />
            <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                    Loading preview...
                </p>
                <p className="max-w-sm text-balance text-muted-foreground text-sm">
                    Opening the page.
                </p>
            </div>
        </div>
    );
}

function QuickLookDrawerBlocked({
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
                    This site can't be previewed.
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
                    Open in new tab
                </Button>
            ) : null}
        </div>
    );
}
