"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerFooter,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { LibraryItemWithCollections } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    BoldIcon,
    ChevronRight,
    HighlighterIcon,
    ItalicIcon,
    StrikethroughIcon,
    UnderlineIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactElement } from "react";

const NOTE_EMPTY_HTML = "<p></p>";
const NOTE_HIGHLIGHT_COLOR = "#fef08a";

interface NoteDraft {
    readonly contentHtml: string;
    readonly title: string;
}

interface Props {
    readonly note: LibraryItemWithCollections | null;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSave: (draft: NoteDraft) => Promise<void> | void;
    readonly open: boolean;
    readonly saving: boolean;
}

interface FormatState {
    readonly bold: boolean;
    readonly highlight: boolean;
    readonly italic: boolean;
    readonly strikeThrough: boolean;
    readonly underline: boolean;
}

const EMPTY_FORMAT_STATE: FormatState = {
    bold: false,
    highlight: false,
    italic: false,
    strikeThrough: false,
    underline: false,
};

function noteHtmlFromItem(note: LibraryItemWithCollections | null): string {
    return note?.noteContentHtml?.trim() || NOTE_EMPTY_HTML;
}

export function LibraryNoteDrawer({
    note,
    onOpenChange,
    onSave,
    open,
    saving,
}: Props): ReactElement {
    const editorRef = useRef<HTMLDivElement>(null);
    const [title, setTitle] = useState(note?.caption ?? "");
    const [contentHtml, setContentHtml] = useState(noteHtmlFromItem(note));
    const [formats, setFormats] = useState<FormatState>(EMPTY_FORMAT_STATE);

    useEffect(() => {
        if (!open) {
            return;
        }

        setTitle(note?.caption ?? "");
        setContentHtml(noteHtmlFromItem(note));
    }, [note, open]);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== contentHtml) {
            editorRef.current.innerHTML = contentHtml;
        }
    }, [contentHtml]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            editorRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const refreshFormats = () => {
            const selection = window.getSelection();
            const anchorNode = selection?.anchorNode;
            const editor = editorRef.current;
            const isInsideEditor =
                !!editor &&
                !!anchorNode &&
                (anchorNode === editor || editor.contains(anchorNode));

            if (!isInsideEditor) {
                setFormats(EMPTY_FORMAT_STATE);
                return;
            }

            const highlightValue = String(
                document.queryCommandValue("hiliteColor") ?? ""
            ).toLowerCase();

            setFormats({
                bold: document.queryCommandState("bold"),
                highlight:
                    highlightValue.includes("254") ||
                    highlightValue.includes("fef08a"),
                italic: document.queryCommandState("italic"),
                strikeThrough: document.queryCommandState("strikeThrough"),
                underline: document.queryCommandState("underline"),
            });
        };

        document.addEventListener("selectionchange", refreshFormats);
        return () => {
            document.removeEventListener("selectionchange", refreshFormats);
        };
    }, [open]);

    const runCommand = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        setContentHtml(editorRef.current?.innerHTML || NOTE_EMPTY_HTML);
    };

    const saveNote = async () => {
        await onSave({
            contentHtml: editorRef.current?.innerHTML || NOTE_EMPTY_HTML,
            title,
        });
    };

    return (
        <Drawer onOpenChange={onOpenChange} open={open} position="right">
            <DrawerPopup
                className="w-full max-w-3xl"
                showBar
                showCloseButton
                variant="inset"
            >
                <DrawerHeader allowSelection>
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
                        <DrawerTitle className="font-medium text-sm">
                            {note ? "Edit note" : "New entry"}
                        </DrawerTitle>
                    </div>
                </DrawerHeader>
                <DrawerPanel
                    allowSelection
                    className="flex min-h-0 flex-1 flex-col gap-4"
                    scrollable={false}
                >
                    <Input
                        className="-mx-[calc(--spacing(3)-1px)] font-semibold text-2xl tracking-tight"
                        maxLength={160}
                        onChange={(event) => {
                            setTitle(event.currentTarget.value);
                        }}
                        placeholder="Untitled"
                        size="lg"
                        unstyled
                        value={title}
                    />
                    <div className="-mx-2 flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/35 p-1">
                        <Button
                            aria-label="Bold"
                            className={cn(formats.bold && "bg-accent")}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                runCommand("bold");
                            }}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <BoldIcon className="size-4" />
                        </Button>
                        <Button
                            aria-label="Italic"
                            className={cn(formats.italic && "bg-accent")}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                runCommand("italic");
                            }}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <ItalicIcon className="size-4" />
                        </Button>
                        <Button
                            aria-label="Underline"
                            className={cn(formats.underline && "bg-accent")}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                runCommand("underline");
                            }}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <UnderlineIcon className="size-4" />
                        </Button>
                        <Button
                            aria-label="Strikethrough"
                            className={cn(formats.strikeThrough && "bg-accent")}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                runCommand("strikeThrough");
                            }}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <StrikethroughIcon className="size-4" />
                        </Button>
                        <Button
                            aria-label="Highlight"
                            className={cn(formats.highlight && "bg-accent")}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                runCommand(
                                    "hiliteColor",
                                    formats.highlight
                                        ? "transparent"
                                        : NOTE_HIGHLIGHT_COLOR
                                );
                            }}
                            size="icon-sm"
                            variant="ghost"
                        >
                            <HighlighterIcon className="size-4" />
                        </Button>
                    </div>
                    <div className="relative flex min-h-[24rem] flex-1">
                        <div
                            className={cn(
                                "prose prose-stone max-w-none flex-1 overflow-y-auto text-[15px] leading-7 outline-none",
                                "prose-p:my-0 prose-p:min-h-[1.75rem] prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5 prose-strong:font-semibold prose-em:italic prose-u:underline prose-s:line-through"
                            )}
                            contentEditable
                            onInput={(event) => {
                                setContentHtml(event.currentTarget.innerHTML);
                            }}
                            ref={editorRef}
                            suppressContentEditableWarning
                        />
                        {contentHtml === NOTE_EMPTY_HTML ? (
                            <div className="pointer-events-none absolute inset-0 text-base text-muted-foreground">
                                Start writing or paste an URL...
                            </div>
                        ) : null}
                    </div>
                </DrawerPanel>
                <DrawerFooter>
                    <DrawerClose render={<Button size="sm" variant="ghost" />}>
                        Close
                    </DrawerClose>
                    <Button loading={saving} onClick={saveNote} size="sm">
                        Save
                    </Button>
                </DrawerFooter>
            </DrawerPopup>
        </Drawer>
    );
}
