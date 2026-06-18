"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import {
    ClaudeIcon,
    CursorIcon,
    GoogleDocsIcon,
    NotionIcon,
    OpenAIIcon,
    SciraIcon,
    V0Icon,
} from "@/components/ui/icons";
import {
    Menu,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger,
} from "@/components/ui/menu";
import type { LibraryItemWithCollections } from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { getOwnerDocument } from "@/lib/common/dom";
import { createLogger } from "@/lib/common/logs/console/logger";
import { parseStandaloneUrl } from "@/lib/common/url";
import {
    NOTE_EMPTY_HTML,
    convertNoteHtmlToMarkdown,
    extractNoteText,
    isNoteSerializedEditorState,
    normalizeNoteHtml,
    serializeNoteEditorStateToHtml,
    type NoteSerializedEditorState,
} from "@/lib/integrations/notes/utils";
import AppIconSmall from "@/public/cache-icon-small.png";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { $generateNodesFromDOM } from "@lexical/html";
import { AutoFocusPlugin as LexicalAutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import {
    LexicalComposer,
    type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
    $createHeadingNode,
    $isHeadingNode,
    HeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { T, Var } from "gt-next";
import {
    $createParagraphNode,
    $getRoot,
    $getSelection,
    $isRangeSelection,
    $isRootNode,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    PASTE_COMMAND,
    SELECTION_CHANGE_COMMAND,
    mergeRegister,
    type LexicalEditor,
    type PasteCommandType,
    type TextFormatType,
} from "lexical";
import {
    BoldIcon,
    ChevronDownIcon,
    ChevronRight,
    DownloadIcon,
    ExternalLinkIcon,
    FileTextIcon,
    ItalicIcon,
    MessageCircleIcon,
    StrikethroughIcon,
    UnderlineIcon,
    XIcon,
    type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import {
    createContext,
    startTransition,
    use,
    useDeferredValue,
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from "react";

export interface NoteDraft {
    contentHtml: string;
    contentState: NoteSerializedEditorState | null;
}

interface NoteProps {
    children: ReactNode;
    contentEditableRef?: React.RefObject<HTMLDivElement | null>;
    note: LibraryItemWithCollections | null;
    onOpenChange: (open: boolean) => void | Promise<void>;
    onSave: (draft: NoteDraft) => Promise<boolean> | boolean;
    onUrlPaste: (url: string) => Promise<void> | void;
    open: boolean;
    saving: boolean;
}

interface NoteContextValue {
    contentEditableRef?: React.RefObject<HTMLDivElement | null>;
    contentHtml: string;
    editorKey: number;
    initialDraft: NoteDraft;
    isBusy: boolean;
    onDraftChange: (draft: NoteDraft) => void;
    onOpenChange: (open: boolean) => Promise<void>;
    onUrlPaste: (url: string) => Promise<void>;
    query: string;
    shouldCreateBookmarkFromUrlPaste: () => boolean;
    textMetrics: NoteTextMetrics;
    title: string;
}

interface FormatState {
    blockType: NoteBlockType;
    bold: boolean;
    italic: boolean;
    strikeThrough: boolean;
    underline: boolean;
}

interface NoteTextMetrics {
    characterCount: number;
    paragraphCount: number;
    plainText: string;
    readMinuteCount: number;
    wordCount: number;
}

type NoteBlockType = "h1" | "h2" | "h3" | "paragraph";
type NoteInlineFormatStateKey = Exclude<keyof FormatState, "blockType">;

interface ExportContentProvider {
    createUrl: (query: string) => string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
}

const INITIAL_FORMAT_STATE: FormatState = {
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
const NOTE_READING_WORDS_PER_MINUTE = 250;
const NOTE_WORD_SEPARATOR = /\s+/;

const log = createLogger("library:notes");

const NOTE_NON_EMPTY_BLOCK_TAG_REGEX =
    /<(h[1-3]|p)>(?!(?:\s|<br\s*\/?>)*<\/\1>)[\s\S]*?<\/\1>/gi;

const NOTE_BLOCK_OPTIONS = [
    { ariaLabel: "Paragraph", label: "Text", value: "paragraph" },
    { ariaLabel: "Heading 1", label: "H1", value: "h1" },
    { ariaLabel: "Heading 2", label: "H2", value: "h2" },
    { ariaLabel: "Heading 3", label: "H3", value: "h3" },
] satisfies ReadonlyArray<{
    ariaLabel: string;
    label: string;
    value: NoteBlockType;
}>;

const NOTE_TEXT_FORMAT_OPTIONS = [
    { ariaLabel: "Bold", format: "bold", icon: BoldIcon, stateKey: "bold" },
    {
        ariaLabel: "Italic",
        format: "italic",
        icon: ItalicIcon,
        stateKey: "italic",
    },
    {
        ariaLabel: "Underline",
        format: "underline",
        icon: UnderlineIcon,
        stateKey: "underline",
    },
    {
        ariaLabel: "Strikethrough",
        format: "strikethrough",
        icon: StrikethroughIcon,
        stateKey: "strikeThrough",
    },
] satisfies ReadonlyArray<{
    ariaLabel: string;
    format: TextFormatType;
    icon: LucideIcon;
    stateKey: NoteInlineFormatStateKey;
}>;

/**
 * AI tools and editors that users can send note content to.
 *
 * Each provider receives the full plain-text note as a query parameter
 * where supported, or opens a blank document otherwise.
 */
const EXPORT_CONTENT_PROVIDERS: readonly ExportContentProvider[] = [
    {
        createUrl: (query) =>
            `https://chatgpt.com/?${new URLSearchParams({ hints: "search", prompt: query })}`,
        icon: OpenAIIcon,
        title: "Open in ChatGPT",
    },
    {
        createUrl: (query) =>
            `https://claude.ai/new?${new URLSearchParams({ q: query })}`,
        icon: ClaudeIcon,
        title: "Open in Claude",
    },
    {
        createUrl: (query) => {
            const url = new URL("https://cursor.com/link/prompt");
            url.searchParams.set("text", query);
            return url.toString();
        },
        icon: CursorIcon,
        title: "Open in Cursor",
    },
    {
        createUrl: (query) =>
            `https://scira.ai/?${new URLSearchParams({ q: query })}`,
        icon: SciraIcon,
        title: "Open in Scira",
    },
    {
        createUrl: (query) =>
            `codex://new?${new URLSearchParams({ prompt: query })}`,
        icon: OpenAIIcon,
        title: "Open in Codex",
    },
    {
        createUrl: (query) =>
            `https://t3.chat/new?${new URLSearchParams({ q: query })}`,
        icon: MessageCircleIcon,
        title: "Open in T3 Chat",
    },
    {
        createUrl: (query) =>
            `https://v0.app?${new URLSearchParams({ q: query })}`,
        icon: V0Icon,
        title: "Open in v0",
    },
    {
        createUrl: (_query) => "https://docs.new",
        icon: GoogleDocsIcon,
        title: "Open in Google Docs",
    },
    {
        createUrl: (_query) => "https://notion.new",
        icon: NotionIcon,
        title: "Open in Notion",
    },
];

const NoteContext = createContext<NoteContextValue | null>(null);

function useNoteContext(): NoteContextValue {
    const context = use(NoteContext);
    if (!context) {
        throw new Error(
            "Note compound components must be rendered inside Note.Root."
        );
    }
    return context;
}

/**
 * Normalize a draft so HTML comparisons are stable across serializations.
 *
 * Must be called before any equality check or save so whitespace-only
 * differences don't create false positives.
 */
function normalizeDraft(draft: NoteDraft): NoteDraft {
    return {
        contentHtml: normalizeNoteHtml(draft.contentHtml),
        contentState: draft.contentState,
    };
}

/**
 * Convert a Lexical editor state into a normalized draft.
 *
 * Preserves the serialized state so the editor can restore it exactly,
 * while also caching the HTML for quick text-metric calculations.
 */
function noteDraftFromEditorState(
    contentState: NoteSerializedEditorState
): NoteDraft {
    return normalizeDraft({
        contentHtml: serializeNoteEditorStateToHtml(contentState),
        contentState,
    });
}

/**
 * Build a draft from an existing note item or an empty placeholder.
 *
 * Prefers the structured editor state over raw HTML so history and
 * formatting are preserved when the note is reopened.
 */
function noteDraftFromItem(note: LibraryItemWithCollections | null): NoteDraft {
    const contentState = isNoteSerializedEditorState(note?.noteContentState)
        ? note.noteContentState
        : null;

    if (contentState) {
        return noteDraftFromEditorState(contentState);
    }

    return normalizeDraft({
        contentHtml: note?.noteContentHtml ?? NOTE_EMPTY_HTML,
        contentState: null,
    });
}

/**
 * Shallow equality check for toolbar format state.
 *
 * Used to bail out of React re-renders when the selection hasn't changed.
 */
function areFormatStatesEqual(left: FormatState, right: FormatState): boolean {
    return (
        left.blockType === right.blockType &&
        left.bold === right.bold &&
        left.italic === right.italic &&
        left.strikeThrough === right.strikeThrough &&
        left.underline === right.underline
    );
}

/**
 * Derive word, character, and paragraph counts from note HTML.
 *
 * Falls back to one implicit paragraph when text exists but block tags
 * are missing, which happens with plain-text pastes.
 */
function getNoteTextMetrics(contentHtml: string): NoteTextMetrics {
    const plainText = extractNoteText(contentHtml);
    const matchedBlocks = contentHtml.match(NOTE_NON_EMPTY_BLOCK_TAG_REGEX);
    const wordCount =
        plainText.length === 0
            ? 0
            : plainText.split(NOTE_WORD_SEPARATOR).filter(Boolean).length;

    // If there is text but no matched block tags, treat it as a single implicit paragraph.
    const paragraphCount =
        plainText.length === 0 ? 0 : Math.max(1, matchedBlocks?.length ?? 0);

    return {
        characterCount: plainText.length,
        paragraphCount,
        plainText,
        readMinuteCount: Math.ceil(wordCount / NOTE_READING_WORDS_PER_MINUTE),
        wordCount,
    };
}

/**
 * Produce the correct Lexical `editorState` initializer from a draft.
 *
 * Uses the JSON snapshot when available for instant hydration; otherwise
 * parses HTML into nodes so legacy notes still render correctly.
 */
function getInitialEditorState(
    initialDraft: NoteDraft
): InitialConfigType["editorState"] {
    if (initialDraft.contentState) {
        return JSON.stringify(initialDraft.contentState);
    }

    if (normalizeNoteHtml(initialDraft.contentHtml) === NOTE_EMPTY_HTML) {
        return null;
    }

    return (editor: LexicalEditor) => {
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

/**
 * Compare two drafts for semantic differences.
 *
 * Normalizes HTML before comparing so inconsequential whitespace changes
 * don't trigger a save prompt.
 */
function haveDraftsChanged(left: NoteDraft, right: NoteDraft): boolean {
    return (
        normalizeNoteHtml(left.contentHtml) !==
        normalizeNoteHtml(right.contentHtml)
    );
}

/**
 * Check whether a draft contains any visible text.
 *
 * HTML with only empty tags or whitespace is considered empty.
 */
function isDraftEmpty(draft: NoteDraft): boolean {
    return extractNoteText(draft.contentHtml).length === 0;
}

/**
 * Lexical plugin that renders a block-type and inline-format toolbar.
 *
 * Listens to selection changes and only re-renders when the format state
 * actually differs, which is important because Lexical fires many
 * selection events during typing.
 */
function FormattingToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [formats, setFormats] = useState<FormatState>(INITIAL_FORMAT_STATE);

    useEffect(() => {
        const updateToolbarState = () => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    setFormats((current) =>
                        areFormatStatesEqual(current, INITIAL_FORMAT_STATE)
                            ? current
                            : INITIAL_FORMAT_STATE
                    );
                    return;
                }

                const anchorNode = selection.anchor.getNode();
                const topLevelNode = $isRootNode(anchorNode)
                    ? anchorNode
                    : anchorNode.getTopLevelElement();
                const blockType =
                    topLevelNode && $isHeadingNode(topLevelNode)
                        ? topLevelNode.getTag()
                        : "paragraph";

                const nextFormats: FormatState = {
                    blockType:
                        blockType === "h1" ||
                        blockType === "h2" ||
                        blockType === "h3"
                            ? blockType
                            : "paragraph",
                    bold: selection.hasFormat("bold"),
                    italic: selection.hasFormat("italic"),
                    strikeThrough: selection.hasFormat("strikethrough"),
                    underline: selection.hasFormat("underline"),
                };

                setFormats((currentFormats) =>
                    areFormatStatesEqual(currentFormats, nextFormats)
                        ? currentFormats
                        : nextFormats
                );
            });
        };

        updateToolbarState();

        return mergeRegister(
            editor.registerUpdateListener(() => updateToolbarState()),
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
        <div className="-mx-2 mb-3 flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/35 p-1">
            {NOTE_BLOCK_OPTIONS.map((option) => (
                <Button
                    aria-label={option.ariaLabel}
                    className={cn(
                        "rounded-full px-3 font-medium text-xs",
                        formats.blockType === option.value && "bg-accent"
                    )}
                    key={option.value}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        setBlockType(option.value);
                    }}
                    size="xs"
                    variant="ghost"
                >
                    {option.label}
                </Button>
            ))}
            {NOTE_TEXT_FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;

                return (
                    <Button
                        aria-label={option.ariaLabel}
                        className={cn(formats[option.stateKey] && "bg-accent")}
                        key={option.format}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            toggleTextFormat(option.format);
                        }}
                        size="icon-sm"
                        variant="ghost"
                    >
                        <Icon className="size-4" />
                    </Button>
                );
            })}
        </div>
    );
}

/**
 * Lexical plugin bundle that wires the editor to the note system.
 *
 * Handles paste interception (detects standalone URLs and routes them
 * to `onUrlPaste`), change serialization, and history.
 */
function ContentPlugin({
    contentEditableRef,
    onDraftChange,
    onUrlPaste,
    shouldCreateBookmarkFromUrlPaste,
}: {
    contentEditableRef?: React.RefObject<HTMLDivElement | null>;
    onDraftChange: (draft: NoteDraft) => void;
    onUrlPaste: (url: string) => Promise<void> | void;
    shouldCreateBookmarkFromUrlPaste: () => boolean;
}) {
    const [editor] = useLexicalComposerContext();

    const handlePaste = useStableCallback((event: PasteCommandType) => {
        if (!shouldCreateBookmarkFromUrlPaste()) {
            return false;
        }

        if (!("clipboardData" in event && event.clipboardData)) {
            return false;
        }

        const pastedText = event.clipboardData.getData("text/plain");
        const parsedUrl = parseStandaloneUrl(pastedText);
        if (!parsedUrl) {
            return false;
        }

        event.preventDefault();
        const pasteResult = onUrlPaste(parsedUrl.href);
        if (pasteResult) {
            pasteResult.catch((error: unknown) => {
                log.error("Unexpected note URL paste failure", error);
            });
        }
        return true;
    });

    useEffect(
        () =>
            editor.registerCommand(
                PASTE_COMMAND,
                handlePaste,
                COMMAND_PRIORITY_LOW
            ),
        [editor, handlePaste]
    );

    return (
        <>
            <FormattingToolbarPlugin />
            <div className="relative min-h-96 flex-1">
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className={cn(
                                "prose prose-stone h-full min-h-96 max-w-none overflow-y-auto text-[15px] leading-7 outline-none",
                                "prose-p:my-0 prose-p:min-h-[1.75rem]",
                                "prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5",
                                "prose-strong:font-semibold prose-em:italic prose-u:underline prose-s:line-through"
                            )}
                            ref={contentEditableRef}
                        />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                    placeholder={
                        <div className="pointer-events-none absolute inset-0 text-base text-muted-foreground">
                            <T>Start typing or paste a link to add...</T>
                        </div>
                    }
                />
                <HistoryPlugin />
                <LexicalAutoFocusPlugin defaultSelection="rootEnd" />
                <OnChangePlugin
                    ignoreSelectionChange
                    onChange={(editorState) => {
                        const contentState = editorState.toJSON();
                        onDraftChange(noteDraftFromEditorState(contentState));
                    }}
                />
            </div>
        </>
    );
}

/**
 * Root controller for the note editor.
 *
 * Manages draft state, dirty-checking, auto-save on close, and expansion
 * toggling. Provides the shared context consumed by all leaf parts.
 */
function NoteRoot({
    children,
    contentEditableRef,
    note,
    onOpenChange,
    onSave,
    onUrlPaste,
    open,
    saving,
}: NoteProps) {
    const [initialDraft, setInitialDraft] = useState<NoteDraft>(() =>
        noteDraftFromItem(note)
    );
    const [draft, setDraft] = useState<NoteDraft>(initialDraft);
    const [editorKey, setEditorKey] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    const initialDraftRef = useRef<NoteDraft>(draft);
    const latestDraftRef = useRef<NoteDraft>(draft);

    const resetDraft = () => {
        const nextDraft = noteDraftFromItem(note);
        initialDraftRef.current = nextDraft;
        latestDraftRef.current = nextDraft;
        setInitialDraft(nextDraft);
        setDraft(nextDraft);
        setEditorKey((key) => key + 1);
    };

    // React to prop changes during render instead of a `useEffect` to avoid
    // committing once for the prop change and again for the state sync.
    const [prevOpen, setPrevOpen] = useState(open);
    const [prevNote, setPrevNote] = useState(note);

    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            resetDraft();
        }
    }

    if (note !== prevNote) {
        setPrevNote(note);
        if (open) {
            resetDraft();
        }
    }

    const handleDraftChange = (nextDraft: NoteDraft) => {
        const normalizedDraft = normalizeDraft(nextDraft);
        if (!haveDraftsChanged(normalizedDraft, latestDraftRef.current)) {
            return;
        }
        latestDraftRef.current = normalizedDraft;
        startTransition(() => {
            setDraft(normalizedDraft);
        });
    };

    const handleUrlPaste = async (url: string) => {
        await onUrlPaste(url);
        resetDraft();
        await onOpenChange(false);
    };

    const shouldCreateBookmarkFromUrlPaste = () =>
        !note && isDraftEmpty(latestDraftRef.current);

    const handleOpenChange = async (nextOpen: boolean) => {
        if (nextOpen) {
            onOpenChange(true);
            return;
        }

        if (saving || isClosing) {
            return;
        }

        const currentDraft = latestDraftRef.current;
        const hasChanged = haveDraftsChanged(
            currentDraft,
            initialDraftRef.current
        );

        if (!hasChanged) {
            onOpenChange(false);
            return;
        }

        if (!note && isDraftEmpty(currentDraft)) {
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

    const deferredContentHtml = useDeferredValue(draft.contentHtml);
    const textMetrics = getNoteTextMetrics(deferredContentHtml);
    const query = textMetrics.plainText;
    const title = note ? "Edit note" : "New entry";
    const isBusy = saving || isClosing;

    return (
        <NoteContext
            value={{
                contentEditableRef,
                contentHtml: draft.contentHtml,
                editorKey,
                initialDraft,
                isBusy,
                onDraftChange: handleDraftChange,
                onOpenChange: handleOpenChange,
                onUrlPaste: handleUrlPaste,
                query,
                shouldCreateBookmarkFromUrlPaste,
                textMetrics,
                title,
            }}
        >
            {children}
        </NoteContext>
    );
}

/**
 * Render the current note title string.
 *
 * Used by parent layouts that need the title outside the note tree.
 */
function NoteTitle() {
    const { title } = useNoteContext();
    return title;
}

function NoteHeader() {
    const { contentHtml, isBusy, onOpenChange, query, title } =
        useNoteContext();

    const hasQuery = query.length > 0;

    const handleExportMarkdown = () => {
        const markdown = convertNoteHtmlToMarkdown(contentHtml);
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const ownerDocument = getOwnerDocument();
        const link = ownerDocument.createElement("a");
        link.href = url;
        link.download = "note.md";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="flex items-center gap-1">
                <Badge size="lg" variant="outline">
                    <Image alt="" height={12} src={AppIconSmall} width={12} />
                    Cache
                </Badge>
                <ChevronRight className="inline-block size-3.5 shrink-0" />
                <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
                <Menu>
                    <MenuTrigger
                        render={
                            <Button
                                className="rounded-full"
                                disabled={!hasQuery}
                                size="sm"
                                variant="secondary"
                            />
                        }
                    >
                        <T>Open in...</T>
                        <ChevronDownIcon className="size-3.5" />
                    </MenuTrigger>
                    <MenuPopup align="start" className="w-60">
                        {EXPORT_CONTENT_PROVIDERS.map((provider) => {
                            const ProviderIcon = provider.icon;
                            return (
                                <MenuItem
                                    disabled={!hasQuery}
                                    key={provider.title}
                                    render={(props) => (
                                        <a
                                            {...props}
                                            href={provider.createUrl(query)}
                                            rel="noopener noreferrer"
                                            target="_blank"
                                        />
                                    )}
                                >
                                    <ProviderIcon className="size-4 text-muted-foreground" />
                                    <span className="flex-1">
                                        {provider.title}
                                    </span>
                                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                                </MenuItem>
                            );
                        })}
                        <MenuSeparator />
                        <MenuItem
                            disabled={!hasQuery}
                            onClick={handleExportMarkdown}
                        >
                            <FileTextIcon className="size-4 text-muted-foreground" />
                            <span className="flex-1">
                                <T>Export to Markdown</T>
                            </span>
                            <DownloadIcon className="size-4 text-muted-foreground" />
                        </MenuItem>
                    </MenuPopup>
                </Menu>
                <Group aria-label="Panel actions">
                    <Button
                        aria-label="Close note"
                        className="mr-0.5 rounded-full"
                        loading={isBusy}
                        onClick={async () => {
                            await onOpenChange(false);
                        }}
                        size="icon-sm"
                        variant="secondary"
                    >
                        <XIcon className="inline-block size-3.5" />
                    </Button>
                </Group>
            </div>
        </>
    );
}

/**
 * Lexical composer that mounts the rich-text editor with the correct
 * initial state and plugins.
 *
 * Keyed by `editorKey` so reopening a different note fully remounts
 * the editor instead of recycling stale internal state.
 */
function NoteEditor() {
    const {
        contentEditableRef,
        editorKey,
        initialDraft,
        onDraftChange,
        onUrlPaste,
        shouldCreateBookmarkFromUrlPaste,
    } = useNoteContext();
    const editorState = getInitialEditorState(initialDraft);

    return (
        <LexicalComposer
            initialConfig={{
                editorState,
                namespace: NOTE_EDITOR_NAMESPACE,
                nodes: NOTE_EDITOR_NODES,
                onError(error: Error) {
                    log.error("Unexpected note editor error", error);
                },
                theme: NOTE_EDITOR_THEME,
            }}
            key={editorKey}
        >
            <ContentPlugin
                contentEditableRef={contentEditableRef}
                onDraftChange={onDraftChange}
                onUrlPaste={onUrlPaste}
                shouldCreateBookmarkFromUrlPaste={
                    shouldCreateBookmarkFromUrlPaste
                }
            />
        </LexicalComposer>
    );
}

function NoteMetrics() {
    const { textMetrics } = useNoteContext();
    const shouldShowReadTime = textMetrics.readMinuteCount >= 2;

    return (
        <div className="mt-3 flex items-center justify-end gap-4 border-border/60 border-t pt-3 text-muted-foreground text-xs">
            {shouldShowReadTime ? (
                <T>
                    <span>
                        <Var>{textMetrics.readMinuteCount}</Var> minute read
                    </span>
                </T>
            ) : null}
            <T>
                <span>
                    <Var>{textMetrics.wordCount}</Var> words
                </span>
            </T>
            <T>
                <span>
                    <Var>{textMetrics.paragraphCount}</Var> paragraphs
                </span>
            </T>
            <T>
                <span>
                    <Var>{textMetrics.characterCount}</Var> characters
                </span>
            </T>
        </div>
    );
}

/**
 * Compound component for the rich-text note editor.
 *
 * Compose with `.Root`, `.Header`, `.Editor`, and `.Metrics`:
 *   <Note.Root note={note} open onSave={...} ...>
 *     <Note.Header />
 *     <Note.Editor />
 *     <Note.Metrics />
 *   </Note.Root>
 *
 * Call `.useContext()` in custom children to read draft state,
 * text metrics, and the expanded flag.
 */
export const Note = Object.assign(NoteRoot, {
    Editor: NoteEditor,
    Header: NoteHeader,
    Metrics: NoteMetrics,
    Root: NoteRoot,
    Title: NoteTitle,
    useContext: useNoteContext,
});
