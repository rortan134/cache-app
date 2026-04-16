"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Group } from "@/components/ui/group";
import { GoogleDocsIcon, NotionIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { LibraryItemWithCollections } from "@/lib/library/types";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    BoldIcon,
    ChevronRight,
    HighlighterIcon,
    ItalicIcon,
    Maximize2,
    StrikethroughIcon,
    UnderlineIcon,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";

const NOTE_EMPTY_HTML = "<p></p>";
const NOTE_HIGHLIGHT_COLOR = "#fef08a";

interface NoteDraft {
    readonly contentHtml: string;
}

interface Props {
    readonly note: LibraryItemWithCollections | null;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSave: (draft: NoteDraft) => Promise<boolean> | boolean;
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

function normalizeNoteHtml(html: string | null | undefined): string {
    return html?.trim() || NOTE_EMPTY_HTML;
}

function noteDraftFromItem(note: LibraryItemWithCollections | null): NoteDraft {
    return {
        contentHtml: normalizeNoteHtml(note?.noteContentHtml),
    };
}

function noteDraftsMatch(left: NoteDraft, right: NoteDraft): boolean {
    return (
        normalizeNoteHtml(left.contentHtml) ===
        normalizeNoteHtml(right.contentHtml)
    );
}

function noteHtmlHasMeaningfulContent(contentHtml: string): boolean {
    const textContent = contentHtml
        .replaceAll(/<[^>]*>/g, " ")
        .replaceAll("&nbsp;", " ")
        .trim();

    return textContent.length > 0;
}

function noteDraftShouldSave(
    currentDraft: NoteDraft,
    initialDraft: NoteDraft,
    note: LibraryItemWithCollections | null
): boolean {
    if (noteDraftsMatch(currentDraft, initialDraft)) {
        return false;
    }

    if (note) {
        return true;
    }

    return noteHtmlHasMeaningfulContent(currentDraft.contentHtml);
}

function useRichTextFormats(
    editorRef: RefObject<HTMLDivElement | null>,
    enabled: boolean
): FormatState {
    const [formats, setFormats] = useState<FormatState>(EMPTY_FORMAT_STATE);

    useEffect(() => {
        if (!enabled) {
            setFormats(EMPTY_FORMAT_STATE);
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
        refreshFormats();

        return () => {
            document.removeEventListener("selectionchange", refreshFormats);
        };
    }, [editorRef, enabled]);

    return formats;
}

function NoteDrawerHeader({ title }: { readonly title: string }) {
    return (
        <DrawerHeader allowSelection className="flex-row justify-between">
            <div className="flex items-center gap-1">
                <Badge size="lg" variant="outline">
                    <Image alt="" height={12} src={AppIconSmall} width={12} />
                    Cache
                </Badge>
                <ChevronRight className="inline-block size-3.5 shrink-0" />
                <DrawerTitle className="font-medium text-sm">
                    {title}
                </DrawerTitle>
            </div>
            <div className="flex items-center justify-end gap-1.5">
                <Button className="rounded-full" size="xs" variant="outline">
                    <GoogleDocsIcon className="inline-block size-3.5" />
                    Open in Google Docs
                </Button>
                <Button className="rounded-full" size="xs" variant="outline">
                    <NotionIcon className="inline-block size-3.5" />
                    &nbsp;Open in Notion
                </Button>
                <Group aria-label="Panel actions">
                    <Button
                        className="rounded-full"
                        size="icon-sm"
                        variant="secondary"
                    >
                        <Maximize2 className="inline-block size-3.5" />
                    </Button>
                    <DrawerClose
                        render={
                            <Button
                                className="rounded-full"
                                size="icon-sm"
                                variant="secondary"
                            >
                                <XIcon className="inline-block size-3.5" />
                            </Button>
                        }
                    />
                </Group>
            </div>
        </DrawerHeader>
    );
}

function NoteFormattingToolbar({
    editorRef,
    onContentHtmlChange,
    open,
}: {
    readonly editorRef: RefObject<HTMLDivElement | null>;
    readonly onContentHtmlChange: (contentHtml: string) => void;
    readonly open: boolean;
}) {
    const formats = useRichTextFormats(editorRef, open);

    const runCommand = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        onContentHtmlChange(editorRef.current?.innerHTML ?? NOTE_EMPTY_HTML);
    };

    return (
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
                        formats.highlight ? "transparent" : NOTE_HIGHLIGHT_COLOR
                    );
                }}
                size="icon-sm"
                variant="ghost"
            >
                <HighlighterIcon className="size-4" />
            </Button>
        </div>
    );
}

function NoteEditor({
    contentHtml,
    editorRef,
    onContentHtmlChange,
}: {
    readonly contentHtml: string;
    readonly editorRef: RefObject<HTMLDivElement | null>;
    readonly onContentHtmlChange: (contentHtml: string) => void;
}) {
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || editor.innerHTML === contentHtml) {
            return;
        }

        editor.innerHTML = contentHtml;
    }, [contentHtml, editorRef]);

    const isEmpty = contentHtml === NOTE_EMPTY_HTML;

    return (
        <div className="relative flex min-h-96 flex-1">
            <div
                className={cn(
                    "prose prose-stone max-w-none flex-1 overflow-y-auto text-[15px] leading-7 outline-none",
                    "prose-p:my-0 prose-p:min-h-[1.75rem] prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5 prose-strong:font-semibold prose-em:italic prose-u:underline prose-s:line-through"
                )}
                contentEditable
                onInput={(event) => {
                    onContentHtmlChange(event.currentTarget.innerHTML);
                }}
                ref={editorRef}
                suppressContentEditableWarning
            />
            {isEmpty ? (
                <div className="pointer-events-none absolute inset-0 text-base text-muted-foreground">
                    Start writing or paste an URL...
                </div>
            ) : null}
        </div>
    );
}

function NoteDrawerContent({
    contentHtml,
    editorRef,
    onContentHtmlChange,
    open,
}: {
    readonly contentHtml: string;
    readonly editorRef: RefObject<HTMLDivElement | null>;
    readonly onContentHtmlChange: (contentHtml: string) => void;
    readonly open: boolean;
}) {
    return (
        <DrawerPanel
            allowSelection
            className="flex min-h-0 flex-1 flex-col gap-4"
        >
            <NoteFormattingToolbar
                editorRef={editorRef}
                onContentHtmlChange={onContentHtmlChange}
                open={open}
            />
            <NoteEditor
                contentHtml={contentHtml}
                editorRef={editorRef}
                onContentHtmlChange={onContentHtmlChange}
            />
        </DrawerPanel>
    );
}

export function LibraryNoteDrawer({
    note,
    onOpenChange,
    onSave,
    open,
    saving,
}: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const initialDraftRef = useRef<NoteDraft>(noteDraftFromItem(note));
    const [draft, setDraft] = useState<NoteDraft>(() =>
        noteDraftFromItem(note)
    );
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const nextDraft = noteDraftFromItem(note);
        initialDraftRef.current = nextDraft;
        setDraft(nextDraft);
    }, [note, open]);

    const handleContentHtmlChange = (nextContentHtml: string) => {
        setDraft((currentDraft) => ({
            ...currentDraft,
            contentHtml: normalizeNoteHtml(nextContentHtml),
        }));
    };

    const handleOpenChange = async (nextOpen: boolean) => {
        if (nextOpen) {
            onOpenChange(true);
            return;
        }

        if (saving || isClosing) {
            return;
        }

        const currentDraft = {
            contentHtml: editorRef.current?.innerHTML ?? draft.contentHtml,
        } satisfies NoteDraft;

        if (!noteDraftShouldSave(currentDraft, initialDraftRef.current, note)) {
            onOpenChange(false);
            return;
        }

        setIsClosing(true);

        try {
            const didSave = await onSave(currentDraft);

            if (didSave) {
                onOpenChange(false);
            }
        } finally {
            setIsClosing(false);
        }
    };

    return (
        <Drawer onOpenChange={handleOpenChange} open={open} position="right">
            <DrawerPopup className="max-w-2xl" variant="straight">
                <NoteDrawerHeader title={note ? "Edit note" : "New entry"} />
                <NoteDrawerContent
                    contentHtml={draft.contentHtml}
                    editorRef={editorRef}
                    onContentHtmlChange={handleContentHtmlChange}
                    open={open}
                />
            </DrawerPopup>
        </Drawer>
    );
}
