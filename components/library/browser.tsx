"use client";

import { UnprivilegedOnly } from "@/components/billing/privilege";
import {
    BlockPromotionBanner,
    InlinePromotionBanner,
} from "@/components/billing/promotion-banner";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
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
    NAME_COLLATOR,
    sortCollections,
    sortCollectionSummaries,
    useCollectionsSortStore,
} from "@/components/library/collections";
import { LibraryNoteDrawer } from "@/components/library/notes";
import {
    PreviewDrawer,
    PreviewDrawerContent,
    PreviewDrawerTrigger,
} from "@/components/library/preview-drawer";
import {
    Attachment,
    AttachmentInfo,
    AttachmentPreview,
    AttachmentPreviewCard,
    AttachmentPreviewCardPopup,
    AttachmentPreviewCardTrigger,
    AttachmentRemove,
    Attachments,
    getAttachmentLabel,
    getMediaCategory,
} from "@/components/ui/attachments";
import { AutocompletePopup } from "@/components/ui/autocomplete";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
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
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanItem,
} from "@/components/ui/kanban";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Masonry, MasonryItem } from "@/components/ui/masonry";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Ticker } from "@/components/ui/ticker";
import { TruncateAfter } from "@/components/ui/truncate-after";
import { useAccess } from "@/hooks/use-access";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-effect";
import {
    createCollection,
    createCollectionFromItems,
    deleteCollection,
    duplicateCollection,
    renameCollection,
    updateCollectionPriority,
    type CreateCollectionFromItemsResult,
    type CreateCollectionResult,
    type DeleteCollectionResult,
    type DuplicateCollectionResult,
    type RenameCollectionResult,
    type UpdateCollectionPriorityResult,
} from "@/lib/collections/actions";
import {
    deleteLibraryItem,
    updateLibraryItemCollections,
    type DeleteLibraryItemResult,
    type UpdateLibraryItemCollectionsResult,
} from "@/lib/collections/items";
import { downloadMedia } from "@/lib/collections/media";
import {
    disableCollectionSharing,
    shareCollectionPublicly,
    type DisableCollectionPublicShareResult,
    type ShareCollectionPubliclyResult,
} from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import { cn } from "@/lib/common/cn";
import { getColorGradientFromName } from "@/lib/common/colors";
import { getSystemControlKey } from "@/lib/common/environment";
import {
    createFileAttachment,
    fileOpen,
    revokeFileAttachmentObjectUrl,
    saveFile,
} from "@/lib/common/file";
import { filterValidImageUrls } from "@/lib/common/image";
import { getImageColors } from "@/lib/common/image-colors";
import { withMemoize } from "@/lib/common/memoize";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import { normalizeURL, parseDisplayUrl, toValidUrl } from "@/lib/common/url";
import { dayjs } from "@/lib/dayjs";
import {
    createChromeBookmarkFromUrl,
    type CreateChromeBookmarkFromUrlResult,
} from "@/lib/integrations/chrome/actions";
import {
    createNote,
    updateNote,
    type NoteMutationResult,
} from "@/lib/integrations/notes/actions";
import { getNoteExcerpt } from "@/lib/integrations/notes/utils";
import {
    LibraryItemSource,
    type CollectionPriority,
} from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    Toolbar,
    type AutocompleteRootChangeEventDetails,
    type BaseUIEvent,
} from "@base-ui/react";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsDown,
    ChevronsUp,
    ChevronUp,
    CircleDashed,
    CircleDot,
    CircleFadingPlus,
    Component,
    CornerDownLeftIcon,
    DownloadIcon,
    ExternalLinkIcon,
    EyeIcon,
    FilePenLineIcon,
    Globe,
    Grid2x2,
    Grid2x2X,
    Info,
    LinkIcon,
    NotebookPenIcon,
    Plus,
    PlusIcon,
    Shapes,
    Sparkles,
    SquarePen,
    Trash2Icon,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import useSWR from "swr";

const SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT = 20;
const SECTION_DESCRIPTION_FALLBACK_TEXT =
    "Description is unavailable right now.";

interface CommandSuggestion {
    label: string;
    onSelect: () => void;
}

const SUGGESTION_LIMIT = 3;

function buildCommandSuggestions({
    collections,
    items,
    selectedCollectionIds,
    setGroupBy,
    setSourceFilters,
    setPaletteInput,
    setCommandListOpen,
    onToggleCollectionSelection,
}: {
    collections: LibraryCollectionSummary[];
    items: LibraryItemWithCollections[];
    selectedCollectionIds: string[];
    setGroupBy: (value: GroupByMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    setPaletteInput: (value: string) => void;
    setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    onToggleCollectionSelection: (id: string) => void;
}): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    // Suggest filtering by the most populated unselected collection
    const unselectedCollections = collections.filter(
        (c) => !selectedCollectionIds.includes(c.id) && c.itemCount > 0
    );
    const topCollection = unselectedCollections.sort(
        (a, b) => b.itemCount - a.itemCount
    )[0];

    if (topCollection) {
        suggestions.push({
            label: `Browse \u201c${topCollection.name}\u201d`,
            onSelect: () => {
                onToggleCollectionSelection(topCollection.id);
                setPaletteInput("");
                setCommandListOpen(false);
            },
        });
    }

    // Suggest filtering by the most common source
    const sourceCounts = new Map<LibraryItemSource, number>();
    for (const item of items) {
        sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
    }
    const topSource = Array.from(sourceCounts.entries()).sort(
        ([, a], [, b]) => b - a
    )[0];

    if (topSource) {
        suggestions.push({
            label: `Filter by ${sourceLabel(topSource[0])}`,
            onSelect: () => {
                setSourceFilters([topSource[0]]);
                setPaletteInput("");
                setCommandListOpen(false);
            },
        });
    }

    // Suggest grouping by source when there are multiple sources
    if (sourceCounts.size > 1) {
        suggestions.push({
            label: "Group by source",
            onSelect: () => {
                setGroupBy("source");
                setPaletteInput("");
                setCommandListOpen(false);
            },
        });
    }

    // Suggest grouping by domain as a fallback
    if (suggestions.length < SUGGESTION_LIMIT) {
        const domains = new Set(items.map((item) => itemDomain(item.url)));
        if (domains.size > 1) {
            suggestions.push({
                label: "Group by domain",
                onSelect: () => {
                    setGroupBy("domain");
                    setPaletteInput("");
                    setCommandListOpen(false);
                },
            });
        }
    }

    return suggestions.slice(0, SUGGESTION_LIMIT);
}

interface SectionDescriptionResponse {
    summary: string;
}

type SectionDescriptionSWRKey = [endpoint: string, requestBody: string];

async function fetchSectionDescription([
    endpoint,
    requestBody,
]: SectionDescriptionSWRKey): Promise<SectionDescriptionResponse> {
    const response = await fetch(endpoint, {
        body: requestBody,
        headers: {
            "content-type": "application/json",
        },
        method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: string;
    };

    if (!response.ok) {
        throw new Error(
            payload.error ?? "Unable to generate a section description."
        );
    }

    const summary = payload.summary?.trim();
    if (!summary) {
        throw new Error("Section description response was empty.");
    }

    return { summary };
}

interface Props {
    initialCollections: LibraryCollectionSummary[];
    initialItems: LibraryItemWithCollections[];
    sidebarBottom?: ReactNode;
    sidebarHeader?: ReactNode;
}

interface CollectionActionFeedback {
    message: string;
    tone: "error" | "success";
}

interface CollectionSidebarActionDependencies {
    collections: LibraryCollectionTag[];
    itemsByCollectionId: Map<string, LibraryItemWithCollections[]>;
    setCollections: (
        value:
            | LibraryCollectionTag[]
            | ((current: LibraryCollectionTag[]) => LibraryCollectionTag[])
    ) => void;
    setItems: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void;
}

interface LibraryWorkspaceSidebarProps {
    actionDependencies: CollectionSidebarActionDependencies;
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collectionSummaries: LibraryCollectionSummary[];
    onClearCollectionFilters: () => void;
    onSelectCollection: (collectionId: string) => void;
    selectedCollectionIds: string[];
    sidebarBottom?: ReactNode;
    sidebarHeader?: ReactNode;
}

function replaceItemCollections(
    items: LibraryItemWithCollections[],
    itemId: string,
    collections: LibraryCollectionTag[]
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

function getPreviewOrderSeed(value: string): number {
    let hash = 0;
    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return hash;
}

function getCollectionPreviewThumbnailUrls(
    collectionId: string,
    items: LibraryItemWithCollections[]
): string[] {
    return [...items]
        .filter(
            (
                item
            ): item is LibraryItemWithCollections & {
                thumbnailUrl: string;
            } => Boolean(item.thumbnailUrl)
        )
        .sort(
            (left, right) =>
                getPreviewOrderSeed(`${collectionId}:${left.id}`) -
                getPreviewOrderSeed(`${collectionId}:${right.id}`)
        )
        .slice(0, 5)
        .map((item) => item.thumbnailUrl);
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

function deriveCollectionSummaries(
    collections: LibraryCollectionTag[],
    items: LibraryItemWithCollections[]
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
            createdAt: collection.createdAt,
            description: collection.description ?? null,
            id: collection.id,
            itemCount: counts.get(collection.id) ?? 0,
            name: collection.name,
            priority: collection.priority,
            sharedAt: collection.sharedAt,
            shareId: collection.shareId,
            sources: Array.from(collectionSources.get(collection.id) ?? []),
            updatedAt: collection.updatedAt,
        }))
    );
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
}: LibraryWorkspaceSidebarProps): React.ReactElement {
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
    const [isCreatePending, startCreateTransition] = React.useTransition();
    const [isRenamePending, startRenameTransition] = React.useTransition();
    const [isDeletePending, startDeleteTransition] = React.useTransition();
    const [isSharePending, startShareTransition] = React.useTransition();
    const [, startDuplicateTransition] = React.useTransition();
    const [pendingShareCollectionId, setPendingShareCollectionId] =
        React.useState<string | null>(null);
    const createInputId = React.useId();
    const createDescriptionId = React.useId();
    const renameInputId = React.useId();
    const { collections, itemsByCollectionId, setCollections, setItems } =
        actionDependencies;
    const { copyToClipboard } = useCopyToClipboard();

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
        const nextCollection = {
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
            current.some((collection) => collection.id === nextCollection.id)
                ? current
                : sortCollections([...current, nextCollection])
        );

        if (input.assignedItemIds.length > 0) {
            const [firstAssignedItemId] = input.assignedItemIds;
            setItems((current) =>
                input.assignedItemIds.length === 1 && firstAssignedItemId
                    ? appendCollectionToItem(
                          current,
                          firstAssignedItemId,
                          nextCollection
                      )
                    : appendCollectionToItems(
                          current,
                          input.assignedItemIds,
                          nextCollection
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
            <Sidebar>
                <SidebarHeader>
                    {sidebarHeader}
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
                                    Create a new collection (
                                    {getSystemControlKey()}N)
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
                                                    selectedCollectionIds.length >
                                                    0
                                                }
                                                onClick={
                                                    onClearCollectionFilters
                                                }
                                            />
                                        }
                                    />
                                    <CollectionsListToolbarButton
                                        render={
                                            <CollectionsListSortingCombobox />
                                        }
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
                                                onUpdatePriority={(priority) =>
                                                    handleUpdateCollectionPriority(
                                                        collection.id,
                                                        priority
                                                    )
                                                }
                                            />
                                            <CollectionsListItemPreview
                                                onSelect={() =>
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
                                        isVisible={
                                            selectedCollectionIds.length > 0
                                        }
                                        onClick={onClearCollectionFilters}
                                    />
                                </>
                            ) : (
                                <CollectionsListEmpty>
                                    No collections found. Create your first
                                    collection to start grouping saved items.
                                </CollectionsListEmpty>
                            )}
                        </CollectionsListPanel>
                    </CollectionsList>
                </SidebarHeader>
                <SidebarFooter>{sidebarBottom}</SidebarFooter>
            </Sidebar>
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

/** Base UI combobox close reason when an item is activated (inline mode still emits this). */
const COMBOBOX_ITEM_PRESS_REASON = "item-press";
const ALL_DOMAIN_FILTER = "__all_domains__";

const SEARCH_HOTKEYS = [
    "ctrl+g",
    "ctrl+k",
    "ctrl+p",
    "cmd+g",
    "cmd+k",
    "cmd+p",
    "Meta+g",
    "Meta+k",
    "Meta+p",
    "/",
] as const;
const SEARCH_CANCEL_KEYS = ["esc", "tab"] as const;
const LIBRARY_COMMAND_PANEL_TOP_PX = 12;
const LIBRARY_SECTION_STICKY_GAP_PX = 8;
const FREE_LIBRARY_PREVIEW_ITEMS = 12;
const COLLECTION_NAME_MAX_LENGTH = 64;

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
            "Personal admin items like purchases, reminders, and household tasks.",
        name: "Life Admin",
        value: "life_admin",
    },
] as const satisfies readonly CollectionTemplateOption[];

type CollectionTemplateValue =
    (typeof COLLECTION_TEMPLATE_OPTIONS)[number]["value"];

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
type LayoutMode = "masonry" | "kanban";
type PaletteSection = "search" | "filter" | "group" | "sort" | "layout";

const DEFAULT_SORT_MODE: SortMode = "added-newest";
const DEFAULT_COLUMN_COUNT_MODE: ColumnCountMode = "auto";
const DEFAULT_LAYOUT_MODE: LayoutMode = "masonry";
const DEFAULT_COLLECTION_MEMBERSHIP_FILTER: CollectionMembershipFilter = "all";
const UNASSIGNED_COLLECTION_COLUMN_ID = "__unassigned__";
const FILTERABLE_LIBRARY_SOURCES = [
    LibraryItemSource.cache_note,
    LibraryItemSource.chrome_bookmarks,
    LibraryItemSource.github_starred_repositories,
    LibraryItemSource.google_photos,
    LibraryItemSource.instagram,
    LibraryItemSource.pinterest,
    LibraryItemSource.tiktok,
    LibraryItemSource.x_bookmarks,
    LibraryItemSource.youtube_watch_later,
] as const satisfies LibraryItemSource[];

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

const PALETTE_LAYOUT_MODE_OPTIONS = [
    { label: "Masonry", value: "masonry" as const },
    { label: "Kanban", value: "kanban" as const },
];

interface CommandPaletteItem {
    active?: boolean;
    description?: string;
    label: string;
    onSelect: (
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void | Promise<void>;
    render?: (item: CommandPaletteItem) => ReactNode;
    shortcut?: string;
    value: string;
}

interface CommandPaletteGroup {
    items: CommandPaletteItem[];
    label: string;
    layout?: "horizontal" | "vertical";
}

interface LibraryBrowserSection {
    items: LibraryItemWithCollections[];
    key: string;
    paywallPreviewCount?: number;
    showPaywallBanner?: boolean;
    title: string | null;
}
interface LibraryCommandAttachment
    extends ReturnType<typeof createFileAttachment> {
    id: string;
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException
        ? error.name === "AbortError"
        : error instanceof Error && error.name === "AbortError";
}

function itemDomain(url: string): string {
    return parseDisplayUrl(url) || "Other";
}

function itemDate(
    item: LibraryItem,
    mode: "added" | "created" = "added"
): Date {
    const value =
        mode === "created"
            ? (item.postedAt ?? item.scrapedAt ?? item.createdAt)
            : (item.scrapedAt ?? item.createdAt);
    return value instanceof Date ? value : new Date(value);
}

function itemTimestamp(
    item: LibraryItem,
    mode: "added" | "created" = "added"
): number {
    return itemDate(item, mode).getTime();
}

function itemMonthKey(
    item: LibraryItem,
    mode: "added" | "created" = "added"
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
    if (source === LibraryItemSource.github_starred_repositories) {
        return "GitHub";
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

function buildResultsCollectionName(searchTerms: string[]): string {
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
    sortMode: SortMode
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
                sourceLabel(b.source)
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
    sortMode: SortMode
): number {
    if (groupBy === "month-added" || groupBy === "month-created") {
        const isOldest =
            sortMode === "added-oldest" || sortMode === "created-oldest";
        return isOldest ? a.localeCompare(b) : b.localeCompare(a);
    }
    if (groupBy === "source") {
        return NAME_COLLATOR.compare(
            formatGroupHeading(groupBy, a),
            formatGroupHeading(groupBy, b)
        );
    }
    return NAME_COLLATOR.compare(a, b);
}

function truncateLabel(label: string, max = 22): string {
    return label.length > max ? `${label.slice(0, max)}…` : label;
}

function appendUniqueSearchTerm(values: string[], next: string): string[] {
    const normalized = next.trim();
    if (!normalized) {
        return [...values];
    }
    return values.some(
        (value) => value.toLowerCase() === normalized.toLowerCase()
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
        (field) => field?.toLowerCase().includes(normalizedQuery)
    );
}

function removeValue<T>(values: T[], value: T): T[] {
    return values.filter((entry) => entry !== value);
}

function toggleValue<T>(values: T[], next: T): T[] {
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

function isTextEntryTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            Boolean(
                target.closest('input, textarea, select, [role="textbox"]')
            ))
    );
}

function isPrintablePaletteKey(event: KeyboardEvent): boolean {
    return (
        event.key.length === 1 &&
        event.key.trim() !== "" &&
        !event.isComposing &&
        event.key !== "Dead" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
    );
}

function isSearchCancelKey(
    event: React.KeyboardEvent<HTMLInputElement>
): boolean {
    const key = event.key.toLowerCase();
    return SEARCH_CANCEL_KEYS.includes(
        key as (typeof SEARCH_CANCEL_KEYS)[number]
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

function layoutModeLabel(mode: LayoutMode): string {
    return mode === "kanban" ? "Kanban" : "Masonry";
}

function collectionMembershipFilterLabel(
    filter: CollectionMembershipFilter
): string {
    if (filter === "in-collections") {
        return "In collections";
    }
    if (filter === "not-in-collections") {
        return "Not in collections";
    }
    return "All items";
}

function collectionItemCountLabel(count: number): string {
    return `${count} item${count === 1 ? "" : "s"}`;
}

function buildCollectionPaletteDescription(
    collection: LibraryCollectionSummary,
    isActive: boolean
): string {
    const details = [collectionItemCountLabel(collection.itemCount)];

    if (collection.sources.length > 0) {
        details.push(collection.sources.map(sourceLabel).join(", "));
    }

    return isActive
        ? `Active collection filter. ${details.join(". ")}`
        : `Toggle this collection in the filter stack. ${details.join(". ")}`;
}

function buildCollectionPaletteItems({
    collections,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    wrapOnSelect,
}: {
    collections: LibraryCollectionSummary[];
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    wrapOnSelect: (fn: () => void) => () => void;
}): CommandPaletteItem[] {
    return [
        {
            active: selectedCollectionIds.length === 0,
            description:
                selectedCollectionIds.length === 0
                    ? "Show items from every collection"
                    : "Clear the selected collection filters",
            label: "Collections: All collections",
            onSelect: wrapOnSelect(onClearCollectionFilters),
            value: "filter collection all",
        },
        ...collections.map((collection) => {
            const isActive = selectedCollectionIds.includes(collection.id);

            return {
                active: isActive,
                description: buildCollectionPaletteDescription(
                    collection,
                    isActive
                ),
                label: `Collection: ${collection.name}`,
                onSelect: wrapOnSelect(() =>
                    onToggleCollectionSelection(collection.id)
                ),
                value: `filter collection ${collection.id}`,
            } satisfies CommandPaletteItem;
        }),
    ];
}

function PaletteAttachmentChip({
    attachment,
    onRemove,
}: {
    attachment: LibraryCommandAttachment;
    onRemove: (id: string) => void;
}) {
    const label = getAttachmentLabel(attachment);
    const mediaCategory = getMediaCategory(attachment);

    return (
        <Attachments className="gap-0" variant="inline">
            <AttachmentPreviewCard>
                <AttachmentPreviewCardTrigger
                    render={
                        <Attachment
                            className="palette-chip-enter max-w-[min(100%,12rem)] rounded-full border-border/60 bg-background/90 py-0.5 ps-1 pe-0.5 text-xs shadow-xs/5"
                            data={attachment}
                            onRemove={() => onRemove(attachment.id)}
                        />
                    }
                >
                    <AttachmentPreview className="size-4 rounded-full bg-transparent" />
                    <AttachmentInfo />
                    <AttachmentRemove
                        className="rounded-full opacity-100"
                        size="icon-xs"
                    >
                        <XIcon className="size-3.5! shrink-0" />
                    </AttachmentRemove>
                </AttachmentPreviewCardTrigger>
                <AttachmentPreviewCardPopup className="max-w-80">
                    <div className="space-y-3">
                        {mediaCategory === "image" && attachment.url ? (
                            <div className="flex max-h-80 w-72 items-center justify-center overflow-hidden rounded-md border">
                                <img
                                    alt={label}
                                    className="max-h-full max-w-full object-contain"
                                    height={320}
                                    src={attachment.url}
                                    width={288}
                                />
                            </div>
                        ) : null}
                        <div className="space-y-1 px-0.5">
                            <h4 className="font-semibold text-sm leading-none">
                                {label}
                            </h4>
                            {attachment.mediaType ? (
                                <p className="font-mono text-muted-foreground text-xs">
                                    {attachment.mediaType}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </AttachmentPreviewCardPopup>
            </AttachmentPreviewCard>
        </Attachments>
    );
}

function PaletteChip({
    label,
    onRemove,
}: {
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="palette-chip-enter inline-flex max-w-[min(100%,12rem)] items-center gap-0.5 rounded-full border border-border/60 bg-background/90 py-0.5 ps-2 pe-0.5 font-medium text-foreground text-xs shadow-xs/5">
            <span className="min-w-0 max-w-full truncate text-xs">{label}</span>
            <Button
                aria-label={`Remove ${label}`}
                className="rounded-full"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                }}
                size="icon-xs"
                variant="ghost"
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
    layoutMode,
    enableSectionCollapse,
    onCollapseAllSections,
    onCopyLink,
    onDelete,
    onExpandAllSections,
    onOpenNote,
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
    collapsedSectionKeys: Set<string>;
    collections: LibraryCollectionSummary[];
    clearLibraryPalette: () => void;
    columnCount?: number;
    layoutMode: LayoutMode;
    enableSectionCollapse: boolean;
    onCollapseAllSections?: () => void;
    onCopyLink: (item: LibraryItem) => void;
    onDelete: (item: LibraryItem) => void;
    onExpandAllSections?: () => void;
    onOpenNote: (item: LibraryItem) => void;
    onOpenInNewTab: (item: LibraryItem) => void;
    onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
    onToggleSection: (key: string) => void;
    paywallTotalCount?: number;
    pendingCollectionItemIds: string[];
    pendingDeleteItemId: string | null;
    sections: LibraryBrowserSection[];
    showEmptyLibraryPeek: boolean;
    showNoFilteredResults: boolean;
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
                layoutMode={layoutMode}
                onCollapseAll={onCollapseAllSections}
                onCopyLink={onCopyLink}
                onDelete={onDelete}
                onExpandAll={onExpandAllSections}
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
                        <span className="font-medium text-foreground text-xs tabular-nums">
                            {section.items.length}
                        </span>
                    </div>
                ) : null}
                <ExtensionLibraryGrid
                    collections={collections}
                    columnCount={columnCount}
                    items={section.items}
                    layoutMode={layoutMode}
                    onCopyLink={onCopyLink}
                    onDelete={onDelete}
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
        )
    );
}

function ValidCategoryThumbnail({ urls }: { urls: string[] }) {
    const [validUrls, setValidUrls] = React.useState<string[]>([]);
    const urlsKey = urls.join(",");

    React.useEffect(() => {
        if (!urlsKey) {
            setValidUrls([]);
            return;
        }
        let isMounted = true;
        filterValidImageUrls(urlsKey.split(",")).then((valid) => {
            if (isMounted) {
                setValidUrls(valid);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [urlsKey]);

    if (validUrls.length === 0) {
        return null;
    }

    return (
        <img
            alt=""
            className="absolute inset-0 z-10 size-full object-cover opacity-80 mix-blend-overlay"
            height={225}
            src={validUrls[0]}
            width={300}
        />
    );
}

function buildSearchPaletteGroups({
    collections,
    collectionPreviewThumbnailUrlsById,
    clearLibraryPalette,
    draft,
    hasAnyRefinements,
    navigationItems,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    selectedCollectionIds,
    searchTerms,
    setCommandListOpen,
    setPaletteInput,
    setSearchTerms,
}: {
    collections: LibraryCollectionSummary[];
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    clearLibraryPalette: () => void;
    draft: string;
    hasAnyRefinements: boolean;
    navigationItems: CommandPaletteItem[];
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    selectedCollectionIds: string[];
    searchTerms: string[];
    setCommandListOpen: (value: boolean) => void;
    setPaletteInput: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
}): CommandPaletteGroup[] {
    const groups: CommandPaletteGroup[] = [];
    const draftAlreadyIncluded = searchTerms.some(
        (term) => term.toLowerCase() === draft.toLowerCase()
    );
    const isDefaultState = draft.length === 0 && !hasAnyRefinements;
    const showCollectionsGroup =
        collections.length > 0 &&
        (draft.length > 0 ||
            selectedCollectionIds.length > 0 ||
            isDefaultState);
    const applyCollectionFilter = (fn: () => void) => () => {
        fn();
        setPaletteInput("");
        setCommandListOpen(true);
    };

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
                            appendUniqueSearchTerm(current, draft)
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

    if (showCollectionsGroup) {
        if (isDefaultState) {
            groups.push({
                items: collections
                    .filter((collection) => {
                        const thumbnails =
                            collectionPreviewThumbnailUrlsById.get(
                                collection.id
                            ) ?? [];
                        return thumbnails.length > 1;
                    })
                    .slice(0, 3)
                    .map((collection) => {
                        const thumbnails =
                            collectionPreviewThumbnailUrlsById.get(
                                collection.id
                            ) ?? [];
                        const isActive = selectedCollectionIds.includes(
                            collection.id
                        );
                        return {
                            active: isActive,
                            label: collection.name,
                            onSelect: applyCollectionFilter(() =>
                                onToggleCollectionSelection(collection.id)
                            ),
                            render: () => (
                                <div className="group relative flex size-full flex-col overflow-hidden rounded-3xl">
                                    {thumbnails.length > 0 && (
                                        <ValidCategoryThumbnail
                                            urls={thumbnails}
                                        />
                                    )}
                                    <div className="absolute inset-0 z-20 bg-linear-to-b from-black/40 via-black/15 to-black/5" />
                                    <span className="relative z-30 p-3 font-medium text-base text-white">
                                        {collection.name}
                                    </span>
                                </div>
                            ),
                            value: `filter collection ${collection.id}`,
                        };
                    }),
                label: "Categories",
                layout: "horizontal",
            });
        } else {
            groups.push({
                items: buildCollectionPaletteItems({
                    collections,
                    onClearCollectionFilters,
                    onToggleCollectionSelection,
                    selectedCollectionIds,
                    wrapOnSelect: applyCollectionFilter,
                }),
                label: "Collections",
            });
        }
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

    return groups;
}

interface BuildLibraryPaletteGroupsInput {
    clearLibraryPalette: () => void;
    collectionMembershipFilter: CollectionMembershipFilter;
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collections: LibraryCollectionSummary[];
    columnCountMode: ColumnCountMode;
    domainFilters: string[];
    domainOptions: {
        label: string;
        value: string;
    }[];
    groupBy: GroupByMode;
    layoutMode: LayoutMode;
    onClearCollectionFilters: () => void;
    onToggleCollectionSelection: (id: string) => void;
    openPaletteSection: (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => void;
    paletteInput: string;
    paletteSection: PaletteSection;
    returnToSearchSection: () => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setCommandListOpen: (
        value: boolean | ((previous: boolean) => boolean)
    ) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setPaletteInput: (value: string) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: SourceFilterValue[];
}

function buildDomainPaletteOptions(
    items: LibraryItem[]
): { label: string; value: string }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const domain = itemDomain(item.url);
        counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    const dynamicDomains = Array.from(counts.entries())
        .sort(
            ([aDomain, aCount], [bDomain, bCount]) =>
                bCount - aCount || NAME_COLLATOR.compare(aDomain, bDomain)
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
    collections,
    clearLibraryPalette,
    columnCountMode,
    collectionMembershipFilter,
    collectionPreviewThumbnailUrlsById,
    domainFilters,
    domainOptions,
    groupBy,
    layoutMode,
    onClearCollectionFilters,
    onToggleCollectionSelection,
    openPaletteSection,
    paletteInput,
    paletteSection,
    returnToSearchSection,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setCommandListOpen,
    setDomainFilters,
    setGroupBy,
    setLayoutMode,
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
            description: `Current: ${layoutModeLabel(layoutMode)}`,
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
        selectedCollectionIds.length > 0 ||
        sourceFilters.length > 0 ||
        domainFilters.length > 0 ||
        collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER ||
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE ||
        layoutMode !== DEFAULT_LAYOUT_MODE;

    if (paletteSection === "search") {
        return buildSearchPaletteGroups({
            clearLibraryPalette,
            collectionPreviewThumbnailUrlsById,
            collections,
            draft,
            hasAnyRefinements,
            navigationItems,
            onClearCollectionFilters,
            onToggleCollectionSelection,
            searchTerms: [...searchTerms],
            selectedCollectionIds: [...selectedCollectionIds],
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
                    (option) => option.value !== "all"
                ).map((option) => ({
                    active: sourceFilters.includes(
                        option.value as SourceFilterValue
                    ),
                    description: "Toggle this source in the filter stack",
                    label: `Source: ${option.label}`,
                    onSelect: applyAndStay(() =>
                        setSourceFilters((current) =>
                            toggleValue(
                                current,
                                option.value as SourceFilterValue
                            )
                        )
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
                            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
                        )
                    ),
                    value: "filter collections all",
                },
                {
                    active: collectionMembershipFilter === "in-collections",
                    description:
                        "Show only items that belong to at least one collection",
                    label: "Collections: In collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("in-collections")
                    ),
                    value: "filter collections in",
                },
                {
                    active: collectionMembershipFilter === "not-in-collections",
                    description:
                        "Show only items that do not belong to any collection",
                    label: "Collections: Not in collections",
                    onSelect: applyAndStay(() =>
                        setCollectionMembershipFilter("not-in-collections")
                    ),
                    value: "filter collections not-in",
                },
            ],
            label: "Collection state",
        });
        groups.push({
            items: buildCollectionPaletteItems({
                collections,
                onClearCollectionFilters,
                onToggleCollectionSelection,
                selectedCollectionIds,
                wrapOnSelect: applyAndStay,
            }),
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
                              toggleValue(current, option.value)
                          )
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
                        setGroupBy(option.value as GroupByMode)
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
                        setSortMode(option.value as SortMode)
                    ),
                    value: `sort ${option.value}`,
                })),
                label: "Sorting",
            },
        ];
    }

    return [
        { items: [backItem], label: "Navigation" },
        ...(layoutMode === "masonry"
            ? [
                  {
                      items: PALETTE_COLUMN_OPTIONS.map((option) => ({
                          active: columnCountMode === option.value,
                          description:
                              option.value === "auto"
                                  ? "Let the masonry adapt to the available width"
                                  : "Force a specific number of columns",
                          label: option.label,
                          onSelect: applyAndReturn(() =>
                              setColumnCountMode(
                                  option.value as ColumnCountMode
                              )
                          ),
                          value: `columns ${option.value}`,
                      })),
                      label: "Columns",
                  },
              ]
            : []),
        {
            items: PALETTE_LAYOUT_MODE_OPTIONS.map((option) => ({
                active: layoutMode === option.value,
                description:
                    option.value === "kanban"
                        ? "Group entries by collections in draggable columns"
                        : "Display saved items in a visual masonry grid",
                label: option.label,
                onSelect: applyAndReturn(() =>
                    setLayoutMode(option.value as LayoutMode)
                ),
                value: `layout ${option.value}`,
            })),
            label: "Layout",
        },
    ];
}

function filterLibraryBrowserItems(
    items: LibraryItemWithCollections[],
    input: {
        collectionMembershipFilter: CollectionMembershipFilter;
        domainFilters: string[];
        searchTerms: string[];
        selectedCollectionIds: string[];
        sourceFilters: SourceFilterValue[];
    }
): LibraryItemWithCollections[] {
    let list = [...items];
    const normalizedSearchTerms = input.searchTerms.map((term) =>
        term.trim().toLowerCase()
    );

    if (input.selectedCollectionIds.length > 0) {
        list = list.filter((item) =>
            item.collections.some((collection) =>
                input.selectedCollectionIds.includes(collection.id)
            )
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
                    url.includes(term)
            );
        });
    }

    if (input.sourceFilters.length > 0) {
        list = list.filter((item) => input.sourceFilters.includes(item.source));
    }

    if (input.domainFilters.length > 0) {
        list = list.filter((item) =>
            input.domainFilters.includes(itemDomain(item.url))
        );
    }

    return list;
}

function sortLibraryBrowserItems(
    filteredItems: LibraryItemWithCollections[],
    sortMode: SortMode
): LibraryItemWithCollections[] {
    const itemSortMode =
        sortMode === "count-desc" ? DEFAULT_SORT_MODE : sortMode;
    return [...filteredItems].sort((a, b) => compareItems(a, b, itemSortMode));
}

function buildLibraryBrowserSections(
    sortedItems: LibraryItemWithCollections[],
    groupBy: GroupByMode,
    sortMode: SortMode
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
    activeNote: LibraryItemWithCollections | null;
    draft: {
        contentHtml: string;
        contentState: unknown | null;
    };
}): Promise<NoteMutationResult> {
    try {
        return activeNote
            ? await updateNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
                  itemId: activeNote.id,
              })
            : await createNote({
                  contentHtml: draft.contentHtml,
                  contentState: draft.contentState ?? undefined,
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

async function createLibraryBookmarkFromPastedUrl({
    url,
}: {
    url: string;
}): Promise<CreateChromeBookmarkFromUrlResult> {
    try {
        return await createChromeBookmarkFromUrl({
            url,
        });
    } catch {
        return {
            message: "We couldn't save this URL right now.",
            status: "ERROR",
        };
    }
}

function gateLibraryBrowserSections(
    sections: LibraryBrowserSection[],
    shouldGate: boolean
): LibraryBrowserSection[] {
    if (!shouldGate) {
        return sections as LibraryBrowserSection[];
    }

    let remainingPreviewItems = FREE_LIBRARY_PREVIEW_ITEMS;
    let shouldShowPaywallBanner = true;

    return sections.map((section) => {
        const paywallPreviewCount = Math.min(
            section.items.length,
            remainingPreviewItems
        );
        const hasLockedItems = paywallPreviewCount < section.items.length;

        remainingPreviewItems = Math.max(
            0,
            remainingPreviewItems - paywallPreviewCount
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
    section: LibraryBrowserSection
): LibraryItemWithCollections[] {
    const resolvedPreviewCount = Math.max(
        0,
        Math.min(
            section.paywallPreviewCount ?? section.items.length,
            section.items.length
        )
    );

    return section.items.slice(0, resolvedPreviewCount);
}

function libraryBrowserHasActiveFilters(input: {
    collectionMembershipFilter: CollectionMembershipFilter;
    domainFilters: string[];
    searchTerms: string[];
    selectedCollectionIds: string[];
    sourceFilters: SourceFilterValue[];
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
    paletteGroups: CommandPaletteGroup[],
    paletteInput: string,
    systemControlKey: string
): CommandPaletteGroup[] {
    const filtered = paletteGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                matchesCommandPaletteItem(item, paletteInput)
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
    groupBy: GroupByMode;
    hasActiveFilters: boolean;
    sections: LibraryBrowserSection[];
    showEmptyLibraryPeek: boolean;
    showNoFilteredResults: boolean;
}) {
    const [collapsedSectionKeys, setCollapsedSectionKeys] = React.useState<
        string[]
    >([]);

    const enableSectionCollapse =
        !(showEmptyLibraryPeek || showNoFilteredResults) &&
        (hasActiveFilters || groupBy !== "none");

    React.useEffect(() => {
        const validKeys = new Set(sections.map((section) => section.key));
        setCollapsedSectionKeys((current) => {
            const next = current.filter((key) => validKeys.has(key));
            return next.length === current.length ? current : next;
        });
    }, [sections]);

    React.useEffect(() => {
        if (!enableSectionCollapse) {
            setCollapsedSectionKeys((current) =>
                current.length === 0 ? current : []
            );
        }
    }, [enableSectionCollapse]);

    const toggleSection = (key: string) => {
        setCollapsedSectionKeys((current) =>
            current.includes(key)
                ? current.filter((entry) => entry !== key)
                : [...current, key]
        );
    };

    const collapseAllSections = () => {
        setCollapsedSectionKeys(sections.map((section) => section.key));
    };

    const expandAllSections = () => {
        setCollapsedSectionKeys([]);
    };

    return {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        toggleSection,
    };
}

function LibraryPaletteTrailing({
    commandAttachments,
    collectionMembershipFilter,
    collections,
    columnCountMode,
    domainFilters,
    groupBy,
    layoutMode,
    onAttachFiles,
    onRemoveCollectionFilter,
    onRemoveCommandAttachment,
    searchTerms,
    selectedCollectionIds,
    setCollectionMembershipFilter,
    setColumnCountMode,
    setDomainFilters,
    setGroupBy,
    setLayoutMode,
    setSearchTerms,
    setSortMode,
    setSourceFilters,
    sortMode,
    sourceFilters,
}: {
    commandAttachments: LibraryCommandAttachment[];
    collectionMembershipFilter: CollectionMembershipFilter;
    collections: LibraryCollectionSummary[];
    columnCountMode: ColumnCountMode;
    domainFilters: string[];
    groupBy: GroupByMode;
    layoutMode: LayoutMode;
    onAttachFiles: () => void | Promise<void>;
    onRemoveCollectionFilter: (id: string) => void;
    onRemoveCommandAttachment: (id: string) => void;
    searchTerms: string[];
    selectedCollectionIds: string[];
    setCollectionMembershipFilter: (value: CollectionMembershipFilter) => void;
    setColumnCountMode: (value: ColumnCountMode) => void;
    setDomainFilters: (
        value: string[] | ((value: string[]) => string[])
    ) => void;
    setGroupBy: (value: GroupByMode) => void;
    setLayoutMode: (value: LayoutMode) => void;
    setSearchTerms: (value: string[] | ((value: string[]) => string[])) => void;
    setSortMode: (value: SortMode) => void;
    setSourceFilters: (
        value:
            | SourceFilterValue[]
            | ((value: SourceFilterValue[]) => SourceFilterValue[])
    ) => void;
    sortMode: SortMode;
    sourceFilters: SourceFilterValue[];
}) {
    const chips: React.ReactNode[] = [];

    for (const collectionId of selectedCollectionIds) {
        const collection = collections.find((c) => c.id === collectionId);
        if (collection) {
            chips.push(
                <PaletteChip
                    key={`collection-${collectionId}`}
                    label={`Collection: ${truncateLabel(collection.name)}`}
                    onRemove={() => onRemoveCollectionFilter(collectionId)}
                />
            );
        }
    }

    for (const attachment of commandAttachments) {
        chips.push(
            <PaletteAttachmentChip
                attachment={attachment}
                key={`attachment-${attachment.id}`}
                onRemove={onRemoveCommandAttachment}
            />
        );
    }

    for (const term of searchTerms) {
        chips.push(
            <PaletteChip
                key={`search-${term}`}
                label={`Search: ${truncateLabel(term)}`}
                onRemove={() =>
                    setSearchTerms((current) => removeValue(current, term))
                }
            />
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
            />
        );
    }

    for (const domainFilter of domainFilters) {
        chips.push(
            <PaletteChip
                key={`domain-${domainFilter}`}
                label={`Domain: ${truncateLabel(domainFilter)}`}
                onRemove={() =>
                    setDomainFilters((current) =>
                        removeValue(current, domainFilter)
                    )
                }
            />
        );
    }

    if (collectionMembershipFilter !== DEFAULT_COLLECTION_MEMBERSHIP_FILTER) {
        chips.push(
            <PaletteChip
                key="collection-membership"
                label={`Collections: ${collectionMembershipFilterLabel(collectionMembershipFilter)}`}
                onRemove={() =>
                    setCollectionMembershipFilter(
                        DEFAULT_COLLECTION_MEMBERSHIP_FILTER
                    )
                }
            />
        );
    }

    if (groupBy !== "none") {
        chips.push(
            <PaletteChip
                key="group"
                label={`Group: ${groupByLabel(groupBy)}`}
                onRemove={() => setGroupBy("none")}
            />
        );
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
        chips.push(
            <PaletteChip
                key="sort"
                label={`Sort: ${sortModeLabel(sortMode)}`}
                onRemove={() => setSortMode(DEFAULT_SORT_MODE)}
            />
        );
    }

    if (layoutMode !== DEFAULT_LAYOUT_MODE) {
        chips.push(
            <PaletteChip
                key="layout-mode"
                label={`Layout: ${layoutModeLabel(layoutMode)}`}
                onRemove={() => setLayoutMode(DEFAULT_LAYOUT_MODE)}
            />
        );
    }

    if (
        layoutMode === "masonry" &&
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE
    ) {
        chips.push(
            <PaletteChip
                key="columns"
                label={`Columns: ${columnCountLabel(columnCountMode)}`}
                onRemove={() => setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE)}
            />
        );
    }

    return (
        <>
            <TruncateAfter
                badgeRender={
                    <Badge
                        className="palette-chip-enter inline-flex h-7! cursor-pointer rounded-full text-xs tabular-nums"
                        render={<button type="button" />}
                        variant="secondary"
                    />
                }
                className="justify-end"
                count={1}
            >
                {chips}
            </TruncateAfter>
            <Button
                className="rounded-full"
                onClick={(event) => {
                    event.stopPropagation();
                    onAttachFiles();
                    event.preventDefault();
                }}
                size="icon-sm"
                title="Add context"
                variant="ghost"
            >
                <Plus className="size-4 shrink-0" />
            </Button>
        </>
    );
}

interface LibraryProps {
    collectionPreviewThumbnailUrlsById: Map<string, string[]>;
    collections: LibraryCollectionSummary[];
    items: LibraryItemWithCollections[];
    onClearCollectionFilters: () => void;
    onCreateCollectionFromResults: (input: {
        description?: string;
        itemIds: string[];
        name: string;
    }) => Promise<CreateCollectionFromItemsResult>;
    onItemsChange: (
        value:
            | LibraryItemWithCollections[]
            | ((
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void;
    onRemoveCollectionFilter: (id: string) => void;
    onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
    pendingCollectionItemIds: string[];
    selectedCollectionIds: string[];
}

interface LibraryActionFeedback {
    message: string;
    tone: "error" | "success";
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
                  current: LibraryItemWithCollections[]
              ) => LibraryItemWithCollections[])
    ) => void
) {
    const [pendingDeleteItem, setPendingDeleteItem] =
        React.useState<LibraryItem | null>(null);
    const [actionFeedback, setActionFeedback] =
        React.useState<LibraryActionFeedback | null>(null);
    const [isDeletePending, startDeleteTransition] = React.useTransition();
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
                    current.filter((item) => item.id !== result.itemId)
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
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    };
}

interface GridProps {
    collections: LibraryCollectionSummary[];
    columnCount?: number;
    items: LibraryItemWithCollections[];
    layoutMode: LayoutMode;
    onCopyLink?: (item: LibraryItemWithCollections) => void;
    onDelete?: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    onOpenNote?: (item: LibraryItemWithCollections) => void;
    onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
    paywallPreviewCount?: number;
    paywallTotalCount?: number;
    pendingCollectionItemIds: string[];
    pendingDeleteItemId?: string | null;
    showPaywallBanner?: boolean;
}

interface SectionProps extends GridProps {
    accentKey?: string;
    collapsed?: boolean;
    collapsible?: boolean;
    emptyHint: string;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    onToggle?: () => void;
    title: string;
}

interface LibraryGridCardProps {
    addedLabel: string;
    alt: string;
    collections: LibraryCollectionSummary[];
    createdLabel: string;
    href: string;
    item: LibraryItemWithCollections;
    onCopyLink?: (item: LibraryItemWithCollections) => void;
    onDelete?: (item: LibraryItemWithCollections) => void;
    onOpenInNewTab?: (item: LibraryItemWithCollections) => void;
    onOpenNote?: (item: LibraryItemWithCollections) => void;
    onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
    pendingDeleteItemId?: string | null;
    previewDescription?: string;
    previewTitle: string;
}

interface LockedLibraryGridCardProps {
    alt: string;
    item: LibraryItemWithCollections;
}

interface KanbanColumnItem {
    item: LibraryItemWithCollections;
    value: string;
}

interface PreviewMediaProps {
    alt: string;
    fallbackLabel?: string;
    src: string | null;
}

function buildKanbanColumns(
    collections: LibraryCollectionSummary[],
    items: LibraryItemWithCollections[]
): Record<string, KanbanColumnItem[]> {
    const columns: Record<string, KanbanColumnItem[]> = {
        [UNASSIGNED_COLLECTION_COLUMN_ID]: [],
    };

    for (const collection of collections) {
        columns[collection.id] = [];
    }

    for (const item of items) {
        if (item.collections.length === 0) {
            columns[UNASSIGNED_COLLECTION_COLUMN_ID]?.push({
                item,
                value: `${UNASSIGNED_COLLECTION_COLUMN_ID}:${item.id}`,
            });
            continue;
        }

        for (const collection of collections) {
            const belongsToCollection = item.collections.some(
                (entry) => entry.id === collection.id
            );
            if (!belongsToCollection) {
                continue;
            }

            columns[collection.id]?.push({
                item,
                value: `${collection.id}:${item.id}`,
            });
        }
    }

    return columns;
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

function getSharedCollectionIds(items: LibraryItemWithCollections[]): string[] {
    if (items.length === 0) {
        return [];
    }

    const [firstItem, ...remainingItems] = items;
    const sharedCollectionIds = new Set(
        firstItem?.collections.map((collection) => collection.id)
    );

    for (const item of remainingItems) {
        const itemCollectionIds = new Set(
            item.collections.map((collection) => collection.id)
        );
        for (const collectionId of [...sharedCollectionIds]) {
            if (!itemCollectionIds.has(collectionId)) {
                sharedCollectionIds.delete(collectionId);
            }
        }
    }

    return (
        firstItem?.collections
            .map((collection) => collection.id)
            .filter((collectionId) => sharedCollectionIds.has(collectionId)) ??
        []
    );
}

function fallbackGridStyle(
    columnCount?: number
): React.CSSProperties | undefined {
    if (!columnCount) {
        return;
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
}: PreviewMediaProps): React.ReactElement {
    const [didFail, setDidFail] = React.useState(false);
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
    children,
    ...props
}: React.ComponentProps<typeof ComboboxTrigger> & {
    collections: LibraryCollectionSummary[];
    item: LibraryItemWithCollections | LibraryItemWithCollections[];
    onUpdateItemCollections: (itemId: string, collectionIds: string[]) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}): React.ReactElement {
    const [isOpenInternal, setIsOpenInternal] = React.useState(false);
    const isOpen = openProp ?? isOpenInternal;
    const setIsOpen = onOpenChange ?? setIsOpenInternal;
    const selectedCollectionIds = Array.isArray(item)
        ? getSharedCollectionIds(item)
        : item.collections.map((collection) => collection.id);
    const selectedCount = selectedCollectionIds.length;

    return (
        <Combobox
            autoHighlight
            items={collections}
            multiple
            onOpenChange={setIsOpen}
            onValueChange={(nextIds) => {
                if (Array.isArray(item)) {
                    for (const currentItem of item) {
                        const mergedCollectionIds = Array.from(
                            new Set([
                                ...currentItem.collections.map(
                                    (collection) => collection.id
                                ),
                                ...nextIds,
                            ])
                        );
                        onUpdateItemCollections(
                            currentItem.id,
                            mergedCollectionIds
                        );
                    }
                } else {
                    onUpdateItemCollections(item.id, [...nextIds]);
                }
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
                {...props}
            >
                {children ??
                    (selectedCount > 0 ? (
                        <CircleDot className="size-4.5" />
                    ) : (
                        <CircleDashed className="size-4.5" />
                    ))}
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
                                <div className="flex max-w-64 items-center justify-between gap-3">
                                    <span className="min-w-0 max-w-full flex-1 truncate text-foreground text-sm">
                                        {collection.name}
                                    </span>
                                    <span className="shrink-0 text-nowrap text-muted-foreground text-xs tabular-nums">
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

function PreviewColor({ value }: { value: string }) {
    const { copyToClipboard, isCopied } = useCopyToClipboard();

    return (
        <Avatar
            className="relative size-4.5 cursor-pointer overflow-visible"
            onClick={() => copyToClipboard(value)}
        >
            <AvatarFallback style={{ backgroundColor: value }}>
                {isCopied ? (
                    <>
                        <Check className="size-3 text-black invert" />
                        <span className="absolute -bottom-4 text-nowrap rounded-full bg-white text-[11px] text-success-foreground">
                            Copied!
                        </span>
                    </>
                ) : null}
            </AvatarFallback>
        </Avatar>
    );
}

function PreviewColorPalette({ src }: { src: string }) {
    const { data } = useSWR(src, withMemoize(getImageColors), {
        keepPreviousData: true,
    });

    if (!data) {
        return null;
    }

    return (
        <AvatarGroup className="justify-end -space-x-1">
            {data.map((value, i) => (
                <PreviewColor key={i} value={value} />
            ))}
        </AvatarGroup>
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
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingDeleteItemId,
    previewDescription,
    previewTitle,
}: LibraryGridCardProps): React.ReactElement {
    const isNote = item.kind === "note";
    const isDeletePending = pendingDeleteItemId === item.id;
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] =
        React.useState(false);
    const previewImageUrl = opengraphPreviewUrl(item);
    const canPreview = !isNote && toValidUrl(href) !== "about:blank";
    const noteExcerpt = getNoteExcerpt(item.noteContentText);
    const displayTitle = getItemTitle(item);

    useHotkeys("s", () => setIsCollectionPickerOpen(true), {
        enabled: isHovered && !isCollectionPickerOpen,
        preventDefault: true,
    });

    const handlePrimaryClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isNote) {
            onOpenNote?.(item);
            return;
        }
        onOpenInNewTab?.(item);
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
            <div className="relative mx-auto flex max-w-56 items-center gap-2 py-2 pl-2.5 opacity-50">
                <span
                    className={cn("block truncate text-xs", {
                        "underline decoration-muted-foreground/20 underline-offset-2":
                            !isNote,
                    })}
                >
                    {isNote ? (
                        "Note"
                    ) : (
                        <a
                            href={item.url}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {item.url}
                        </a>
                    )}
                </span>
            </div>
            <div className="px-2.5 pb-2 text-[11px] text-muted-foreground">
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
                {previewImageUrl ? (
                    <div className="flex items-center justify-between gap-3 py-0.5">
                        <span>Palette</span>
                        <PreviewColorPalette src={previewImageUrl} />
                    </div>
                ) : null}
            </div>
        </>
    );

    const renderPrimaryMenuItems = (
        Item: typeof ContextMenuItem | typeof MenuItem,
        Separator: typeof ContextMenuSeparator | typeof MenuSeparator
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
                        nativeButton={false}
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
                    <Item closeOnClick onClick={() => onCopyLink?.(item)}>
                        <LinkIcon className="size-4.5 text-muted-foreground" />
                        Copy URL link
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
                    className="group relative flex flex-col overflow-hidden rounded-xl ring-1 ring-border/50 hover:z-10"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
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
                    {dayjs(addedLabel).isToday() && !isNote ? (
                        <Badge
                            className="absolute top-3 left-3 bg-primary/50"
                            size="sm"
                        >
                            NEW
                        </Badge>
                    ) : null}
                    <div
                        className={cn(
                            "overflow-fade-top absolute inset-x-0 bottom-0 flex items-center gap-1 overflow-hidden bg-black/35 px-1.5 pt-2 pb-1 backdrop-blur-[2.5px]",
                            {
                                "bg-black/4 opacity-80 mix-blend-difference":
                                    isNote,
                            }
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
}: LockedLibraryGridCardProps): React.ReactElement {
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
    locked = false,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    pendingDeleteItemId,
}: GridProps & { locked?: boolean }): React.ReactElement {
    return (
        <Masonry
            columnCount={columnCount}
            deps={[
                collections,
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
                            "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
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
                    item.scrapedAt ?? item.createdAt
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

function renderLibraryKanban({
    collections,
    items,
    locked = false,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenInNewTab,
    onUpdateItemCollections,
    pendingDeleteItemId,
}: GridProps & { locked?: boolean }): React.ReactElement {
    const kanbanColumns = buildKanbanColumns(collections, items);
    const columnIds = [
        UNASSIGNED_COLLECTION_COLUMN_ID,
        ...collections.map((collection) => collection.id),
    ];

    return (
        <div className="overflow-x-auto pb-1">
            <Kanban getItemValue={(entry) => entry.value} value={kanbanColumns}>
                <KanbanBoard className="min-w-max items-start gap-3">
                    {columnIds.map((columnId) => {
                        const columnName =
                            columnId === UNASSIGNED_COLLECTION_COLUMN_ID
                                ? "No collection"
                                : (collections.find(
                                      (item) => item.id === columnId
                                  )?.name ?? "Collection");
                        const columnItems = kanbanColumns[columnId] ?? [];

                        return (
                            <KanbanColumn
                                className="w-76"
                                key={columnId}
                                value={columnId}
                            >
                                <div className="mb-2 flex items-center gap-3">
                                    <h3 className="truncate font-medium text-sm">
                                        {columnName}
                                    </h3>
                                    <span className="shrink-0 font-medium text-muted-foreground text-xs tabular-nums">
                                        {columnItems.length}
                                    </span>
                                </div>
                                <div className="flex min-h-24 flex-col gap-3">
                                    {columnItems.length === 0 ? (
                                        <p className="rounded-lg border border-border/60 border-dashed px-3 py-4 text-center text-muted-foreground text-xs">
                                            No items yet
                                        </p>
                                    ) : (
                                        columnItems.map((columnItem) => {
                                            const { item } = columnItem;
                                            const href = normalizeURL(item.url);
                                            const alt =
                                                (item.caption ?? "").trim() ||
                                                "Saved item";
                                            const domain = itemDomain(item.url);
                                            const previewTitle =
                                                alt === "Saved item"
                                                    ? "Preview"
                                                    : alt;
                                            const previewDescription =
                                                domain === "Other"
                                                    ? item.url
                                                    : domain;
                                            const createdLabel = itemDateLabel(
                                                item.createdAt
                                            );
                                            const addedLabel = itemDateLabel(
                                                item.scrapedAt ?? item.createdAt
                                            );

                                            return (
                                                <KanbanItem
                                                    key={columnItem.value}
                                                    value={columnItem.value}
                                                >
                                                    {locked ? (
                                                        <LockedLibraryGridCard
                                                            alt={alt}
                                                            item={item}
                                                        />
                                                    ) : (
                                                        <LibraryGridCard
                                                            addedLabel={
                                                                addedLabel
                                                            }
                                                            alt={alt}
                                                            collections={
                                                                collections
                                                            }
                                                            createdLabel={
                                                                createdLabel
                                                            }
                                                            href={href}
                                                            item={item}
                                                            onCopyLink={
                                                                onCopyLink
                                                            }
                                                            onDelete={onDelete}
                                                            onOpenInNewTab={
                                                                onOpenInNewTab
                                                            }
                                                            onOpenNote={
                                                                onOpenNote
                                                            }
                                                            onUpdateItemCollections={
                                                                onUpdateItemCollections
                                                            }
                                                            pendingDeleteItemId={
                                                                pendingDeleteItemId
                                                            }
                                                            previewDescription={
                                                                previewDescription
                                                            }
                                                            previewTitle={
                                                                previewTitle
                                                            }
                                                        />
                                                    )}
                                                </KanbanItem>
                                            );
                                        })
                                    )}
                                </div>
                            </KanbanColumn>
                        );
                    })}
                </KanbanBoard>
            </Kanban>
        </div>
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
    layoutMode,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenInNewTab,
    onUpdateItemCollections,
    paywallPreviewCount,
    paywallTotalCount,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    showPaywallBanner,
}: GridProps): React.ReactElement | null {
    if (items.length === 0) {
        return null;
    }

    const resolvedPreviewCount = Math.max(
        0,
        Math.min(paywallPreviewCount ?? items.length, items.length)
    );
    const showPaywall = resolvedPreviewCount < items.length;
    const previewItems = showPaywall
        ? items.slice(0, resolvedPreviewCount)
        : items;
    const lockedItems = showPaywall ? items.slice(resolvedPreviewCount) : [];
    const renderLibraryLayout = (
        nextItems: LibraryItemWithCollections[],
        locked = false
    ) =>
        layoutMode === "kanban"
            ? renderLibraryKanban({
                  collections,
                  columnCount,
                  items: nextItems,
                  layoutMode,
                  locked,
                  onCopyLink,
                  onDelete,
                  onOpenInNewTab,
                  onOpenNote,
                  onUpdateItemCollections,
                  paywallPreviewCount,
                  paywallTotalCount,
                  pendingCollectionItemIds,
                  pendingDeleteItemId,
                  showPaywallBanner,
              })
            : renderLibraryMasonry({
                  collections,
                  columnCount,
                  items: nextItems,
                  layoutMode,
                  locked,
                  onCopyLink,
                  onDelete,
                  onOpenInNewTab,
                  onOpenNote,
                  onUpdateItemCollections,
                  paywallPreviewCount,
                  paywallTotalCount,
                  pendingCollectionItemIds,
                  pendingDeleteItemId,
                  showPaywallBanner,
              });

    if (!showPaywall) {
        return renderLibraryLayout(items);
    }

    return (
        <div className="flex flex-col gap-8">
            {previewItems.length > 0 ? renderLibraryLayout(previewItems) : null}
            {lockedItems.length > 0 ? (
                <div className="relative isolate">
                    {showPaywallBanner ? (
                        <BlockPromotionBanner
                            length={paywallTotalCount ?? items.length}
                        />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-linear-to-b from-background/10 via-background/45 to-background/75" />
                    <div className="select-none opacity-60 blur-[1.5px] saturate-75">
                        {renderLibraryLayout(lockedItems, true)}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function SectionDescription({
    items,
    title,
}: {
    items: LibraryItemWithCollections[];
    title: string;
}) {
    const requestBody = React.useMemo(
        () =>
            JSON.stringify({
                items: items.slice(0, SECTION_DESCRIPTION_CONTEXT_ITEMS_LIMIT),
                sectionTitle: title,
            }),
        [items, title]
    );
    const { data, error, isLoading } = useSWR<SectionDescriptionResponse>(
        items.length > 0
            ? (["/api/library/section-description", requestBody] as const)
            : null,
        fetchSectionDescription,
        {
            dedupingInterval: 60_000,
            keepPreviousData: true,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        }
    );

    if (isLoading && !data && !error) {
        return (
            <div className="block w-full text-xs leading-snug">
                <Skeleton className="my-0.5 h-4 w-full" />
                <Skeleton className="my-0.5 h-4 w-48" />
            </div>
        );
    }

    const summary = data?.summary?.trim();
    return (
        <p className="fade-in-0 block w-full animate-in text-xs leading-snug motion-reduce:animate-none">
            {summary && summary.length > 0
                ? summary
                : SECTION_DESCRIPTION_FALLBACK_TEXT}
        </p>
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
    layoutMode,
    onCopyLink,
    onDelete,
    onOpenNote,
    onOpenInNewTab,
    onUpdateItemCollections,
    onToggle,
    onCollapseAll,
    onExpandAll,
    pendingCollectionItemIds,
    pendingDeleteItemId,
    title,
}: SectionProps): React.ReactElement {
    const canToggle = collapsible && onToggle;
    const headerGradient = collapsible
        ? getColorGradientFromName(accentKey ?? title)
        : undefined;
    let body: React.ReactElement | null;

    const shouldRequestDescription = canToggle && title === "Results";

    if (collapsed) {
        body = null;
    } else if (items.length === 0) {
        body = <p className="text-muted-foreground text-sm">{emptyHint}</p>;
    } else {
        body = (
            <>
                {shouldRequestDescription ? (
                    <div className="flex items-start gap-2">
                        <AvatarGroup>
                            <Avatar className="size-7 bg-muted">
                                <Sparkles className="size-4" />
                            </Avatar>
                            <Avatar className="border-2 border-white bg-muted">
                                <Info className="size-4" />
                            </Avatar>
                        </AvatarGroup>
                        <div className="flex w-full flex-1 flex-col gap-1">
                            <GradientWaveText
                                ariaLabel="Description"
                                className="-ml-px font-medium text-muted-foreground text-xs opacity-80"
                            >
                                Description
                            </GradientWaveText>
                            <SectionDescription items={items} title={title} />
                        </div>
                    </div>
                ) : null}
                <ExtensionLibraryGrid
                    collections={collections}
                    columnCount={columnCount}
                    items={items}
                    layoutMode={layoutMode}
                    onCopyLink={onCopyLink}
                    onDelete={onDelete}
                    onOpenInNewTab={onOpenInNewTab}
                    onOpenNote={onOpenNote}
                    onUpdateItemCollections={onUpdateItemCollections}
                    pendingCollectionItemIds={pendingCollectionItemIds}
                    pendingDeleteItemId={pendingDeleteItemId}
                />
            </>
        );
    }

    return (
        <section className="flex w-full flex-col gap-3">
            <ContextMenu>
                <ContextMenuTrigger render={<div className="contents" />}>
                    <div
                        className={cn(
                            "flex items-center justify-between gap-3 py-1 pr-5",
                            collapsible &&
                                "sticky z-10 rounded-xl bg-muted/92 backdrop-blur-sm supports-backdrop-filter:bg-muted/50"
                        )}
                        style={
                            collapsible
                                ? ({
                                      background: headerGradient,
                                      top: "var(--library-section-sticky-top)",
                                  } as React.CSSProperties)
                                : undefined
                        }
                    >
                        {canToggle ? (
                            <Button
                                className="group min-w-0 flex-1 justify-start rounded-xl"
                                onClick={onToggle}
                                size="lg"
                                title={
                                    collapsed
                                        ? "Expand group"
                                        : "Collapse group"
                                }
                                variant="ghost"
                                {...(collapsed
                                    ? {}
                                    : { "data-panel-open": true })}
                            >
                                <ChevronDownFilledIcon />
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
                </ContextMenuTrigger>
                {collapsible && (
                    <ContextMenuPopup>
                        <ContextMenuItem
                            closeOnClick
                            disabled={!collapsed}
                            onClick={onToggle}
                        >
                            <ChevronDown className="size-4.5 text-muted-foreground" />
                            Expand
                        </ContextMenuItem>
                        <ContextMenuItem
                            closeOnClick
                            disabled={collapsed}
                            onClick={onToggle}
                        >
                            <ChevronUp className="size-4.5 text-muted-foreground" />
                            Collapse
                        </ContextMenuItem>
                        {(onExpandAll || onCollapseAll) && (
                            <>
                                <ContextMenuSeparator />
                                {onExpandAll && (
                                    <ContextMenuItem
                                        closeOnClick
                                        onClick={onExpandAll}
                                    >
                                        <ChevronsDown className="size-4.5 text-muted-foreground" />
                                        Expand all
                                    </ContextMenuItem>
                                )}
                                {onCollapseAll && (
                                    <ContextMenuItem
                                        closeOnClick
                                        onClick={onCollapseAll}
                                    >
                                        <ChevronsUp className="size-4.5 text-muted-foreground" />
                                        Collapse all
                                    </ContextMenuItem>
                                )}
                            </>
                        )}
                    </ContextMenuPopup>
                )}
            </ContextMenu>
            {body}
        </section>
    );
}

function LibraryBrowser({
    collectionPreviewThumbnailUrlsById,
    collections,
    items,
    onClearCollectionFilters,
    onCreateCollectionFromResults,
    onItemsChange,
    onRemoveCollectionFilter,
    onUpdateItemCollections,
    pendingCollectionItemIds,
    selectedCollectionIds,
}: LibraryProps) {
    const { hasAccess, isLoading: isAccessLoading } = useAccess();
    const systemControlKey = useClientOnlyValue(getSystemControlKey());
    const [searchTerms, setSearchTerms] = React.useState<string[]>([]);
    const [paletteInput, setPaletteInput] = React.useState("");
    const [sourceFilters, setSourceFilters] = React.useState<
        SourceFilterValue[]
    >([]);
    const [domainFilters, setDomainFilters] = React.useState<string[]>([]);
    const [collectionMembershipFilter, setCollectionMembershipFilter] =
        React.useState<CollectionMembershipFilter>(
            DEFAULT_COLLECTION_MEMBERSHIP_FILTER
        );
    const [groupBy, setGroupBy] = React.useState<GroupByMode>("none");
    const [sortMode, setSortMode] = React.useState<SortMode>(DEFAULT_SORT_MODE);
    const [columnCountMode, setColumnCountMode] =
        React.useState<ColumnCountMode>(DEFAULT_COLUMN_COUNT_MODE);
    const [layoutMode, setLayoutMode] =
        React.useState<LayoutMode>(DEFAULT_LAYOUT_MODE);
    const [paletteSection, setPaletteSection] =
        React.useState<PaletteSection>("search");
    const [commandAttachments, setCommandAttachments] = React.useState<
        LibraryCommandAttachment[]
    >([]);
    const [activeNote, setActiveNote] =
        React.useState<LibraryItemWithCollections | null>(null);
    const [isNoteDrawerOpen, setIsNoteDrawerOpen] = React.useState(false);
    const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] =
        React.useState(false);
    const [createResultsNameDraft, setCreateResultsNameDraft] =
        React.useState("");
    const [createResultsDescriptionDraft, setCreateResultsDescriptionDraft] =
        React.useState("");
    const [createResultsError, setCreateResultsError] = React.useState<
        string | null
    >(null);
    const [commandListOpen, setCommandListOpen] = React.useState(false);
    const [isPaletteFocused, setIsPaletteFocused] = React.useState(false);
    const [commandPanelShellHeight, setCommandPanelShellHeight] =
        React.useState(0);
    const commandPanelContainerRef = React.useRef<HTMLDivElement>(null);
    const paletteInputRef = React.useRef<HTMLInputElement>(null);
    const commandAttachmentsRef = React.useRef<LibraryCommandAttachment[]>([]);
    commandAttachmentsRef.current = commandAttachments;
    const createResultsNameInputId = React.useId();
    const createResultsDescriptionId = React.useId();
    /** Skips one combobox-driven close right after entering a drill-down section. */
    const suppressNextCommandCloseRef = React.useRef(false);
    const {
        actionFeedback,
        handleConfirmDelete,
        handleCopyLink,
        handleDeleteDialogOpenChange,
        handleOpenInNewTab,
        handleRequestDelete,
        isDeletePending,
        pendingDeleteItem,
        setActionFeedback,
    } = useLibraryItemActions(onItemsChange);
    const [isSavingNote, startSavingNoteTransition] = React.useTransition();
    const [isSavingPastedUrl, startSavingPastedUrlTransition] =
        React.useTransition();
    const [
        isCreatingResultsCollection,
        startCreateResultsCollectionTransition,
    ] = React.useTransition();

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

    const focusPaletteInputRef = React.useRef(focusPaletteInput);
    focusPaletteInputRef.current = focusPaletteInput;

    const handleCommandOpenChange = (
        nextOpen: boolean,
        eventDetails?: { reason?: string }
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

    useIsomorphicLayoutEffect(() => {
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

    useIsomorphicLayoutEffect(() => {
        const el = commandPanelContainerRef.current;
        if (!el) {
            return;
        }

        const updateHeight = () => {
            const nextHeight = Math.ceil(el.getBoundingClientRect().height);
            setCommandPanelShellHeight((current) =>
                current === nextHeight ? current : nextHeight
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

    React.useEffect(() => {
        const handleWindowKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            const isTextEntry = isTextEntryTarget(target);
            const isPaletteEventTarget =
                target instanceof Node &&
                commandPanelContainerRef.current?.contains(target);

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
                !isTextEntry
            ) {
                event.preventDefault();
                focusPaletteInputRef.current();
                return;
            }

            if (
                event.defaultPrevented ||
                isTextEntry ||
                isPaletteEventTarget ||
                !isPrintablePaletteKey(event)
            ) {
                return;
            }

            event.preventDefault();
            setPaletteInput((current) => `${current}${event.key}`);
            focusPaletteInputRef.current();
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, []);

    React.useEffect(
        () => () => {
            for (const attachment of commandAttachmentsRef.current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
        },
        []
    );

    const returnToSearchSection = () => {
        setPaletteSection("search");
        setPaletteInput("");
        setCommandListOpen(true);
    };

    const openPaletteSection = (
        section: Exclude<PaletteSection, "search">,
        event: BaseUIEvent<React.MouseEvent> | KeyboardEvent
    ) => {
        event.preventDefault();
        suppressNextCommandCloseRef.current = true;
        setPaletteSection(section);
        setPaletteInput("");
    };

    const handleCommandInputChange = (
        next: string,
        eventDetails: AutocompleteRootChangeEventDetails
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

    const removeCommandAttachment = (id: string) => {
        setCommandAttachments((current) => {
            const nextAttachments: LibraryCommandAttachment[] = [];
            for (const attachment of current) {
                if (attachment.id === id) {
                    revokeFileAttachmentObjectUrl(attachment.url);
                    continue;
                }
                nextAttachments.push(attachment);
            }
            return nextAttachments;
        });
    };

    const clearCommandAttachments = () => {
        setCommandAttachments((current) => {
            for (const attachment of current) {
                revokeFileAttachmentObjectUrl(attachment.url);
            }
            return [];
        });
    };

    const handleAttachCommandFiles = async () => {
        try {
            const selectedFiles = await fileOpen({
                description: "Files",
                multiple: true,
            });
            const files = Array.isArray(selectedFiles)
                ? selectedFiles
                : [selectedFiles];

            if (files.length === 0) {
                return;
            }

            const nextAttachments = files.map((file) => ({
                ...createFileAttachment(file),
                id: crypto.randomUUID(),
            }));
            setCommandAttachments((current) => [
                ...current,
                ...nextAttachments,
            ]);
            focusPaletteInputRef.current();
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }
            setActionFeedback({
                message: "We couldn't attach those files right now.",
                tone: "error",
            });
        }
    };

    const clearLibraryPalette = () => {
        setPaletteInput("");
        setSearchTerms([]);
        setSourceFilters([]);
        setDomainFilters([]);
        clearCommandAttachments();
        setCollectionMembershipFilter(DEFAULT_COLLECTION_MEMBERSHIP_FILTER);
        onClearCollectionFilters();
        setGroupBy("none");
        setSortMode(DEFAULT_SORT_MODE);
        setColumnCountMode(DEFAULT_COLUMN_COUNT_MODE);
        setLayoutMode(DEFAULT_LAYOUT_MODE);
        setPaletteSection("search");
        setCommandListOpen(false);
    };

    const handlePaletteInputKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
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
        collectionPreviewThumbnailUrlsById,
        collections,
        columnCountMode,
        domainFilters,
        domainOptions,
        groupBy,
        layoutMode,
        onClearCollectionFilters,
        onToggleCollectionSelection: onRemoveCollectionFilter,
        openPaletteSection,
        paletteInput,
        paletteSection,
        returnToSearchSection,
        searchTerms,
        selectedCollectionIds,
        setCollectionMembershipFilter,
        setColumnCountMode,
        setCommandListOpen,
        setDomainFilters,
        setGroupBy,
        setLayoutMode,
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
        systemControlKey ?? ""
    );

    const visiblePaletteGroupsRef = React.useRef(visiblePaletteGroups);
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
                (g) => g.items
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
        [commandListOpen]
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

    const filteredItems = React.useMemo(
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
        ]
    );

    const sortedItems = React.useMemo(
        () => sortLibraryBrowserItems(filteredItems, sortMode),
        [filteredItems, sortMode]
    );

    const sections = React.useMemo(
        () => buildLibraryBrowserSections(sortedItems, groupBy, sortMode),
        [groupBy, sortMode, sortedItems]
    );

    const shouldGateResults =
        !(isAccessLoading || hasAccess) &&
        filteredItems.length > FREE_LIBRARY_PREVIEW_ITEMS;

    const gatedSections = React.useMemo(
        () => gateLibraryBrowserSections(sections, shouldGateResults),
        [sections, shouldGateResults]
    );

    const hasActiveFilters = React.useMemo(
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
        ]
    );

    const hasNonDefaultView =
        groupBy !== "none" ||
        sortMode !== DEFAULT_SORT_MODE ||
        columnCountMode !== DEFAULT_COLUMN_COUNT_MODE ||
        layoutMode !== DEFAULT_LAYOUT_MODE;

    const showEmptyLibraryPeek =
        items.length === 0 && filteredItems.length === 0 && !hasActiveFilters;

    const showNoFilteredResults =
        filteredItems.length === 0 && !showEmptyLibraryPeek;

    const {
        collapseAllSections,
        collapsedSectionKeys,
        enableSectionCollapse,
        expandAllSections,
        toggleSection,
    } = useSectionCollapseState({
        groupBy,
        hasActiveFilters,
        sections: gatedSections,
        showEmptyLibraryPeek,
        showNoFilteredResults,
    });

    const resolvedColumnCount =
        layoutMode === "masonry" && columnCountMode !== "auto"
            ? Number(columnCountMode)
            : undefined;

    const resultsSummary =
        filteredItems.length === items.length
            ? `${items.length} item${items.length === 1 ? "" : "s"}`
            : `${filteredItems.length} of ${items.length} items`;
    const visibleResultItems = React.useMemo(
        () =>
            gatedSections.flatMap((section) => getVisibleSectionItems(section)),
        [gatedSections]
    );
    const canCreateCollectionFromResults =
        searchTerms.length > 0 && visibleResultItems.length > 0;

    const canClear =
        (hasActiveFilters || hasNonDefaultView) && !showEmptyLibraryPeek;

    const commandSuggestions = React.useMemo(
        () =>
            buildCommandSuggestions({
                collections,
                items,
                onToggleCollectionSelection: onRemoveCollectionFilter,
                selectedCollectionIds,
                setCommandListOpen,
                setGroupBy,
                setPaletteInput,
                setSourceFilters,
            }),
        [collections, items, onRemoveCollectionFilter, selectedCollectionIds]
    );

    const resultCollectionItemIds = React.useMemo(
        () => visibleResultItems.map((item) => item.id),
        [visibleResultItems]
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

    const handleSaveNote = async (draft: {
        contentHtml: string;
        contentState: unknown | null;
    }) =>
        await new Promise<boolean>((resolve) => {
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
                        (item) => item.id === result.item.id
                    );

                    if (existingIndex === -1) {
                        return [result.item, ...current];
                    }

                    return current.map((item) =>
                        item.id === result.item.id ? result.item : item
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

    const handlePasteUrlIntoLibrary = async (url: string) =>
        await new Promise<void>((resolve) => {
            startSavingPastedUrlTransition(async () => {
                setActionFeedback(null);

                const result = await createLibraryBookmarkFromPastedUrl({
                    url,
                });

                if (result.status !== "SUCCESS") {
                    setActionFeedback({
                        message: result.message,
                        tone: "error",
                    });
                    resolve();
                    return;
                }

                onItemsChange((current) => {
                    const existingIndex = current.findIndex(
                        (item) => item.id === result.item.id
                    );

                    if (existingIndex === -1) {
                        return [result.item, ...current];
                    }

                    return current.map((item) =>
                        item.id === result.item.id ? result.item : item
                    );
                });

                let message =
                    "Existing bookmark refreshed from the pasted link.";
                if (result.outcome === "CREATED") {
                    message = "Link saved to your library.";
                } else if (result.outcome === "MERGED") {
                    message =
                        "Link matched an existing bookmark in your library.";
                }

                setActionFeedback({
                    message,
                    tone: "success",
                });
                resolve();
            });
        });

    const libraryBrowserStyle = getStickySectionStyle(commandPanelShellHeight);

    const libraryGridBody = renderLibraryGridBody({
        clearLibraryPalette,
        collapsedSectionKeys: new Set(collapsedSectionKeys),
        collections,
        columnCount: resolvedColumnCount,
        enableSectionCollapse,
        layoutMode,
        onCollapseAllSections: collapseAllSections,
        onCopyLink: handleCopyLink,
        onDelete: handleRequestDelete,
        onExpandAllSections: expandAllSections,
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
            className="relative z-0 flex w-full flex-col gap-4"
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
                    <DialogFooter>
                        <DialogClose
                            disabled={isDeletePending}
                            render={<Button variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isDeletePending}
                            onClick={handleConfirmDelete}
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
                <DialogPopup>
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
                                            event.currentTarget.value
                                        );
                                        if (createResultsError) {
                                            setCreateResultsError(null);
                                        }
                                    }}
                                    placeholder="Collection title"
                                    required
                                    size="lg"
                                    type="text"
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
                                            event.currentTarget.value
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
                            <CollectionComboboxPicker
                                collections={collections}
                                item={visibleResultItems}
                                onUpdateItemCollections={
                                    onUpdateItemCollections
                                }
                                render={
                                    <Button
                                        className="mr-auto -ml-2"
                                        size="xs"
                                        variant="link"
                                    />
                                }
                            >
                                <Component className="mr-0.5! size-4" />
                                Add to existing
                            </CollectionComboboxPicker>
                            <DialogClose
                                disabled={isCreatingResultsCollection}
                                render={<Button size="sm" variant="ghost" />}
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
            <div className="max-w-xl rounded-t-4xl rounded-b-2xl bg-muted/80">
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
                            endAddon={
                                <LibraryPaletteTrailing
                                    collectionMembershipFilter={
                                        collectionMembershipFilter
                                    }
                                    collections={collections}
                                    columnCountMode={columnCountMode}
                                    commandAttachments={commandAttachments}
                                    domainFilters={domainFilters}
                                    groupBy={groupBy}
                                    layoutMode={layoutMode}
                                    onAttachFiles={handleAttachCommandFiles}
                                    onRemoveCollectionFilter={
                                        onRemoveCollectionFilter
                                    }
                                    onRemoveCommandAttachment={
                                        removeCommandAttachment
                                    }
                                    searchTerms={searchTerms}
                                    selectedCollectionIds={
                                        selectedCollectionIds
                                    }
                                    setCollectionMembershipFilter={
                                        setCollectionMembershipFilter
                                    }
                                    setColumnCountMode={setColumnCountMode}
                                    setDomainFilters={setDomainFilters}
                                    setGroupBy={setGroupBy}
                                    setLayoutMode={setLayoutMode}
                                    setSearchTerms={setSearchTerms}
                                    setSortMode={setSortMode}
                                    setSourceFilters={setSourceFilters}
                                    sortMode={sortMode}
                                    sourceFilters={sourceFilters}
                                />
                            }
                            onKeyDown={handlePaletteInputKeyDown}
                            placeholder={inputPlaceholder}
                            ref={paletteInputRef}
                            size="lg"
                        />
                        <AutocompletePopup positionMethod="fixed">
                            <CommandEmpty>
                                No matching commands found.
                            </CommandEmpty>
                            <CommandList>
                                {visiblePaletteGroups.map((group) => (
                                    <CommandGroup
                                        items={group.items}
                                        key={group.label}
                                    >
                                        <CommandGroupLabel>
                                            {group.label}
                                        </CommandGroupLabel>
                                        <div
                                            className={
                                                group.layout === "horizontal"
                                                    ? "-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-4 [&::-webkit-scrollbar]:hidden"
                                                    : ""
                                            }
                                        >
                                            <CommandCollection>
                                                {(item: CommandPaletteItem) => (
                                                    <CommandItem
                                                        className={
                                                            group.layout ===
                                                            "horizontal"
                                                                ? "relative h-[104px] w-[140px] shrink-0 p-0 outline-none data-active:ring-2 data-active:ring-ring data-active:ring-offset-2 data-active:ring-offset-background"
                                                                : undefined
                                                        }
                                                        key={item.value}
                                                        onClick={item.onSelect}
                                                        value={item.value}
                                                    >
                                                        {item.render ? (
                                                            item.render(item)
                                                        ) : (
                                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="truncate">
                                                                        {
                                                                            item.label
                                                                        }
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
                                                                        {
                                                                            item.shortcut
                                                                        }
                                                                    </CommandShortcut>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </CommandItem>
                                                )}
                                            </CommandCollection>
                                        </div>
                                    </CommandGroup>
                                ))}
                            </CommandList>
                            <CommandFooter>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium">
                                        Navigate
                                    </span>
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
                <Toolbar.Root className="flex items-center gap-2 px-2.5 py-2">
                    <Toolbar.Button
                        render={
                            <Button
                                className="rounded-full"
                                onClick={handleCreateNote}
                                size="xs"
                                variant="ghost"
                            >
                                <SquarePen className="inline-block size-3.5 shrink-0" />
                                &nbsp;New
                            </Button>
                        }
                    />
                    <FeedbackWidget
                        render={
                            <Toolbar.Button
                                render={
                                    <Button
                                        className="hidden rounded-full md:flex"
                                        size="xs"
                                        variant="ghost"
                                    />
                                }
                            />
                        }
                    >
                        <Globe className="inline-block size-3.5 shrink-0" />
                        &nbsp;Feedback
                        <ChevronDown className="inline-block size-3.5 shrink-0" />
                    </FeedbackWidget>
                    {canCreateCollectionFromResults ? (
                        <Toolbar.Button
                            render={
                                <Button
                                    className="rounded-full"
                                    onClick={() =>
                                        handleCreateResultsDialogOpenChange(
                                            true
                                        )
                                    }
                                    size="xs"
                                    variant="ghost"
                                >
                                    <CircleFadingPlus className="inline-block size-4 shrink-0" />
                                    &nbsp;Collection with results
                                </Button>
                            }
                        />
                    ) : null}
                    <Toolbar.Button
                        render={
                            <Button
                                className="rounded-full"
                                onClick={() => {
                                    clearLibraryPalette();
                                }}
                                size="xs"
                                title="Reset browser"
                                variant="ghost"
                            >
                                {canClear ? (
                                    <Grid2x2X className="inline-block size-3.5 shrink-0" />
                                ) : (
                                    <Grid2x2 className="inline-block size-3.5 shrink-0" />
                                )}
                                &nbsp;Showing {resultsSummary}
                                {groupBy === "none" ? null : (
                                    <>
                                        , {sections.length} group
                                        {sections.length === 1 ? "" : "s"}
                                    </>
                                )}
                            </Button>
                        }
                    />
                    {canCreateCollectionFromResults ? null : (
                        <span className="mr-2 ml-auto select-all font-semibold text-[10px] text-muted-foreground uppercase">
                            CACHE APP
                        </span>
                    )}
                </Toolbar.Root>
            </div>
            {canClear ||
            actionFeedback ||
            commandSuggestions.length === 0 ? null : (
                <div className="relative -mt-1 px-2.5">
                    <ScrollArea
                        className="max-w-full whitespace-nowrap"
                        scrollFade
                    >
                        <div className="flex w-max flex-nowrap items-center gap-1.5">
                            <span className="pr-2 font-medium text-muted-foreground text-xs">
                                Suggestions
                            </span>
                            <span className="font-medium text-muted-foreground text-xs">
                                ·
                            </span>
                            {commandSuggestions.map((suggestion) => (
                                <React.Fragment key={suggestion.label}>
                                    <Button
                                        className="rounded-full text-muted-foreground"
                                        onClick={suggestion.onSelect}
                                        size="xs"
                                        variant="ghost"
                                    >
                                        {suggestion.label}
                                    </Button>
                                    <span className="font-medium text-muted-foreground text-xs last:hidden">
                                        ·
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                        <ScrollBar
                            className="hidden"
                            orientation="horizontal"
                        />
                    </ScrollArea>
                </div>
            )}
            {actionFeedback ? (
                <div
                    className={cn(
                        "rounded-xl border px-4 py-2 font-medium text-sm",
                        actionFeedback.tone === "success"
                            ? "border-emerald-500/25 bg-emerald-500/8 text-foreground"
                            : "border-destructive/25 bg-destructive/6 text-foreground"
                    )}
                >
                    {actionFeedback.message}
                </div>
            ) : null}
            <UnprivilegedOnly>
                <InlinePromotionBanner />
            </UnprivilegedOnly>
            {libraryGridBody}
            <LibraryNoteDrawer
                note={activeNote}
                onOpenChange={setIsNoteDrawerOpen}
                onSave={handleSaveNote}
                onUrlPaste={handlePasteUrlIntoLibrary}
                open={isNoteDrawerOpen}
                saving={isSavingNote || isSavingPastedUrl}
            />
        </div>
    );
}

export function LibraryWorkspace({
    initialCollections,
    initialItems,
    sidebarBottom,
    sidebarHeader,
}: Props): React.ReactElement {
    const [items, setItems] = React.useState<LibraryItemWithCollections[]>([
        ...initialItems,
    ]);
    const [collections, setCollections] = React.useState<
        LibraryCollectionTag[]
    >(
        sortCollections(
            initialCollections.map((collection) => ({
                createdAt: collection.createdAt,
                description: collection.description,
                id: collection.id,
                name: collection.name,
                priority: collection.priority,
                sharedAt: collection.sharedAt,
                shareId: collection.shareId,
                updatedAt: collection.updatedAt,
            }))
        )
    );
    const [selectedCollectionIds, setSelectedCollectionIds] = React.useState<
        string[]
    >([]);
    const [pendingCollectionItemIds, setPendingCollectionItemIds] =
        React.useState<string[]>([]);

    const { collectionSortField } = useCollectionsSortStore();

    const collectionSummaries = sortCollectionSummaries(
        deriveCollectionSummaries(collections, items),
        collectionSortField
    );

    const itemsByCollectionId = React.useMemo(() => {
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

    const collectionPreviewThumbnailUrlsById = React.useMemo(() => {
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
            createdAt: result.collection.createdAt,
            description: result.collection.description,
            id: result.collection.id,
            name: result.collection.name,
            priority: result.collection.priority,
            sharedAt: result.collection.sharedAt,
            shareId: result.collection.shareId,
            updatedAt: result.collection.updatedAt,
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
                    collectionPreviewThumbnailUrlsById={
                        collectionPreviewThumbnailUrlsById
                    }
                    collections={collectionSummaries}
                    items={items}
                    onClearCollectionFilters={clearCollectionFilters}
                    onCreateCollectionFromResults={
                        handleCreateCollectionFromResults
                    }
                    onItemsChange={setItems}
                    onRemoveCollectionFilter={handleToggleCollectionSelection}
                    onUpdateItemCollections={handleUpdateItemCollections}
                    pendingCollectionItemIds={pendingCollectionItemIds}
                    selectedCollectionIds={selectedCollectionIds}
                />
            </div>
        </>
    );
}
