import { useEffect, useState } from "react";
import type { ExtensionCollectionDto } from "~lib/api";
import {
    clipPage,
    createCollection,
    listCollections,
} from "~lib/api";
import {
    MESSAGE_TYPES,
    STORAGE_KEYS,
    getConfiguredCacheAppOrigin,
    isSocialImportUrl,
    isUnsupportedClipUrl,
} from "~lib/runtime";
import styles from "./popup.module.css";
import { CollectionCreateView } from "./collection-create-view";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});

const POPUP_SUCCESS_CLOSE_DELAY_MS = 900;
const TITLE_MAX_LENGTH = 48;

type ActiveTab = {
    id: number | undefined;
    title: string;
    url: string;
};

type PopupViewState =
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "list" }
    | { kind: "create" };

type LinkState = "unknown" | "unlinked" | "linked";

async function readLinkState(): Promise<LinkState> {
    const data = await chrome.storage.local.get([STORAGE_KEYS.syncApiKey]);
    const token =
        typeof data[STORAGE_KEYS.syncApiKey] === "string"
            ? data[STORAGE_KEYS.syncApiKey].trim()
            : "";
    return token ? "linked" : "unlinked";
}

async function readActiveTab(): Promise<ActiveTab | null> {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab) {
            return null;
        }
        return {
            id: tab.id,
            title: tab.title ?? "",
            url: tab.url ?? "",
        };
    } catch {
        return null;
    }
}

function truncateTitle(title: string, max = TITLE_MAX_LENGTH): string {
    if (title.length <= max) {
        return title;
    }
    return `${title.slice(0, max - 1)}…`;
}

function hostnameFromUrl(raw: string): string {
    try {
        return new URL(raw).hostname;
    } catch {
        return "";
    }
}

async function readLastClipCollectionIds(): Promise<string[]> {
    const data = await chrome.storage.local.get([
        STORAGE_KEYS.lastClipCollectionIds,
    ]);
    const stored = data[STORAGE_KEYS.lastClipCollectionIds];
    return Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [];
}

async function persistLastClipCollectionIds(ids: string[]): Promise<void> {
    await chrome.storage.local.set({
        [STORAGE_KEYS.lastClipCollectionIds]: ids,
    });
}

function openCacheInNewTab(): void {
    const origin = getConfiguredCacheAppOrigin();
    if (!origin) {
        return;
    }
    void chrome.tabs.create({ url: origin });
}

async function triggerSocialImport(
    tabId: number | undefined,
): Promise<void> {
    if (typeof tabId !== "number") {
        throw new Error("No active tab to import from.");
    }
    await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.START_SYNC });
}

function StartupPopup(): React.ReactElement {
    return (
        <div className={styles.root}>
            <div className={styles.centerState}>
                <div className={styles.spinner} aria-hidden="true" />
            </div>
        </div>
    );
}

function UnlinkedPopup(): React.ReactElement {
    return (
        <div className={styles.root}>
            <div className={styles.centerState}>
                <p className={styles.centerStateTitle}>Cache is not linked</p>
                <p className={styles.centerStateBody}>
                    Open Cache to link this browser. Sign in once and your
                    collections will appear here.
                </p>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={openCacheInNewTab}
                >
                    Open Cache
                </button>
            </div>
        </div>
    );
}

function UnsupportedPopup({
    hostname,
}: {
    hostname: string;
}): React.ReactElement {
    return (
        <div className={styles.root}>
            <div className={styles.centerState}>
                <p className={styles.centerStateTitle}>
                    This page can't be clipped
                </p>
                <p className={styles.centerStateBody}>
                    {hostname
                        ? `${hostname} cannot be read by extensions.`
                        : "Browser-internal pages cannot be read by extensions."}
                    {" "}
                    Open a regular web page to clip it into Cache.
                </p>
            </div>
        </div>
    );
}

function SocialImportPopup({ tab }: { tab: ActiveTab }): React.ReactElement {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = () => {
        setError(null);
        setIsSubmitting(true);
        void triggerSocialImport(tab.id)
            .then(() => setDone(true))
            .catch((err: unknown) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not start import. Reopen the page and try again.",
                );
            })
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div className={styles.root}>
            <div className={styles.centerState}>
                <p className={styles.centerStateTitle}>
                    Import this collection
                </p>
                <p className={styles.centerStateBody}>
                    {hostnameFromUrl(tab.url)} will be imported through
                    Cache's bulk social import. Smart Collections will
                    organize items once they land in your library.
                </p>
            </div>
            <div className={styles.footer}>
                {done ? (
                    <p className={styles.successBanner}>Import started.</p>
                ) : null}
                {error ? <p className={styles.inlineError}>{error}</p> : null}
                <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={isSubmitting || done}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? "Importing…" : "Import to Cache"}
                </button>
            </div>
        </div>
    );
}

function SearchField({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
}): React.ReactElement {
    return (
        <div className={styles.searchRow}>
            <span className={styles.searchIcon} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                        cx="6"
                        cy="6"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    />
                    <path
                        d="M9 9l3 3"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                    />
                </svg>
            </span>
            <input
                type="text"
                className={styles.searchInput}
                placeholder="Search collections"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function CollectionRow({
    collection,
    isSelected,
    onToggle,
}: {
    collection: ExtensionCollectionDto;
    isSelected: boolean;
    onToggle: (id: string) => void;
}): React.ReactElement {
    const handleClick = () => onToggle(collection.id);
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onToggle(collection.id);
        }
    };
    return (
        <li
            className={`${styles.row} ${isSelected ? styles.rowChecked : ""}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
        >
            <span className={styles.rowCheck} aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path
                        d="M2 5.5L4.5 8L9 3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </span>
            <span className={styles.rowName}>{collection.name}</span>
            <span className={styles.rowCount}>
                {NUMBER_FORMATTER.format(collection.itemCount)}
            </span>
        </li>
    );
}

function ListSkeletons(): React.ReactElement {
    return (
        <ul className={styles.list} aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
                <li
                    key={i}
                    className={styles.skeletonRow}
                    style={{
                        width: `${70 + ((i * 13) % 30)}%`,
                    }}
                />
            ))}
        </ul>
    );
}

export default function Popup(): React.ReactElement {
    const [linkState, setLinkState] = useState<LinkState>("unknown");
    const [tab, setTab] = useState<ActiveTab | null>(null);
    const [collections, setCollections] = useState<ExtensionCollectionDto[]>(
        [],
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [view, setView] = useState<PopupViewState>({ kind: "loading" });
    const [search, setSearch] = useState("");
    const [clipError, setClipError] = useState<string | null>(null);
    const [isClipping, setIsClipping] = useState(false);
    const [clipSuccess, setClipSuccess] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [nextLinkState, activeTab] = await Promise.all([
                readLinkState(),
                readActiveTab(),
            ]);
            if (cancelled) {
                return;
            }
            setLinkState(nextLinkState);
            setTab(activeTab);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchCollections = async () => {
        setView({ kind: "loading" });
        setClipError(null);
        setClipSuccess(false);
        try {
            const response = await listCollections();
            const list = response.collections ?? [];
            const lastIds = await readLastClipCollectionIds();
            const liveIds = new Set(list.map((c) => c.id));
            const restored = lastIds.filter((id) => liveIds.has(id));
            setCollections(list);
            setSelectedIds(new Set(restored));
            setView({ kind: "list" });
        } catch (error) {
            setView({
                kind: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load your collections.",
            });
        }
    };

    useEffect(() => {
        if (linkState !== "linked" || tab === null) {
            return;
        }
        if (isUnsupportedClipUrl(tab.url) || isSocialImportUrl(tab.url)) {
            return;
        }
        void fetchCollections();
    }, [linkState, tab]);

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCreated = (collection: ExtensionCollectionDto) => {
        setCollections((prev) => [collection, ...prev]);
        setSelectedIds((prev) => new Set(prev).add(collection.id));
        setView({ kind: "list" });
    };

    const handleClip = async () => {
        if (isClipping || tab === null) {
            return;
        }
        setClipError(null);
        setClipSuccess(false);
        setIsClipping(true);
        try {
            const ids = Array.from(selectedIds);
            await clipPage({
                url: tab.url,
                caption: tab.title,
                collectionIds: ids,
            });
            void persistLastClipCollectionIds(ids);
            setClipSuccess(true);
            window.setTimeout(() => {
                window.close();
            }, POPUP_SUCCESS_CLOSE_DELAY_MS);
        } catch (error) {
            setClipError(
                error instanceof Error
                    ? error.message
                    : "Clip failed. Please try again.",
            );
        } finally {
            setIsClipping(false);
        }
    };

    if (linkState === "unknown") {
        return <StartupPopup />;
    }

    if (linkState === "unlinked") {
        return <UnlinkedPopup />;
    }

    if (tab === null) {
        return <StartupPopup />;
    }

    if (isUnsupportedClipUrl(tab.url)) {
        return <UnsupportedPopup hostname={hostnameFromUrl(tab.url)} />;
    }

    if (isSocialImportUrl(tab.url)) {
        return <SocialImportPopup tab={tab} />;
    }

    const filteredCollections =
        search.trim() === ""
            ? collections
            : collections.filter((c) =>
                  c.name.toLowerCase().includes(search.trim().toLowerCase()),
              );

    const hasCollections = collections.length > 0;

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <span className={styles.subheader}>
                    {hostnameFromUrl(tab.url)}
                    {tab.title ? ` — ${truncateTitle(tab.title)}` : ""}
                </span>
            </header>

            {view.kind === "list" ? (
                <>
                    <SearchField
                        value={search}
                        onChange={setSearch}
                    />

                    <div className={styles.sectionHeader}>
                        <span>Collections</span>
                        <button
                            type="button"
                            className={styles.newButton}
                            onClick={() => setView({ kind: "create" })}
                        >
                            + New
                        </button>
                    </div>

                    {!hasCollections ? (
                        <div className={styles.centerState}>
                            <p className={styles.centerStateTitle}>
                                No collections yet
                            </p>
                            <p className={styles.centerStateBody}>
                                Create a collection to start filing pages.
                            </p>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => setView({ kind: "create" })}
                                style={{ width: "auto" }}
                            >
                                Create your first collection
                            </button>
                        </div>
                    ) : filteredCollections.length === 0 ? (
                        <div className={styles.centerState}>
                            <p className={styles.centerStateBody}>
                                No collections match &ldquo;{search}&rdquo;.
                            </p>
                        </div>
                    ) : (
                        <ul className={styles.list}>
                            {filteredCollections.map((collection) => (
                                <CollectionRow
                                    key={collection.id}
                                    collection={collection}
                                    isSelected={selectedIds.has(collection.id)}
                                    onToggle={toggleSelection}
                                />
                            ))}
                        </ul>
                    )}

                    <div className={styles.footer}>
                        {clipSuccess ? (
                            <p className={styles.successBanner}>
                                Clipped to Cache.
                            </p>
                        ) : null}
                        {clipError ? (
                            <p className={styles.inlineError}>{clipError}</p>
                        ) : null}
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={isClipping || clipSuccess}
                        onClick={handleClip}
                    >
                        {isClipping ? "Clipping…" : "Done"}
                    </button>
                    </div>
                </>
            ) : null}

            {view.kind === "loading" ? (
                <>
                    <SearchField value={search} onChange={setSearch} disabled />
                    <div
                        className={styles.sectionHeader}
                        aria-label="Collections"
                    >
                        <span>Collections</span>
                    </div>
                    <ListSkeletons />
                    <div className={styles.footer}>
                        {clipError ? (
                            <p className={styles.inlineError}>{clipError}</p>
                        ) : null}
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            disabled={isClipping || clipSuccess}
                            onClick={handleClip}
                        >
                            {isClipping ? "Clipping…" : "Done"}
                        </button>
                    </div>
                </>
            ) : null}

            {view.kind === "error" ? (
                <div className={styles.centerState}>
                    <p className={styles.centerStateBody}>{view.message}</p>
                    <button
                        type="button"
                        className={styles.retryButton}
                        onClick={() => void fetchCollections()}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {view.kind === "create" ? (
                <CollectionCreateView
                    createCollection={createCollection}
                    onCreated={handleCreated}
                    onCancel={() => setView({ kind: "list" })}
                />
            ) : null}
        </div>
    );
}
