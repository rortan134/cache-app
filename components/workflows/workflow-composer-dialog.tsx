"use client";

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
    ComboboxValue,
} from "@/components/ui/combobox";
import {
    Dialog,
    DialogClose,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/common/cn";
import { createLogger } from "@/lib/common/logs/console/logger";
import AppIconSmall from "@/public/cache-icon-small.png";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    LexicalComposer,
    type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import {
    ChevronDown,
    ChevronRight,
    Clock,
    FolderOpen,
    Plus,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

const SCHEDULE_OPTIONS: ScheduleOption[] = [
    {
        label: "Daily",
        value: "daily",
    },
    {
        label: "Weekly",
        value: "weekly",
    },
    {
        label: "Monthly",
        value: "monthly",
    },
];

const DEFAULT_SCHEDULE_OPTION: ScheduleOption = {
    label: "Weekly",
    value: "weekly",
};

const NO_COLLECTION_OPTION: WorkflowCollectionOption = {
    id: "all",
    name: "Any collection",
};
const log = createLogger("workflow:composer-dialog");

interface ScheduleOption {
    label: string;
    value: "daily" | "weekly" | "monthly";
}

export interface WorkflowCollectionOption {
    id: string;
    name: string;
}

export interface WorkflowComposerWorkflow {
    collectionId?: string;
    description: string;
    schedule: ScheduleOption["value"];
    title: string;
}

export function WorkflowComposerDialog({
    children,
    collections,
    trigger,
    workflow,
}: WorkflowComposerDialogProps) {
    const titleId = React.useId();
    const collectionId = React.useId();
    const instructionsId = React.useId();
    const scheduleId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [editorKey, setEditorKey] = React.useState(0);
    const [title, setTitle] = React.useState(() => workflow?.title ?? "");
    const [markdown, setMarkdown] = React.useState(
        () => workflow?.description ?? ""
    );
    const collectionOptions = [NO_COLLECTION_OPTION, ...collections];
    const [collection, setCollection] =
        React.useState<WorkflowCollectionOption>(() =>
            getCollectionOption(collectionOptions, workflow?.collectionId)
        );
    const [schedule, setSchedule] = React.useState<ScheduleOption>(() =>
        getScheduleOption(workflow?.schedule)
    );
    const isEditing = workflow !== undefined;

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setTitle(workflow?.title ?? "");
            setMarkdown(workflow?.description ?? "");
            setCollection(
                getCollectionOption(collectionOptions, workflow?.collectionId)
            );
            setSchedule(getScheduleOption(workflow?.schedule));
            setEditorKey((currentEditorKey) => currentEditorKey + 1);
        }
        setOpen(nextOpen);
    });

    const handleSubmit = useStableCallback(
        (event: React.ChangeEvent<HTMLFormElement>) => {
            event.preventDefault();
            setOpen(false);
            if (!isEditing) {
                setTitle("");
                setMarkdown("");
                setCollection(NO_COLLECTION_OPTION);
                setSchedule(DEFAULT_SCHEDULE_OPTION);
            }
        }
    );

    return (
        <Dialog onOpenChange={handleOpenChange} open={open}>
            <DialogTrigger render={trigger ?? <Button size="sm" />}>
                {children ?? (
                    <>
                        <Plus
                            aria-hidden
                            className="size-4"
                            focusable="false"
                        />
                        Create workflow
                    </>
                )}
            </DialogTrigger>
            <DialogPopup>
                <form className="contents" onSubmit={handleSubmit}>
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
                                Workflow
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogPanel className="space-y-2">
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={titleId}
                            >
                                Title
                            </label>
                            <Input
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={titleId}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="Summarize AI research"
                                required
                                size="lg"
                                type="text"
                                unstyled
                                value={title}
                            />
                        </div>
                        <div>
                            <span
                                className="sr-only font-medium text-sm"
                                id={instructionsId}
                            >
                                Instructions
                            </span>
                            <WorkflowMarkdownEditor
                                editorKey={editorKey}
                                initialValue={markdown}
                                labelId={instructionsId}
                                onChange={setMarkdown}
                            />
                        </div>
                    </DialogPanel>
                    <DialogFooter className="items-center justify-between">
                        <div className="mr-auto flex flex-wrap items-center gap-1">
                            <span
                                className="sr-only font-medium text-sm"
                                id={collectionId}
                            >
                                Collection
                            </span>
                            <WorkflowCollectionCombobox
                                labelId={collectionId}
                                onValueChange={setCollection}
                                options={collectionOptions}
                                value={collection}
                            />
                            <span
                                className="sr-only font-medium text-sm"
                                id={scheduleId}
                            >
                                Schedule
                            </span>
                            <WorkflowScheduleCombobox
                                labelId={scheduleId}
                                onValueChange={setSchedule}
                                value={schedule}
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                            <DialogClose
                                render={<Button size="sm" variant="ghost" />}
                            >
                                Cancel
                            </DialogClose>
                            <Button disabled size="sm" type="submit">
                                {isEditing
                                    ? "Save workflow"
                                    : "Create workflow"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface WorkflowComposerDialogProps {
    children?: React.ReactNode;
    collections: WorkflowCollectionOption[];
    trigger?: React.ReactElement;
    workflow?: WorkflowComposerWorkflow;
}

function WorkflowMarkdownEditor({
    editorKey,
    initialValue,
    labelId,
    onChange,
}: WorkflowMarkdownEditorProps) {
    const initialConfig: InitialConfigType = {
        editorState: () => {
            if (!initialValue) {
                return;
            }

            const root = $getRoot();
            root.clear();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(initialValue));
            root.append(paragraph);
        },
        namespace: "cache-workflow-composer",
        onError(error: Error) {
            log.error("Unexpected workflow composer editor error", error);
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig} key={editorKey}>
            <div className="relative min-h-48 text-base sm:text-sm">
                <PlainTextPlugin
                    contentEditable={
                        <ContentEditable
                            aria-label="Workflow instructions"
                            aria-labelledby={labelId}
                            className={cn(
                                "min-h-48 whitespace-pre-wrap text-foreground leading-7 outline-none",
                                "placeholder:text-muted-foreground/72"
                            )}
                        />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                    placeholder={
                        <div className="pointer-events-none absolute inset-x-0 top-0 text-muted-foreground/72">
                            Write markdown instructions...
                        </div>
                    }
                />
                <OnChangePlugin
                    ignoreSelectionChange
                    onChange={(editorState) => {
                        editorState.read(() => {
                            onChange($getRoot().getTextContent());
                        });
                    }}
                />
            </div>
        </LexicalComposer>
    );
}

interface WorkflowMarkdownEditorProps {
    editorKey: number;
    initialValue: string;
    labelId: string;
    onChange: (value: string) => void;
}

function WorkflowCollectionCombobox({
    labelId,
    onValueChange,
    options,
    value,
}: WorkflowCollectionComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<WorkflowCollectionOption>
            autoHighlight
            items={options}
            itemToStringLabel={(option) => option.name}
            itemToStringValue={(option) => option.id}
            onOpenChange={setIsOpen}
            onValueChange={(nextCollection) => {
                if (!nextCollection) {
                    return;
                }
                onValueChange(nextCollection);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <span className="flex items-center gap-2">
                    <FolderOpen
                        aria-hidden
                        className="size-3.5 text-muted-foreground"
                        focusable="false"
                    />
                    <ComboboxValue />
                    <ChevronDown
                        aria-hidden
                        className="size-3.5"
                        focusable="false"
                    />
                </span>
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search collections"
                    placeholder="Select collection..."
                />
                <ComboboxEmpty>No matching collections</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(collectionOption: WorkflowCollectionOption) => (
                            <ComboboxItem
                                key={collectionOption.id}
                                showIndicatorLast
                                value={collectionOption}
                            >
                                {collectionOption.name}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface WorkflowCollectionComboboxProps {
    labelId: string;
    onValueChange: (value: WorkflowCollectionOption) => void;
    options: WorkflowCollectionOption[];
    value: WorkflowCollectionOption;
}

function WorkflowScheduleCombobox({
    labelId,
    onValueChange,
    value,
}: WorkflowScheduleComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<ScheduleOption>
            autoHighlight
            items={SCHEDULE_OPTIONS}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            onOpenChange={setIsOpen}
            onValueChange={(nextSchedule) => {
                if (!nextSchedule) {
                    return;
                }
                onValueChange(nextSchedule);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <span className="flex items-center gap-2">
                    <Clock
                        aria-hidden
                        className="size-3.5 text-muted-foreground"
                        focusable="false"
                    />
                    <ComboboxValue />
                    <ChevronDown
                        aria-hidden
                        className="size-3.5"
                        focusable="false"
                    />
                </span>
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search schedules"
                    placeholder="Select schedule..."
                />
                <ComboboxEmpty>No matching schedules</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(scheduleOption: ScheduleOption) => (
                            <ComboboxItem
                                key={scheduleOption.value}
                                showIndicatorLast
                                value={scheduleOption}
                            >
                                {scheduleOption.label}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface WorkflowScheduleComboboxProps {
    labelId: string;
    onValueChange: (value: ScheduleOption) => void;
    value: ScheduleOption;
}

function getScheduleOption(value: ScheduleOption["value"] | undefined) {
    return (
        SCHEDULE_OPTIONS.find((option) => option.value === value) ??
        DEFAULT_SCHEDULE_OPTION
    );
}

function getCollectionOption(
    options: WorkflowCollectionOption[],
    collectionId: string | undefined
) {
    return (
        options.find((option) => option.id === collectionId) ??
        NO_COLLECTION_OPTION
    );
}
