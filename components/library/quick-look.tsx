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
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { T } from "gt-next";
import { AlertCircleIcon, ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import useSWR from "swr";
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

// The fetcher's resolution distinguishes the three server outcomes that drive the
// derived status: a successful oEmbed (`found`), a server-side failure while
// attempting oEmbed (`not-found`), and a 404 meaning this URL has no oEmbed
// provider at all (`unsupported`). Only `found` short-circuits the vanilla
// iframe; `not-found` mirrors the original "failed" path of surfacing blocked
// immediately, while `unsupported` lets the iframe try.
type QuickLookOembedResolution =
    | {
          oembed: QuickLookDrawerOembed;
          resolution: "found";
      }
    | {
          resolution: "not-found" | "unsupported";
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

interface QuickLookDrawerActions {
    openWithEntry: (entry: QuickLookDrawerEntry, triggerId: string) => void;
    selectQueueIndex: (index: number) => void;
}

// stan-js@1.9's `CustomActions` constraint is `Record<string, (...args: never[]) => void>`,
// which is too narrow to accept parameterised functions. Intersecting with that shape
// satisfies the constraint without weakening our typed signatures. Soundness leans on
// `noUncheckedIndexedAccess` (tsconfig.json): the index signature resolves to `... | undefined`,
// so unknown action keys are rejected at call sites. Do not disable that flag.
type QuickLookDrawerStanActions = QuickLookDrawerActions &
    Record<string, (...args: never[]) => void>;

function clampQuickLookActiveIndex(index: number, itemsLength: number): number {
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

const QuickLookDrawerContext =
    React.createContext<QuickLookDrawerContextValue | null>(null);

const QUICK_LOOK_DRAWER_HANDLE = DrawerCreateHandle<QuickLookDrawerEntry>();

const {
    actions: quickLookDrawerStoreActions,
    useStore: useQuickLookDrawerStore,
} = createStore<QuickLookDrawerStore, QuickLookDrawerStanActions>(
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

            // stan-js wraps custom actions in `batchUpdates`, so these four writes
            // flush as a single update. Do not wrap them in another batch — nesting
            // `batchUpdates` flushes listeners inside the outer batch and re-flushes
            // them on the outer `finally`, notifying subscribers twice.
            actions.setItems(queue.items);
            actions.setActiveIndex(
                clampQuickLookActiveIndex(queue.activeIndex, queue.items.length)
            );
            actions.setTriggerId(triggerId);
            actions.setIsOpen(true);
            QUICK_LOOK_DRAWER_HANDLE.open(triggerId);
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
        selectQueueIndex,
        setIsOpen,
        setTriggerId,
        triggerId,
    } = useQuickLookDrawerStore();

    // `activeIndex` is persisted alongside `items`, but a cross-tab `storage` event
    // can deliver one key before the other (stan-js writes each key separately), and
    // per-key storage corruption can leave the persisted pair inconsistent. Clamp on
    // read so the surface never indexes out of bounds; the source stays clamped on
    // write via `openWithEntry`/`selectQueueIndex`, so no write-back effect is needed.
    const safeActiveIndex = clampQuickLookActiveIndex(
        activeIndex,
        items.length
    );
    const activeEntry = items[safeActiveIndex] ?? null;

    const handleOpenChange = useStableCallback((nextIsOpen: boolean) => {
        setIsOpen(nextIsOpen);
        if (!nextIsOpen) {
            setTriggerId(null);
            QUICK_LOOK_DRAWER_HANDLE.close();
        }
    });

    // Cross-tab `storage` events can clear `items` while the drawer is open.
    // The drawer closes visually via the `open` prop below, but the store's
    // `isOpen` flag and handle state still need to be cleaned up to stay
    // consistent for the next open call.
    React.useEffect(() => {
        if (isOpen && items.length === 0) {
            setIsOpen(false);
            setTriggerId(null);
            QUICK_LOOK_DRAWER_HANDLE.close();
        }
    }, [isOpen, items.length, setIsOpen, setTriggerId]);

    return (
        <Drawer
            handle={QUICK_LOOK_DRAWER_HANDLE}
            onOpenChange={handleOpenChange}
            open={isOpen && items.length > 0}
            position="left"
            triggerId={triggerId}
        >
            <DrawerVirtualKeyboardProvider>
                {activeEntry && isOpen ? (
                    <QuickLookDrawerContent
                        activeEntry={activeEntry}
                        activeIndex={safeActiveIndex}
                        items={items}
                        onSelectQueueIndex={selectQueueIndex}
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

export function openQuickLookDrawer(
    entry: QuickLookDrawerEntry,
    triggerId: string
) {
    quickLookDrawerStoreActions.openWithEntry(entry, triggerId);
}

function useQuickLookStatus(url: string, timeoutMs: number) {
    // `about:blank` is the synthetic "no preview" URL. There is nothing to embed
    // or load, so we disable SWR's fetcher with a `null` key and derivation
    // returns "blocked" directly.
    const swrKey = url === QUICK_LOOK_BLOCKED_URL ? null : url;

    const { data, error } = useSWR(swrKey, resolveQuickLookOembed, {
        // oEmbed responses are stable per URL within a session — re-fetching on
        // focus or reconnect would just re-mount the preview and discard a
        // working iframe for no observable benefit.
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        // The endpoint fails fast (5s server-side upper bound). Retrying would
        // only delay the blocked fallback; recoverability depends on the user
        // choosing a different URL, not on transient network blips.
        shouldRetryOnError: false,
    });

    // SWR owns the oEmbed fetch; the iframe keeps a tiny piece of local state for
    // its own DOM lifecycle. `<iframe>` onLoad/onError describe a *rendering*
    // outcome, not a network request — there's no natural SWR model (no key to
    // de-dupe or revalidate), so a second fetcher would be a fake abstraction.
    // Composing these two signals in derivation is simpler and keeps each part
    // honest about what it knows.
    const [iframeStatus, setIframeStatus] = React.useState<
        "pending" | "loaded" | "blocked"
    >("pending");

    const blockedTimeout = useTimeout();

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
        if (url === QUICK_LOOK_BLOCKED_URL) {
            blockedTimeout.clear();
            return;
        }
        // The timeout bounds the *total* wait from the URL change, mirroring the
        // original 8-second deadline that spanned both the oEmbed fetch and the
        // iframe load. It can only cause a `pending → blocked` transition — once
        // the iframe has reached a terminal state, the callback no-ops.
        blockedTimeout.start(timeoutMs, () => {
            setIframeStatus((current) =>
                current === "pending" ? "blocked" : current
            );
        });
        return () => {
            blockedTimeout.clear();
        };
    }, [blockedTimeout, timeoutMs, url]);

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
            blockedTimeout.clear();
        }
    }, [blockedTimeout, data, error]);

    return {
        markAsBlocked,
        markAsLoaded,
        oembed: data?.resolution === "found" ? data.oembed : null,
        status: deriveQuickLookStatus(url, data, error, iframeStatus),
    };
}

function deriveQuickLookStatus(
    url: string,
    data: QuickLookOembedResolution | undefined,
    error: Error | undefined,
    iframeStatus: "pending" | "loaded" | "blocked"
): QuickLookDrawerStatus {
    if (url === QUICK_LOOK_BLOCKED_URL) {
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

async function resolveQuickLookOembed(
    url: string
): Promise<QuickLookOembedResolution> {
    // SWR manages key changes and stale-response discarding internally; the
    // original AbortController plumbing is no longer needed here. SWR will not
    // abort the underlying fetch on key change, but the server endpoint caps
    // itself at 5s, so abandoned requests do not accumulate indefinitely.
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
    const oembed = parseQuickLookOembed(data);
    return oembed
        ? { oembed, resolution: "found" }
        : { resolution: "not-found" };
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
        url,
        DEFAULT_QUICK_LOOK_TIMEOUT_MS
    );
    const canOpenUrlExternally = url !== QUICK_LOOK_BLOCKED_URL;
    const shouldRenderPreview =
        canOpenUrlExternally && status !== "blocked" && status !== "oembed";

    return (
        <DrawerViewport>
            <DrawerPopup
                className="sm:max-w-[min(96vw,78rem)]"
                shouldShowCloseButton
            >
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                    <DrawerDescription>
                        {description ?? parseDisplayUrl(url)}
                        <span className="ml-2">·</span>
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
                                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
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
