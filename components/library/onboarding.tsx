"use client";

import { useIntegrationsListStore } from "@/components/library/integrations";
import {
    replaceCollectionShareState,
    shareCollectionPubliclySafely,
    useWorkspaceContext,
    type CollectionShareState,
} from "@/components/library/workspace";
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
import { buildPublicCollectionShareUrl } from "@/lib/collections/sharing/url";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import { Toolbar } from "@base-ui/react";
import { Checkbox } from "@base-ui/react/checkbox";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
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

const ONBOARDING_TASK_META = [
    {
        id: "pain-point-survey",
        label: "Answer this...",
    },
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
        label: "Try the Command",
    },
    {
        id: "share",
        label: "Share a collection",
    },
] as const;

const ONBOARDING_TASK_COUNT = ONBOARDING_TASK_META.length;

const PAIN_POINT_OPTIONS = [
    {
        description: "I lose track of articles, videos, and links I've saved.",
        id: "losing-saved",
        label: "Finding things I've saved",
    },
    {
        description:
            "Twitter here, YouTube there, browser bookmarks somewhere else.",
        id: "too-many-places",
        label: "Too many places to search",
    },
    {
        description: "Saved stuff piles up without any structure or themes.",
        id: "organizing",
        label: "Hard to organize into topics",
    },
    {
        description: "I save things and never come back to read or watch them.",
        id: "reading-later",
        label: "Never getting back to them",
    },
    {
        description: "I'd love a clean link to send friends or coworkers.",
        id: "sharing",
        label: "Sharing with others",
    },
    {
        description: "I want to jot ideas next to the things I save.",
        id: "quick-thoughts",
        label: "Adding my own notes",
    },
] as const;

type OnboardingTaskId = (typeof ONBOARDING_TASK_META)[number]["id"];
type PainPointId = (typeof PAIN_POINT_OPTIONS)[number]["id"];

interface OnboardingTask {
    id: OnboardingTaskId;
    isCompleted: boolean;
    label: string;
    onSelect: () => void | Promise<void>;
}

interface CompletedTaskInput {
    clientCompletedTaskIds: OnboardingTaskId[];
    collections: LibraryCollectionSummary[];
    connectedIntegrationCount: number;
    items: LibraryItemWithCollections[];
}

const { useStore: useLibraryOnboardingStore } = createStore({
    completedOnboardingTaskIds: storage<OnboardingTaskId[]>([]),
    painPointSurveySelections: storage<PainPointId[]>([]),
});

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
    if (clientCompletedTaskIds.includes("pain-point-survey")) {
        completed.add("pain-point-survey");
    }
    if (collections.some(isSharedCollection)) {
        completed.add("share");
    }

    return completed;
}

function isSharedCollection(collection: LibraryCollectionSummary): boolean {
    return Boolean(collection.shareId && collection.sharedAt);
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

function replaceItemCollectionShareState(
    items: LibraryItemWithCollections[],
    next: CollectionShareState
): LibraryItemWithCollections[] {
    let isItemUpdated = false;

    const nextItems = items.map((item) => {
        const nextCollections = replaceCollectionShareState(
            item.collections,
            next
        );

        if (nextCollections === item.collections) {
            return item;
        }

        isItemUpdated = true;

        return { ...item, collections: nextCollections };
    });

    return isItemUpdated ? nextItems : items;
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
    const {
        completedOnboardingTaskIds,
        setCompletedOnboardingTaskIds,
        setPainPointSurveySelections,
    } = useLibraryOnboardingStore();

    const { copyToClipboard } = useCopyToClipboard();

    const completedTaskIdSet = getCompletedTaskIdSet({
        clientCompletedTaskIds: completedOnboardingTaskIds,
        collections,
        connectedIntegrationCount,
        items,
    });

    const completedTaskCount = completedTaskIdSet.size;
    const isOnboardingCompleted = completedTaskCount === ONBOARDING_TASK_COUNT;
    const progressValue = (completedTaskCount / ONBOARDING_TASK_COUNT) * 100;

    const [pendingShareCollection, setPendingShareCollection] =
        React.useState<LibraryCollectionSummary | null>(null);
    const [shareErrorMessage, setShareErrorMessage] = React.useState<
        string | null
    >(null);
    const [isSharePending, startShareTransition] = React.useTransition();

    const [isPainPointDialogOpen, setIsPainPointDialogOpen] =
        React.useState(false);
    const [painPointDialogSelections, setPainPointDialogSelections] =
        React.useState<Set<PainPointId>>(() => new Set());

    const markClientTaskCompleted = useStableCallback(
        (taskId: OnboardingTaskId) => {
            setCompletedOnboardingTaskIds((current) =>
                current.includes(taskId) ? current : [...current, taskId]
            );
        }
    );

    const syncShareState = useStableCallback((next: CollectionShareState) => {
        setCollections((current) => replaceCollectionShareState(current, next));
        setItems((current) => replaceItemCollectionShareState(current, next));
    });

    const handleOpenCommand = useStableCallback(() => {
        markClientTaskCompleted("command");
        onOpenCommand();
    });

    const handleOpenIntegrations = useStableCallback(() => {
        setSidebarOpen(true);
        setIsIntegrationsListOpen(true);
    });

    const handleCopyExistingShareLink = useStableCallback(
        async (collection: LibraryCollectionSummary) => {
            if (!collection.shareId) {
                return;
            }

            const shareUrl = buildPublicCollectionShareUrl(collection.shareId);
            await copyToClipboard(shareUrl);
        }
    );

    const handleRequestShare = useStableCallback(async () => {
        const sharedCollection = collections.find(isSharedCollection);
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
    });

    const handleShareDialogOpenChange = useStableCallback((open: boolean) => {
        if (!(open || isSharePending)) {
            setShareErrorMessage(null);
            setPendingShareCollection(null);
        }
    });

    const handleConfirmShare = useStableCallback(() => {
        const collection = pendingShareCollection;
        if (!collection) {
            return;
        }

        setShareErrorMessage(null);
        startShareTransition(async () => {
            const result = await shareCollectionPubliclySafely({
                collectionId: collection.id,
            });

            if (result.status !== "SHARED") {
                setShareErrorMessage(result.message);
                return;
            }

            syncShareState(result.collection);
            setPendingShareCollection(null);

            await copyToClipboard(result.shareUrl);
        });
    });

    const handleSelectShareCollection = useStableCallback(
        (collection: LibraryCollectionSummary) => {
            setShareErrorMessage(null);
            setPendingShareCollection((current) =>
                current?.id === collection.id ? current : collection
            );
        }
    );

    const handleOpenPainPointDialog = useStableCallback(() => {
        setIsPainPointDialogOpen(true);
    });

    const handlePainPointDialogOpenChange = useStableCallback(
        (open: boolean) => {
            setIsPainPointDialogOpen(open);
            if (!open) {
                setPainPointDialogSelections(new Set());
            }
        }
    );

    const handleTogglePainPoint = useStableCallback(
        (painPointId: PainPointId, checked: boolean) => {
            setPainPointDialogSelections((current) => {
                const next = new Set(current);
                if (checked) {
                    next.add(painPointId);
                } else {
                    next.delete(painPointId);
                }
                return next;
            });
        }
    );

    const handleSubmitPainPointSurvey = useStableCallback(() => {
        const selections = painPointDialogSelections;
        setPainPointSurveySelections((current) => {
            const known = new Set(current);
            const merged: PainPointId[] = [...current];
            for (const id of selections) {
                if (!known.has(id)) {
                    known.add(id);
                    merged.push(id);
                }
            }
            return merged;
        });
        markClientTaskCompleted("pain-point-survey");
        setIsPainPointDialogOpen(false);
        setPainPointDialogSelections(new Set());
    });

    const taskHandlerMap: Record<OnboardingTaskId, () => void | Promise<void>> =
        {
            collection: onCreateCollection,
            command: handleOpenCommand,
            integration: handleOpenIntegrations,
            note: onCreateNote,
            "pain-point-survey": handleOpenPainPointDialog,
            share: handleRequestShare,
        };

    const tasks: OnboardingTask[] = isOnboardingCompleted
        ? []
        : ONBOARDING_TASK_META.map((meta) => ({
              ...meta,
              isCompleted: completedTaskIdSet.has(meta.id),
              onSelect: taskHandlerMap[meta.id],
          }));

    return (
        <>
            {isOnboardingCompleted ? null : (
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
                    <MenuPopup className="min-w-72">
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
            {pendingShareCollection ? (
                <Dialog onOpenChange={handleShareDialogOpenChange} open>
                    <DialogPopup>
                        <DialogHeader>
                            <div className="flex items-center gap-1.5">
                                <LibraryBig className="size-4 text-muted-foreground" />
                                <DialogTitle>Share collection?</DialogTitle>
                            </div>
                            <DialogDescription>
                                Create a public, read-only link for{" "}
                                {pendingShareCollection.name}.
                            </DialogDescription>
                        </DialogHeader>
                        {collections.length > 1 ? (
                            <DialogPanel className="grid gap-1">
                                {collections.map((collection) => (
                                    <Button
                                        className={cn(
                                            "w-full justify-start",
                                            pendingShareCollection.id ===
                                                collection.id && "bg-accent"
                                        )}
                                        key={collection.id}
                                        onClick={() =>
                                            handleSelectShareCollection(
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
                            </DialogPanel>
                        ) : null}
                        {shareErrorMessage ? (
                            <OnboardingShareError>
                                {shareErrorMessage}
                            </OnboardingShareError>
                        ) : null}
                        <DialogFooter>
                            <DialogClose
                                disabled={isSharePending}
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                isLoading={isSharePending}
                                onClick={handleConfirmShare}
                                size="sm"
                            >
                                Share and copy link
                            </Button>
                        </DialogFooter>
                    </DialogPopup>
                </Dialog>
            ) : null}
            <PainPointSurveyDialog
                onCheckedChange={handleTogglePainPoint}
                onOpenChange={handlePainPointDialogOpenChange}
                onSubmit={handleSubmitPainPointSurvey}
                open={isPainPointDialogOpen}
                selections={painPointDialogSelections}
            />
        </>
    );
}

interface OnboardingMenuProps {
    connectedIntegrationCount: number;
    onCreateCollection: () => void;
    onCreateNote: () => void;
    onOpenCommand: () => void;
}

type OnboardingShareErrorProps = React.ComponentProps<"p">;

function OnboardingShareError({
    className,
    ...props
}: OnboardingShareErrorProps) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            {...props}
            aria-atomic="true"
            aria-live="assertive"
            className={cn(
                "px-1 text-destructive text-xs italic leading-tight",
                className
            )}
            role="alert"
        />
    );
}

function OnboardingMenuItem({ task }: { task: OnboardingTask }) {
    return (
        <MenuItem onClick={task.onSelect}>
            <OnboardingTaskStateIcon isCompleted={task.isCompleted} />
            <span className="mr-2 min-w-0 flex-1 truncate">{task.label}</span>
            <ChevronRight className="ml-auto inline-block size-3.5 shrink-0 opacity-50" />
        </MenuItem>
    );
}

function OnboardingTaskStateIcon({ isCompleted }: { isCompleted: boolean }) {
    if (isCompleted) {
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

interface PainPointSurveyDialogProps {
    onCheckedChange: (painPointId: PainPointId, checked: boolean) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    open: boolean;
    selections: Set<PainPointId>;
}

function PainPointSurveyDialog({
    onCheckedChange,
    onOpenChange,
    onSubmit,
    open,
    selections,
}: PainPointSurveyDialogProps) {
    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>
                        What's your biggest pain point right now?
                    </DialogTitle>
                    <DialogDescription>
                        Pick anything that sounds like you. We'll use this to
                        tailor the next steps
                    </DialogDescription>
                </DialogHeader>
                <DialogPanel className="grid gap-1.5">
                    {PAIN_POINT_OPTIONS.map((option) => {
                        const isChecked = selections.has(option.id);
                        return (
                            <label
                                className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 outline-none transition-colors hover:border-border has-focus-visible:border-ring data-checked:border-border"
                                data-checked={isChecked || undefined}
                                htmlFor={`pain-point-${option.id}`}
                                key={option.id}
                            >
                                <Checkbox.Root
                                    aria-label={option.label}
                                    checked={isChecked}
                                    className="relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-[.25rem] border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 outline-none ring-ring transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[3px] not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/48 data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:size-4 dark:not-data-checked:bg-input/32 dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] [[data-disabled],[data-checked],[aria-invalid]]:shadow-none"
                                    id={`pain-point-${option.id}`}
                                    onCheckedChange={(checked) =>
                                        onCheckedChange(option.id, checked)
                                    }
                                >
                                    <Checkbox.Indicator className="absolute -inset-px flex items-center justify-center rounded-[.25rem] text-primary-foreground data-unchecked:hidden data-checked:bg-primary data-indeterminate:text-foreground">
                                        <Check
                                            aria-hidden
                                            className="size-3.5 sm:size-3"
                                            focusable="false"
                                        />
                                    </Checkbox.Indicator>
                                </Checkbox.Root>
                                <span className="grid min-w-0 flex-1 gap-0.5 text-sm leading-tight">
                                    <span className="font-medium text-foreground">
                                        {option.label}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </DialogPanel>
                <DialogFooter>
                    <DialogClose render={<Button size="sm" variant="ghost" />}>
                        Skip
                    </DialogClose>
                    <Button onClick={onSubmit} size="sm">
                        Done
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
