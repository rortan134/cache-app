"use client";

import {
    $createParagraphNode,
    $getSelection,
    $getRoot,
    $isRangeSelection,
    $isRootNode,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    SELECTION_CHANGE_COMMAND,
    mergeRegister,
    type LexicalEditor,
    type TextFormatType,
} from "lexical";
import { $generateNodesFromDOM } from "@lexical/html";
import { $setBlocksType } from "@lexical/selection";
import {
    HeadingNode,
    $createHeadingNode,
    $isHeadingNode,
} from "@lexical/rich-text";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import {
    LexicalComposer,
    type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
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
import {
    NOTE_EMPTY_HTML,
    isNoteSerializedEditorState,
    normalizeNoteHtml,
    serializeNoteEditorStateToHtml,
    type NoteSerializedEditorState,
} from "@/lib/library/notes";
import type { LibraryItemWithCollections } from "@/lib/library/types";
import AppIconSmall from "@/public/cache-icon-small.png";
import {
    BoldIcon,
    ChevronRight,
    ItalicIcon,
    Maximize2,
    StrikethroughIcon,
    UnderlineIcon,
    XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface NoteDraft {
    readonly contentHtml: string;
    readonly contentState: NoteSerializedEditorState | null;
}

interface Props {
    readonly note: LibraryItemWithCollections | null;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSave: (draft: NoteDraft) => Promise<boolean> | boolean;
    readonly open: boolean;
    readonly saving: boolean;
}

interface FormatState {
    readonly blockType: NoteBlockType;
    readonly bold: boolean;
    readonly italic: boolean;
    readonly strikeThrough: boolean;
    readonly underline: boolean;
}

interface NoteTextStats {
    readonly characterCount: number;
    readonly wordCount: number;
}

type NoteBlockType = "h1" | "h2" | "h3" | "paragraph";

const EMPTY_FORMAT_STATE: FormatState = {
    blockType: "paragraph",
    bold: false,
    italic: false,
    strikeThrough: false,
    underline: false,
};

const NOTE_EDITOR_THEME = {
    heading: {
        h1: "mb-3 mt-0 text-[2rem] font-semibold leading-tight tracking-tight",
        h2: "mb-3 mt-6 text-[1.5rem] font-semibold leading-tight tracking-tight",
        h3: "mb-2 mt-5 text-[1.2rem] font-semibold leading-tight tracking-tight",
    },
    paragraph: "my-0 min-h-[1.75rem] leading-7",
    text: {
        bold: "font-semibold",
        highlight: "rounded-sm bg-amber-200/90 px-0.5",
        italic: "italic",
        strikethrough: "line-through",
        underline: "underline",
    },
};

const NOTE_EDITOR_NODES = [HeadingNode];
const NOTE_EDITOR_NAMESPACE = "cache-library-note";
const NOTE_WORD_SEPARATOR = /\s+/;

function noteDraftFromItem(note: LibraryItemWithCollections | null): NoteDraft {
    const contentState = isNoteSerializedEditorState(note?.noteContentState)
        ? note.noteContentState
        : null;

    return {
        contentHtml: contentState
            ? serializeNoteEditorStateToHtml(contentState)
            : normalizeNoteHtml(note?.noteContentHtml),
        contentState,
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

function getNotePlainText(contentHtml: string): string {
    return contentHtml
        .replaceAll(/<br\s*\/?>/gi, "\n")
        .replaceAll(/<\/(h[1-6]|p|div)>/gi, "\n")
        .replaceAll(/<[^>]*>/g, "")
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll(/\u00a0/g, " ");
}

function getNoteTextStats(contentHtml: string): NoteTextStats {
    const plainText = getNotePlainText(contentHtml);
    const normalizedWords = plainText.trim();

    return {
        characterCount: plainText.length,
        wordCount:
            normalizedWords.length === 0
                ? 0
                : normalizedWords.split(NOTE_WORD_SEPARATOR).length,
    };
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

function getSelectedBlockType(): NoteBlockType {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
        return "paragraph";
    }

    const anchorNode = selection.anchor.getNode();
    const topLevelNode = $isRootNode(anchorNode)
        ? anchorNode
        : anchorNode.getTopLevelElement();

    if (topLevelNode && $isHeadingNode(topLevelNode)) {
        const tag = topLevelNode.getTag();
        if (tag === "h1" || tag === "h2" || tag === "h3") {
            return tag;
        }
    }

    return "paragraph";
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

function NoteFormattingToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [formats, setFormats] = useState<FormatState>(EMPTY_FORMAT_STATE);

    useEffect(() => {
        const updateToolbarState = () => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();

                if (!$isRangeSelection(selection)) {
                    setFormats(EMPTY_FORMAT_STATE);
                    return;
                }

                setFormats({
                    blockType: getSelectedBlockType(),
                    bold: selection.hasFormat("bold"),
                    italic: selection.hasFormat("italic"),
                    strikeThrough: selection.hasFormat("strikethrough"),
                    underline: selection.hasFormat("underline"),
                });
            });
        };

        updateToolbarState();

        return mergeRegister(
            editor.registerUpdateListener(() => {
                updateToolbarState();
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateToolbarState();
                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    const toggleTextFormat = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const setBlockType = (blockType: NoteBlockType) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }

            if (blockType === "paragraph") {
                $setBlocksType(selection, () => $createParagraphNode());
                return;
            }

            $setBlocksType(selection, () => $createHeadingNode(blockType));
        });
    };

    return (
        <div className="-mx-2 flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/35 p-1">
            <Button
                aria-label="Paragraph"
                className={cn(
                    "rounded-full px-3 font-medium text-xs",
                    formats.blockType === "paragraph" && "bg-accent"
                )}
                onMouseDown={(event) => {
                    event.preventDefault();
                    setBlockType("paragraph");
                }}
                size="xs"
                variant="ghost"
            >
                Text
            </Button>
            <Button
                aria-label="Heading 1"
                className={cn(
                    "rounded-full px-3 font-medium text-xs",
                    formats.blockType === "h1" && "bg-accent"
                )}
                onMouseDown={(event) => {
                    event.preventDefault();
                    setBlockType("h1");
                }}
                size="xs"
                variant="ghost"
            >
                H1
            </Button>
            <Button
                aria-label="Heading 2"
                className={cn(
                    "rounded-full px-3 font-medium text-xs",
                    formats.blockType === "h2" && "bg-accent"
                )}
                onMouseDown={(event) => {
                    event.preventDefault();
                    setBlockType("h2");
                }}
                size="xs"
                variant="ghost"
            >
                H2
            </Button>
            <Button
                aria-label="Heading 3"
                className={cn(
                    "rounded-full px-3 font-medium text-xs",
                    formats.blockType === "h3" && "bg-accent"
                )}
                onMouseDown={(event) => {
                    event.preventDefault();
                    setBlockType("h3");
                }}
                size="xs"
                variant="ghost"
            >
                H3
            </Button>
            <Button
                aria-label="Bold"
                className={cn(formats.bold && "bg-accent")}
                onMouseDown={(event) => {
                    event.preventDefault();
                    toggleTextFormat("bold");
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
                    toggleTextFormat("italic");
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
                    toggleTextFormat("underline");
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
                    toggleTextFormat("strikethrough");
                }}
                size="icon-sm"
                variant="ghost"
            >
                <StrikethroughIcon className="size-4" />
            </Button>
        </div>
    );
}

function NoteContentPlugin({
    onDraftChange,
}: {
    readonly onDraftChange: (draft: NoteDraft) => void;
}) {
    return (
        <>
            <NoteFormattingToolbarPlugin />
            <div className="relative flex min-h-96 flex-1">
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className={cn(
                                "prose prose-stone max-w-none flex-1 overflow-y-auto text-[15px] leading-7 outline-none",
                                "prose-p:my-0 prose-p:min-h-[1.75rem] prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5 prose-strong:font-semibold prose-em:italic prose-u:underline prose-s:line-through"
                            )}
                        />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                    placeholder={
                        <div className="pointer-events-none absolute inset-0 text-base text-muted-foreground">
                            Start writing or paste an URL...
                        </div>
                    }
                />
                <HistoryPlugin />
                <AutoFocusPlugin />
                <OnChangePlugin
                    ignoreSelectionChange
                    onChange={(editorState) => {
                        const contentState = editorState.toJSON();
                        onDraftChange({
                            contentHtml:
                                serializeNoteEditorStateToHtml(contentState),
                            contentState,
                        });
                    }}
                />
            </div>
        </>
    );
}

function NoteStatsFooter({ contentHtml }: { readonly contentHtml: string }) {
    const stats = getNoteTextStats(contentHtml);

    return (
        <div className="flex items-center justify-end gap-4 border-border/60 border-t pt-3 text-muted-foreground text-xs">
            <span>{stats.wordCount} words</span>
            <span>{stats.characterCount} characters</span>
        </div>
    );
}

function NoteEditor({
    editorKey,
    initialDraft,
    onDraftChange,
}: {
    readonly editorKey: number;
    readonly initialDraft: NoteDraft;
    readonly onDraftChange: (draft: NoteDraft) => void;
}) {
    let initialEditorState: InitialConfigType["editorState"] = null;

    if (initialDraft.contentState) {
        initialEditorState = JSON.stringify(initialDraft.contentState);
    } else if (
        normalizeNoteHtml(initialDraft.contentHtml) !== NOTE_EMPTY_HTML
    ) {
        initialEditorState = (editor: LexicalEditor) => {
            const dom = new DOMParser().parseFromString(
                initialDraft.contentHtml,
                "text/html"
            );
            const nodes = $generateNodesFromDOM(editor, dom);
            const root = $getRoot();

            root.clear();
            root.append(...nodes);

            if (root.getChildrenSize() === 0) {
                root.append($createParagraphNode());
            }
        };
    }

    const initialConfig: InitialConfigType = {
        editorState: initialEditorState,
        namespace: NOTE_EDITOR_NAMESPACE,
        nodes: NOTE_EDITOR_NODES,
        onError(error: Error) {
            console.error(error);
        },
        theme: NOTE_EDITOR_THEME,
    };

    return (
        <LexicalComposer initialConfig={initialConfig} key={editorKey}>
            <NoteContentPlugin onDraftChange={onDraftChange} />
        </LexicalComposer>
    );
}

export function LibraryNoteDrawer({
    note,
    onOpenChange,
    onSave,
    open,
    saving,
}: Props) {
    const initialDraftRef = useRef<NoteDraft>(noteDraftFromItem(note));
    const latestDraftRef = useRef<NoteDraft>(noteDraftFromItem(note));
    const [draft, setDraft] = useState<NoteDraft>(() =>
        noteDraftFromItem(note)
    );
    const [editorKey, setEditorKey] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const nextDraft = noteDraftFromItem(note);
        initialDraftRef.current = nextDraft;
        latestDraftRef.current = nextDraft;
        setDraft(nextDraft);
        setEditorKey((currentKey) => currentKey + 1);
    }, [note, open]);

    const handleDraftChange = (nextDraft: NoteDraft) => {
        const normalizedDraft = {
            contentHtml: normalizeNoteHtml(nextDraft.contentHtml),
            contentState: nextDraft.contentState,
        } satisfies NoteDraft;

        latestDraftRef.current = normalizedDraft;
        setDraft(normalizedDraft);
    };

    const handleOpenChange = async (nextOpen: boolean) => {
        if (nextOpen) {
            onOpenChange(true);
            return;
        }

        if (saving || isClosing) {
            return;
        }

        const currentDraft = latestDraftRef.current;

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
                <DrawerPanel
                    allowSelection
                    className="flex min-h-0 flex-1 flex-col gap-4"
                >
                    <NoteEditor
                        editorKey={editorKey}
                        initialDraft={draft}
                        onDraftChange={handleDraftChange}
                    />
                    <NoteStatsFooter contentHtml={draft.contentHtml} />
                </DrawerPanel>
            </DrawerPopup>
        </Drawer>
    );
}
