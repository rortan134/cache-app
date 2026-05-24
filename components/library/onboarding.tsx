"use client";

import { useIntegrationsListStore } from "@/components/library/integrations";
import { useWorkspaceContext } from "@/components/library/workspace";
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
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuTrigger,
} from "@/components/ui/menu";
import { RadialIcon } from "@/components/ui/radial-icon";
import { useSidebar } from "@/components/ui/sidebar";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { shareCollectionPublicly } from "@/lib/collections/sharing/actions";
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
    LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import { Toolbar } from "@base-ui/react";
import {
    Check,
    ChevronDown,
    ChevronRight,
    Component,
    LibraryBig,
} from "lucide-react";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const ONBOARDING_SHARE_ERROR_MESSAGE =
    "We couldn't create a public link right now.";

const ONBOARDING_TASK_META = [
    {
        id: "integration",
        label: "Connect your first integration",
    },
    {
        id: "collection",
        label: "Create your first collection",
    },
    {
        id: "note",
        label: "Add a note",
    },
    {
        id: "command",
        label: "Try out the Command",
    },
    {
        id: "share",
        label: "Share a collection",
    },
] as const satisfies readonly OnboardingTaskMeta[];

const ONBOARDING_TASK_COUNT = ONBOARDING_TASK_META.length;

const { useStore: useLibraryOnboardingStore } = createStore({
    completedOnboardingTaskIds: storage<OnboardingTaskId[]>([]),
});

type OnboardingTaskId =
    | "collection"
    | "command"
    | "integration"
    | "note"
    | "share";

interface OnboardingTaskMeta {
    id: OnboardingTaskId;
    label: string;
}

interface OnboardingTask extends OnboardingTaskMeta {
    completed: boolean;
    onSelect: () => void | Promise<void>;
}

interface CompletedTaskInput {
    clientCompletedTaskIds: OnboardingTaskId[];
    collections: LibraryCollectionSummary[];
    connectedIntegrationCount: number;
    items: LibraryItemWithCollections[];
}

interface CollectionShareState
    extends Pick<
        LibraryCollectionTag,
        "id" | "shareId" | "sharedAt" | "updatedAt"
    > {}

interface OnboardingMenuProps {
    connectedIntegrationCount: number;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onOpenCommand: () => void;
}

export function OnboardingMenu({
    connectedIntegrationCount,
    onCreateCollection,
    onCreateNote,
    onOpenCommand,
}: OnboardingMenuProps) {
    const { collections, items, setCollections, setItems } =
        useWorkspaceContext();

    const { setOpen: setSidebarOpen } = useSidebar();
    const { setIsIntegrationsListOpen } = useIntegrationsListStore();
    const { completedOnboardingTaskIds, setCompletedOnboardingTaskIds } =
        useLibraryOnboardingStore();
    const { copyToClipboard } = useCopyToClipboard();

    const [pendingShareCollection, setPendingShareCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [isSharePending, startShareTransition] = React.useTransition();

    const completedTaskIdSet = getCompletedTaskIdSet({
        clientCompletedTaskIds: completedOnboardingTaskIds,
        collections,
        connectedIntegrationCount,
        items,
    });

    const completedTaskCount = completedTaskIdSet.size;
    const progressValue = (completedTaskCount / ONBOARDING_TASK_COUNT) * 100;

    const markClientTaskCompleted = (taskId: OnboardingTaskId) => {
        setCompletedOnboardingTaskIds((current) =>
            current.includes(taskId) ? current : [...current, taskId]
        );
    };

    const syncShareState = (next: CollectionShareState) => {
        setCollections((current) => replaceCollectionShareState(current, next));
        setItems((current) => replaceItemCollectionShareState(current, next));
    };

    const handleOpenCommand = () => {
        markClientTaskCompleted("command");
        onOpenCommand();
    };

    const handleCopyExistingShareLink = async (
        collection: LibraryCollectionSummary
    ) => {
        if (!collection.shareId) {
            return;
        }

        const shareUrl = buildPublicCollectionShareUrl(collection.shareId);
        await copyToClipboard(shareUrl);
    };

    const handleRequestShare = async () => {
        const sharedCollection = getSharedCollection(collections);
        if (sharedCollection) {
            await handleCopyExistingShareLink(sharedCollection);
            return;
        }

        const shareCandidate = getShareCandidate(collections);
        if (!shareCandidate) {
            onCreateCollection();
            return;
        }

        setPendingShareCollection(shareCandidate);
    };

    const handleShareDialogOpenChange = (open: boolean) => {
        if (!(open || isSharePending)) {
            setPendingShareCollection(null);
        }
    };

    const handleConfirmShare = () => {
        const collection = pendingShareCollection;
        if (!collection) {
            return;
        }

        startShareTransition(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status !== "SHARED") {
                return;
            }

            syncShareState(result.collection);
            setPendingShareCollection(null);

            await copyToClipboard(result.shareUrl);
        });
    };

    const taskHandlerMap: Record<OnboardingTaskId, () => void | Promise<void>> =
        {
            collection: onCreateCollection,
            command: handleOpenCommand,
            integration: () => {
                setSidebarOpen(true);
                setIsIntegrationsListOpen(true);
            },
            note: onCreateNote,
            share: handleRequestShare,
        };

    const tasks: OnboardingTask[] = ONBOARDING_TASK_META.map((meta) => ({
        ...meta,
        completed: completedTaskIdSet.has(meta.id),
        onSelect: taskHandlerMap[meta.id],
    }));

    return (
        <>
            {tasks.every((task) => task.completed) ? null : (
                <Menu>
                    <Toolbar.Button
                        render={
                            <MenuTrigger
                                render={
                                    <Button
                                        aria-label={`Get to know Cache, ${completedTaskCount} of ${ONBOARDING_TASK_COUNT} checklist items complete`}
                                        className="rounded-full"
                                        size="xs"
                                        variant="ghost"
                                    >
                                        <RadialIcon
                                            className="inline-block size-4 shrink-0"
                                            size={9}
                                            value={progressValue}
                                        />
                                        &nbsp;Get to know Cache
                                        <ChevronDown className="inline-block size-3.5 shrink-0" />
                                    </Button>
                                }
                            />
                        }
                    />
                    <MenuPopup align="end" className="min-w-72">
                        <MenuGroup>
                            <MenuGroupLabel>
                                Complete this checklist
                            </MenuGroupLabel>
                            {tasks.map((task) => (
                                <OnboardingMenuItem key={task.id} task={task} />
                            ))}
                        </MenuGroup>
                    </MenuPopup>
                </Menu>
            )}
            <Dialog
                onOpenChange={handleShareDialogOpenChange}
                open={pendingShareCollection !== null}
            >
                <DialogPopup>
                    <DialogHeader>
                        <div className="flex items-center gap-1.5">
                            <LibraryBig className="size-4 text-muted-foreground" />
                            <DialogTitle>Share collection?</DialogTitle>
                        </div>
                        <DialogDescription>
                            Create a public, read-only link for{" "}
                            {pendingShareCollection?.name ?? "this collection"}.
                        </DialogDescription>
                    </DialogHeader>
                    {collections.length > 1 ? (
                        <DialogPanel className="space-y-2">
                            <div className="grid gap-1">
                                {collections.map((collection) => (
                                    <Button
                                        className={cn(
                                            "w-full justify-start",
                                            pendingShareCollection?.id ===
                                                collection.id && "bg-accent"
                                        )}
                                        key={collection.id}
                                        onClick={() =>
                                            setPendingShareCollection(
                                                collection
                                            )
                                        }
                                        size="sm"
                                        variant="ghost"
                                    >
                                        <Component className="size-4" />
                                        <span className="min-w-0 truncate">
                                            {collection.name}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </DialogPanel>
                    ) : null}
                    <DialogFooter>
                        <DialogClose
                            disabled={isSharePending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            loading={isSharePending}
                            onClick={handleConfirmShare}
                            size="sm"
                        >
                            Share and copy link
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
        </>
    );
}

function OnboardingMenuItem({ task }: { task: OnboardingTask }) {
    return (
        <MenuItem onClick={task.onSelect}>
            <OnboardingTaskStateIcon completed={task.completed} />
            <span className="mr-2 flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate">{task.label}</span>
            </span>
            <ChevronRight className="ml-auto inline-block size-3.5 shrink-0 opacity-50" />
        </MenuItem>
    );
}

function OnboardingTaskStateIcon({ completed }: { completed: boolean }) {
    if (completed) {
        return (
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
                <Check className="size-3" />
            </span>
        );
    }

    return (
        <RadialIcon
            className="inline-block size-4 shrink-0"
            size={10}
            value={0}
        />
    );
}

function getCompletedTaskIdSet({
    clientCompletedTaskIds,
    collections,
    connectedIntegrationCount,
    items,
}: CompletedTaskInput): Set<OnboardingTaskId> {
    const completed = new Set<OnboardingTaskId>();

    if (connectedIntegrationCount > 0) {
        completed.add("integration");
    }
    if (collections.length > 0) {
        completed.add("collection");
    }
    if (items.some((item) => item.kind === ITEM_KIND_NOTE)) {
        completed.add("note");
    }
    if (clientCompletedTaskIds.includes("command")) {
        completed.add("command");
    }
    if (collections.some(isSharedCollection)) {
        completed.add("share");
    }

    return completed;
}

function isSharedCollection(collection: LibraryCollectionSummary): boolean {
    return Boolean(collection.shareId && collection.sharedAt);
}

function getSharedCollection(
    collections: LibraryCollectionSummary[]
): LibraryCollectionSummary | null {
    return collections.find(isSharedCollection) ?? null;
}

function getShareCandidate(
    collections: LibraryCollectionSummary[]
): LibraryCollectionSummary | null {
    return (
        collections.find((collection) => !isSharedCollection(collection)) ??
        collections[0] ??
        null
    );
}

function replaceCollectionShareState<T extends LibraryCollectionTag>(
    collections: T[],
    next: CollectionShareState
): T[] {
    return collections.map((collection) =>
        collection.id === next.id
            ? {
                  ...collection,
                  sharedAt: next.sharedAt,
                  shareId: next.shareId,
                  updatedAt: next.updatedAt,
              }
            : collection
    );
}

function replaceItemCollectionShareState(
    items: LibraryItemWithCollections[],
    next: CollectionShareState
): LibraryItemWithCollections[] {
    return items.map((item) => ({
        ...item,
        collections: replaceCollectionShareState(item.collections, next),
    }));
}

async function shareCollectionPubliclySafely(
    input: Parameters<typeof shareCollectionPublicly>[0]
): Promise<Awaited<ReturnType<typeof shareCollectionPublicly>>> {
    try {
        return await shareCollectionPublicly(input);
    } catch {
        return {
            message: ONBOARDING_SHARE_ERROR_MESSAGE,
            status: "ERROR",
        };
    }
}
