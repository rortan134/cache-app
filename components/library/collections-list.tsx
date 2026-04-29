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
    useLibraryWorkspace,
} from "@/components/library/workspace-context";
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
import { normalizeURL } from "@/lib/common/url";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import { ChevronRight, Info, PlusIcon, Shapes } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface CollectionActionFeedback {
    message: string;
    tone: "error" | "success";
}

function replaceCollectionShareState<T extends LibraryCollectionTag>(
    collections: T[],
    nextCollection: Pick<
        LibraryCollectionTag,
        "id" | "shareId" | "sharedAt" | "updatedAt"
    >
): T[] {
    return sortCollections(
        collections.map((collection) =>
            collection.id === nextCollection.id
                ? {
                      ...collection,
                      sharedAt: nextCollection.sharedAt,
                      shareId: nextCollection.shareId,
                      updatedAt: nextCollection.updatedAt,
                  }
                : collection
        )
    );
}

function getCollectionItemUrls(items: LibraryItemWithCollections[]): string[] {
    return items.map((item) => normalizeURL(item.url));
}

function replaceItemsCollectionShareState(
    items: LibraryItemWithCollections[],
    nextCollection: Pick<
        LibraryCollectionTag,
        "id" | "shareId" | "sharedAt" | "updatedAt"
    >
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionShareState(
            item.collections,
            nextCollection
        ),
    }));
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

function openSavedItemsInNewTabs(urls: string[]): void {
    if (typeof window.openai === "undefined") {
        for (const url of urls) {
            openSavedItemInNewTab(url);
        }
        return;
    }
    for (const url of urls.values()) {
        openSavedItemInNewTab(url);
    }
}

function escapeCsvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function buildCollectionCsv(
    collection: LibraryCollectionSummary,
    items: LibraryItemWithCollections[]
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

function replaceCollectionPriority<T extends LibraryCollectionTag>(
    collections: T[],
    collectionId: string,
    priority: CollectionPriority
): T[] {
    return collections.map((collection) =>
        collection.id === collectionId
            ? { ...collection, priority }
            : collection
    );
}

function replaceItemsCollectionPriority(
    items: LibraryItemWithCollections[],
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

function replaceCollectionName<T extends LibraryCollectionTag>(
    collections: T[],
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

function replaceItemsCollectionName(
    items: LibraryItemWithCollections[],
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

function appendCollectionToItem(
    items: LibraryItemWithCollections[],
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
    items: LibraryItemWithCollections[],
    itemIds: string[],
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

interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

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

export function WorkspaceCollectionsList() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [createDialogDraft, setCreateDialogDraft] = React.useState("");
    const [createDialogDescriptionDraft, setCreateDialogDescriptionDraft] =
        React.useState("");
    const [createDialogError, setCreateDialogError] = React.useState<
        string | null
    >(null);
    const [isTemplateComboboxOpen, setIsTemplateComboboxOpen] =
        React.useState(false);
    const [createDialogAssignItemId, setCreateDialogAssignItemId] =
        React.useState<string | null>(null);
    const [pendingRenameCollection, setPendingRenameCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [renameDialogDraft, setRenameDialogDraft] = React.useState("");
    const [renameDialogError, setRenameDialogError] = React.useState<
        string | null
    >(null);
    const [pendingDeleteCollection, setPendingDeleteCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [collectionActionFeedback, setCollectionActionFeedback] =
        React.useState<CollectionActionFeedback | null>(null);
    const [pendingShareCollectionId, setPendingShareCollectionId] =
        React.useState<string | null>(null);

    const [isCreatePending, startCreateTransition] = React.useTransition();
    const [isRenamePending, startRenameTransition] = React.useTransition();
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const [isSharePending, startShareTransition] = React.useTransition();
    const [, startDuplicateTransition] = React.useTransition();

    const createInputId = React.useId();
    const createDescriptionId = React.useId();
    const renameInputId = React.useId();

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
    } = useLibraryWorkspace();
    const { copyToClipboard } = useCopyToClipboard();

    const collectionHasHiddenItems = (
        collection: LibraryCollectionSummary
    ): boolean =>
        !hasAccess &&
        (itemsByCollectionId.get(collection.id)?.length ?? 0) <
            collection.itemCount;

    const ensureCollectionActionAccess = (
        collection: LibraryCollectionSummary,
        actionLabel: string
    ) => {
        if (!collectionHasHiddenItems(collection)) {
            return true;
        }

        setCollectionActionFeedback({
            message: `Upgrade to ${actionLabel} every item in ${collection.name}.`,
            tone: "error",
        });
        return false;
    };

    const resetCreateDialog = () => {
        setCreateDialogDraft("");
        setCreateDialogDescriptionDraft("");
        setCreateDialogError(null);
        setIsTemplateComboboxOpen(false);
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
        if (!ensureCollectionActionAccess(collection, "copy")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];
        const urls = getCollectionItemUrls(collectionItems);

        if (urls.length === 0) {
            setCollectionActionFeedback({
                message: "There are no links in this collection yet.",
                tone: "error",
            });
            return;
        }

        setCollectionActionFeedback(
            copyToClipboard(urls.join("\n"))
                ? {
                      message: `Links from ${collection.name} copied to the clipboard.`,
                      tone: "success",
                  }
                : {
                      message: "We couldn't copy these links right now.",
                      tone: "error",
                  }
        );
    };

    const handleCopyCollectionTitle = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(
            copyToClipboard(collection.name)
                ? {
                      message: `${collection.name} title copied to the clipboard.`,
                      tone: "success",
                  }
                : {
                      message:
                          "We couldn't copy this collection title right now.",
                      tone: "error",
                  }
        );
    };

    const handleCopyCollectionShareLink = (
        collection: LibraryCollectionSummary
    ) => {
        if (!collection.shareId) {
            setCollectionActionFeedback({
                message: "Create a public link before trying to copy it.",
                tone: "error",
            });
            return;
        }

        const shareUrl = buildPublicCollectionShareUrl(collection.shareId);

        setCollectionActionFeedback(
            copyToClipboard(shareUrl)
                ? {
                      message: `Public link for ${collection.name} copied to the clipboard.`,
                      tone: "success",
                  }
                : {
                      message: "We couldn't copy this public link right now.",
                      tone: "error",
                  }
        );
    };

    const handleEnableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            let result: ShareCollectionPubliclyResult;

            try {
                result = await shareCollectionPublicly({
                    collectionId: collection.id,
                });
            } catch {
                result = {
                    message: "We couldn't create a public link right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "SHARED") {
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
                setPendingShareCollectionId(null);
                return;
            }

            setCollections((current) =>
                replaceCollectionShareState(current, result.collection)
            );
            setItems((current) =>
                replaceItemsCollectionShareState(current, result.collection)
            );
            setPendingShareCollectionId(null);
            setCollectionActionFeedback(
                copyToClipboard(result.shareUrl)
                    ? {
                          message: `${collection.name} is now publicly shared. Link copied to the clipboard.`,
                          tone: "success",
                      }
                    : {
                          message: `${collection.name} is now publicly shared.`,
                          tone: "success",
                      }
            );
        });
    };

    const handleDisableCollectionShare = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);
        setPendingShareCollectionId(collection.id);

        startShareTransition(async () => {
            let result: DisableCollectionPublicShareResult;

            try {
                result = await disableCollectionSharing({
                    collectionId: collection.id,
                });
            } catch {
                result = {
                    message:
                        "We couldn't stop sharing this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "DISABLED") {
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
                setPendingShareCollectionId(null);
                return;
            }

            setCollections((current) =>
                replaceCollectionShareState(current, result.collection)
            );
            setItems((current) =>
                replaceItemsCollectionShareState(current, result.collection)
            );
            setPendingShareCollectionId(null);
            setCollectionActionFeedback({
                message: `${collection.name} is no longer publicly shared.`,
                tone: "success",
            });
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
        collection: LibraryCollectionSummary
    ) => {
        if (!ensureCollectionActionAccess(collection, "export")) {
            return;
        }

        const collectionItems = itemsByCollectionId.get(collection.id) ?? [];

        if (collectionItems.length === 0) {
            setCollectionActionFeedback({
                message: "There are no links in this collection yet.",
                tone: "error",
            });
            return;
        }

        React.startTransition(async () => {
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

    const syncCollection = (input: {
        assignedItemIds: string[];
        collection: LibraryCollectionSummary;
    }) => {
        const nextCollection = input.collection;
        const nextCollectionTag = {
            createdAt: input.collection.createdAt,
            description: input.collection.description,
            id: input.collection.id,
            name: input.collection.name,
            priority: input.collection.priority,
            sharedAt: input.collection.sharedAt,
            shareId: input.collection.shareId,
            updatedAt: input.collection.updatedAt,
        } satisfies LibraryCollectionTag;

        setCollections((current) =>
            mergeCollectionSummaries(current, [nextCollection])
        );

        if (input.assignedItemIds.length > 0) {
            const [firstAssignedItemId] = input.assignedItemIds;
            setItems((current) =>
                input.assignedItemIds.length === 1 && firstAssignedItemId
                    ? appendCollectionToItem(
                          current,
                          firstAssignedItemId,
                          nextCollectionTag
                      )
                    : appendCollectionToItems(
                          current,
                          input.assignedItemIds,
                          nextCollectionTag
                      )
            );
        }
    };

    const handleDuplicateCollection = (
        collection: LibraryCollectionSummary
    ) => {
        setCollectionActionFeedback(null);

        startDuplicateTransition(async () => {
            let result: DuplicateCollectionResult;

            try {
                result = await duplicateCollection({
                    collectionId: collection.id,
                });
            } catch {
                result = {
                    message:
                        "We couldn't make a copy of this collection right now.",
                    status: "ERROR",
                };
            }

            if (result.status !== "CREATED") {
                setCollectionActionFeedback({
                    message: result.message,
                    tone: "error",
                });
                return;
            }

            syncCollection({
                assignedItemIds: result.assignedItemIds,
                collection: result.collection,
            });
            setCollectionActionFeedback({
                message: `${collection.name} copied as ${result.collection.name}.`,
                tone: "success",
            });
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

            syncCollection({
                assignedItemIds: result.assignedItemId
                    ? [result.assignedItemId]
                    : [],
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

        setCreateDialogError(null);
        setIsTemplateComboboxOpen(false);
        startCreateTransition(async () => {
            let result: CreateCollectionResult;

            try {
                result = await createCollection({
                    assignToItemId: createDialogAssignItemId ?? undefined,
                    description: selectedTemplate.description,
                    name: selectedTemplate.name,
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

            syncCollection({
                assignedItemIds: result.assignedItemId
                    ? [result.assignedItemId]
                    : [],
                collection: result.collection,
            });
            setCollectionActionFeedback({
                message: `${result.collection.name} created from template.`,
                tone: "success",
            });
            resetCreateDialog();
            setIsCreateDialogOpen(false);
        });
    };

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
                                        isVisible={
                                            selectedCollectionIds.length > 0
                                        }
                                        onClick={onClearCollectionFilters}
                                    />
                                }
                            />
                            <CollectionsListToolbarButton
                                render={<CollectionsListSortingCombobox />}
                            />
                        </CollectionsListToolbarGroup>
                    </CollectionsListToolbar>
                    {collectionSummaries.length > 0 ? (
                        <>
                            {collectionSummaries.map((collection) => (
                                <CollectionsListItem
                                    collection={collection}
                                    isSelected={selectedCollectionIds.includes(
                                        collection.id
                                    )}
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
                                        {...(selectedCollectionIds.includes(
                                            collection.id
                                        )
                                            ? { "data-pressed": true }
                                            : {})}
                                        onClick={() =>
                                            onSelectCollection(collection.id)
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
                                                collection.id && isSharePending
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
                            ))}
                            <CollectionsListStatus
                                onDismiss={() =>
                                    setCollectionActionFeedback(null)
                                }
                                tone={collectionActionFeedback?.tone}
                            >
                                {collectionActionFeedback?.message}
                            </CollectionsListStatus>
                            <CollectionsListFilterClear
                                isVisible={selectedCollectionIds.length > 0}
                                onClick={onClearCollectionFilters}
                            />
                        </>
                    ) : (
                        <CollectionsListEmpty>
                            No collections found. Create your first collection
                            to start grouping saved items.
                        </CollectionsListEmpty>
                    )}
                </CollectionsListPanel>
            </CollectionsList>
            <Dialog
                onOpenChange={handleRenameDialogOpenChange}
                open={pendingRenameCollection !== null}
            >
                <DialogPopup>
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
                                    type="text"
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
                <DialogPopup>
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
                                            event.currentTarget.value
                                        );
                                    }}
                                    placeholder="Add description..."
                                    size="lg"
                                    unstyled
                                    value={createDialogDescriptionDraft}
                                />
                            </div>
                            {createDialogError ? (
                                <p className="text-destructive text-xs">
                                    {createDialogError}
                                </p>
                            ) : null}
                        </DialogPanel>
                        <DialogFooter>
                            <Combobox
                                autoHighlight
                                items={COLLECTION_TEMPLATE_OPTIONS}
                                onOpenChange={setIsTemplateComboboxOpen}
                                onValueChange={handleCreateTemplateCollection}
                                open={isTemplateComboboxOpen}
                            >
                                <ComboboxTrigger
                                    disabled={isCreatePending}
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
                                <ComboboxPopup
                                    align="start"
                                    className="max-w-80"
                                >
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
                                                            {
                                                                template.description
                                                            }
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
                                            can automatically assign collections
                                            to entries that match with these.
                                        </p>
                                    </div>
                                </ComboboxPopup>
                            </Combobox>
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
                    <DialogFooter>
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDeleteCollection}
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
