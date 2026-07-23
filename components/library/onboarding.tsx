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
        solution:
            "You saved it for a reason. That reason is still there — even when all you remember is a detail. Search finds it, so nothing stays buried.",
    },
    {
        description:
            "Twitter here, YouTube there, browser bookmarks somewhere else.",
        id: "too-many-places",
        label: "Too many places to search",
        solution:
            "Everything you save lands in one place. No more hunting across apps to find what you're looking for.",
    },
    {
        description: "Saved stuff piles up without any structure or themes.",
        id: "organizing",
        label: "Hard to organize into topics",
        solution:
            "Your saves organize themselves around the topics and projects that matter to you. No folders to maintain, no taxonomy to design.",
    },
    {
        description: "I save things and never come back to read or watch them.",
        id: "reading-later",
        label: "Never getting back to them",
        solution:
            "What you set aside stays close enough to return to. On your time, not buried in a backlog of good intentions.",
    },
    {
        description: "I'd love a clean link to send friends or coworkers.",
        id: "sharing",
        label: "Sharing with others",
        solution:
            "One link. Exactly what you meant to show them. No export dumps, no “which app do you use?”, no screenshots.",
    },
    {
        description: "I want to jot ideas next to the things I save.",
        id: "quick-thoughts",
        label: "Adding my own notes",
        solution:
            "The thought that sparked when you saved something belongs next to it. Not in a separate notes app while the source lives somewhere else.",
    },
] as const;

type OnboardingTaskId = (typeof ONBOARDING_TASK_META)[number]["id"];
type PainPointId = (typeof PAIN_POINT_OPTIONS)[number]["id"];
type PainPointDialogStep = "survey" | "response";

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
    const [painPointDialogStep, setPainPointDialogStep] =
        React.useState<PainPointDialogStep>("survey");
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
        setPainPointDialogStep("survey");
        setIsPainPointDialogOpen(true);
    });

    const handlePainPointDialogOpenChange = useStableCallback(
        (open: boolean) => {
            setIsPainPointDialogOpen(open);
            if (!open) {
                setPainPointDialogStep("survey");
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
        setPainPointSurveySelections((current) => {
            const known = new Set(current);
            const merged: PainPointId[] = [...current];
            for (const id of painPointDialogSelections) {
                if (!known.has(id)) {
                    known.add(id);
                    merged.push(id);
                }
            }
            return merged;
        });
        markClientTaskCompleted("pain-point-survey");

        if (painPointDialogSelections.size === 0) {
            setIsPainPointDialogOpen(false);
            setPainPointDialogSelections(new Set());
            return;
        }

        setPainPointDialogStep("response");
    });

    const handleFinishPainPointResponse = useStableCallback(() => {
        setIsPainPointDialogOpen(false);
        setPainPointDialogStep("survey");
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
                                openOnHover
                                render={
                                    <Button
                                        aria-label={`Get to know Cache, ${completedTaskCount} of ${ONBOARDING_TASK_COUNT} checklist items complete`}
                                        className="rounded-full"
                                        size="xs"
                                        variant="ghost"
                                    >
                                        <RadialIcon
                                            aria-hidden
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
                    <MenuPopup align="start" className="min-w-72">
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
                                    <ShareCollectionButton
                                        collection={collection}
                                        key={collection.id}
                                        onSelect={handleSelectShareCollection}
                                        selectedId={pendingShareCollection.id}
                                    />
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
                onFinishResponse={handleFinishPainPointResponse}
                onOpenChange={handlePainPointDialogOpenChange}
                onSubmit={handleSubmitPainPointSurvey}
                open={isPainPointDialogOpen}
                selections={painPointDialogSelections}
                step={painPointDialogStep}
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
            aria-hidden
            className="inline-block size-4 shrink-0"
            size={10}
            value={0}
        />
    );
}

interface PainPointSurveyDialogProps {
    onCheckedChange: (painPointId: PainPointId, checked: boolean) => void;
    onFinishResponse: () => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    open: boolean;
    selections: Set<PainPointId>;
    step: PainPointDialogStep;
}

function PainPointSurveyDialog({
    onCheckedChange,
    onFinishResponse,
    onOpenChange,
    onSubmit,
    open,
    selections,
    step,
}: PainPointSurveyDialogProps) {
    const isResponseStep = step === "response";
    const selectedOptions = isResponseStep
        ? PAIN_POINT_OPTIONS.filter((option) => selections.has(option.id))
        : null;

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogPopup>
                {isResponseStep && selectedOptions ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Good news –</DialogTitle>
                            <DialogDescription>
                                None of that has to follow you here.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogPanel className="grid gap-3">
                            {selectedOptions.map((option) => (
                                <div
                                    className="grid gap-1 rounded-md border border-border p-3"
                                    key={option.id}
                                >
                                    <p className="font-medium text-foreground text-sm leading-tight">
                                        {option.label}
                                    </p>
                                    <p className="text-muted-foreground text-sm leading-snug">
                                        {option.solution}
                                    </p>
                                </div>
                            ))}
                        </DialogPanel>
                        <DialogFooter>
                            <Button onClick={onFinishResponse} size="sm">
                                Continue
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                What's your biggest pain point right now?
                            </DialogTitle>
                            <DialogDescription>
                                Pick anything that sounds like you. We'll use
                                this to tailor the next steps
                            </DialogDescription>
                        </DialogHeader>
                        <DialogPanel className="grid gap-1.5">
                            {PAIN_POINT_OPTIONS.map((option) => (
                                <PainPointOption
                                    description={option.description}
                                    id={option.id}
                                    isChecked={selections.has(option.id)}
                                    key={option.id}
                                    label={option.label}
                                    onCheckedChange={onCheckedChange}
                                />
                            ))}
                        </DialogPanel>
                        <DialogFooter>
                            <DialogClose
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Skip
                            </DialogClose>
                            <Button onClick={onSubmit} size="sm">
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogPopup>
        </Dialog>
    );
}

function ShareCollectionButton({
    collection,
    onSelect,
    selectedId,
}: {
    collection: LibraryCollectionSummary;
    onSelect: (collection: LibraryCollectionSummary) => void;
    selectedId: string;
}) {
    const handleClick = useStableCallback(() => onSelect(collection));

    return (
        <Button
            className={cn(
                "w-full justify-start",
                selectedId === collection.id && "bg-accent"
            )}
            onClick={handleClick}
            size="sm"
            variant="ghost"
        >
            <Component className="size-4" />
            <span className="min-w-0 truncate">{collection.name}</span>
        </Button>
    );
}

function PainPointOption({
    id,
    isChecked,
    label,
    description,
    onCheckedChange,
}: {
    id: PainPointId;
    isChecked: boolean;
    label: string;
    description: string;
    onCheckedChange: (painPointId: PainPointId, checked: boolean) => void;
}) {
    const handleCheckedChange = useStableCallback((checked: boolean) =>
        onCheckedChange(id, checked)
    );

    return (
        <label
            className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 outline-none transition-colors hover:border-border has-focus-visible:border-ring data-checked:border-border"
            data-checked={isChecked || undefined}
            htmlFor={`pain-point-${id}`}
        >
            <Checkbox.Root
                aria-label={label}
                checked={isChecked}
                className="relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-[.25rem] border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 outline-none ring-ring transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[3px] not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/48 data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:size-4 dark:not-data-checked:bg-input/32 dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] [[data-disabled],[data-checked],[aria-invalid]]:shadow-none"
                id={`pain-point-${id}`}
                onCheckedChange={handleCheckedChange}
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
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-muted-foreground">{description}</span>
            </span>
        </label>
    );
}
