"use client";

import {
    createCollection,
    createCollectionFromItems,
    deleteCollection,
    renameCollection,
    updateCollectionPriority,
    updateLibraryItemCollections,
    type CreateCollectionFromItemsResult,
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
} from "@/components/library/collections-list";
import { LibraryBrowser } from "@/components/library/library-browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { saveFile } from "@/lib/file";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/library/types";
import { normalizeURL } from "@/lib/url";
import type {
    CollectionPriority,
    LibraryItemSource,
} from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import { ChevronRight, PlusIcon } from "lucide-react";
import Image from "next/image";
import type { ReactElement, ReactNode } from "react";
import { useId, useMemo, useState, useTransition } from "react";

const COLLECTION_NAME_COLLATOR = new Intl.Collator(undefined, {
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
    readonly locale: string;
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
            | ((current: LibraryCollectionTag[]) => LibraryCollectionTag[])
    ) => void;
    readonly setItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
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
    collections: readonly T[]
): T[] {
    return [...collections].sort((a, b) => {
        const priorityDifference =
            COLLECTION_PRIORITY_ORDER[a.priority] -
            COLLECTION_PRIORITY_ORDER[b.priority];

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return COLLECTION_NAME_COLLATOR.compare(a.name, b.name);
    });
}

function replaceItemCollections(
    items: readonly LibraryItemWithCollections[],
    itemId: string,
    collections: readonly LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) =>
        item.id === itemId
            ? {
                  ...item,
                  collections: [...collections],
              }
            : item
    );
}

function appendCollectionToItem(
    items: readonly LibraryItemWithCollections[],
    itemId: string,
    collection: LibraryCollectionTag
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
    collection: LibraryCollectionTag
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
    priority: CollectionPriority
): T[] {
    return collections.map((collection) =>
        collection.id === collectionId
            ? { ...collection, priority }
            : collection
    );
}

function replaceCollectionName<T extends LibraryCollectionTag>(
    collections: readonly T[],
    collectionId: string,
    name: string
): T[] {
    return sortCollections(
        collections.map((collection) =>
            collection.id === collectionId
                ? { ...collection, name }
                : collection
        )
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
    items: readonly LibraryItemWithCollections[]
): string[] {
    return [...items]
        .filter(
            (
                item
            ): item is LibraryItemWithCollections & {
                readonly thumbnailUrl: string;
            } => Boolean(item.thumbnailUrl)
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
    priority: CollectionPriority
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionPriority(
            item.collections,
            collectionId,
            priority
        ),
    }));
}

function replaceItemsCollectionName(
    items: readonly LibraryItemWithCollections[],
    collectionId: string,
    name: string
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionName(
            item.collections,
            collectionId,
            name
        ),
    }));
}

function deriveCollectionSummaries(
    collections: readonly LibraryCollectionTag[],
    items: readonly LibraryItemWithCollections[]
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
        }))
    );
}

function openSavedItemInNewTab(url: string): void {
    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to the browser when the desktop bridge isn't available.
    }

    window.open(url, "_blank", "noopener,noreferrer");
}

function getCollectionItemUrls(
    items: readonly LibraryItemWithCollections[]
): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function escapeCsvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function buildCollectionCsv(
    collection: LibraryCollectionSummary,
    items: readonly LibraryItemWithCollections[]
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
        null
    );
    const [createDialogAssignItemId, setCreateDialogAssignItemId] = useState<
        string | null
    >(null);
    const [pendingRenameCollection, setPendingRenameCollection] =
        useState<LibraryCollectionSummary | null>(null);
    const [renameDialogDraft, setRenameDialogDraft] = useState("");
    const [renameDialogError, setRenameDialogError] = useState<string | null>(
        null
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
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingDeleteCollection(collection);
    };

    const handleRequestRenameCollection = (
        collection: LibraryCollectionSummary
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
        collection: LibraryCollectionSummary
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
        collection: LibraryCollectionSummary
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

        for (const url of urls) {
            openSavedItemInNewTab(url);
        }
    };

    const handleExportCollectionToCsv = (
        collection: LibraryCollectionSummary
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
                        }
                    ),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: collectionExportFileName(collection.name),
                    }
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
                    current === collection.id ? null : current
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
                    (collection) => collection.id !== result.collection.id
                )
            );
            setItems((current) =>
                current.map((item) => ({
                    ...item,
                    collections: item.collections.filter(
                        (collection) => collection.id !== result.collection.id
                    ),
                }))
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
        priority: CollectionPriority
    ) => {
        const previousPriority = collections.find(
            (collection) => collection.id === collectionId
        )?.priority;

        if (!previousPriority || previousPriority === priority) {
            return;
        }

        setCollections((current) =>
            replaceCollectionPriority(current, collectionId, priority)
        );
        setItems((current) =>
            replaceItemsCollectionPriority(current, collectionId, priority)
        );
        setPendingPriorityCollectionIds((current) =>
            current.includes(collectionId)
                ? current
                : [...current, collectionId]
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
                        result.collection.priority
                    )
                );
                setItems((current) =>
                    replaceItemsCollectionPriority(
                        current,
                        result.collection.id,
                        result.collection.priority
                    )
                );
            } else {
                setCollections((current) =>
                    replaceCollectionPriority(
                        current,
                        collectionId,
                        previousPriority
                    )
                );
                setItems((current) =>
                    replaceItemsCollectionPriority(
                        current,
                        collectionId,
                        previousPriority
                    )
                );
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
            }

            setPendingPriorityCollectionIds((current) =>
                current.filter((id) => id !== collectionId)
            );
        };

        runUpdate().catch(() => {
            setCollections((current) =>
                replaceCollectionPriority(
                    current,
                    collectionId,
                    previousPriority
                )
            );
            setItems((current) =>
                replaceItemsCollectionPriority(
                    current,
                    collectionId,
                    previousPriority
                )
            );
            setPendingPriorityCollectionIds((current) =>
                current.filter((id) => id !== collectionId)
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
            replaceCollectionName(current, targetCollection.id, nextName)
        );
        setItems((current) =>
            replaceItemsCollectionName(current, targetCollection.id, nextName)
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
                        result.collection.name
                    )
                );
                setItems((current) =>
                    replaceItemsCollectionName(
                        current,
                        result.collection.id,
                        result.collection.name
                    )
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
                    previousName
                )
            );
            setItems((current) =>
                replaceItemsCollectionName(
                    current,
                    targetCollection.id,
                    previousName
                )
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
                    (collection) => collection.id === nextCollection.id
                )
                    ? current
                    : sortCollections([...current, nextCollection])
            );

            if (result.assignedItemId) {
                const assignedItemId = result.assignedItemId;
                setItems((current) =>
                    appendCollectionToItem(
                        current,
                        assignedItemId,
                        nextCollection
                    )
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
                                    (collection) => collection.name
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
                                                collection.id
                                            )}
                                            isUpdatePriorityPending={pendingPriorityCollectionIds.includes(
                                                collection.id
                                            )}
                                            key={collection.id}
                                            onCopyLinks={() =>
                                                handleCopyCollectionLinks(
                                                    collection
                                                )
                                            }
                                            onDelete={() =>
                                                handleRequestDeleteCollection(
                                                    collection
                                                )
                                            }
                                            onExportCsv={() =>
                                                handleExportCollectionToCsv(
                                                    collection
                                                )
                                            }
                                            onOpenLinks={() =>
                                                handleOpenCollectionLinks(
                                                    collection
                                                )
                                            }
                                            onRename={() =>
                                                handleRequestRenameCollection(
                                                    collection
                                                )
                                            }
                                            onSelect={() =>
                                                onSelectCollection(
                                                    collection.id
                                                )
                                            }
                                            onUpdatePriority={(priority) =>
                                                handleUpdateCollectionPriority(
                                                    collection.id,
                                                    priority
                                                )
                                            }
                                            previewThumbnailUrls={
                                                collectionPreviewThumbnailUrlsById.get(
                                                    collection.id
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
                                            event.currentTarget.value
                                        );
                                        if (renameDialogError) {
                                            setRenameDialogError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
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
                                            event.currentTarget.value
                                        );
                                        if (createDialogError) {
                                            setCreateDialogError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    required
                                    size="lg"
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
                                            event.currentTarget.value
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

export function LibraryWorkspace({
    initialCollections,
    initialItems,
    locale,
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
            }))
        )
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
                getCollectionPreviewThumbnailUrls(collectionId, collectionItems)
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
                : [...current, id]
        );
    };

    const handleUpdateItemCollections = (
        itemId: string,
        collectionIds: string[]
    ) => {
        const previousCollections =
            items.find((item) => item.id === itemId)?.collections ?? [];
        const optimisticCollections = sortCollections(
            collections.filter((collection) =>
                collectionIds.includes(collection.id)
            )
        );

        setItems((current) =>
            replaceItemCollections(current, itemId, optimisticCollections)
        );
        setPendingCollectionItemIds((current) =>
            current.includes(itemId) ? current : [...current, itemId]
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
                    replaceItemCollections(current, itemId, result.collections)
                );
            } else {
                setItems((current) =>
                    replaceItemCollections(current, itemId, previousCollections)
                );
            }

            setPendingCollectionItemIds((current) =>
                current.filter((id) => id !== itemId)
            );
        };

        runUpdate().catch(() => {
            setItems((current) =>
                replaceItemCollections(current, itemId, previousCollections)
            );
            setPendingCollectionItemIds((current) =>
                current.filter((id) => id !== itemId)
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
                : sortCollections([...current, nextCollection])
        );
        setItems((current) =>
            appendCollectionToItems(
                current,
                result.assignedItemIds,
                nextCollection
            )
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
                    locale={locale}
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
