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
import { CalendarClock, ChevronRight, Plus } from "lucide-react";
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

interface ScheduleOption {
    label: string;
    value: "daily" | "weekly" | "monthly";
}

export interface WorkflowComposerWorkflow {
    description: string;
    schedule: ScheduleOption["value"];
    title: string;
}

export function WorkflowComposerDialog({
    children,
    trigger,
    workflow,
}: WorkflowComposerDialogProps) {
    const titleId = React.useId();
    const instructionsId = React.useId();
    const scheduleId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [editorKey, setEditorKey] = React.useState(0);
    const [title, setTitle] = React.useState(() => workflow?.title ?? "");
    const [markdown, setMarkdown] = React.useState(
        () => workflow?.description ?? ""
    );
    const [schedule, setSchedule] = React.useState<ScheduleOption>(() =>
        getScheduleOption(workflow?.schedule)
    );
    const isEditing = workflow !== undefined;

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setTitle(workflow?.title ?? "");
            setMarkdown(workflow?.description ?? "");
            setSchedule(getScheduleOption(workflow?.schedule));
            setEditorKey((currentEditorKey) => currentEditorKey + 1);
        }
        setOpen(nextOpen);
    });

    const handleSubmit = useStableCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setOpen(false);
            if (!isEditing) {
                setTitle("");
                setMarkdown("");
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
                                {isEditing ? "Edit workflow" : "New workflow"}
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
                        <div className="pt-1">
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
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button size="sm" type="submit">
                            {isEditing ? "Save workflow" : "Create workflow"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface WorkflowComposerDialogProps {
    children?: React.ReactNode;
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
            console.error("Unexpected workflow composer editor error", error);
        },
    };

    return (
        <LexicalComposer initialConfig={initialConfig} key={editorKey}>
            <div className="relative -mx-[calc(--spacing(3)-1px)] min-h-24 text-base sm:text-sm">
                <PlainTextPlugin
                    contentEditable={
                        <ContentEditable
                            aria-label="Workflow instructions"
                            aria-labelledby={labelId}
                            className={cn(
                                "min-h-24 whitespace-pre-wrap text-foreground leading-7 outline-none",
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

function WorkflowScheduleCombobox({
    labelId,
    onValueChange,
    value,
}: WorkflowScheduleComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<ScheduleOption>
            autoHighlight
            filter={null}
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
                        className="-mx-2 w-fit justify-start"
                        size="xs"
                        variant="outline"
                    />
                }
            >
                <span className="flex items-center gap-2">
                    <CalendarClock
                        aria-hidden
                        className="size-4 text-muted-foreground"
                        focusable="false"
                    />
                    <ComboboxValue />
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
