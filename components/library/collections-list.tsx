"use client";

import {
    CollectionsList,
    CollectionsListActionButton,
    CollectionsListEmpty,
    CollectionsListFilterClear,
    CollectionsListFilterClearIcon,
    CollectionsListItem,
    CollectionsListItemMeta,
    CollectionsListItemPreview,
    CollectionsListItemPriorityCombobox,
    CollectionsListItemValue,
    CollectionsListNoticeCallout,
    CollectionsListPanel,
    CollectionsListSortingCombobox,
    CollectionsListStatus,
    CollectionsListToolbar,
    CollectionsListToolbarButton,
    CollectionsListToolbarGroup,
    CollectionsListTrigger,
    sortCollections,
} from "@/components/library/collections";
import {
    mergeCollectionSummaries,
    useWorkspace,
} from "@/components/library/workspace-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
    createCollection,
    deleteCollection,
    duplicateCollection,
    renameCollection,
    updateCollectionPriority,
    type CreateCollectionResult,
    type DeleteCollectionResult,
    type DuplicateCollectionResult,
    type RenameCollectionResult,
    type UpdateCollectionPriorityResult,
} from "@/lib/collections/actions";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
    type DisableCollectionPublicShareResult,
    type ShareCollectionPubliclyResult,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import { getSystemControlKey } from "@/lib/common/environment";
import { saveFile } from "@/lib/common/file";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import { normalizeURL, openSavedItemInNewTab } from "@/lib/common/url";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import { ChevronRight, Info, PlusIcon, Shapes } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

type CollectionActionFeedbackTone = "error" | "success";

interface CollectionActionFeedback {
    message: string;
    tone: CollectionActionFeedbackTone;
}

type CollectionShareState = Pick<
    LibraryCollectionTag,
    "id" | "shareId" | "sharedAt" | "updatedAt"
>;

interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

interface SyncCreatedCollectionInput {
    assignedItemIds: string[];
    collection: LibraryCollectionSummary;
}

const COLLECTION_CSV_CONTENT_TYPE = "text/csv;charset=utf-8";

const COLLECTION_CSV_HEADERS = [
    "Collection",
    "Caption",
    "URL",
    "Source",
    "Kind",
    "Saved At",
    "Posted At",
] as const;

const COLLECTION_NAME_MAX_LENGTH = 64;

const CREATE_COLLECTION_ERROR_MESSAGE =
    "We couldn't create this collection right now.";
const DELETE_COLLECTION_ERROR_MESSAGE =
    "We couldn't delete this collection right now.";
const DUPLICATE_COLLECTION_ERROR_MESSAGE =
    "We couldn't make a copy of this collection right now.";
const EMPTY_COLLECTION_LINKS_MESSAGE =
    "There are no links in this collection yet.";
const RENAME_COLLECTION_ERROR_MESSAGE =
    "We couldn't rename this collection right now.";
const SHARE_COLLECTION_ERROR_MESSAGE =
    "We couldn't create a public link right now.";
const STOP_SHARING_COLLECTION_ERROR_MESSAGE =
    "We couldn't stop sharing this collection right now.";
const UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE =
    "We couldn't update this collection priority right now.";

const COLLECTION_TEMPLATE_OPTIONS = [
    {
        description:
            "Articles, essays, and references worth reading when you have time.",
        name: "Reading List",
        value: "reading_list",
    },
    {
        description:
            "Visual references, examples, and sparks to kick off new ideas.",
        name: "Inspiration",
        value: "inspiration",
    },
    {
        description:
            "Step-by-step tutorials, docs, and practical guides to revisit.",
        name: "Tutorials & Guides",
        value: "tutorials_guides",
    },
    {
        description:
            "APIs, standards, specs, and evergreen references you keep coming back to.",
        name: "Reference Shelf",
        value: "reference_shelf",
    },
    {
        description:
            "Apps, services, libraries, and useful tools worth keeping handy.",
        name: "Tools & Resources",
        value: "tools_resources",
    },
    {
        description: "Videos, talks, and media to watch when you're ready.",
        name: "Watch Later",
        value: "watch_later",
    },
    {
        description: "Recipes and meal ideas you want to try later.",
        name: "Recipes",
        value: "recipes",
    },
    {
        description:
            "Background research, references, and findings for ongoing work.",
        name: "Research Notes",
        value: "research_notes",
    },
    {
        description:
            "Potential product concepts, opportunities, and experiments.",
        name: "Product Ideas",
        value: "product_ideas",
    },
    {
        description:
            "Products, gear, and purchase links you're comparing or planning to buy.",
        name: "Things to Buy",
        value: "things_to_buy",
    },
    {
        description:
            "Restaurants, cafes, shops, and spots you want to check out soon.",
        name: "Places to Try",
        value: "places_to_try",
    },
    {
        description:
            "Trips, destinations, and travel resources to plan effectively.",
        name: "Travel Plans",
        value: "travel_plans",
    },
    {
        description:
            "DIY ideas, home upgrades, decor references, and projects for your space.",
        name: "Home Projects",
        value: "home_projects",
    },
    {
        description:
            "Workouts, routines, nutrition ideas, and wellness resources to revisit.",
        name: "Wellness & Fitness",
        value: "wellness_fitness",
    },
    {
        description:
            "Learning goals, resources, and opportunities for professional growth.",
        name: "Career Growth",
        value: "career_growth",
    },
    {
        description:
            "Tickets, events, deadlines, deals, and opportunities that are only useful for a short window and should be acted on soon.",
        name: "Time-sensitive",
        value: "time_sensitive",
    },
    {
        description:
            "Personal admin items like purchases, reminders, and household tasks.",
        name: "Life Admin",
        value: "life_admin",
    },
] as const satisfies readonly CollectionTemplateOption[];

type CollectionTemplateValue =
    (typeof COLLECTION_TEMPLATE_OPTIONS)[number]["value"];

function toCollectionTag({
    createdAt,
    description,
    id,
    name,
    priority,
    sharedAt,
    shareId,
    updatedAt,
}: LibraryCollectionTag): LibraryCollectionTag {
    return {
        createdAt,
        description,
        id,
        name,
        priority,
        sharedAt,
        shareId,
        updatedAt,
    };
}

function updateCollectionById<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    getNextCollection: (collection: T) => T
): T[] {
    return collections.map((collection) =>
        collection.id === collectionId
            ? getNextCollection(collection)
            : collection
    );
}

function updateItemCollectionTags(
    items: LibraryItemWithCollections[],
    getNextCollections: (
        collections: LibraryCollectionTag[]
    ) => LibraryCollectionTag[]
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: getNextCollections(item.collections),
    }));
}

function replaceCollectionShareState<T extends LibraryCollectionTag>(
    collections: T[],
    nextCollection: CollectionShareState
): T[] {
    return sortCollections(
        updateCollectionById(collections, nextCollection.id, (collection) => ({
            ...collection,
            sharedAt: nextCollection.sharedAt,
            shareId: nextCollection.shareId,
            updatedAt: nextCollection.updatedAt,
        }))
    );
}

function replaceCollectionPriority<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    priority: CollectionPriority
): T[] {
    return updateCollectionById(collections, collectionId, (collection) => ({
        ...collection,
        priority,
    }));
}

function replaceCollectionName<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    name: string
): T[] {
    return sortCollections(
        updateCollectionById(collections, collectionId, (collection) => ({
            ...collection,
            name,
        }))
    );
}

function replaceItemsCollectionName(
    items: LibraryItemWithCollections[],
    collectionId: string,
    name: string
): LibraryItemWithCollections[] {
    return updateItemCollectionTags(items, (collections) =>
        replaceCollectionName(collections, collectionId, name)
    );
}

function appendCollectionToItems(
    items: LibraryItemWithCollections[],
    itemIds: string[],
    collection: LibraryCollectionTag
): LibraryItemWithCollections[] {
    const itemIdSet = new Set(itemIds);
    if (itemIdSet.size === 0) {
        return items;
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

function getCollectionItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function escapeCsvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function buildCollectionCsv(
    collection: LibraryCollectionSummary,
    items: LibraryItemWithCollections[]
): string {
    const rows = items.map((item) => [
        collection.name,
        item.caption ?? "",
        normalizeURL(item.url),
        item.source,
        item.kind,
        item.createdAt.toISOString(),
        item.postedAt?.toISOString() ?? "",
    ]);

    return [COLLECTION_CSV_HEADERS, ...rows]
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

function normalizeCollectionName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

function getCreateCollectionAssignedItemIds(
    result: Extract<CreateCollectionResult, { status: "CREATED" }>
): string[] {
    return result.assignedItemId ? [result.assignedItemId] : [];
}

async function createCollectionSafely(
    input: Parameters<typeof createCollection>[0]
): Promise<CreateCollectionResult> {
    try {
        return await createCollection(input);
    } catch {
        return {
            message: CREATE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function deleteCollectionSafely(
    input: Parameters<typeof deleteCollection>[0]
): Promise<DeleteCollectionResult> {
    try {
        return await deleteCollection(input);
    } catch {
        return {
            message: DELETE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function duplicateCollectionSafely(
    input: Parameters<typeof duplicateCollection>[0]
): Promise<DuplicateCollectionResult> {
    try {
        return await duplicateCollection(input);
    } catch {
        return {
            message: DUPLICATE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function renameCollectionSafely(
    input: Parameters<typeof renameCollection>[0]
): Promise<RenameCollectionResult> {
    try {
        return await renameCollection(input);
    } catch {
        return {
            message: RENAME_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function updateCollectionPrioritySafely(
    input: Parameters<typeof updateCollectionPriority>[0]
): Promise<UpdateCollectionPriorityResult> {
    try {
        return await updateCollectionPriority(input);
    } catch {
        return {
            message: UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function shareCollectionPubliclySafely(
    input: Parameters<typeof shareCollectionPublicly>[0]
): Promise<ShareCollectionPubliclyResult> {
    try {
        return await shareCollectionPublicly(input);
    } catch {
        return {
            message: SHARE_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

async function disableCollectionSharingSafely(
    input: Parameters<typeof disableCollectionSharing>[0]
): Promise<DisableCollectionPublicShareResult> {
    try {
        return await disableCollectionSharing(input);
    } catch {
        return {
            message: STOP_SHARING_COLLECTION_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}

export function WorkspaceCollectionsList() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [createDialogDraftName, setCreateDialogDraftName] =
        React.useState("");
    const [createDialogDraftDescription, setCreateDialogDraftDescription] =
        React.useState("");
    const [createDialogAssignItemId, setCreateDialogAssignItemId] =
        React.useState<string | null>(null);

    const [renameDialogDraftName, setRenameDialogDraft] = React.useState("");

    const [createDialogErrorMessage, setCreateDialogErrorMessage] =
        React.useState<string | null>(null);
    const [renameDialogErrorMessage, setRenameDialogErrorMessage] =
        React.useState<string | null>(null);

    const [pendingRenameCollection, setPendingRenameCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [pendingDeleteCollection, setPendingDeleteCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [pendingShareCollectionId, setPendingShareCollectionId] =
        React.useState<string | null>(null);

    const [collectionActionFeedback, setCollectionActionFeedback] =
        React.useState<CollectionActionFeedback | null>(null);

    const [isCreatePending, startCreateTransition] = React.useTransition();
    const [isRenamePending, startRenameTransition] = React.useTransition();
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const [isSharePending, startShareTransition] = React.useTransition();
    const [, startDuplicateTransition] = React.useTransition();

    const {
        collectionPreviewThumbnailUrlsById,
        collectionSummaries,
        collections,
        hasAccess,
        itemsByCollectionId,
        onClearCollectionFilters,
        onSelectCollection,
        selectedCollectionIds,
        setCollections,
        setItems,
    } = useWorkspace();
    const { copyToClipboard } = useCopyToClipboard();

    const showCollectionActionError = (message: string) => {
        setCollectionActionFeedback({ message, tone: "error" });
    };

    const showCollectionActionSuccess = (message: string) => {
        setCollectionActionFeedback({ message, tone: "success" });
    };

    const checkCollectionHasHiddenItems = (
        collection: LibraryCollectionSummary
    ) =>
        !hasAccess &&
        (itemsByCollectionId.get(collection.id)?.length ?? 0) <
            collection.itemCount;

    const ensureCollectionActionAccess = (
        collection: LibraryCollectionSummary,
        actionLabel: string
    ) => {
        if (!checkCollectionHasHiddenItems(collection)) {
            return true;
        }
        showCollectionActionError(
            `Upgrade to ${actionLabel} every item in ${collection.name}.`
        );
        return false;
    };

    const resetCreateDialog = () => {
        setCreateDialogDraftName("");
        setCreateDialogDraftDescription("");
        setCreateDialogErrorMessage(null);
        setCreateDialogAssignItemId(null);
    };

    const resetRenameDialog = () => {
        setPendingRenameCollection(null);
        setRenameDialogDraft("");
        setRenameDialogErrorMessage(null);
    };

    const syncCollectionShareState = (nextCollection: CollectionShareState) => {
        setCollections((current) =>
            replaceCollectionShareState(current, nextCollection)
        );
        setItems((current) =>
            updateItemCollectionTags(current, (collections) =>
                replaceCollectionShareState(collections, nextCollection)
            )
        );
    };

    const syncCollectionPriority = (
        collectionId: string,
        priority: CollectionPriority
    ) => {
        setCollections((current) =>
            replaceCollectionPriority(current, collectionId, priority)
        );
        setItems((current) =>
            updateItemCollectionTags(current, (collections) =>
                replaceCollectionPriority(collections, collectionId, priority)
            )
        );
    };

    const syncCreatedCollection = (input: SyncCreatedCollectionInput) => {
        setCollections((current) =>
            mergeCollectionSummaries(current, [input.collection])
        );

        if (input.assignedItemIds.length === 0) {
            return;
        }

        const collectionTag = toCollectionTag(input.collection);
        setItems((current) =>
            appendCollectionToItems(
                current,
                input.assignedItemIds,
                collectionTag
            )
        );
    };

    const handleCreateDialogOpenChange = (open: boolean) => {
        if (!(open || isCreatePending)) {
            resetCreateDialog();
        }
        setIsCreateDialogOpen(open);
    };

    const handleCreateCollectionRequest = (itemId?: string) => {
        setCreateDialogAssignItemId(itemId ?? null);
        setCreateDialogDraftName("");
        setCreateDialogDraftDescription("");
        setCreateDialogErrorMessage(null);
        setIsCreateDialogOpen(true);
    };

    useHotkeys(
        "mod+n",
        () => {
            if (isCreateDialogOpen) {
                setIsCreateDialogOpen(false);
            } else {
                handleCreateCollectionRequest();
            }
        },
        {
            enableOnFormTags: true,
            preventDefault: true,
        },
        [isCreateDialogOpen]
    );

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
        setRenameDialogErrorMessage(null);
        setPendingRenameCollection(collection);
    };

    const handleRenameDialogOpenChange = (open: boolean) => {
        if (!(open || isRenamePending)) {
            resetRenameDialog();
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
        if (!ensureCollectionActionAccess(collection, "copy")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        if (copyToClipboard(urls.join("\n"))) {
            showCollectionActionSuccess(
                `Links from ${collection.name} copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError("We couldn't copy these links right now.");
    };

    const handleCopyCollectionTitle = (
        collection: LibraryCollectionSummary
    ) => {
        if (copyToClipboard(collection.name)) {
            showCollectionActionSuccess(
                `${collection.name} title copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError(
            "We couldn't copy this collection title right now."
        );
    };

    const handleCopyCollectionShareLink = (
        collection: LibraryCollectionSummary
    ) => {
        if (!collection.shareId) {
            showCollectionActionError(
                "Create a public link before trying to copy it."
            );
            return;
        }

        const shareUrl = buildPublicCollectionShareUrl(collection.shareId);

        if (copyToClipboard(shareUrl)) {
            showCollectionActionSuccess(
                `Public link for ${collection.name} copied to the clipboard.`
            );
            return;
        }

        showCollectionActionError(
            "We couldn't copy this public link right now."
        );
    };

    const handleEnableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status !== "SHARED") {
                showCollectionActionError(result.message);
                setPendingShareCollectionId(null);
                return;
            }

            syncCollectionShareState(result.collection);
            setPendingShareCollectionId(null);
            showCollectionActionSuccess(
                copyToClipboard(result.shareUrl)
                    ? `${collection.name} is now publicly shared. Link copied to the clipboard.`
                    : `${collection.name} is now publicly shared.`
            );
        });
    };

    const handleDisableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            const result = await disableCollectionSharingSafely({
                collectionId: collection.id,
            });

            if (result.status !== "DISABLED") {
                showCollectionActionError(result.message);
                setPendingShareCollectionId(null);
                return;
            }

            syncCollectionShareState(result.collection);
            setPendingShareCollectionId(null);
            showCollectionActionSuccess(
                `${collection.name} is no longer publicly shared.`
            );
        });
    };

    const handleOpenCollectionLinks = (
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "open")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        showCollectionActionSuccess(
            `Opening ${urls.length} link${urls.length === 1 ? "" : "s"} from ${collection.name}.`
        );

        for (const url of urls) {
            openSavedItemInNewTab(url);
        }
    };

    const handleExportCollectionToCsv = (
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "export")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];

        if (collectionItems.length === 0) {
            showCollectionActionError(EMPTY_COLLECTION_LINKS_MESSAGE);
            return;
        }

        React.startTransition(async () => {
            try {
                await saveFile(
                    new Blob(
                        [buildCollectionCsv(collection, collectionItems)],
                        {
                            type: COLLECTION_CSV_CONTENT_TYPE,
                        }
                    ),
                    {
                        description: "CSV file",
                        extension: "csv",
                        name: collectionExportFileName(collection.name),
                    }
                );

                showCollectionActionSuccess(
                    `${collection.name} exported as CSV.`
                );
            } catch {
                showCollectionActionError(
                    "We couldn't export this collection right now."
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
            const result = await deleteCollectionSafely({
                collectionId: targetCollection.id,
            });

            if (result.status !== "DELETED") {
                showCollectionActionError(result.message);
                return;
            }

            setCollections((current) =>
                current.filter(
                    (collection) => collection.id !== result.collection.id
                )
            );
            setItems((current) =>
                updateItemCollectionTags(current, (collections) =>
                    collections.filter(
                        (collection) => collection.id !== result.collection.id
                    )
                )
            );
            setPendingDeleteCollection(null);
            showCollectionActionSuccess(`${result.collection.name} deleted.`);
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

        syncCollectionPriority(collectionId, priority);

        const runUpdate = async () => {
            const result = await updateCollectionPrioritySafely({
                collectionId,
                priority,
            });

            if (result.status === "UPDATED") {
                syncCollectionPriority(
                    result.collection.id,
                    result.collection.priority
                );
            } else {
                syncCollectionPriority(collectionId, previousPriority);
                showCollectionActionError(result.message);
            }
        };

        runUpdate().catch(() => {
            syncCollectionPriority(collectionId, previousPriority);
            showCollectionActionError(UPDATE_COLLECTION_PRIORITY_ERROR_MESSAGE);
        });
    };

    const handleRenameCollectionSubmit = () => {
        const targetCollection = pendingRenameCollection;
        if (!targetCollection) {
            return;
        }

        const previousName = targetCollection.name;
        const nextName = normalizeCollectionName(renameDialogDraftName);

        if (nextName.length === 0) {
            setRenameDialogErrorMessage("Enter a collection name.");
            return;
        }

        if (nextName === previousName) {
            resetRenameDialog();
            return;
        }

        setCollections((current) =>
            replaceCollectionName(current, targetCollection.id, nextName)
        );
        setItems((current) =>
            replaceItemsCollectionName(current, targetCollection.id, nextName)
        );

        startRenameTransition(async () => {
            const result = await renameCollectionSafely({
                collectionId: targetCollection.id,
                name: nextName,
            });

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
                resetRenameDialog();
                showCollectionActionSuccess(
                    `${result.collection.name} renamed.`
                );
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
            setRenameDialogErrorMessage(result.message);
        });
    };

    const handleDuplicateCollection = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);

        startDuplicateTransition(async () => {
            const result = await duplicateCollectionSafely({
                collectionId: collection.id,
            });

            if (result.status !== "CREATED") {
                showCollectionActionError(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: result.assignedItemIds,
                collection: result.collection,
            });
            showCollectionActionSuccess(
                `${collection.name} copied as ${result.collection.name}.`
            );
        });
    };

    const handleCreateCollectionSubmit = () => {
        startCreateTransition(async () => {
            const result = await createCollectionSafely({
                assignToItemId: createDialogAssignItemId ?? undefined,
                description: createDialogDraftDescription || undefined,
                name: createDialogDraftName,
            });

            if (result.status !== "CREATED") {
                setCreateDialogErrorMessage(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: getCreateCollectionAssignedItemIds(result),
                collection: result.collection,
            });
            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

    const handleCreateTemplateCollection = (
        templateValue: CollectionTemplateValue | null
    ) => {
        if (!templateValue) {
            return;
        }

        const selectedTemplate = COLLECTION_TEMPLATE_OPTIONS.find(
            (template) => template.value === templateValue
        );
        if (!selectedTemplate) {
            return;
        }

        setCreateDialogErrorMessage(null);

        startCreateTransition(async () => {
            const result = await createCollectionSafely({
                assignToItemId: createDialogAssignItemId ?? undefined,
                description: selectedTemplate.description,
                name: selectedTemplate.name,
            });

            if (result.status !== "CREATED") {
                setCreateDialogErrorMessage(result.message);
                return;
            }

            syncCreatedCollection({
                assignedItemIds: getCreateCollectionAssignedItemIds(result),
                collection: result.collection,
            });
            showCollectionActionSuccess(
                `${result.collection.name} created from template.`
            );
            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

    const handleCreateDialogDraftChange = (draft: string) => {
        setCreateDialogDraftName(draft);
        if (createDialogErrorMessage) {
            setCreateDialogErrorMessage(null);
        }
    };

    const handleCreateDialogDescriptionDraftChange = (draft: string) => {
        setCreateDialogDraftDescription(draft);
    };

    const handleRenameDialogDraftChange = (draft: string) => {
        setRenameDialogDraft(draft);
        if (renameDialogErrorMessage) {
            setRenameDialogErrorMessage(null);
        }
    };

    const hasSelectedCollections = selectedCollectionIds.length > 0;

    return (
        <>
            <CollectionsList>
                <div className="flex w-full items-center gap-1">
                    <CollectionsListTrigger
                        collectionLabels={collectionSummaries.map(
                            (collection) => collection.name
                        )}
                    />
                    <CollectionsListActionButton
                        onClick={() => handleCreateCollectionRequest()}
                        title={`Create a new collection (${getSystemControlKey()}N)`}
                    >
                        <PlusIcon
                            aria-hidden
                            className="inline-block size-4.5 shrink-0"
                            focusable="false"
                        />
                        <span className="sr-only">
                            Create a new collection ({getSystemControlKey()}N)
                        </span>
                    </CollectionsListActionButton>
                </div>
                <CollectionsListPanel>
                    <CollectionsListToolbar>
                        <CollectionsListNoticeCallout />
                        <CollectionsListToolbarGroup>
                            <CollectionsListToolbarButton
                                render={
                                    <CollectionsListFilterClearIcon
                                        isVisible={hasSelectedCollections}
                                        onClick={onClearCollectionFilters}
                                    />
                                }
                            />
                            <CollectionsListToolbarButton
                                render={<CollectionsListSortingCombobox />}
                            />
                        </CollectionsListToolbarGroup>
                    </CollectionsListToolbar>
                    {collectionSummaries.length === 0 ? (
                        <CollectionsListEmpty>
                            No collections found. Create your first collection
                            to start grouping saved items.
                        </CollectionsListEmpty>
                    ) : (
                        <>
                            {collectionSummaries.map((collection) => {
                                const isCollectionSelected =
                                    selectedCollectionIds.includes(
                                        collection.id
                                    );

                                return (
                                    <CollectionsListItem
                                        collection={collection}
                                        isSelected={isCollectionSelected}
                                        key={collection.id}
                                    >
                                        <CollectionsListItemPriorityCombobox
                                            onValueChange={(priority) =>
                                                handleUpdateCollectionPriority(
                                                    collection.id,
                                                    priority
                                                )
                                            }
                                        />
                                        <CollectionsListItemPreview
                                            {...(isCollectionSelected
                                                ? { "data-pressed": true }
                                                : {})}
                                            onClick={() =>
                                                onSelectCollection(
                                                    collection.id
                                                )
                                            }
                                            thumbnails={
                                                collectionPreviewThumbnailUrlsById.get(
                                                    collection.id
                                                ) ?? []
                                            }
                                        >
                                            <CollectionsListItemValue />
                                        </CollectionsListItemPreview>
                                        <CollectionsListItemMeta
                                            isSharePending={
                                                pendingShareCollectionId ===
                                                    collection.id &&
                                                isSharePending
                                            }
                                            onCopyLinks={() =>
                                                handleCopyCollectionLinks(
                                                    collection
                                                )
                                            }
                                            onCopyShareLink={() =>
                                                handleCopyCollectionShareLink(
                                                    collection
                                                )
                                            }
                                            onCopyTitle={() =>
                                                handleCopyCollectionTitle(
                                                    collection
                                                )
                                            }
                                            onDelete={() =>
                                                handleRequestDeleteCollection(
                                                    collection
                                                )
                                            }
                                            onDisableShare={() =>
                                                handleDisableCollectionShare(
                                                    collection
                                                )
                                            }
                                            onEnableShare={() =>
                                                handleEnableCollectionShare(
                                                    collection
                                                )
                                            }
                                            onExportCsv={() =>
                                                handleExportCollectionToCsv(
                                                    collection
                                                )
                                            }
                                            onMakeCopy={() =>
                                                handleDuplicateCollection(
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
                                            shareUrl={
                                                collection.shareId
                                                    ? buildPublicCollectionShareUrl(
                                                          collection.shareId
                                                      )
                                                    : null
                                            }
                                        />
                                    </CollectionsListItem>
                                );
                            })}
                            <CollectionsListStatus
                                onDismiss={() =>
                                    setCollectionActionFeedback(null)
                                }
                                tone={collectionActionFeedback?.tone}
                            >
                                {collectionActionFeedback?.message}
                            </CollectionsListStatus>
                            <CollectionsListFilterClear
                                isVisible={hasSelectedCollections}
                                onClick={onClearCollectionFilters}
                            />
                        </>
                    )}
                </CollectionsListPanel>
            </CollectionsList>
            <RenameCollectionDialog
                errorMessage={renameDialogErrorMessage}
                isOpen={pendingRenameCollection !== null}
                isPending={isRenamePending}
                nameDraft={renameDialogDraftName}
                onNameDraftChange={handleRenameDialogDraftChange}
                onOpenChange={handleRenameDialogOpenChange}
                onSubmit={handleRenameCollectionSubmit}
            />
            <CreateCollectionDialog
                descriptionDraft={createDialogDraftDescription}
                errorMessage={createDialogErrorMessage}
                isOpen={isCreateDialogOpen}
                isPending={isCreatePending}
                nameDraft={createDialogDraftName}
                onCreateFromTemplate={handleCreateTemplateCollection}
                onDescriptionDraftChange={
                    handleCreateDialogDescriptionDraftChange
                }
                onNameDraftChange={handleCreateDialogDraftChange}
                onOpenChange={handleCreateDialogOpenChange}
                onSubmit={handleCreateCollectionSubmit}
            />
            <DeleteCollectionDialog
                collection={pendingDeleteCollection}
                isPending={isDeletePending}
                onConfirm={handleConfirmDeleteCollection}
                onOpenChange={handleDeleteCollectionDialogOpenChange}
            />
        </>
    );
}

interface RenameCollectionDialogProps {
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

function RenameCollectionDialog({
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: RenameCollectionDialogProps) {
    const inputId = React.useId();

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
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
                                htmlFor={inputId}
                            >
                                Name
                            </label>
                            <Input
                                autoFocus
                                id={inputId}
                                maxLength={COLLECTION_NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
                                required
                                type="text"
                                value={nameDraft}
                            />
                            {errorMessage ? (
                                <p className="pt-2 text-destructive text-xs">
                                    {errorMessage}
                                </p>
                            ) : null}
                        </div>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface CreateCollectionDialogProps {
    descriptionDraft: string;
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onCreateFromTemplate: (
        templateValue: CollectionTemplateValue | null
    ) => void;
    onDescriptionDraftChange: (draft: string) => void;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

function CreateCollectionDialog({
    descriptionDraft,
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onCreateFromTemplate,
    onDescriptionDraftChange,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: CreateCollectionDialogProps) {
    const nameInputId = React.useId();
    const descriptionInputId = React.useId();

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
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
                                htmlFor={nameInputId}
                            >
                                Name
                            </label>
                            <Input
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={nameInputId}
                                maxLength={COLLECTION_NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
                                required
                                size="lg"
                                type="text"
                                unstyled
                                value={nameDraft}
                            />
                        </div>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={descriptionInputId}
                            >
                                Description (optional)
                            </label>
                            <Textarea
                                className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                id={descriptionInputId}
                                maxLength={1024}
                                onChange={(event) =>
                                    onDescriptionDraftChange(
                                        event.currentTarget.value
                                    )
                                }
                                placeholder="Add description..."
                                size="lg"
                                unstyled
                                value={descriptionDraft}
                            />
                        </div>
                        {errorMessage ? (
                            <p className="text-destructive text-xs">
                                {errorMessage}
                            </p>
                        ) : null}
                    </DialogPanel>
                    <DialogFooter>
                        <Combobox
                            autoHighlight
                            items={COLLECTION_TEMPLATE_OPTIONS}
                            onValueChange={onCreateFromTemplate}
                        >
                            <ComboboxTrigger
                                disabled={isPending}
                                render={
                                    <Button
                                        className="mr-auto -ml-2"
                                        size="xs"
                                        variant="link"
                                    />
                                }
                            >
                                <Shapes className="mr-0.5! size-4" />
                                Explore Templates
                            </ComboboxTrigger>
                            <ComboboxPopup align="start" className="max-w-80">
                                <ComboboxInput placeholder="Create collection from template..." />
                                <ComboboxEmpty>
                                    No matching templates
                                </ComboboxEmpty>
                                <ComboboxList>
                                    <ComboboxCollection>
                                        {(template) => (
                                            <ComboboxItem
                                                key={template.value}
                                                value={template.value}
                                            >
                                                <div className="flex min-w-0 max-w-80 flex-col gap-0.5">
                                                    <span className="min-w-0 truncate text-foreground text-sm">
                                                        {template.name}
                                                    </span>
                                                    <span className="line-clamp-2 text-muted-foreground text-xs">
                                                        {template.description}
                                                    </span>
                                                </div>
                                            </ComboboxItem>
                                        )}
                                    </ComboboxCollection>
                                </ComboboxList>
                                <div className="flex gap-2 px-3 py-2">
                                    <Info className="inline-block size-3.5 shrink-0" />
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                        Cache's{" "}
                                        <strong className="font-medium">
                                            Smart Collections
                                        </strong>{" "}
                                        can automatically assign collections to
                                        entries that match with these.
                                    </p>
                                </div>
                            </ComboboxPopup>
                        </Combobox>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Create collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface DeleteCollectionDialogProps {
    collection: LibraryCollectionSummary | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

function DeleteCollectionDialog({
    collection,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteCollectionDialogProps) {
    return (
        <Dialog onOpenChange={onOpenChange} open={collection !== null}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Delete collection?</DialogTitle>
                    <DialogDescription>
                        Remove {collection?.name || "this collection"} from
                        Cache. Saved items will remain in your library, but they
                        won't belong to this collection anymore.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose
                        disabled={isPending}
                        render={<Button variant="ghost" />}
                    >
                        Cancel
                    </DialogClose>
                    <Button
                        loading={isPending}
                        onClick={onConfirm}
                        variant="destructive"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
