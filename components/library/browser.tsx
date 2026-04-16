"use client";

import {
    createNote,
    deleteLibraryItem,
    downloadMedia,
    updateNote,
    type CreateCollectionFromItemsResult,
    type DeleteLibraryItemResult,
    type NoteMutationResult,
} from "@/app/[locale]/library/actions";
import { UnprivilegedOnly } from "@/components/billing/privilege";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { LibraryNoteDrawer } from "@/components/library/entry/notes";
import {
    PreviewDrawer,
    PreviewDrawerContent,
    PreviewDrawerTrigger,
} from "@/components/library/preview-drawer";
import {
    AutocompleteClear,
    AutocompletePopup,
} from "@/components/ui/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientOnlyValue } from "@/components/ui/client-only";
import {
    Combobox,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import {
    Command,
    CommandCollection,
    CommandEmpty,
    CommandFooter,
    CommandGroup,
    CommandGroupLabel,
    CommandInput,
    CommandItem,
    CommandList,
    CommandPanel,
    CommandShortcut,
} from "@/components/ui/command";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    BlockPromotionBanner,
    InlinePromotionBanner,
} from "@/components/ui/promotion-banner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Ticker } from "@/components/ui/ticker";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { useAccess } from "@/hooks/use-access";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { getSubtleColorGradientFromName } from "@/lib/colors";
import { getNoteExcerpt } from "@/lib/library/notes";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { normalizeURL, toValidUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { LibraryItemSource } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    type AutocompleteRootChangeEventDetails,
    type BaseUIEvent,
} from "@base-ui/react";
import fscreen from "fscreen";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    ArrowUpRightIcon,
    ChevronDownIcon,
    ChevronRight,
    ChevronRightIcon,
    CircleDashed,
    CircleDot,
    CircleFadingPlus,
    CornerDownLeftIcon,
    DownloadIcon,
    ExternalLinkIcon,
    EyeIcon,
    FilePenLineIcon,
    LinkIcon,
    MaximizeIcon,
    NotebookPenIcon,
    SquarePen,
    Trash2Icon,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import React, {
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
    type CSSProperties,
    type MouseEvent,
    type ReactElement,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";

import {
    createCollection,
    createCollectionFromItems,
    deleteCollection,
    renameCollection,
    updateCollectionPriority,
    updateLibraryItemCollections,
    type CreateCollectionResult,
    type DeleteCollectionResult,
    type RenameCollectionResult,
    type UpdateCollectionPriorityResult,
    type UpdateLibraryItemCollectionsResult,
} from "@/app/[locale]/library/actions";
import {
    CollectionsList,
    CollectionsListAction,
    CollectionsListContent,
    CollectionsListEmpty,
    CollectionsListFeedback,
    CollectionsListFilterClear,
    CollectionsListItem,
    CollectionsListTrigger,
    SmartCollectionsCallout,
} from "@/components/library/collections";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { saveFile } from "@/lib/file";
import type { LibraryCollectionTag } from "@/lib/library/types";
import type { CollectionPriority } from "@/prisma/client/enums";

import { PlusIcon, Shapes } from "lucide-react";

import { type ReactNode } from "react";

const NAME_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
});

const COLLECTION_PRIORITY_ORDER = {
    archive: 3,
    none: 4,
    peripheral: 2,
    relevant: 1,
    very_relevant: 0,
} satisfies Record<CollectionPriority, number>;

interface Props {
    readonly initialCollections: readonly LibraryCollectionSummary[];
    readonly initialItems: readonly LibraryItemWithCollections[];
    readonly sidebarBottom?: ReactNode;
    readonly sidebarHeader?: ReactNode;
}

interface CollectionActionFeedback {
    readonly message: string;
    readonly tone: "error" | "success";
}

interface CollectionSidebarActionDependencies {
    readonly collections: readonly LibraryCollectionTag[];
    readonly itemsByCollectionId: ReadonlyMap<
        string,
        readonly LibraryItemWithCollections[]
    >;
    readonly setCollections: (
        value:
            | LibraryCollectionTag[]
            | ((current: LibraryCollectionTag[]) => LibraryCollectionTag[]),
    ) => void;
    readonly setItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[],
              ) => LibraryItemWithCollections[]),
    ) => void;
}

interface LibraryWorkspaceSidebarProps {
    readonly actionDependencies: CollectionSidebarActionDependencies;
    readonly collectionPreviewThumbnailUrlsById: ReadonlyMap<
        string,
        readonly string[]
    >;
    readonly collectionSummaries: readonly LibraryCollectionSummary[];
    readonly onClearCollectionFilters: () => void;
    readonly onSelectCollection: (collectionId: string) => void;
    readonly selectedCollectionIds: readonly string[];
    readonly sidebarBottom?: ReactNode;
    readonly sidebarHeader?: ReactNode;
}

function sortCollections<T extends LibraryCollectionTag>(
    collections: readonly T[],
): T[] {
    return [...collections].sort((a, b) => {
        const priorityDifference =
            COLLECTION_PRIORITY_ORDER[a.priority] -
            COLLECTION_PRIORITY_ORDER[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return NAME_COLLATOR.compare(a.name, b.name);
    });
}

function replaceItemCollections(
    items: readonly LibraryItemWithCollections[],
    itemId: string,
    collections: readonly LibraryCollectionTag[],
): LibraryItemWithCollections[] {
    return items.map((item) =>
        item.id === itemId
            ? {
                  ...item,
                  collections: [...collections],
              }
            : item,
    );
}

function appendCollectionToItem(
    items: readonly LibraryItemWithCollections[],
    itemId: string,
    collection: LibraryCollectionTag,
): LibraryItemWithCollections[] {
    return items.map((item) => {
        if (item.id !== itemId) {
            return item;
        }
        if (item.collections.some((entry) => entry.id === collection.id)) {
            return item;
        }
        return {
            ...item,
            collections: sortCollections([...item.collections, collection]),
        };
    });
}

function appendCollectionToItems(
    items: readonly LibraryItemWithCollections[],
    itemIds: readonly string[],
    collection: LibraryCollectionTag,
): LibraryItemWithCollections[] {
    const itemIdSet = new Set(itemIds);
    if (itemIdSet.size === 0) {
        return [...items];
    }

    return items.map((item) => {
        if (!itemIdSet.has(item.id)) {
            return item;
        }
        if (item.collections.some((entry) => entry.id === collection.id)) {
            return item;
        }
        return {
            ...item,
            collections: sortCollections([...item.collections, collection]),
        };
    });
}

function replaceCollectionPriority<T extends LibraryCollectionTag>(
    collections: readonly T[],
    collectionId: string,
    priority: CollectionPriority,
): T[] {
    return collections.map((collection) =>
        collection.id === collectionId
            ? { ...collection, priority }
            : collection,
    );
}

function replaceCollectionName<T extends LibraryCollectionTag>(
    collections: readonly T[],
    collectionId: string,
    name: string,
): T[] {
    return sortCollections(
        collections.map((collection) =>
            collection.id === collectionId
                ? { ...collection, name }
                : collection,
        ),
    );
}

function getPreviewOrderSeed(value: string): number {
    let hash = 0;
    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash;
}

function getCollectionPreviewThumbnailUrls(
    collectionId: string,
    items: readonly LibraryItemWithCollections[],
): string[] {
    return [...items]
        .filter(
            (
                item,
            ): item is LibraryItemWithCollections & {
                readonly thumbnailUrl: string;
            } => Boolean(item.thumbnailUrl),
        )
        .sort((left, right) => {
            return (
                getPreviewOrderSeed(`${collectionId}:${left.id}`) -
                getPreviewOrderSeed(`${collectionId}:${right.id}`)
            );
        })
        .slice(0, 5)
        .map((item) => item.thumbnailUrl);
}

function replaceItemsCollectionPriority(
    items: readonly LibraryItemWithCollections[],
    collectionId: string,
    priority: CollectionPriority,
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionPriority(
            item.collections,
            collectionId,
            priority,
        ),
    }));
}

function replaceItemsCollectionName(
    items: readonly LibraryItemWithCollections[],
    collectionId: string,
    name: string,
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionName(
            item.collections,
            collectionId,
            name,
        ),
    }));
}

function deriveCollectionSummaries(
    collections: readonly LibraryCollectionTag[],
    items: readonly LibraryItemWithCollections[],
): LibraryCollectionSummary[] {
    const counts = new Map<string, number>();
    const collectionSources = new Map<string, Set<LibraryItemSource>>();

    for (const item of items) {
        for (const collection of item.collections) {
            counts.set(collection.id, (counts.get(collection.id) ?? 0) + 1);

            const sources = collectionSources.get(collection.id) ?? new Set();
            sources.add(item.source);
            collectionSources.set(collection.id, sources);
        }
    }

    return sortCollections(
        collections.map((collection) => ({
            description: collection.description ?? null,
            id: collection.id,
            itemCount: counts.get(collection.id) ?? 0,
            name: collection.name,
            priority: collection.priority,
            sources: Array.from(collectionSources.get(collection.id) ?? []),
        })),
    );
}

const OPEN_EXTERNAL_LINK_INTERVAL_MS = 80;

function waitToOpenNextExternalLink(): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, OPEN_EXTERNAL_LINK_INTERVAL_MS);
    });
}

function openSavedItemsInNewTabs(urls: readonly string[]): void {
    if (typeof window.openai === "undefined") {
        for (const url of urls) {
            openSavedItemInNewTab(url);
        }
        return;
    }

    void (async () => {
        for (const [index, url] of urls.entries()) {
            if (index > 0) {
                await waitToOpenNextExternalLink();
            }

            openSavedItemInNewTab(url);
        }
    })();
}

function getCollectionItemUrls(
    items: readonly LibraryItemWithCollections[],
): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function escapeCsvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function buildCollectionCsv(
    collection: LibraryCollectionSummary,
    items: readonly LibraryItemWithCollections[],
): string {
    const header = [
        "Collection",
        "Caption",
        "URL",
        "Source",
        "Kind",
        "Saved At",
        "Posted At",
    ];

    const rows = items.map((item) => [
        collection.name,
        item.caption ?? "",
        normalizeURL(item.url),
        item.source,
        item.kind,
        item.createdAt.toISOString(),
        item.postedAt?.toISOString() ?? "",
    ]);

    return [header, ...rows]
        .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
        .join("\n");
}

function collectionExportFileName(name: string): string {
    const slug = name
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");

    return slug.length > 0 ? `${slug}-links` : "collection-links";
}

function LibraryWorkspaceSidebar({
    actionDependencies,
    collectionPreviewThumbnailUrlsById,
    collectionSummaries,
    selectedCollectionIds,
    onClearCollectionFilters,
    onSelectCollection,
    sidebarBottom,
    sidebarHeader,
}: LibraryWorkspaceSidebarProps): ReactElement {
    const [isCollectionsListOpen, setIsCollectionsListOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createDialogDraft, setCreateDialogDraft] = useState("");
    const [createDialogDescriptionDraft, setCreateDialogDescriptionDraft] =
        useState("");
    const [createDialogError, setCreateDialogError] = useState<string | null>(
        null,
    );
    const [createDialogAssignItemId, setCreateDialogAssignItemId] = useState<
        string | null
    >(null);
    const [pendingRenameCollection, setPendingRenameCollection] =
        useState<LibraryCollectionSummary | null>(null);
    const [renameDialogDraft, setRenameDialogDraft] = useState("");
    const [renameDialogError, setRenameDialogError] = useState<string | null>(
        null,
    );
    const [pendingPriorityCollectionIds, setPendingPriorityCollectionIds] =
        useState<string[]>([]);
    const [pendingDeleteCollection, setPendingDeleteCollection] =
        useState<LibraryCollectionSummary | null>(null);
    const [pendingExportCollectionId, setPendingExportCollectionId] = useState<
        string | null
    >(null);
    const [collectionActionFeedback, setCollectionActionFeedback] =
        useState<CollectionActionFeedback | null>(null);
    const [isCreatePending, startCreateTransition] = useTransition();
    const [isRenamePending, startRenameTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [isExportPending, startExportTransition] = useTransition();
    const createInputId = useId();
    const createDescriptionId = useId();
    const renameInputId = useId();
    const { collections, itemsByCollectionId, setCollections, setItems } =
        actionDependencies;
    const { copyToClipboard } = useCopyToClipboard({
        onCopy: () => {
            setCollectionActionFeedback({
                message: "All collection links copied to the clipboard.",
                tone: "success",
            });
        },
    });

    const resetCreateDialog = () => {
        setCreateDialogDraft("");
        setCreateDialogDescriptionDraft("");
        setCreateDialogError(null);
        setCreateDialogAssignItemId(null);
    };

    const handleCreateDialogOpenChange = (open: boolean) => {
        if (!(open || isCreatePending)) {
            resetCreateDialog();
        }
        setIsCreateDialogOpen(open);
    };

    const handleCreateCollectionRequest = (itemId?: string) => {
        setCreateDialogAssignItemId(itemId ?? null);
        setCreateDialogDraft("");
        setCreateDialogDescriptionDraft("");
        setCreateDialogError(null);
        setIsCreateDialogOpen(true);
    };

    const handleRequestDeleteCollection = (
        collection: LibraryCollectionSummary,
    ) => {
        setCollectionActionFeedback(null);
        setPendingDeleteCollection(collection);
    };

    const handleRequestRenameCollection = (
        collection: LibraryCollectionSummary,
    ) => {
        setCollectionActionFeedback(null);
        setRenameDialogDraft(collection.name);
        setRenameDialogError(null);
        setPendingRenameCollection(collection);
    };

    const handleRenameDialogOpenChange = (open: boolean) => {
        if (!(open || isRenamePending)) {
            setPendingRenameCollection(null);
            setRenameDialogDraft("");
            setRenameDialogError(null);
        }
    };

    const handleDeleteCollectionDialogOpenChange = (open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDeleteCollection(null);
        }
    };

    const handleCopyCollectionLinks = (
        collection: LibraryCollectionSummary,
    ) => {
        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            setCollectionActionFeedback({
                message: "There are no links in this collection yet.",
                tone: "error",
            });
            return;
        }

        setCollectionActionFeedback(null);
        copyToClipboard(urls.join("\n"));
    };

    const handleOpenCollectionLinks = (
        collection: LibraryCollectionSummary,
    ) => {
        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            setCollectionActionFeedback({
                message: "There are no links in this collection yet.",
                tone: "error",
            });
            return;
        }

        setCollectionActionFeedback({
            message: `Opening ${urls.length} link${urls.length === 1 ? "" : "s"} from ${collection.name}.`,
            tone: "success",
        });

        openSavedItemsInNewTabs(urls);
    };

    const handleExportCollectionToCsv = (
        collection: LibraryCollectionSummary,
    ) => {
        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];

        if (collectionItems.length === 0) {
            setCollectionActionFeedback({
                message: "There are no links in this collection yet.",
                tone: "error",
            });
            return;
        }

        startExportTransition(async () => {
            setPendingExportCollectionId(collection.id);

            try {
                await saveFile(
                    new Blob(
                        [buildCollectionCsv(collection, collectionItems)],
                        {
                            type: "text/csv;charset=utf-8",
                        },
                    ),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: collectionExportFileName(collection.name),
                    },
                );

                setCollectionActionFeedback({
                    message: `${collection.name} exported as CSV.`,
                    tone: "success",
                });
            } catch {
                setCollectionActionFeedback({
                    message: "We couldn't export this collection right now.",
                    tone: "error",
                });
            } finally {
                setPendingExportCollectionId((current) =>
                    current === collection.id ? null : current,
                );
            }
        });
    };

    const handleConfirmDeleteCollection = () => {
        const targetCollection = pendingDeleteCollection;
        if (!targetCollection) {
            return;
        }

        startDeleteTransition(async () => {
            let result: DeleteCollectionResult;

            try {
                result = await deleteCollection({
                    collectionId: targetCollection.id,
                });
            } catch {
                result = {
                    message: "We couldn't delete this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "DELETED") {
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
                return;
            }

            setCollections((current) =>
                current.filter(
                    (collection) => collection.id !== result.collection.id,
                ),
            );
            setItems((current) =>
                current.map((item) => ({
                    ...item,
                    collections: item.collections.filter(
                        (collection) => collection.id !== result.collection.id,
                    ),
                })),
            );
            setPendingDeleteCollection(null);
            setCollectionActionFeedback({
                message: `${result.collection.name} deleted.`,
                tone: "success",
            });
        });
    };

    const handleUpdateCollectionPriority = (
        collectionId: string,
        priority: CollectionPriority,
    ) => {
        const previousPriority = collections.find(
            (collection) => collection.id === collectionId,
        )?.priority;

        if (!previousPriority || previousPriority === priority) {
            return;
        }

        setCollections((current) =>
            replaceCollectionPriority(current, collectionId, priority),
        );
        setItems((current) =>
            replaceItemsCollectionPriority(current, collectionId, priority),
        );
        setPendingPriorityCollectionIds((current) =>
            current.includes(collectionId)
                ? current
                : [...current, collectionId],
        );

        const runUpdate = async () => {
            let result: UpdateCollectionPriorityResult;

            try {
                result = await updateCollectionPriority({
                    collectionId,
                    priority,
                });
            } catch {
                result = {
                    message:
                        "We couldn't update this collection priority right now.",
                    status: "ERROR",
                };
            }

            if (result.status === "UPDATED") {
                setCollections((current) =>
                    replaceCollectionPriority(
                        current,
                        result.collection.id,
                        result.collection.priority,
                    ),
                );
                setItems((current) =>
                    replaceItemsCollectionPriority(
                        current,
                        result.collection.id,
                        result.collection.priority,
                    ),
                );
            } else {
                setCollections((current) =>
                    replaceCollectionPriority(
                        current,
                        collectionId,
                        previousPriority,
                    ),
                );
                setItems((current) =>
                    replaceItemsCollectionPriority(
                        current,
                        collectionId,
                        previousPriority,
                    ),
                );
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
            }

            setPendingPriorityCollectionIds((current) =>
                current.filter((id) => id !== collectionId),
            );
        };

        runUpdate().catch(() => {
            setCollections((current) =>
                replaceCollectionPriority(
                    current,
                    collectionId,
                    previousPriority,
                ),
            );
            setItems((current) =>
                replaceItemsCollectionPriority(
                    current,
                    collectionId,
                    previousPriority,
                ),
            );
            setPendingPriorityCollectionIds((current) =>
                current.filter((id) => id !== collectionId),
            );
            setCollectionActionFeedback({
                message:
                    "We couldn't update this collection priority right now.",
                tone: "error",
            });
        });
    };

    const handleRenameCollectionSubmit = () => {
        const targetCollection = pendingRenameCollection;
        if (!targetCollection) {
            return;
        }

        const previousName = targetCollection.name;
        const nextName = renameDialogDraft.trim().replace(/\s+/g, " ");

        if (nextName.length === 0) {
            setRenameDialogError("Enter a collection name.");
            return;
        }

        if (nextName === previousName) {
            setPendingRenameCollection(null);
            setRenameDialogDraft("");
            setRenameDialogError(null);
            return;
        }

        setCollections((current) =>
            replaceCollectionName(current, targetCollection.id, nextName),
        );
        setItems((current) =>
            replaceItemsCollectionName(current, targetCollection.id, nextName),
        );

        startRenameTransition(async () => {
            let result: RenameCollectionResult;

            try {
                result = await renameCollection({
                    collectionId: targetCollection.id,
                    name: nextName,
                });
            } catch {
                result = {
                    message: "We couldn't rename this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status === "UPDATED") {
                setCollections((current) =>
                    replaceCollectionName(
                        current,
                        result.collection.id,
                        result.collection.name,
                    ),
                );
                setItems((current) =>
                    replaceItemsCollectionName(
                        current,
                        result.collection.id,
                        result.collection.name,
                    ),
                );
                setPendingRenameCollection(null);
                setRenameDialogDraft("");
                setRenameDialogError(null);
                setCollectionActionFeedback({
                    message: `${result.collection.name} renamed.`,
                    tone: "success",
                });
                return;
            }

            setCollections((current) =>
                replaceCollectionName(
                    current,
                    targetCollection.id,
                    previousName,
                ),
            );
            setItems((current) =>
                replaceItemsCollectionName(
                    current,
                    targetCollection.id,
                    previousName,
                ),
            );
            setRenameDialogError(result.message);
        });
    };

    const handleCreateCollectionSubmit = () => {
        startCreateTransition(async () => {
            let result: CreateCollectionResult;

            try {
                result = await createCollection({
                    assignToItemId: createDialogAssignItemId ?? undefined,
                    description: createDialogDescriptionDraft || undefined,
                    name: createDialogDraft,
                });
            } catch {
                result = {
                    message: "We couldn't create this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "CREATED") {
                setCreateDialogError(result.message);
                return;
            }

            const nextCollection = {
                description: result.collection.description,
                id: result.collection.id,
                name: result.collection.name,
                priority: result.collection.priority,
            } satisfies LibraryCollectionTag;

            setCollections((current) =>
                current.some(
                    (collection) => collection.id === nextCollection.id,
                )
                    ? current
                    : sortCollections([...current, nextCollection]),
            );

            if (result.assignedItemId) {
                const assignedItemId = result.assignedItemId;
                setItems((current) =>
                    appendCollectionToItem(
                        current,
                        assignedItemId,
                        nextCollection,
                    ),
                );
            }

            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

    return (
        <>
            <Sidebar>
                <SidebarHeader>
                    {sidebarHeader}
                    <CollectionsList
                        onOpenChange={setIsCollectionsListOpen}
                        open={isCollectionsListOpen}
                    >
                        <div className="flex w-full items-center gap-1">
                            <CollectionsListTrigger
                                collectionLabels={collectionSummaries.map(
                                    (collection) => collection.name,
                                )}
                                isPreviewEnabled={!isCollectionsListOpen}
                            />
                            <CollectionsListAction
                                aria-label="Create new collection"
                                onClick={() => handleCreateCollectionRequest()}
                            >
                                <PlusIcon
                                    aria-hidden
                                    className="inline-block size-4.5 shrink-0"
                                    focusable="false"
                                />
                                <span className="sr-only">
                                    Create new collection
                                </span>
                            </CollectionsListAction>
                        </div>
                        <CollectionsListContent>
                            <SmartCollectionsCallout />
                            {collectionSummaries.length > 0 ? (
                                <>
                                    {collectionSummaries.map((collection) => (
                                        <CollectionsListItem
                                            collection={collection}
                                            isExportPending={
                                                isExportPending &&
                                                pendingExportCollectionId ===
                                                    collection.id
                                            }
                                            isSelected={selectedCollectionIds.includes(
                                                collection.id,
                                            )}
                                            isUpdatePriorityPending={pendingPriorityCollectionIds.includes(
                                                collection.id,
                                            )}
                                            key={collection.id}
                                            onCopyLinks={() =>
                                                handleCopyCollectionLinks(
                                                    collection,
                                                )
                                            }
                                            onDelete={() =>
                                                handleRequestDeleteCollection(
                                                    collection,
                                                )
                                            }
                                            onExportCsv={() =>
                                                handleExportCollectionToCsv(
                                                    collection,
                                                )
                                            }
                                            onOpenLinks={() =>
                                                handleOpenCollectionLinks(
                                                    collection,
                                                )
                                            }
                                            onRename={() =>
                                                handleRequestRenameCollection(
                                                    collection,
                                                )
                                            }
                                            onSelect={() =>
                                                onSelectCollection(
                                                    collection.id,
                                                )
                                            }
                                            onUpdatePriority={(priority) =>
                                                handleUpdateCollectionPriority(
                                                    collection.id,
                                                    priority,
                                                )
                                            }
                                            previewThumbnailUrls={
                                                collectionPreviewThumbnailUrlsById.get(
                                                    collection.id,
                                                ) ?? []
                                            }
                                        />
                                    ))}
                                    <CollectionsListFeedback
                                        message={
                                            collectionActionFeedback?.message
                                        }
                                        onDismiss={() =>
                                            setCollectionActionFeedback(null)
                                        }
                                        tone={collectionActionFeedback?.tone}
                                    />
                                    <CollectionsListFilterClear
                                        isVisible={
                                            selectedCollectionIds.length > 0
                                        }
                                        onClear={onClearCollectionFilters}
                                    />
                                </>
                            ) : (
                                <CollectionsListEmpty />
                            )}
                        </CollectionsListContent>
                    </CollectionsList>
                </SidebarHeader>
                <SidebarFooter>{sidebarBottom}</SidebarFooter>
            </Sidebar>
            <Dialog
                onOpenChange={handleRenameDialogOpenChange}
                open={pendingRenameCollection !== null}
            >
                <DialogPopup showCloseButton>
                    <form
                        className="contents"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleRenameCollectionSubmit();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>Rename collection</DialogTitle>
                            <DialogDescription>
                                Update how this collection appears across your
                                library.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogPanel>
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={renameInputId}
                                >
                                    Name
                                </label>
                                <Input
                                    autoFocus
                                    id={renameInputId}
                                    maxLength={64}
                                    onChange={(event) => {
                                        setRenameDialogDraft(
                                            event.currentTarget.value,
                                        );
                                        if (renameDialogError) {
                                            setRenameDialogError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    type="text"
                                    required
                                    value={renameDialogDraft}
                                />
                                {renameDialogError ? (
                                    <p className="pt-2 text-destructive text-xs">
                                        {renameDialogError}
                                    </p>
                                ) : null}
                            </div>
                        </DialogPanel>
                        <DialogFooter>
                            <DialogClose
                                disabled={isRenamePending}
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                loading={isRenamePending}
                                size="sm"
                                type="submit"
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogPopup>
            </Dialog>
            <Dialog
                onOpenChange={handleCreateDialogOpenChange}
                open={isCreateDialogOpen}
            >
                <DialogPopup showCloseButton>
                    <form
                        className="contents"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleCreateCollectionSubmit();
                        }}
                    >
                        <DialogHeader>
                            <div className="flex items-center gap-1">
                                <Badge size="lg" variant="outline">
                                    <Image
                                        alt=""
                                        height={12}
                                        src={AppIconSmall}
                                        width={12}
                                    />
                                    Cache
                                </Badge>
                                <ChevronRight className="inline-block size-3.5 shrink-0" />
                                <DialogTitle className="font-medium text-sm">
                                    New collection
                                </DialogTitle>
                            </div>
                        </DialogHeader>
                        <DialogPanel className="space-y-2">
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createInputId}
                                >
                                    Name
                                </label>
                                <Input
                                    autoFocus
                                    className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                    id={createInputId}
                                    maxLength={64}
                                    onChange={(event) => {
                                        setCreateDialogDraft(
                                            event.currentTarget.value,
                                        );
                                        if (createDialogError) {
                                            setCreateDialogError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    required
                                    size="lg"
                                    type="text"
                                    unstyled
                                    value={createDialogDraft}
                                />
                            </div>
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createDescriptionId}
                                >
                                    Description (optional)
                                </label>
                                <Textarea
                                    className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                    id={createDescriptionId}
                                    maxLength={1024}
                                    onChange={(event) => {
                                        setCreateDialogDescriptionDraft(
                                            event.currentTarget.value,
                                        );
                                    }}
                                    placeholder="Add description..."
                                    size="lg"
                                    unstyled
                                    value={createDialogDescriptionDraft}
                                />
                            </div>
                        </DialogPanel>
                        <DialogFooter>
                            <Button
                                variant="link"
                                size="xs"
                                type="button"
                                className="mr-auto -ml-2"
                            >
                                <Shapes className="size-4" />
                                Explore Templates
                            </Button>
                            <DialogClose
                                disabled={isCreatePending}
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                loading={isCreatePending}
                                size="sm"
                                type="submit"
                            >
                                Create collection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogPopup>
            </Dialog>
            <Dialog
                onOpenChange={handleDeleteCollectionDialogOpenChange}
                open={pendingDeleteCollection !== null}
            >
                <DialogPopup>
                    <DialogHeader>
                        <DialogTitle>Delete collection?</DialogTitle>
                        <DialogDescription>
                            Remove{" "}
                            {pendingDeleteCollection?.name || "this collection"}{" "}
                            from Cache. Saved items will remain in your library,
                            but they won't belong to this collection anymore.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter variant="default">
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDeleteCollection}
                            size="sm"
                            variant="destructive"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
        </>
    );
}

/** Base UI combobox close reason when an item is activated (inline mode still emits this). */
const COMBOBOX_ITEM_PRESS_REASON = "item-press";
const ALL_DOMAIN_FILTER = "__all_domains__";

const WWW_PREFIX_RE = /^www\./;
const IS_MAC =
    typeof window !== "undefined" && navigator.userAgent.includes("Mac");
const SEARCH_HOTKEYS = [
    "cmd+k",
    "ctrl+k",
    "Meta+k",
    "cmd+p",
    "ctrl+p",
    "Meta+p",
    "/",
    "cmd+f",
    "ctrl+f",
    "Meta+f",
] as const;
const SEARCH_CANCEL_KEYS = ["esc", "tab"] as const;
const LIBRARY_COMMAND_PANEL_TOP_PX = 12;
const LIBRARY_SECTION_STICKY_GAP_PX = 8;
const FREE_LIBRARY_PREVIEW_ITEMS = 12;
const COLLECTION_NAME_MAX_LENGTH = 64;
type LibraryItem = LibraryItemWithCollections;

type GroupByMode =
    | "none"
    | "source"
    | "domain"
    | "month-added"
    | "month-created";
type SortMode =
    | "added-newest"
    | "added-oldest"
    | "created-newest"
    | "created-oldest"
    | "count-desc"
    | "source"
    | "domain";
type SourceFilterValue = LibraryItemSource;
type CollectionMembershipFilter =
    | "all"
    | "in-collections"
    | "not-in-collections";
type ColumnCountMode = "auto" | "2" | "3" | "4" | "5" | "6";
type PaletteSection = "search" | "filter" | "group" | "sort" | "layout";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
const FILTERABLE_LIBRARY_SOURCES = [
    LibraryItemSource.cache_note,
    LibraryItemSource.chrome_bookmarks,
    LibraryItemSource.google_photos,
    LibraryItemSource.instagram,
    LibraryItemSource.pinterest,
    LibraryItemSource.tiktok,
    LibraryItemSource.x_bookmarks,
    LibraryItemSource.youtube_watch_later,
] as const satisfies readonly LibraryItemSource[];

/** Stable placeholders for empty-library masonry sneak peek (opacity fades by order). */
const EMPTY_LIBRARY_PEEK_PLACEHOLDERS = [
    { aspect: "aspect-[3/4]", id: "library-empty-peek-0" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-1" },
    { aspect: "aspect-square", id: "library-empty-peek-2" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-3" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-4" },
    { aspect: "aspect-square", id: "library-empty-peek-5" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-6" },
    { aspect: "aspect-[3/4]", id: "library-empty-peek-7" },
    { aspect: "aspect-[5/6]", id: "library-empty-peek-8" },
    { aspect: "aspect-[4/5]", id: "library-empty-peek-9" },
] as const;

const PALETTE_SORT_OPTIONS = [
    { label: "Added: Newest first", value: "added-newest" as const },
    { label: "Added: Oldest first", value: "added-oldest" as const },
    { label: "Created: Newest first", value: "created-newest" as const },
    { label: "Created: Oldest first", value: "created-oldest" as const },
    { label: "Count: Most items first", value: "count-desc" as const },
    { label: "Source", value: "source" as const },
    { label: "Domain", value: "domain" as const },
];

const PALETTE_GROUP_OPTIONS = [
    { label: "No grouping", value: "none" as const },
    { label: "Source", value: "source" as const },
    { label: "Domain", value: "domain" as const },
    { label: "Month Added", value: "month-added" as const },
    { label: "Month Created", value: "month-created" as const },
];

const PALETTE_COLUMN_OPTIONS = [
    { label: "Auto columns", value: "auto" as const },
    { label: "2 columns", value: "2" as const },
    { label: "3 columns", value: "3" as const },
    { label: "4 columns", value: "4" as const },
    { label: "5 columns", value: "5" as const },
    { label: "6 columns", value: "6" as const },
];

const getSystemControlKey = () => (IS_MAC ? "⌘" : "Ctrl");

interface CommandPaletteItem {
    readonly active?: boolean;
    readonly description?: string;
    readonly label: string;
    readonly onSelect: (
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent,
    ) => void | Promise<void>;
    readonly shortcut?: string;
    readonly value: string;
}

interface CommandPaletteGroup {
    readonly items: CommandPaletteItem[];
    readonly label: string;
}

interface LibraryBrowserSection {
    readonly items: LibraryItemWithCollections[];
    readonly key: string;
    readonly paywallPreviewCount?: number;
    readonly showPaywallBanner?: boolean;
    readonly title: string | null;
}

interface SectionCollapseState {
    readonly collapseAllSections: () => void;
    readonly collapsedSectionKeys: string[];
    readonly enableSectionCollapse: boolean;
    readonly expandAllSections: () => void;
    readonly layoutRefreshToken: number;
    readonly toggleSection: (key: string) => void;
}

function itemDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(WWW_PREFIX_RE, "") || "Other";
    } catch {
        return "Other";
    }
}

function itemDate(
    item: LibraryItem,
    mode: "added" | "created" = "added",
): Date {
    const value =
        mode === "created"
            ? (item.postedAt ?? item.scrapedAt ?? item.createdAt)
            : (item.scrapedAt ?? item.createdAt);
    return value instanceof Date ? value : new Date(value);
}

function itemTimestamp(
    item: LibraryItem,
    mode: "added" | "created" = "added",
): number {
    return itemDate(item, mode).getTime();
}

function itemMonthKey(
    item: LibraryItem,
    mode: "added" | "created" = "added",
): string {
    const date = itemDate(item, mode);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function itemPrimaryText(item: LibraryItem): string {
    if (item.kind === "note") {
        return item.noteContentText?.trim() || "Untitled note";
    }
    const caption = item.caption?.trim();
    return caption && caption.length > 0 ? caption : item.url;
}

function sourceLabel(source: LibraryItemSource): string {
    if (source === LibraryItemSource.cache_note) {
        return "Notes";
    }
    if (source === LibraryItemSource.chrome_bookmarks) {
        return "Chrome";
    }
    if (source === LibraryItemSource.google_photos) {
        return "Google Photos";
    }
    if (source === LibraryItemSource.instagram) {
        return "Instagram";
    }
    if (source === LibraryItemSource.pinterest) {
        return "Pinterest";
    }
    if (source === LibraryItemSource.tiktok) {
        return "TikTok";
    }
    if (source === LibraryItemSource.x_bookmarks) {
        return "X";
    }
    if (source === LibraryItemSource.youtube_watch_later) {
        return "YouTube";
    }
    return "Other";
}

const PALETTE_SOURCE_OPTIONS = [
    { label: "All sources", value: "all" as const },
    ...FILTERABLE_LIBRARY_SOURCES.map((source) => ({
        label: sourceLabel(source),
        value: source,
    })),
    { label: sourceLabel(LibraryItemSource.other), value: "other" as const },
];

function buildResultsCollectionName(searchTerms: readonly string[]): string {
    const normalizedTerms = searchTerms
        .map((term) => term.trim())
        .filter((term) => term.length > 0);

    if (normalizedTerms.length === 0) {
        return "";
    }

    return normalizedTerms.join(" + ").slice(0, COLLECTION_NAME_MAX_LENGTH);
}

function formatGroupHeading(mode: GroupByMode, key: string): string {
    if (mode === "source") {
        return sourceLabel(key as LibraryItemSource);
    }
    if (mode === "month-added" || mode === "month-created") {
        const [ys, ms] = key.split("-");
        const y = Number(ys);
        const m = Number(ms);
        if (!(Number.isFinite(y) && Number.isFinite(m))) {
            return key;
        }
        return new Date(y, m - 1).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
        });
    }
    return key;
}

function compareItems(
    a: LibraryItem,
    b: LibraryItem,
    sortMode: SortMode,
): number {
    if (sortMode === "added-newest") {
        return (
            itemTimestamp(b, "added") - itemTimestamp(a, "added") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "added-oldest") {
        return (
            itemTimestamp(a, "added") - itemTimestamp(b, "added") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-newest") {
        return (
            itemTimestamp(b, "created") - itemTimestamp(a, "created") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "created-oldest") {
        return (
            itemTimestamp(a, "created") - itemTimestamp(b, "created") ||
            NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    if (sortMode === "source") {
        return (
            NAME_COLLATOR.compare(
                sourceLabel(a.source),
                sourceLabel(b.source),
            ) || NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
        );
    }
    return (
        NAME_COLLATOR.compare(itemDomain(a.url), itemDomain(b.url)) ||
        NAME_COLLATOR.compare(itemPrimaryText(a), itemPrimaryText(b))
    );
}

function compareSectionKeys(
    a: string,
    b: string,
    groupBy: GroupByMode,
    sortMode: SortMode,
): number {
    if (groupBy === "month-added" || groupBy === "month-created") {
        const isOldest =
            sortMode === "added-oldest" || sortMode === "created-oldest";
        return isOldest ? a.localeCompare(b) : b.localeCompare(a);
    }
    if (groupBy === "source") {
        return NAME_COLLATOR.compare(
            formatGroupHeading(groupBy, a),
            formatGroupHeading(groupBy, b),
        );
    }
    return NAME_COLLATOR.compare(a, b);
}

function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

function appendUniqueSearchTerm(
    values: readonly string[],
    next: string,
): string[] {
    const normalized = next.trim();
    if (!normalized) {
        return [...values];
    }
    return values.some(
        (value) => value.toLowerCase() === normalized.toLowerCase(),
    )
        ? [...values]
        : [...values, normalized];
}

function matchesCommandPaletteItem(item: unknown, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    if (!item || typeof item !== "object") {
        return false;
    }

    const candidate = item as Partial<CommandPaletteItem>;

    return [candidate.label, candidate.description, candidate.value].some(
        (field) => field?.toLowerCase().includes(normalizedQuery),
    );
}

function removeValue<T>(values: readonly T[], value: T): T[] {
    return values.filter((entry) => entry !== value);
}

function toggleValue<T>(values: readonly T[], next: T): T[] {
    return values.includes(next)
        ? values.filter((entry) => entry !== next)
        : [...values, next];
}

function isSearchHotkey(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const hasMeta = event.metaKey;
    const hasCtrl = event.ctrlKey;
    const hasAlt = event.altKey;
    const eventHotkeys = new Set<string>();

    if (!(hasAlt || hasMeta || hasCtrl)) {
        eventHotkeys.add(key);
    }
    if (!hasAlt && hasMeta) {
        eventHotkeys.add(`cmd+${key}`);
        eventHotkeys.add(`Meta+${key}`);
    }
    if (!hasAlt && hasCtrl) {
        eventHotkeys.add(`ctrl+${key}`);
    }

    return SEARCH_HOTKEYS.some((hotkey) => eventHotkeys.has(hotkey));
}

function isSearchCancelKey(
    event: React.KeyboardEvent<HTMLInputElement>,
): boolean {
    const key = event.key.toLowerCase();
    return SEARCH_CANCEL_KEYS.includes(
        key as (typeof SEARCH_CANCEL_KEYS)[number],
    );
}

function sortModeLabel(mode: SortMode): string {
    if (mode === "added-newest") {
        return "Added: Newest first";
    }
    if (mode === "added-oldest") {
        return "Added: Oldest first";
    }
    if (mode === "created-newest") {
        return "Created: Newest first";
    }
    if (mode === "created-oldest") {
        return "Created: Oldest first";
    }
    if (mode === "count-desc") {
        return "Count: Most items first";
    }
    if (mode === "source") {
        return "Source";
    }
    if (mode === "domain") {
        return "Domain";
    }
    return sortModeLabel(DEFAULT_SORT_MODE);
}

function groupByLabel(mode: GroupByMode): string {
    if (mode === "source") {
        return "Source";
    }
    if (mode === "domain") {
        return "Domain";
    }
    if (mode === "month-added") {
        return "Month Added";
    }
    if (mode === "month-created") {
        return "Month Created";
    }
    return "None";
}

function columnCountLabel(mode: ColumnCountMode): string {
    return mode === "auto" ? "Auto columns" : `${mode} columns`;
}

function collectionMembershipFilterLabel(
    filter: CollectionMembershipFilter,
): string {
    if (filter === "in-collections") {
        return "In collections";
    }
    if (filter === "not-in-collections") {
        return "Not in collections";
    }
    return "All items";
}

function PaletteChip({
    label,
    onRemove,
}: {
    readonly label: string;
    readonly onRemove: () => void;
}) {
    return (
        <span className="palette-chip-enter inline-flex max-w-[min(100%,12rem)] items-center gap-0.5 rounded-full border border-border/60 bg-background/90 py-0.5 ps-2 pe-0.5 font-medium text-foreground text-xs shadow-xs/5 dark:bg-background/40">
            <span className="min-w-0 truncate">{label}</span>
            <Button
                aria-label={`Remove ${label}`}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                }}
                type="button"
                size="icon-xs"
                variant="ghost"
                className="rounded-full"
            >
                <XIcon className="size-3.5 shrink-0" />
            </Button>
        </span>
    );
}

function renderLibraryGridBody({
    collapsedSectionKeys,
    collections,
    clearLibraryPalette,
    columnCount,
    enableSectionCollapse,
    layoutRefreshToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggleSection,
    paywallTotalCount,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: {
    readonly collapsedSectionKeys: ReadonlySet<string>;
    readonly collections: readonly LibraryCollectionSummary[];
    readonly clearLibraryPalette: () => void;
    readonly columnCount?: number;
    readonly enableSectionCollapse: boolean;
    readonly layoutRefreshToken: number;
    readonly onCopyLink: (item: LibraryItem) => void;
    readonly onDelete: (item: LibraryItem) => void;
    readonly onOpenNote: (item: LibraryItem) => void;
    readonly onOpenHere: (item: LibraryItem) => void;
    readonly onOpenInNewTab: (item: LibraryItem) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
    ) => void;
    readonly onToggleSection: (key: string) => void;
    readonly paywallTotalCount?: number;
    readonly pendingCollectionItemIds: readonly string[];
    readonly pendingDeleteItemId: string | null;
    readonly sections: readonly LibraryBrowserSection[];
    readonly showEmptyLibraryPeek: boolean;
    readonly showNoFilteredResults: boolean;
}): React.ReactNode {
    if (showEmptyLibraryPeek) {
        return <ExtensionLibraryEmptyMasonryPeek />;
    }

    if (showNoFilteredResults) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 border-dashed bg-card/30 px-6 py-14 text-center">
                <p className="max-w-md text-balance text-muted-foreground text-sm">
                    No saved items match the current search and filters.
                </p>
                <Button
                    onClick={clearLibraryPalette}
                    size="sm"
                    variant="outline"
                >
                    Reset browser
                </Button>
            </div>
        );
    }

    return sections.map((section) =>
        enableSectionCollapse ? (
            <ExtensionLibrarySection
                accentKey={section.key}
                collapsed={collapsedSectionKeys.has(section.key)}
                collapsible
                collections={collections}
                columnCount={columnCount}
                emptyHint="No saved items in this section."
                items={section.items}
                key={section.key}
                layoutToken={layoutRefreshToken}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onOpenHere={onOpenHere}
                onOpenInNewTab={onOpenInNewTab}
                onOpenNote={onOpenNote}
                onToggle={() => onToggleSection(section.key)}
                onUpdateItemCollections={onUpdateItemCollections}
                paywallPreviewCount={section.paywallPreviewCount}
                paywallTotalCount={paywallTotalCount}
                pendingCollectionItemIds={pendingCollectionItemIds}
                pendingDeleteItemId={pendingDeleteItemId}
                showPaywallBanner={section.showPaywallBanner}
                title={section.title ?? "Results"}
            />
        ) : (
            <section className="flex w-full flex-col gap-3" key={section.key}>
                {section.title ? (
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-foreground text-sm">
                            {section.title}
                        </h2>
                        <span className="text-muted-foreground text-xs tabular-nums">
                            {section.items.length} item
                            {section.items.length === 1 ? "" : "s"}
                        </span>
                    </div>
                ) : null}
                <ExtensionLibraryGrid
                    collections={collections}
                    columnCount={columnCount}
                    items={section.items}
                    layoutToken={layoutRefreshToken}
                    onCopyLink={onCopyLink}
                    onDelete={onDelete}
                    onOpenHere={onOpenHere}
                    onOpenInNewTab={onOpenInNewTab}
                    onOpenNote={onOpenNote}
                    onUpdateItemCollections={onUpdateItemCollections}
                    paywallPreviewCount={section.paywallPreviewCount}
                    paywallTotalCount={paywallTotalCount}
                    pendingCollectionItemIds={pendingCollectionItemIds}
                    pendingDeleteItemId={pendingDeleteItemId}
                    showPaywallBanner={section.showPaywallBanner}
                />
            </section>
        ),
    );
}

function buildSearchPaletteGroups({
    clearLibraryPalette,
    draft,
    hasAnyRefinements,
    navigationItems,
    searchTerms,
    setCommandListOpen,
    setPaletteInput,
    setSearchTerms,
}: {
    readonly clearLibraryPalette: () => void;
    readonly draft: string;
    readonly hasAnyRefinements: boolean;
    readonly navigationItems: CommandPaletteItem[];
    readonly searchTerms: string[];
    readonly setCommandListOpen: (value: boolean) => void;
    readonly setPaletteInput: (value: string) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
}): CommandPaletteGroup[] {
    const groups: CommandPaletteGroup[] = [];
    const draftAlreadyIncluded = searchTerms.some(
        (term) => term.toLowerCase() === draft.toLowerCase(),
    );

    if (draft) {
        groups.push({
            items: [
                {
                    active: draftAlreadyIncluded,
                    description: draftAlreadyIncluded
                        ? "Already included in the stacked search"
                        : "Add this search term to the current stack",
                    label: `Add search "${draft}"`,
                    onSelect: () => {
                        setSearchTerms((current) =>
                            appendUniqueSearchTerm(current, draft),
                        );
                        setPaletteInput("");
                        setCommandListOpen(true);
                    },
                    shortcut: "Enter",
                    value: `add search ${draft}`,
                },
            ],
            label: "Search",
        });
    }

    if (searchTerms.length > 0) {
        groups.push({
            items: [
                ...searchTerms.map((term) => ({
                    active: true,
                    description: "Active stacked search term",
                    label: `Search: ${truncateLabel(term, 28)}`,
                    onSelect: () =>
                        setSearchTerms((current) => removeValue(current, term)),
                    value: `remove search ${term}`,
                })),
                {
                    description: "Remove every committed search term",
                    label: "Clear all searches",
                    onSelect: () => {
                        setSearchTerms([]);
                        setCommandListOpen(true);
                    },
                    value: "clear all searches",
                },
            ],
            label: "Current search",
        });
    }

    groups.push({
        items: navigationItems,
        label: "View",
    });

    if (hasAnyRefinements) {
        groups.push({
            items: [
                {
                    description:
                        "Reset search, filters, grouping, sort, and layout",
                    label: "Reset browser",
                    onSelect: clearLibraryPalette,
                    value: "reset browser state",
                },
            ],
            label: "Quick actions",
        });
    }

    groups.push({
        items: [
            {
                description: "Get in touch with the team",
                label: "Contact support",
                onSelect: () => {
                    window.location.href = "mailto:support@cachd.app";
                },
                shortcut: "?",
                value: "help support",
            },
            {
                description: "Tell us what is missing",
                label: "Send feedback",
                onSelect: () => {
                    // Try to trigger the FeedbackWidget toggle if possible,
                    // otherwise fall back to mailto.
                    window.location.href = "mailto:feedback@cachd.app";
                },
                shortcut: "F",
                value: "help feedback",
            },
        ],
        label: "Help",
    });

    return groups;
}

interface BuildLibraryPaletteGroupsInput {
    readonly clearLibraryPalette: () => void;
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly columnCountMode: ColumnCountMode;
    readonly domainFilters: readonly string[];
    readonly domainOptions: readonly {
        readonly label: string;
        readonly value: string;
    }[];
    readonly groupBy: GroupByMode;
    readonly openPaletteSection: (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent,
    ) => void;
    readonly paletteInput: string;
    readonly paletteSection: PaletteSection;
    readonly returnToSearchSection: () => void;
    readonly searchTerms: readonly string[];
    readonly selectedCollectionIdsLength: number;
    readonly setCollectionMembershipFilter: (
        value: CollectionMembershipFilter,
    ) => void;
    readonly setColumnCountMode: (value: ColumnCountMode) => void;
    readonly setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean),
    ) => void;
    readonly setDomainFilters: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setGroupBy: (value: GroupByMode) => void;
    readonly setPaletteInput: (value: string) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setSortMode: (value: SortMode) => void;
    readonly setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[]),
    ) => void;
    readonly sortMode: SortMode;
    readonly sourceFilters: readonly SourceFilterValue[];
}

function buildDomainPaletteOptions(
    items: readonly LibraryItem[],
): { label: string; value: string }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const domain = itemDomain(item.url);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    const dynamicDomains = Array.from(counts.entries())
        .sort(
            ([aDomain, aCount], [bDomain, bCount]) =>
                bCount - aCount || NAME_COLLATOR.compare(aDomain, bDomain),
        )
        .map(([domain, count]) => ({
            label: `${domain} (${count})`,
            value: domain,
        }));

    return [
        { label: "All domains", value: ALL_DOMAIN_FILTER },
        ...dynamicDomains,
    ];
}

function buildLibraryPaletteGroups({
    clearLibraryPalette,
    columnCountMode,
    collectionMembershipFilter,
    domainFilters,
    domainOptions,
    groupBy,
    openPaletteSection,
    paletteInput,
    paletteSection,
    returnToSearchSection,
    searchTerms,
    selectedCollectionIdsLength,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setCommandListOpen,
    setDomainFilters,
    setGroupBy,
    setPaletteInput,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: BuildLibraryPaletteGroupsInput): CommandPaletteGroup[] {
    const draft = paletteInput.trim();
    const groups: CommandPaletteGroup[] = [];

    const applyAndReturn = (fn: () => void | Promise<void>) => async () => {
        await fn();
        returnToSearchSection();
    };
    const applyAndStay = (fn: () => void) => () => {
        fn();
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const navigationItems: CommandPaletteItem[] = [
        {
            description: "Source and domain filters",
            label: "Filter by…",
            onSelect: (event) => openPaletteSection("filter", event),
            shortcut: "F",
            value: "navigate filters",
        },
        {
            description: `Current: ${groupByLabel(groupBy)}`,
            label: "Group by…",
            onSelect: (event) => openPaletteSection("group", event),
            shortcut: "G",
            value: "navigate grouping",
        },
        {
            description: `Current: ${sortModeLabel(sortMode)}`,
            label: "Sort by…",
            onSelect: (event) => openPaletteSection("sort", event),
            shortcut: "S",
            value: "navigate sorting",
        },
        {
            description: `Current: ${columnCountLabel(columnCountMode)}`,
            label: "Layout…",
            onSelect: (event) => openPaletteSection("layout", event),
            shortcut: "L",
            value: "navigate layout",
        },
    ];

    const backItem: CommandPaletteItem = {
        description: "Return to search and quick actions",
        label: "Back",
        onSelect: returnToSearchSection,
        shortcut: "Esc",
        value: "navigate back",
    };
    const hasAnyRefinements =
        searchTerms.length > 0 ||
        selectedCollectionIdsLength > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

    if (paletteSection === "search") {
        return buildSearchPaletteGroups({
            clearLibraryPalette,
            draft,
            hasAnyRefinements,
            navigationItems,
            searchTerms: [...searchTerms],
            setCommandListOpen,
            setPaletteInput,
            setSearchTerms,
        });
    }

    if (paletteSection === "filter") {
        groups.push({
            items: [backItem],
            label: "Navigation",
        });
        groups.push({
            items: [
                {
                    active: sourceFilters.length === 0,
                    description: "Show every source",
                    label: "Source: All sources",
                    onSelect: applyAndStay(() => setSourceFilters([])),
                    value: "filter source all",
                },
                ...PALETTE_SOURCE_OPTIONS.filter(
                    (option) => option.value !== "all",
                ).map((option) => ({
                    active: sourceFilters.includes(
                        option.value as SourceFilterValue,
                    ),
                    description: "Toggle this source in the filter stack",
                    label: `Source: ${option.label}`,
                    onSelect: applyAndStay(() =>
                        setSourceFilters((current) =>
                            toggleValue(
                                current,
                                option.value as SourceFilterValue,
                            ),
                        ),
                    ),
                    value: `filter source ${option.value}`,
                })),
            ],
            label: "Conditions",
        });
        groups.push({
            items: [
                {
                    active:
                        collectionMembershipFilter ===
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                    description:
                        "Show items whether or not they are in collections",
                    label: "Collections: All items",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter(
                            DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                        ),
                    ),
                    value: "filter collections all",
                },
                {
                    active: collectionMembershipFilter === "in-collections",
                    description:
                        "Show only items that belong to at least one collection",
                    label: "Collections: In collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("in-collections"),
                    ),
                    value: "filter collections in",
                },
                {
                    active: collectionMembershipFilter === "not-in-collections",
                    description:
                        "Show only items that do not belong to any collection",
                    label: "Collections: Not in collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("not-in-collections"),
                    ),
                    value: "filter collections not-in",
                },
            ],
            label: "Collections",
        });
        groups.push({
            items: domainOptions.map((option) => ({
                active:
                    option.value === ALL_DOMAIN_FILTER
                        ? domainFilters.length === 0
                        : domainFilters.includes(option.value),
                description:
                    option.value === ALL_DOMAIN_FILTER
                        ? "Show items from every domain"
                        : "Toggle this domain in the filter stack",
                label: `Domain: ${option.label}`,
                onSelect: applyAndStay(() =>
                    option.value === ALL_DOMAIN_FILTER
                        ? setDomainFilters([])
                        : setDomainFilters((current) =>
                              toggleValue(current, option.value),
                          ),
                ),
                value: `filter domain ${option.value}`,
            })),
            label: "Domain",
        });
        return groups;
    }

    if (paletteSection === "group") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: PALETTE_GROUP_OPTIONS.map((option) => ({
                    active: groupBy === option.value,
                    description: "Organize the grid into sections",
                    label: option.label,
                    onSelect: applyAndReturn(() =>
                        setGroupBy(option.value as GroupByMode),
                    ),
                    value: `group ${option.value}`,
                })),
                label: "Grouping",
            },
        ];
    }

    if (paletteSection === "sort") {
        return [
            { items: [backItem], label: "Navigation" },
            {
                items: PALETTE_SORT_OPTIONS.map((option) => ({
                    active: sortMode === option.value,
                    description: "Change the ordering within the current view",
                    label: option.label,
                    onSelect: applyAndReturn(() =>
                        setSortMode(option.value as SortMode),
                    ),
                    value: `sort ${option.value}`,
                })),
                label: "Sorting",
            },
        ];
    }

    return [
        { items: [backItem], label: "Navigation" },
        {
            items: PALETTE_COLUMN_OPTIONS.map((option) => ({
                active: columnCountMode === option.value,
                description:
                    option.value === "auto"
                        ? "Let the masonry adapt to the available width"
                        : "Force a specific number of columns",
                label: option.label,
                onSelect: applyAndReturn(() =>
                    setColumnCountMode(option.value as ColumnCountMode),
                ),
                value: `columns ${option.value}`,
            })),
            label: "Layout",
        },
    ];
}

function filterLibraryBrowserItems(
    items: readonly LibraryItemWithCollections[],
    input: {
        readonly collectionMembershipFilter: CollectionMembershipFilter;
        readonly domainFilters: readonly string[];
        readonly searchTerms: readonly string[];
        readonly selectedCollectionIds: readonly string[];
        readonly sourceFilters: readonly SourceFilterValue[];
    },
): LibraryItemWithCollections[] {
    let list = [...items];
    const normalizedSearchTerms = input.searchTerms.map((term) =>
        term.trim().toLowerCase(),
    );

    if (input.selectedCollectionIds.length > 0) {
        list = list.filter((item) =>
            item.collections.some((collection) =>
                input.selectedCollectionIds.includes(collection.id),
            ),
        );
    }

    if (input.collectionMembershipFilter === "in-collections") {
        list = list.filter((item) => item.collections.length > 0);
    }

    if (input.collectionMembershipFilter === "not-in-collections") {
        list = list.filter((item) => item.collections.length === 0);
    }

    if (normalizedSearchTerms.length > 0) {
        list = list.filter((item) => {
            const cap = item.caption?.toLowerCase() ?? "";
            const noteText = item.noteContentText?.toLowerCase() ?? "";
            const url = item.url.toLowerCase();
            return normalizedSearchTerms.some(
                (term) =>
                    cap.includes(term) ||
                    noteText.includes(term) ||
                    url.includes(term),
            );
        });
    }

    if (input.sourceFilters.length > 0) {
        list = list.filter((item) => input.sourceFilters.includes(item.source));
    }

    if (input.domainFilters.length > 0) {
        list = list.filter((item) =>
            input.domainFilters.includes(itemDomain(item.url)),
        );
    }

    return list;
}

function sortLibraryBrowserItems(
    filteredItems: readonly LibraryItemWithCollections[],
    sortMode: SortMode,
): LibraryItemWithCollections[] {
    const itemSortMode =
        sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
    return [...filteredItems].sort((a, b) => compareItems(a, b, itemSortMode));
}

function buildLibraryBrowserSections(
    sortedItems: readonly LibraryItemWithCollections[],
    groupBy: GroupByMode,
    sortMode: SortMode,
): LibraryBrowserSection[] {
    if (groupBy === "none") {
        return [
            {
                items: sortedItems as LibraryItemWithCollections[],
                key: "all",
                title: null as string | null,
            },
        ];
    }

    const buckets = new Map<string, LibraryItemWithCollections[]>();
    for (const item of sortedItems) {
        let key = "Other";
        if (groupBy === "source") {
            key = item.source;
        } else if (groupBy === "domain") {
            key = itemDomain(item.url);
        } else if (groupBy === "month-added") {
            key = itemMonthKey(item, "added");
        } else if (groupBy === "month-created") {
            key = itemMonthKey(item, "created");
        }

        const bucket = buckets.get(key) ?? [];
        bucket.push(item);
        buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
        .sort(([a, aItems], [b, bItems]) => {
            if (sortMode === "count-desc") {
                return (
                    bItems.length - aItems.length ||
                    compareSectionKeys(a, b, groupBy, sortMode)
                );
            }

            return compareSectionKeys(a, b, groupBy, sortMode);
        })
        .map(([key, sectionItems]) => ({
            items: sectionItems,
            key,
            title: formatGroupHeading(groupBy, key),
        }));
}

async function saveLibraryNoteDraft({
    activeNote,
    draft,
}: {
    readonly activeNote: LibraryItemWithCollections | null;
    readonly draft: {
        readonly contentHtml: string;
    };
}): Promise<NoteMutationResult> {
    try {
        return activeNote
            ? await updateNote({
                  contentHtml: draft.contentHtml,
                  itemId: activeNote.id,
              })
            : await createNote({
                  contentHtml: draft.contentHtml,
              });
    } catch {
        return {
            message: activeNote
                ? "We couldn't save this note right now."
                : "We couldn't create this note right now.",
            status: "ERROR",
        };
    }
}

function gateLibraryBrowserSections(
    sections: readonly LibraryBrowserSection[],
    shouldGate: boolean,
): LibraryBrowserSection[] {
    if (!shouldGate) {
        return sections as LibraryBrowserSection[];
    }

    let remainingPreviewItems = FREE_LIBRARY_PREVIEW_ITEMS;
    let shouldShowPaywallBanner = true;

    return sections.map((section) => {
        const paywallPreviewCount = Math.min(
            section.items.length,
            remainingPreviewItems,
        );
        const hasLockedItems = paywallPreviewCount < section.items.length;

        remainingPreviewItems = Math.max(
            0,
            remainingPreviewItems - paywallPreviewCount,
        );

        if (hasLockedItems && shouldShowPaywallBanner) {
            shouldShowPaywallBanner = false;

            return {
                ...section,
                paywallPreviewCount,
                showPaywallBanner: true,
            };
        }

        return {
            ...section,
            paywallPreviewCount,
        };
    });
}

function getVisibleSectionItems(
    section: LibraryBrowserSection,
): LibraryItemWithCollections[] {
    const resolvedPreviewCount = Math.max(
        0,
        Math.min(
            section.paywallPreviewCount ?? section.items.length,
            section.items.length,
        ),
    );

    return section.items.slice(0, resolvedPreviewCount);
}

function libraryBrowserHasActiveFilters(input: {
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly domainFilters: readonly string[];
    readonly searchTerms: readonly string[];
    readonly selectedCollectionIds: readonly string[];
    readonly sourceFilters: readonly SourceFilterValue[];
}): boolean {
    return (
        input.searchTerms.length > 0 ||
        input.selectedCollectionIds.length > 0 ||
        input.sourceFilters.length > 0 ||
        input.domainFilters.length > 0 ||
        input.collectionMembershipFilter !==
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
    );
}

function applyVisiblePaletteShortcuts(
    paletteGroups: readonly CommandPaletteGroup[],
    paletteInput: string,
    systemControlKey: string,
): CommandPaletteGroup[] {
    const filtered = paletteGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                matchesCommandPaletteItem(item, paletteInput),
            ),
        }))
        .filter((group) => group.items.length > 0);

    let globalIndex = 0;
    return filtered.map((group) => ({
        ...group,
        items: group.items.map((item) => {
            globalIndex++;
            if (globalIndex <= 9) {
                return {
                    ...item,
                    shortcut: systemControlKey
                        ? `${systemControlKey}${globalIndex}`
                        : item.shortcut,
                };
            }
            return item;
        }),
    }));
}

function getStickySectionStyle(commandPanelShellHeight: number) {
    return {
        "--library-section-sticky-top": `${commandPanelShellHeight + LIBRARY_COMMAND_PANEL_TOP_PX + LIBRARY_SECTION_STICKY_GAP_PX}px`,
    } as React.CSSProperties;
}

function useSectionCollapseState({
    groupBy,
    hasActiveFilters,
    sections,
    showEmptyLibraryPeek,
    showNoFilteredResults,
}: {
    readonly groupBy: GroupByMode;
    readonly hasActiveFilters: boolean;
    readonly sections: readonly LibraryBrowserSection[];
    readonly showEmptyLibraryPeek: boolean;
    readonly showNoFilteredResults: boolean;
}): SectionCollapseState {
    const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<string[]>(
        [],
    );
    const [layoutRefreshToken, setLayoutRefreshToken] = useState(0);

    const enableSectionCollapse =
        !(showEmptyLibraryPeek || showNoFilteredResults) &&
        (hasActiveFilters || groupBy !== "none");

    useEffect(() => {
        const validKeys = new Set(sections.map((section) => section.key));
        setCollapsedSectionKeys((current) => {
            const next = current.filter((key) => validKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [sections]);

    useEffect(() => {
        if (!enableSectionCollapse) {
            setCollapsedSectionKeys((current) =>
                current.length === 0 ? current : [],
            );
        }
    }, [enableSectionCollapse]);

    const toggleSection = (key: string) => {
        setCollapsedSectionKeys((current) =>
            current.includes(key)
                ? current.filter((entry) => entry !== key)
                : [...current, key],
        );
        setLayoutRefreshToken((current) => current + 1);
    };

    const collapseAllSections = () => {
        setCollapsedSectionKeys(sections.map((section) => section.key));
        setLayoutRefreshToken((current) => current + 1);
    };

    const expandAllSections = () => {
        setCollapsedSectionKeys([]);
        setLayoutRefreshToken((current) => current + 1);
    };

    return {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        layoutRefreshToken,
        toggleSection,
    };
}

function LibraryPaletteTrailing({
    clearLibraryPalette,
    collectionMembershipFilter,
    columnCountMode,
    domainFilters,
    groupBy,
    paletteInput,
    searchTerms,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setDomainFilters,
    setGroupBy,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: {
    readonly clearLibraryPalette: () => void;
    readonly collectionMembershipFilter: CollectionMembershipFilter;
    readonly columnCountMode: ColumnCountMode;
    readonly domainFilters: string[];
    readonly groupBy: GroupByMode;
    readonly paletteInput: string;
    readonly searchTerms: string[];
    readonly setCollectionMembershipFilter: (
        value: CollectionMembershipFilter,
    ) => void;
    readonly setColumnCountMode: (value: ColumnCountMode) => void;
    readonly setDomainFilters: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setGroupBy: (value: GroupByMode) => void;
    readonly setSearchTerms: (
        value: string[] | ((value: string[]) => string[]),
    ) => void;
    readonly setSortMode: (value: SortMode) => void;
    readonly setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[]),
    ) => void;
    readonly sortMode: SortMode;
    readonly sourceFilters: SourceFilterValue[];
}) {
    const chips: React.ReactNode[] = [];

    for (const term of searchTerms) {
        chips.push(
            <PaletteChip
                key={`search-${term}`}
                label={`Search: ${truncateLabel(term)}`}
                onRemove={() =>
                    setSearchTerms((current) => removeValue(current, term))
                }
            />,
        );
    }

    for (const source of sourceFilters) {
        chips.push(
            <PaletteChip
                key={`source-${source}`}
                label={`Source: ${sourceLabel(source)}`}
                onRemove={() =>
                    setSourceFilters((current) => removeValue(current, source))
                }
            />,
        );
    }

    for (const domainFilter of domainFilters) {
        chips.push(
            <PaletteChip
                key={`domain-${domainFilter}`}
                label={`Domain: ${truncateLabel(domainFilter)}`}
                onRemove={() =>
                    setDomainFilters((current) =>
                        removeValue(current, domainFilter),
                    )
                }
            />,
        );
    }

    if (collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER) {
        chips.push(
            <PaletteChip
                key="collection-membership"
                label={`Collections: ${collectionMembershipFilterLabel(collectionMembershipFilter)}`}
                onRemove={() =>
                    setCollectionMembershipFilter(
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
                    )
                }
            />,
        );
    }

    if (groupBy !== "none") {
        chips.push(
            <PaletteChip
                key="group"
                label={`Group: ${groupByLabel(groupBy)}`}
                onRemove={() => setGroupBy("none")}
            />,
        );
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
        chips.push(
            <PaletteChip
                key="sort"
                label={`Sort: ${sortModeLabel(sortMode)}`}
                onRemove={() => setSortMode(DEFAULT_SORT_MODE)}
            />,
        );
    }

    if (columnCountMode !== DEFAULT_COLUMN_COUNT_MODE) {
        chips.push(
            <PaletteChip
                key="columns"
                label={`Layout: ${columnCountLabel(columnCountMode)}`}
                onRemove={() => setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE)}
            />,
        );
    }

    const canReset = chips.length > 0 || paletteInput.length > 0;

    return (
        <>
            <TruncateAfter count={2}>{chips}</TruncateAfter>
            {canReset ? (
                <AutocompleteClear
                    keepMounted
                    render={
                        <Button
                            aria-label="Clear search, filters, grouping, sorting, layout, and command input"
                            className="rounded-full"
                            onClick={clearLibraryPalette}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                        />
                    }
                />
            ) : null}
        </>
    );
}

interface LibraryProps {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly items: LibraryItemWithCollections[];
    readonly onClearCollectionFilters: () => void;
    readonly onCreateCollectionFromResults: (input: {
        description?: string;
        itemIds: string[];
        name: string;
    }) => Promise<CreateCollectionFromItemsResult>;
    readonly onItemsChange: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[],
              ) => LibraryItemWithCollections[]),
    ) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
    ) => void;
    readonly pendingCollectionItemIds: readonly string[];
    readonly selectedCollectionIds: readonly string[];
}

interface LibraryActionFeedback {
    readonly message: string;
    readonly tone: "error" | "success";
}

interface UseLibraryItemActionsResult {
    readonly actionFeedback: LibraryActionFeedback | null;
    readonly handleConfirmDelete: () => void;
    readonly handleCopyLink: (item: LibraryItem) => void;
    readonly handleDeleteDialogOpenChange: (open: boolean) => void;
    readonly handleOpenHere: (item: LibraryItem) => void;
    readonly handleOpenInNewTab: (item: LibraryItem) => void;
    readonly handleRequestDelete: (item: LibraryItem) => void;
    readonly isDeletePending: boolean;
    readonly pendingDeleteItem: LibraryItem | null;
    readonly setActionFeedback: (
        value:
            | LibraryActionFeedback
            | null
            | ((
                  current: LibraryActionFeedback | null,
              ) => LibraryActionFeedback | null),
    ) => void;
}

function openSavedItemInNewTab(url: string) {
    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to a regular browser tab when the desktop bridge is unavailable.
    }

    window.open(url, "_blank", "noopener,noreferrer");
}

function useLibraryItemActions(
    setVisibleItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[],
              ) => LibraryItemWithCollections[]),
    ) => void,
): UseLibraryItemActionsResult {
    const [pendingDeleteItem, setPendingDeleteItem] =
        useState<LibraryItem | null>(null);
    const [actionFeedback, setActionFeedback] =
        useState<LibraryActionFeedback | null>(null);
    const [isDeletePending, startDeleteTransition] = useTransition();
    const { copyToClipboard } = useCopyToClipboard({
        onCopy: () => {
            setActionFeedback({
                message: "Saved link copied to the clipboard.",
                tone: "success",
            });
        },
    });

    const handleOpenInNewTab = (item: LibraryItem) => {
        setActionFeedback(null);
        openSavedItemInNewTab(normalizeURL(item.url));
    };

    const handleOpenHere = (item: LibraryItem) => {
        setActionFeedback(null);
        window.location.assign(normalizeURL(item.url));
    };

    const handleCopyLink = (item: LibraryItem) => {
        copyToClipboard(normalizeURL(item.url));
    };

    const handleRequestDelete = (item: LibraryItem) => {
        setActionFeedback(null);
        setPendingDeleteItem(item);
    };

    const handleDeleteDialogOpenChange = (open: boolean) => {
        if (!(open || isDeletePending)) {
            setPendingDeleteItem(null);
        }
    };

    const handleConfirmDelete = () => {
        const targetItem = pendingDeleteItem;
        if (!targetItem) {
            return;
        }

        startDeleteTransition(async () => {
            let result: DeleteLibraryItemResult;

            try {
                result = await deleteLibraryItem(targetItem.id);
            } catch {
                result = {
                    message: "We couldn't delete this saved item right now.",
                    status: "ERROR",
                };
            }

            if (result.status === "DELETED") {
                setVisibleItems((current) =>
                    current.filter((item) => item.id !== result.itemId),
                );
                setPendingDeleteItem(null);
                setActionFeedback({
                    message: "Saved item deleted from Cache.",
                    tone: "success",
                });
                return;
            }

            setActionFeedback({
                message: result.message,
                tone: "error",
            });
        });
    };

    return {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenHere,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    };
}

interface GridProps {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly columnCount?: number;
    readonly items: LibraryItemWithCollections[];
    readonly layoutToken?: number;
    readonly onCopyLink?: (item: LibraryItemWithCollections) => void;
    readonly onDelete?: (item: LibraryItemWithCollections) => void;
    readonly onOpenHere?: (item: LibraryItemWithCollections) => void;
    readonly onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    readonly onOpenNote?: (item: LibraryItemWithCollections) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
    ) => void;
    readonly paywallPreviewCount?: number;
    readonly paywallTotalCount?: number;
    readonly pendingCollectionItemIds: readonly string[];
    readonly pendingDeleteItemId?: string | null;
    readonly showPaywallBanner?: boolean;
}

interface SectionProps extends GridProps {
    readonly accentKey?: string;
    readonly collapsed?: boolean;
    readonly collapsible?: boolean;
    readonly emptyHint: string;
    readonly onToggle?: () => void;
    readonly title: string;
}

interface LibraryGridCardProps {
    readonly addedLabel: string;
    readonly alt: string;
    readonly collections: readonly LibraryCollectionSummary[];
    readonly createdLabel: string;
    readonly href: string;
    readonly item: LibraryItemWithCollections;
    readonly onCopyLink?: (item: LibraryItemWithCollections) => void;
    readonly onDelete?: (item: LibraryItemWithCollections) => void;
    readonly onOpenHere?: (item: LibraryItemWithCollections) => void;
    readonly onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    readonly onOpenNote?: (item: LibraryItemWithCollections) => void;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
    ) => void;
    readonly pendingDeleteItemId?: string | null;
    readonly previewDescription?: string;
    readonly previewTitle: string;
}

interface LockedLibraryGridCardProps {
    readonly alt: string;
    readonly item: LibraryItemWithCollections;
}

interface PreviewMediaProps {
    readonly alt: string;
    readonly fallbackLabel?: string;
    readonly src: string | null;
}

function itemDateLabel(dateValue: Date | string | null | undefined): string {
    if (!dateValue) {
        return "";
    }
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function fallbackGridStyle(columnCount?: number): CSSProperties | undefined {
    if (!columnCount) {
        return undefined;
    }
    return {
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
    };
}

function getItemTitle(item: LibraryItemWithCollections): string {
    if (item.kind === "note") {
        return "";
    }
    const caption = item.caption?.trim();
    if (caption) {
        return caption;
    }
    return item.url;
}

function opengraphPreviewUrl(item: LibraryItemWithCollections): string | null {
    if (item.thumbnailUrl) {
        return item.thumbnailUrl;
    }

    if (item.source !== LibraryItemSource.chrome_bookmarks) {
        return null;
    }

    const href = normalizeURL(item.url);
    if (href === "about:blank") {
        return null;
    }

    return `/api/library/opengraph-image?url=${encodeURIComponent(href)}`;
}

function PreviewMedia({
    alt,
    fallbackLabel = "No preview",
    src,
}: PreviewMediaProps): ReactElement {
    const [didFail, setDidFail] = useState(false);
    const imageSrc = src ?? undefined;
    const canRenderImage = Boolean(imageSrc) && !didFail;

    if (!canRenderImage) {
        return (
            <div className="flex size-full items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                {fallbackLabel}
            </div>
        );
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: image load failures drive the visual fallback state
        <img
            alt={alt}
            className="size-full object-cover"
            height={400}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={imageSrc}
            width={300}
        />
    );
}

/** @internal */
function CollectionComboboxPicker({
    collections,
    item,
    onUpdateItemCollections,
    open: openProp,
    onOpenChange,
}: {
    readonly collections: readonly LibraryCollectionSummary[];
    readonly item: LibraryItemWithCollections;
    readonly onUpdateItemCollections: (
        itemId: string,
        collectionIds: string[],
    ) => void;
    readonly open?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
}): ReactElement {
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;
    const selectedCollectionIds = item.collections.map(
        (collection) => collection.id,
    );
    const selectedCount = selectedCollectionIds.length;

    return (
        <Combobox
            autoHighlight
            items={collections}
            multiple
            onOpenChange={setIsOpen}
            onValueChange={(nextIds) => {
                onUpdateItemCollections(item.id, [...nextIds]);
            }}
            open={isOpen}
            value={selectedCollectionIds}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={
                            selectedCount > 0
                                ? `Edit collections (${selectedCount} selected)`
                                : "Add to collections"
                        }
                        className="rounded-full mix-blend-difference invert hover:brightness-125"
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                {selectedCount > 0 ? (
                    <CircleDot className="size-4.5" />
                ) : (
                    <CircleDashed className="size-4.5" />
                )}
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    endAddon={<Kbd>S</Kbd>}
                    placeholder="Assign collections..."
                />
                <ComboboxEmpty>No matching collections</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(collection) => (
                            <ComboboxItem
                                key={collection.id}
                                value={collection.id}
                            >
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                    <span className="min-w-0 truncate text-foreground text-sm">
                                        {collection.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                                        {collection.itemCount}
                                    </span>
                                </div>
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

function LibraryGridCard({
    addedLabel,
    alt,
    collections,
    createdLabel,
    href,
    item,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingDeleteItemId,
    previewDescription,
    previewTitle,
}: LibraryGridCardProps): ReactElement {
    const isNote = item.kind === "note";
    const isDeletePending = pendingDeleteItemId === item.id;
    const [isDownloading, setIsDownloading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
    const previewImageUrl = opengraphPreviewUrl(item);
    const cardRef = useRef<HTMLDivElement>(null);
    const canPreview = !isNote && toValidUrl(href) !== "about:blank";
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const displayTitle = getItemTitle(item);

    useHotkeys("s", () => setIsCollectionPickerOpen(true), {
        enabled: isHovered && !isCollectionPickerOpen,
        preventDefault: true,
    });

    const handlePrimaryClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isNote) {
            onOpenNote?.(item);
            return;
        }
        onOpenInNewTab?.(item);
    };

    const handleFullscreen = () => {
        if (cardRef.current && fscreen.fullscreenEnabled) {
            fscreen.requestFullscreen(cardRef.current);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const result = await downloadMedia(item.url);
            if (result.status === "SUCCESS") {
                // Use a hidden anchor to trigger download if possible, or just open in new tab
                const link = document.createElement("a");
                link.href = result.downloadUrl;
                link.download = ""; // Cobalt usually provides a good filename or direct link
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // alert(result.message);
                console.error(result.message);
            }
        } catch (error) {
            // alert("An unexpected error occurred while starting the download.");
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const renderCardMenuMeta = () => (
        <>
            <div className="relative mx-auto flex max-w-56 items-center gap-2 pt-2 pb-1.5 pl-2.5 opacity-50">
                <span className="block truncate text-xs">
                    {isNote ? "Note" : item.url}
                </span>
            </div>
            <div className="px-2.5 pb-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-3 py-0.5">
                    <span>Created</span>
                    <span className="text-foreground tabular-nums">
                        {createdLabel}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-0.5">
                    <span>Added</span>
                    <span className="text-foreground tabular-nums">
                        {addedLabel}
                    </span>
                </div>
            </div>
        </>
    );

    const renderPrimaryMenuItems = (
        Item: typeof ContextMenuItem | typeof MenuItem,
        Separator: typeof ContextMenuSeparator | typeof MenuSeparator,
    ) => (
        <>
            {isNote ? (
                <Item closeOnClick onClick={() => onOpenNote?.(item)}>
                    <FilePenLineIcon className="size-4.5 text-muted-foreground" />
                    Edit note
                </Item>
            ) : null}
            {canPreview ? (
                <PreviewDrawer
                    description={previewDescription}
                    title={previewTitle}
                    url={href}
                >
                    <PreviewDrawerTrigger
                        render={<Item closeOnClick={false} />}
                    >
                        <EyeIcon className="size-4.5 text-muted-foreground" />
                        Open preview
                    </PreviewDrawerTrigger>
                    <PreviewDrawerContent />
                </PreviewDrawer>
            ) : null}
            {isNote ? null : (
                <>
                    <Item closeOnClick onClick={() => onOpenInNewTab?.(item)}>
                        <ExternalLinkIcon className="size-4.5 text-muted-foreground" />
                        Open in new tab
                    </Item>
                    <Item closeOnClick onClick={() => onOpenHere?.(item)}>
                        <ArrowUpRightIcon className="size-4.5 text-muted-foreground" />
                        Open here
                    </Item>
                    <Item closeOnClick onClick={() => onCopyLink?.(item)}>
                        <LinkIcon className="size-4.5 text-muted-foreground" />
                        Copy link
                    </Item>
                    <Item closeOnClick onClick={handleFullscreen}>
                        <MaximizeIcon className="size-4.5 text-muted-foreground" />
                        View fullscreen
                    </Item>
                    <Item
                        closeOnClick
                        disabled={isDownloading}
                        onClick={handleDownload}
                    >
                        <DownloadIcon className="size-4.5 text-muted-foreground" />
                        {isDownloading ? "Downloading..." : "Download media"}
                    </Item>
                    <Separator />
                </>
            )}
        </>
    );

    const renderDeleteMenuItem = (menuKind: "context" | "menu") => {
        if (menuKind === "context") {
            return (
                <ContextMenuItem
                    className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                    closeOnClick
                    disabled={isDeletePending}
                    onClick={() => onDelete?.(item)}
                >
                    <Trash2Icon className="size-4.5" />
                    {isDeletePending ? "Deleting..." : "Delete"}
                </ContextMenuItem>
            );
        }

        return (
            <MenuItem
                closeOnClick
                disabled={isDeletePending}
                onClick={() => onDelete?.(item)}
                variant="destructive"
            >
                <Trash2Icon className="size-4.5" />
                {isDeletePending ? "Deleting..." : "Delete"}
            </MenuItem>
        );
    };

    const renderCardMenuContent = (menuKind: "context" | "menu") => {
        const Separator =
            menuKind === "context" ? ContextMenuSeparator : MenuSeparator;
        const Item = menuKind === "context" ? ContextMenuItem : MenuItem;

        return (
            <>
                {renderCardMenuMeta()}
                <Separator />
                {renderPrimaryMenuItems(Item, Separator)}
                {renderDeleteMenuItem(menuKind)}
            </>
        );
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger render={<div className="contents" />}>
                {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: TEMP */}
                <article
                    className="hover:z-10 group relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    ref={cardRef}
                >
                    <a
                        className="flex flex-col focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        href={href}
                        onClick={handlePrimaryClick}
                        rel="noopener noreferrer"
                        target={isNote ? undefined : "_blank"}
                    >
                        {isNote ? (
                            <div className="relative flex aspect-3/4 h-auto min-h-72 w-full flex-col justify-between overflow-hidden bg-linear-to-br from-amber-50 via-background to-stone-100 p-3">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_45%)]" />
                                <div className="relative flex flex-1 flex-col gap-2 pt-1.5">
                                    <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed opacity-90">
                                        {noteExcerpt ||
                                            "Tap to start writing in this note"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative aspect-3/4 w-full overflow-hidden">
                                <PreviewMedia
                                    alt={alt}
                                    key={previewImageUrl ?? `empty-${item.id}`}
                                    src={previewImageUrl}
                                />
                            </div>
                        )}
                    </a>
                    <div
                        className={cn(
                            "overflow-fade-top absolute inset-x-0 bottom-0 flex items-center gap-1 overflow-hidden bg-black/35 px-1.5 pt-2 pb-1 backdrop-blur-[2.5px]",
                            {
                                "bg-black/4 opacity-80 mix-blend-difference":
                                    isNote,
                            },
                        )}
                    >
                        <CollectionComboboxPicker
                            collections={collections}
                            item={item}
                            onOpenChange={setIsCollectionPickerOpen}
                            onUpdateItemCollections={onUpdateItemCollections}
                            open={isCollectionPickerOpen}
                        />
                        <Menu>
                            <MenuTrigger
                                render={
                                    <button
                                        className="min-w-0 flex-1 cursor-pointer truncate rounded-sm py-px text-left font-medium text-white text-xs leading-none mix-blend-difference outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                        title={displayTitle}
                                        type="button"
                                    />
                                }
                            >
                                <Ticker>{displayTitle}</Ticker>
                            </MenuTrigger>
                            <MenuPopup>
                                {renderCardMenuContent("menu")}
                            </MenuPopup>
                        </Menu>
                    </div>
                </article>
            </ContextMenuTrigger>
            <ContextMenuPopup>
                {renderCardMenuContent("context")}
            </ContextMenuPopup>
        </ContextMenu>
    );
}

function LockedLibraryGridCard({
    alt,
    item,
}: LockedLibraryGridCardProps): ReactElement {
    const isNote = item.kind === "note";
    const previewImageUrl = opengraphPreviewUrl(item);

    return (
        <div className="relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/30">
            {isNote ? (
                <div className="relative min-h-72 bg-linear-to-br from-amber-50 via-background to-stone-100 px-4 py-4">
                    <div className="absolute inset-0 bg-background/45 backdrop-blur-md" />
                    <div className="relative flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-500/20 bg-white/70 px-2.5 py-1 font-medium text-[11px] text-stone-700">
                            <NotebookPenIcon className="size-3.5" />
                            Note
                        </span>
                    </div>
                </div>
            ) : (
                <div className="relative aspect-3/4 w-full overflow-hidden bg-muted/30">
                    <PreviewMedia
                        alt={alt}
                        fallbackLabel="Locked preview"
                        key={previewImageUrl ?? `locked-empty-${item.id}`}
                        src={previewImageUrl}
                    />
                    <div className="absolute inset-0 bg-background/35 backdrop-blur-md" />
                </div>
            )}
            <div className="relative flex flex-col gap-2 bg-background/75 px-3 py-2">
                <p className="line-clamp-2 truncate text-foreground text-xs leading-tight">
                    Note
                </p>
            </div>
        </div>
    );
}

function renderLibraryMasonry({
    collections,
    columnCount,
    items,
    layoutToken,
    locked = false,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    pendingDeleteItemId,
}: GridProps & { readonly locked?: boolean }): ReactElement {
    return (
        <Masonry
            columnCount={columnCount}
            deps={[
                collections,
                layoutToken,
                items,
                locked,
                pendingCollectionItemIds,
                pendingDeleteItemId,
            ]}
            fallback={
                <div
                    className={cn(
                        "grid gap-2",
                        !columnCount &&
                            "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
                    )}
                    style={fallbackGridStyle(columnCount)}
                >
                    {items.map((item) => (
                        <Skeleton key={item.id} />
                    ))}
                </div>
            }
            gap={4}
            linear
        >
            {items.map((item) => {
                const href = normalizeURL(item.url);
                const alt = (item.caption ?? "").trim() || "Saved item";
                const domain = itemDomain(item.url);
                const previewTitle = alt === "Saved item" ? "Preview" : alt;
                const previewDescription =
                    domain === "Other" ? item.url : domain;
                const createdLabel = itemDateLabel(item.createdAt);
                const addedLabel = itemDateLabel(
                    item.scrapedAt ?? item.createdAt,
                );

                return (
                    <MasonryItem key={item.id}>
                        {locked ? (
                            <LockedLibraryGridCard alt={alt} item={item} />
                        ) : (
                            <LibraryGridCard
                                addedLabel={addedLabel}
                                alt={alt}
                                collections={collections}
                                createdLabel={createdLabel}
                                href={href}
                                item={item}
                                onCopyLink={onCopyLink}
                                onDelete={onDelete}
                                onOpenHere={onOpenHere}
                                onOpenInNewTab={onOpenInNewTab}
                                onOpenNote={onOpenNote}
                                onUpdateItemCollections={
                                    onUpdateItemCollections
                                }
                                pendingDeleteItemId={pendingDeleteItemId}
                                previewDescription={previewDescription}
                                previewTitle={previewTitle}
                            />
                        )}
                    </MasonryItem>
                );
            })}
        </Masonry>
    );
}

function ExtensionLibraryEmptyMasonryPeek() {
    const fallback = (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {EMPTY_LIBRARY_PEEK_PLACEHOLDERS.map(({ aspect, id }, index) => {
                const opacity = Math.max(0.06, 1 - index * 0.095);
                return (
                    <div
                        className="flex flex-col overflow-hidden rounded-xl bg-card/40 transition-opacity"
                        key={id}
                        style={{ opacity }}
                    >
                        <Skeleton
                            className={cn("w-full rounded-none", aspect)}
                        />
                        <div className="flex min-h-14 flex-col gap-1.5 p-3">
                            <Skeleton className="h-2.5 w-[92%]" />
                            <Skeleton className="h-2.5 w-[72%]" />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Masonry columnCount={5} fallback={fallback} gap={4} linear>
            {EMPTY_LIBRARY_PEEK_PLACEHOLDERS.map(({ aspect, id }, index) => {
                const opacity = Math.max(0.06, 1 - index * 0.095);

                return (
                    <MasonryItem
                        className="group flex flex-col overflow-hidden rounded-lg bg-card/40"
                        key={id}
                        style={{ opacity }}
                    >
                        <Skeleton
                            className={cn("w-full rounded-none", aspect)}
                        />
                        <div className="flex min-h-14 flex-col gap-1.5 p-3">
                            <Skeleton className="h-2.5 w-[92%]" />
                            <Skeleton className="h-2.5 w-[72%]" />
                        </div>
                    </MasonryItem>
                );
            })}
        </Masonry>
    );
}

function ExtensionLibraryGrid({
    collections,
    columnCount,
    items,
    layoutToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    paywallPreviewCount,
    paywallTotalCount,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    showPaywallBanner,
}: GridProps): ReactElement | null {
    if (items.length === 0) {
        return null;
    }

    const resolvedPreviewCount = Math.max(
        0,
        Math.min(paywallPreviewCount ?? items.length, items.length),
    );
    const showPaywall = resolvedPreviewCount < items.length;
    const previewItems = showPaywall
        ? items.slice(0, resolvedPreviewCount)
        : items;
    const lockedItems = showPaywall ? items.slice(resolvedPreviewCount) : [];

    if (!showPaywall) {
        return renderLibraryMasonry({
            collections,
            columnCount,
            items,
            layoutToken,
            onCopyLink,
            onDelete,
            onOpenHere,
            onOpenInNewTab,
            onOpenNote,
            onUpdateItemCollections,
            pendingCollectionItemIds,
            pendingDeleteItemId,
        });
    }

    return (
        <div className="flex flex-col gap-8">
            {previewItems.length > 0
                ? renderLibraryMasonry({
                      collections,
                      columnCount,
                      items: previewItems,
                      layoutToken,
                      onCopyLink,
                      onDelete,
                      onOpenHere,
                      onOpenInNewTab,
                      onOpenNote,
                      onUpdateItemCollections,
                      pendingCollectionItemIds,
                      pendingDeleteItemId,
                  })
                : null}
            {lockedItems.length > 0 ? (
                <div className="relative isolate">
                    {showPaywallBanner ? (
                        <BlockPromotionBanner
                            length={paywallTotalCount ?? items.length}
                        />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
                    <div className="select-none opacity-60 blur-[1.5px] saturate-75">
                        {renderLibraryMasonry({
                            collections,
                            columnCount,
                            items: lockedItems,
                            layoutToken,
                            locked: true,
                            onCopyLink,
                            onDelete,
                            onOpenHere,
                            onOpenInNewTab,
                            onOpenNote,
                            onUpdateItemCollections,
                            pendingCollectionItemIds,
                            pendingDeleteItemId,
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ExtensionLibrarySection({
    accentKey,
    collapsed = false,
    collapsible = false,
    collections,
    columnCount,
    emptyHint,
    items,
    layoutToken,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenHere,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggle,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    title,
}: SectionProps): ReactElement {
    const canToggle = collapsible && onToggle;
    const stickyHeader = collapsible;
    const headerGradient = stickyHeader
        ? getSubtleColorGradientFromName(accentKey ?? title)
        : undefined;
    let body: ReactElement | null;

    if (collapsed) {
        body = null;
    } else if (items.length === 0) {
        body = <p className="text-muted-foreground text-sm">{emptyHint}</p>;
    } else {
        body = (
            <ExtensionLibraryGrid
                collections={collections}
                columnCount={columnCount}
                items={items}
                layoutToken={layoutToken}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onOpenHere={onOpenHere}
                onOpenInNewTab={onOpenInNewTab}
                onOpenNote={onOpenNote}
                onUpdateItemCollections={onUpdateItemCollections}
                pendingCollectionItemIds={pendingCollectionItemIds}
                pendingDeleteItemId={pendingDeleteItemId}
            />
        );
    }

    return (
        <section className="flex w-full flex-col gap-3">
            <div
                className={cn(
                    "flex items-center justify-between gap-3 py-1 pr-5",
                    stickyHeader &&
                        "sticky z-10 rounded-xl bg-muted/92 backdrop-blur-sm supports-backdrop-filter:bg-muted/50",
                )}
                style={
                    stickyHeader
                        ? ({
                              background: headerGradient,
                              top: "var(--library-section-sticky-top)",
                          } as CSSProperties)
                        : undefined
                }
            >
                {canToggle ? (
                    <Button
                        className="min-w-0 flex-1 justify-start rounded-xl px-4"
                        onClick={onToggle}
                        size="lg"
                        variant="ghost"
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="size-4" />
                        ) : (
                            <ChevronDownIcon className="size-4" />
                        )}
                        <span className="ml-1 truncate font-medium">
                            {title}
                        </span>
                    </Button>
                ) : (
                    <h2 className="font-medium text-lg">{title}</h2>
                )}
                <span className="font-medium text-foreground text-xs tabular-nums">
                    {items.length}
                </span>
            </div>
            {body}
        </section>
    );
}

export function LibraryBrowser({
    collections,
    items,
    onClearCollectionFilters,
    onCreateCollectionFromResults,
    onItemsChange,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    selectedCollectionIds,
}: LibraryProps) {
    const { hasAccess, isLoading: isAccessLoading } = useAccess();
    const systemControlKey = useClientOnlyValue(getSystemControlKey());
    const [searchTerms, setSearchTerms] = useState<string[]>([]);
    const [paletteInput, setPaletteInput] = useState("");
    const [sourceFilters, setSourceFilters] = useState<SourceFilterValue[]>([]);
    const [domainFilters, setDomainFilters] = useState<string[]>([]);
    const [collectionMembershipFilter, setCollectionMembershipFilter] =
        useState<CollectionMembershipFilter>(
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER,
        );
    const [groupBy, setGroupBy] = useState<GroupByMode>("none");
    const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
    const [columnCountMode, setColumnCountMode] = useState<ColumnCountMode>(
        DEFAULT_COLUMN_COUNT_MODE,
    );
    const [paletteSection, setPaletteSection] =
        useState<PaletteSection>("search");
    const [activeNote, setActiveNote] =
        useState<LibraryItemWithCollections | null>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
    const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] =
        useState(false);
    const [createResultsNameDraft, setCreateResultsNameDraft] = useState("");
    const [createResultsDescriptionDraft, setCreateResultsDescriptionDraft] =
        useState("");
    const [createResultsError, setCreateResultsError] = useState<string | null>(
        null,
    );
    const [commandListOpen, setCommandListOpen] = useState(false);
    const [isPaletteFocused, setIsPaletteFocused] = useState(false);
    const [commandPanelShellHeight, setCommandPanelShellHeight] = useState(0);
    const commandPanelContainerRef = useRef<HTMLDivElement>(null);
    const paletteInputRef = useRef<HTMLInputElement>(null);
    const createResultsNameInputId = useId();
    const createResultsDescriptionId = useId();
    /** Skips one combobox-driven close right after entering a drill-down section. */
    const suppressNextCommandCloseRef = useRef(false);
    const {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenHere,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    } = useLibraryItemActions(onItemsChange);
    const [isSavingNote, startSavingNoteTransition] = useTransition();
    const [
        isCreatingResultsCollection,
        startCreateResultsCollectionTransition,
    ] = useTransition();

    const domainOptions = buildDomainPaletteOptions(items);

    const focusPaletteInput = (select = false) => {
        setCommandListOpen(true);
        queueMicrotask(() => {
            paletteInputRef.current?.focus();
            if (select) {
                paletteInputRef.current?.select();
            }
        });
    };

    const focusPaletteInputRef = useRef(focusPaletteInput);
    focusPaletteInputRef.current = focusPaletteInput;

    const handleCommandOpenChange = (
        nextOpen: boolean,
        eventDetails?: { readonly reason?: string },
    ) => {
        setCommandListOpen(() => {
            if (!nextOpen && suppressNextCommandCloseRef.current) {
                suppressNextCommandCloseRef.current = false;
                return true;
            }

            if (!nextOpen) {
                const shell = commandPanelContainerRef.current;
                const active = document.activeElement;
                const focusInsidePalette =
                    shell && active instanceof Node && shell.contains(active);
                const reason = eventDetails?.reason;

                // Inline autocomplete always requests close on item pick; keep the list
                // visible while focus stays in the palette so the field matches the list.
                if (
                    focusInsidePalette &&
                    reason === COMBOBOX_ITEM_PRESS_REASON
                ) {
                    return true;
                }
            }

            if (nextOpen) {
                suppressNextCommandCloseRef.current = false;
            }

            return nextOpen;
        });
    };

    useLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }

        const handleFocusIn = (event: globalThis.FocusEvent) => {
            setIsPaletteFocused(true);
            if (event.target instanceof HTMLInputElement) {
                setCommandListOpen(true);
            }
        };

        const handleFocusOut = (event: globalThis.FocusEvent) => {
            const { relatedTarget } = event;
            if (relatedTarget instanceof Node && el.contains(relatedTarget)) {
                return;
            }
            const closeIfLeft = () => {
                if (!el.contains(document.activeElement)) {
                    setIsPaletteFocused(false);
                    setCommandListOpen(false);
                }
            };
            queueMicrotask(closeIfLeft);
            window.setTimeout(closeIfLeft, 0);
        };

        el.addEventListener("focusin", handleFocusIn);
        el.addEventListener("focusout", handleFocusOut);
        return () => {
            el.removeEventListener("focusin", handleFocusIn);
            el.removeEventListener("focusout", handleFocusOut);
        };
    }, []);

    useLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }

        const updateHeight = () => {
            const nextHeight = Math.ceil(el.getBoundingClientRect().height);
            setCommandPanelShellHeight((current) =>
                current === nextHeight ? current : nextHeight,
            );
        };

        updateHeight();

        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(el);
        window.addEventListener("resize", updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    useEffect(() => {
        const handleWindowKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            const isEditable =
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    Boolean(
                        target.closest(
                            'input, textarea, select, button, [role="textbox"]',
                        ),
                    ));

            if (isSearchHotkey(event)) {
                event.preventDefault();
                focusPaletteInputRef.current(true);
                return;
            }

            if (
                event.key === "/" &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !isEditable
            ) {
                event.preventDefault();
                focusPaletteInputRef.current();
            }
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, []);

    const returnToSearchSection = () => {
        setPaletteSection("search");
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const openPaletteSection = (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent,
    ) => {
        event.preventDefault();
        suppressNextCommandCloseRef.current = true;
        setPaletteSection(section);
        setPaletteInput("");
    };

    const handleCommandInputChange = (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails,
    ) => {
        if (
            paletteGroups
                .flatMap((group) => group.items)
                .some((value) => value.value === next)
        ) {
            eventDetails.cancel();
            return;
        }

        setPaletteInput(next);
    };

    const clearLibraryPalette = () => {
        setPaletteInput("");
        setSearchTerms([]);
        setSourceFilters([]);
        setDomainFilters([]);
        setCollectionMembershipFilter(DEFAULT_COLLECTION_MEMBERSHIP_FILTER);
        onClearCollectionFilters();
        setGroupBy("none");
        setSortMode(DEFAULT_SORT_MODE);
        setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        setPaletteSection("search");
        setCommandListOpen(false);
    };

    const handlePaletteInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === "Escape") {
            event.preventDefault();
            if (paletteInput.trim() !== "") {
                setPaletteInput("");
                setCommandListOpen(true);
                return;
            }
            if (paletteSection !== "search") {
                returnToSearchSection();
                return;
            }
            setCommandListOpen(false);
            event.currentTarget.blur();
            return;
        }

        if (isSearchCancelKey(event)) {
            setCommandListOpen(false);
            return;
        }

        if (
            event.key === "Backspace" &&
            paletteSection !== "search" &&
            paletteInput.trim() === ""
        ) {
            event.preventDefault();
            returnToSearchSection();
            return;
        }

        if (event.key === "ArrowDown" && !commandListOpen) {
            setCommandListOpen(true);
        }
    };

    const paletteGroups = buildLibraryPaletteGroups({
        clearLibraryPalette,
        collectionMembershipFilter,
        columnCountMode,
        domainFilters,
        domainOptions,
        groupBy,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIdsLength: selectedCollectionIds.length,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
        setPaletteInput,
        setSearchTerms,
        setSortMode,
        setSourceFilters,
        sortMode,
        sourceFilters,
    });

    const visiblePaletteGroups = applyVisiblePaletteShortcuts(
        paletteGroups,
        paletteInput,
        systemControlKey ?? "",
    );

    const visiblePaletteGroupsRef = useRef(visiblePaletteGroups);
    visiblePaletteGroupsRef.current = visiblePaletteGroups;

    useHotkeys(
        "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
        (event) => {
            const digit = Number(event.key);
            if (Number.isNaN(digit)) {
                return;
            }
            const index = digit - 1;
            const flatItems = visiblePaletteGroupsRef.current.flatMap(
                (g) => g.items,
            );
            const item = flatItems[index];
            if (item) {
                item.onSelect(event);
            }
        },
        {
            enabled: commandListOpen,
            enableOnFormTags: true,
            preventDefault: true,
        },
        [commandListOpen],
    );

    let inputPlaceholder = "Search, filter, group, sort, and more…";
    if (paletteSection === "search") {
        inputPlaceholder = "Search, filter, group, sort, and more…";
        if (isPaletteFocused) {
            inputPlaceholder = "What are you looking for?";
        }
    } else if (paletteSection === "filter") {
        inputPlaceholder = "Filter the library…";
    } else if (paletteSection === "group") {
        inputPlaceholder = "Group results…";
    } else if (paletteSection === "sort") {
        inputPlaceholder = "Sort results…";
    } else if (paletteSection === "layout") {
        inputPlaceholder = "Change the layout…";
    }

    const filteredItems = useMemo(
        () =>
            filterLibraryBrowserItems(items, {
                collectionMembershipFilter,
                domainFilters,
                searchTerms,
                selectedCollectionIds,
                sourceFilters,
            }),
        [
            collectionMembershipFilter,
            domainFilters,
            items,
            searchTerms,
            selectedCollectionIds,
            sourceFilters,
        ],
    );

    const sortedItems = useMemo(
        () => sortLibraryBrowserItems(filteredItems, sortMode),
        [filteredItems, sortMode],
    );

    const sections = useMemo(
        () => buildLibraryBrowserSections(sortedItems, groupBy, sortMode),
        [groupBy, sortMode, sortedItems],
    );

    const shouldGateResults =
        !(isAccessLoading || hasAccess) &&
        filteredItems.length > FREE_LIBRARY_PREVIEW_ITEMS;

    const gatedSections = useMemo(
        () => gateLibraryBrowserSections(sections, shouldGateResults),
        [sections, shouldGateResults],
    );

    const hasActiveFilters = useMemo(
        () =>
            libraryBrowserHasActiveFilters({
                collectionMembershipFilter,
                domainFilters,
                searchTerms,
                selectedCollectionIds,
                sourceFilters,
            }),
        [
            collectionMembershipFilter,
            domainFilters,
            searchTerms,
            selectedCollectionIds,
            sourceFilters,
        ],
    );

    const hasNonDefaultView =
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE;

    const showEmptyLibraryPeek =
        items.length === 0 && filteredItems.length === 0 && !hasActiveFilters;

    const showNoFilteredResults =
        filteredItems.length === 0 && !showEmptyLibraryPeek;

    const {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        layoutRefreshToken,
        toggleSection,
    } = useSectionCollapseState({
        groupBy,
        hasActiveFilters,
        sections: gatedSections,
        showEmptyLibraryPeek,
        showNoFilteredResults,
    });

    const resolvedColumnCount =
        columnCountMode === "auto" ? undefined : Number(columnCountMode);

    const resultsSummary =
        filteredItems.length === items.length
            ? `${items.length} item${items.length === 1 ? "" : "s"}`
            : `${filteredItems.length} of ${items.length} items`;
    const visibleResultItems = useMemo(
        () =>
            gatedSections.flatMap((section) => getVisibleSectionItems(section)),
        [gatedSections],
    );
    const canCreateCollectionFromResults =
        searchTerms.length > 0 && visibleResultItems.length > 0;
    const resultCollectionItemIds = useMemo(
        () => visibleResultItems.map((item) => item.id),
        [visibleResultItems],
    );

    const handleCreateNote = () => {
        setActionFeedback(null);
        setActiveNote(null);
        setIsNoteDrawerOpen(true);
    };

    const handleCreateResultsDialogOpenChange = (open: boolean) => {
        if (open) {
            setActionFeedback(null);
            setCreateResultsError(null);
            setCreateResultsNameDraft(buildResultsCollectionName(searchTerms));
            setCreateResultsDescriptionDraft("");
            setIsCreateResultsDialogOpen(true);
            return;
        }

        if (!isCreatingResultsCollection) {
            setIsCreateResultsDialogOpen(false);
            setCreateResultsError(null);
        }
    };

    const handleCreateCollectionFromResultsSubmit = () => {
        startCreateResultsCollectionTransition(async () => {
            let result: CreateCollectionFromItemsResult;

            try {
                result = await onCreateCollectionFromResults({
                    description: createResultsDescriptionDraft || undefined,
                    itemIds: resultCollectionItemIds,
                    name: createResultsNameDraft,
                });
            } catch {
                result = {
                    message: "We couldn't create this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "CREATED") {
                setCreateResultsError(result.message);
                return;
            }

            setIsCreateResultsDialogOpen(false);
            setCreateResultsError(null);
            setActionFeedback({
                message: `${result.collection.name} created with ${result.assignedItemIds.length} result${result.assignedItemIds.length === 1 ? "" : "s"}.`,
                tone: "success",
            });
        });
    };

    const handleOpenNote = (item: LibraryItemWithCollections) => {
        setActionFeedback(null);
        setActiveNote(item);
        setIsNoteDrawerOpen(true);
    };

    const handleSaveNote = async (draft: { contentHtml: string }) => {
        return await new Promise<boolean>((resolve) => {
            startSavingNoteTransition(async () => {
                const result = await saveLibraryNoteDraft({
                    activeNote,
                    draft,
                });

                if (result.status !== "SUCCESS") {
                    setActionFeedback({
                        message: result.message,
                        tone: "error",
                    });
                    resolve(false);
                    return;
                }

                onItemsChange((current) => {
                    const existingIndex = current.findIndex(
                        (item) => item.id === result.item.id,
                    );

                    if (existingIndex === -1) {
                        return [result.item, ...current];
                    }

                    return current.map((item) =>
                        item.id === result.item.id ? result.item : item,
                    );
                });
                setActiveNote(result.item);
                setActionFeedback({
                    message: activeNote
                        ? "Note saved."
                        : "Note created in your library.",
                    tone: "success",
                });
                resolve(true);
            });
        });
    };

    const libraryBrowserStyle = getStickySectionStyle(commandPanelShellHeight);

    const libraryGridBody = renderLibraryGridBody({
        clearLibraryPalette,
        collapsedSectionKeys: new Set(collapsedSectionKeys),
        collections,
        columnCount: resolvedColumnCount,
        enableSectionCollapse,
        layoutRefreshToken,
        onCopyLink: handleCopyLink,
        onDelete: handleRequestDelete,
        onOpenHere: handleOpenHere,
        onOpenInNewTab: handleOpenInNewTab,
        onOpenNote: handleOpenNote,
        onToggleSection: toggleSection,
        onUpdateItemCollections,
        paywallTotalCount: filteredItems.length,
        pendingCollectionItemIds,
        pendingDeleteItemId: pendingDeleteItem?.id ?? null,
        sections: gatedSections,
        showEmptyLibraryPeek,
        showNoFilteredResults,
    });

    return (
        <div
            className="relative z-0 flex w-full flex-col gap-6"
            style={libraryBrowserStyle}
        >
            <Dialog
                onOpenChange={handleDeleteDialogOpenChange}
                open={pendingDeleteItem !== null}
            >
                <DialogPopup>
                    <DialogHeader>
                        <DialogTitle>Delete saved item?</DialogTitle>
                        <DialogDescription>
                            Remove{" "}
                            {pendingDeleteItem?.noteContentText?.trim() ||
                                pendingDeleteItem?.caption?.trim() ||
                                pendingDeleteItem?.url ||
                                "this saved item"}{" "}
                            from Cache. This only deletes it from your library,
                            not from the original platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter variant="default">
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDelete}
                            size="sm"
                            variant="destructive"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
            <Dialog
                onOpenChange={handleCreateResultsDialogOpenChange}
                open={isCreateResultsDialogOpen}
            >
                <DialogPopup showCloseButton>
                    <form
                        className="contents"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleCreateCollectionFromResultsSubmit();
                        }}
                    >
                        <DialogHeader>
                            <div className="flex items-center gap-1">
                                <Badge size="lg" variant="outline">
                                    <Image
                                        alt=""
                                        height={12}
                                        src={AppIconSmall}
                                        width={12}
                                    />
                                    Cache
                                </Badge>
                                <ChevronRight className="inline-block size-3.5 shrink-0" />
                                <DialogTitle className="font-medium text-sm">
                                    New collection with{" "}
                                    {resultCollectionItemIds.length} current
                                    result
                                    {resultCollectionItemIds.length === 1
                                        ? ""
                                        : "s"}
                                </DialogTitle>
                            </div>
                        </DialogHeader>
                        <DialogPanel className="space-y-2">
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createResultsNameInputId}
                                >
                                    Name
                                </label>
                                <Input
                                    autoFocus
                                    className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                    id={createResultsNameInputId}
                                    maxLength={COLLECTION_NAME_MAX_LENGTH}
                                    onChange={(event) => {
                                        setCreateResultsNameDraft(
                                            event.currentTarget.value,
                                        );
                                        if (createResultsError) {
                                            setCreateResultsError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    type="text"
                                    required
                                    size="lg"
                                    unstyled
                                    value={createResultsNameDraft}
                                />
                            </div>
                            <div>
                                <label
                                    className="sr-only font-medium text-sm"
                                    htmlFor={createResultsDescriptionId}
                                >
                                    Description (optional)
                                </label>
                                <Textarea
                                    className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                    id={createResultsDescriptionId}
                                    maxLength={1024}
                                    onChange={(event) => {
                                        setCreateResultsDescriptionDraft(
                                            event.currentTarget.value,
                                        );
                                    }}
                                    placeholder="Add description..."
                                    size="lg"
                                    unstyled
                                    value={createResultsDescriptionDraft}
                                />
                            </div>
                            {createResultsError ? (
                                <p className="text-destructive text-sm">
                                    {createResultsError}
                                </p>
                            ) : null}
                        </DialogPanel>
                        <DialogFooter>
                            <DialogClose
                                disabled={isCreatingResultsCollection}
                                render={
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                    />
                                }
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                loading={isCreatingResultsCollection}
                                size="sm"
                                type="submit"
                            >
                                Create collection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogPopup>
            </Dialog>
            <Command
                filter={null}
                filteredItems={visiblePaletteGroups.map((group) => ({
                    items: group.items,
                }))}
                items={paletteGroups.map((group) => ({
                    items: group.items,
                }))}
                onOpenChange={handleCommandOpenChange}
                onValueChange={handleCommandInputChange}
                open={commandListOpen}
                value={paletteInput}
            >
                <CommandPanel ref={commandPanelContainerRef}>
                    <CommandInput
                        onKeyDown={handlePaletteInputKeyDown}
                        placeholder={inputPlaceholder}
                        ref={paletteInputRef}
                        size="lg"
                        endAddon={
                            <LibraryPaletteTrailing
                                clearLibraryPalette={clearLibraryPalette}
                                collectionMembershipFilter={
                                    collectionMembershipFilter
                                }
                                columnCountMode={columnCountMode}
                                domainFilters={domainFilters}
                                groupBy={groupBy}
                                paletteInput={paletteInput}
                                searchTerms={searchTerms}
                                setCollectionMembershipFilter={
                                    setCollectionMembershipFilter
                                }
                                setColumnCountMode={setColumnCountMode}
                                setDomainFilters={setDomainFilters}
                                setGroupBy={setGroupBy}
                                setSearchTerms={setSearchTerms}
                                setSortMode={setSortMode}
                                setSourceFilters={setSourceFilters}
                                sortMode={sortMode}
                                sourceFilters={sourceFilters}
                            />
                        }
                    />
                    <AutocompletePopup positionMethod="fixed">
                        <CommandEmpty>No matching commands found.</CommandEmpty>
                        <CommandList>
                            {visiblePaletteGroups.map((group) => (
                                <CommandGroup
                                    items={group.items}
                                    key={group.label}
                                >
                                    <CommandGroupLabel>
                                        {group.label}
                                    </CommandGroupLabel>
                                    <CommandCollection>
                                        {(item: CommandPaletteItem) => (
                                            <CommandItem
                                                key={item.value}
                                                onClick={item.onSelect}
                                                value={item.value}
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate">
                                                            {item.label}
                                                        </div>
                                                        {item.description ? (
                                                            <p className="truncate text-muted-foreground text-xs">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    {item.active ? (
                                                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-medium text-[11px] text-accent-foreground">
                                                            Active
                                                        </span>
                                                    ) : null}
                                                    {item.shortcut ? (
                                                        <CommandShortcut>
                                                            {item.shortcut}
                                                        </CommandShortcut>
                                                    ) : null}
                                                </div>
                                            </CommandItem>
                                        )}
                                    </CommandCollection>
                                </CommandGroup>
                            ))}
                        </CommandList>
                        <CommandFooter>
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium">Navigate</span>
                                <KbdGroup>
                                    <Kbd>
                                        <ArrowUpIcon />
                                    </Kbd>
                                    <Kbd>
                                        <ArrowDownIcon />
                                    </Kbd>
                                </KbdGroup>
                            </div>
                            <Separator orientation="vertical" />
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium">
                                    Open Command
                                </span>
                                <Kbd>
                                    <CornerDownLeftIcon />
                                </Kbd>
                            </div>
                        </CommandFooter>
                    </AutocompletePopup>
                </CommandPanel>
            </Command>
            {actionFeedback ? (
                <div
                    className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium",
                        actionFeedback.tone === "success"
                            ? "border-emerald-500/25 bg-emerald-500/8 text-foreground"
                            : "border-destructive/25 bg-destructive/6 text-foreground",
                    )}
                >
                    {actionFeedback.message}
                </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    className="rounded-full"
                    onClick={handleCreateNote}
                    size="xs"
                    variant="outline"
                >
                    <SquarePen className="inline-block size-4 shrink-0" />
                    &nbsp;New entry
                </Button>
                <FeedbackWidget
                    render={
                        <Button
                            className="rounded-full hidden md:flex"
                            size="xs"
                            variant="outline"
                        />
                    }
                >
                    Feedback
                </FeedbackWidget>
                <Separator className="mx-1 h-5" orientation="vertical" />
                <Badge className="sm:text-xs" size="lg" variant="outline">
                    Showing {resultsSummary}
                </Badge>
                {canCreateCollectionFromResults ? (
                    <Button
                        className="rounded-full"
                        onClick={() =>
                            handleCreateResultsDialogOpenChange(true)
                        }
                        size="xs"
                        variant="outline"
                    >
                        <CircleFadingPlus className="inline-block size-4 shrink-0" />
                        &nbsp;Collection with these results
                    </Button>
                ) : null}
                {groupBy === "none" ? null : (
                    <Badge className="sm:text-xs" size="lg" variant="outline">
                        {sections.length} group
                        {sections.length === 1 ? "" : "s"}
                    </Badge>
                )}
                {(hasActiveFilters || hasNonDefaultView) &&
                !showEmptyLibraryPeek ? (
                    <Button
                        onClick={() => {
                            clearLibraryPalette();
                        }}
                        size="xs"
                        variant="ghost"
                    >
                        Reset browser
                    </Button>
                ) : null}
                {enableSectionCollapse ? (
                    <>
                        <Button
                            onClick={expandAllSections}
                            size="xs"
                            variant="ghost"
                        >
                            Expand all
                        </Button>
                        <Button
                            onClick={collapseAllSections}
                            size="xs"
                            variant="ghost"
                        >
                            Collapse all
                        </Button>
                    </>
                ) : null}
            </div>
            <UnprivilegedOnly>
                <InlinePromotionBanner />
            </UnprivilegedOnly>
            {libraryGridBody}
            <LibraryNoteDrawer
                note={activeNote}
                onOpenChange={setIsNoteDrawerOpen}
                onSave={handleSaveNote}
                open={isNoteDrawerOpen}
                saving={isSavingNote}
            />
        </div>
    );
}

export function LibraryWorkspace({
    initialCollections,
    initialItems,
    sidebarBottom,
    sidebarHeader,
}: Props): ReactElement {
    const [items, setItems] = useState<LibraryItemWithCollections[]>([
        ...initialItems,
    ]);
    const [collections, setCollections] = useState<LibraryCollectionTag[]>(
        sortCollections(
            initialCollections.map((collection) => ({
                description: collection.description,
                id: collection.id,
                name: collection.name,
                priority: collection.priority,
            })),
        ),
    );
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<
        string[]
    >([]);
    const [pendingCollectionItemIds, setPendingCollectionItemIds] = useState<
        string[]
    >([]);

    const collectionSummaries = deriveCollectionSummaries(collections, items);

    const itemsByCollectionId = useMemo(() => {
        const map = new Map<string, LibraryItemWithCollections[]>();
        for (const item of items) {
            for (const collection of item.collections) {
                const entries = map.get(collection.id);
                if (entries) {
                    entries.push(item);
                } else {
                    map.set(collection.id, [item]);
                }
            }
        }
        return map;
    }, [items]);

    const collectionPreviewThumbnailUrlsById = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const [collectionId, collectionItems] of itemsByCollectionId) {
            map.set(
                collectionId,
                getCollectionPreviewThumbnailUrls(
                    collectionId,
                    collectionItems,
                ),
            );
        }
        return map;
    }, [itemsByCollectionId]);

    const clearCollectionFilters = () => {
        setSelectedCollectionIds([]);
    };

    const handleToggleCollectionSelection = (id: string) => {
        setSelectedCollectionIds((current) =>
            current.includes(id)
                ? current.filter((entryId) => entryId !== id)
                : [...current, id],
        );
    };

    const handleUpdateItemCollections = (
        itemId: string,
        collectionIds: string[],
    ) => {
        const previousCollections =
            items.find((item) => item.id === itemId)?.collections ?? [];
        const optimisticCollections = sortCollections(
            collections.filter((collection) =>
                collectionIds.includes(collection.id),
            ),
        );

        setItems((current) =>
            replaceItemCollections(current, itemId, optimisticCollections),
        );
        setPendingCollectionItemIds((current) =>
            current.includes(itemId) ? current : [...current, itemId],
        );

        const runUpdate = async () => {
            let result: UpdateLibraryItemCollectionsResult;

            try {
                result = await updateLibraryItemCollections({
                    collectionIds,
                    itemId,
                });
            } catch {
                result = {
                    message: "We couldn't update collections for this item.",
                    status: "ERROR",
                };
            }

            if (result.status === "UPDATED") {
                setItems((current) =>
                    replaceItemCollections(current, itemId, result.collections),
                );
            } else {
                setItems((current) =>
                    replaceItemCollections(
                        current,
                        itemId,
                        previousCollections,
                    ),
                );
            }

            setPendingCollectionItemIds((current) =>
                current.filter((id) => id !== itemId),
            );
        };

        runUpdate().catch(() => {
            setItems((current) =>
                replaceItemCollections(current, itemId, previousCollections),
            );
            setPendingCollectionItemIds((current) =>
                current.filter((id) => id !== itemId),
            );
        });
    };

    const handleCreateCollectionFromResults = async (input: {
        description?: string;
        itemIds: string[];
        name: string;
    }): Promise<CreateCollectionFromItemsResult> => {
        let result: CreateCollectionFromItemsResult;

        try {
            result = await createCollectionFromItems(input);
        } catch {
            result = {
                message: "We couldn't create this collection right now.",
                status: "ERROR",
            };
        }

        if (result.status !== "CREATED") {
            return result;
        }

        const nextCollection = {
            description: result.collection.description,
            id: result.collection.id,
            name: result.collection.name,
            priority: result.collection.priority,
        } satisfies LibraryCollectionTag;

        setCollections((current) =>
            current.some((collection) => collection.id === nextCollection.id)
                ? current
                : sortCollections([...current, nextCollection]),
        );
        setItems((current) =>
            appendCollectionToItems(
                current,
                result.assignedItemIds,
                nextCollection,
            ),
        );

        return result;
    };

    return (
        <>
            <LibraryWorkspaceSidebar
                actionDependencies={{
                    collections,
                    itemsByCollectionId,
                    setCollections,
                    setItems,
                }}
                collectionPreviewThumbnailUrlsById={
                    collectionPreviewThumbnailUrlsById
                }
                collectionSummaries={collectionSummaries}
                onClearCollectionFilters={clearCollectionFilters}
                onSelectCollection={handleToggleCollectionSelection}
                selectedCollectionIds={selectedCollectionIds}
                sidebarBottom={sidebarBottom}
                sidebarHeader={sidebarHeader}
            />
            <div className="flex w-full max-w-[1024px] flex-col items-center gap-12 p-8 2xl:mx-auto">
                <LibraryBrowser
                    collections={collectionSummaries}
                    items={items}
                    onClearCollectionFilters={clearCollectionFilters}
                    onCreateCollectionFromResults={
                        handleCreateCollectionFromResults
                    }
                    onItemsChange={setItems}
                    onUpdateItemCollections={handleUpdateItemCollections}
                    pendingCollectionItemIds={pendingCollectionItemIds}
                    selectedCollectionIds={selectedCollectionIds}
                />
            </div>
        </>
    );
}
