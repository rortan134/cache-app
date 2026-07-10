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
import { useAutosave, type SaveStatus } from "@/hooks/use-autosave";
import type { LibraryItemWithCollections } from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { getOwnerDocument } from "@/lib/common/dom";
import { createLogger } from "@/lib/common/logs/console/logger";
import { openExternal, parseStandaloneUrl } from "@/lib/common/url";
import {
    NOTE_EMPTY_HTML,
    convertNoteHtmlToMarkdown,
    extractNoteText,
    isNoteSerializedEditorState,
    normalizeNoteHtml,
    serializeNoteEditorStateToHtml,
    type NoteSerializedEditorState,
} from "@/lib/integrations/notes/utils";
import { sendNoteToNotion } from "@/lib/integrations/notion/actions";
import AppIconSmall from "@/public/cache-icon-small.png";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    AriaLiveRegionExtension,
    FocusManagerExtension,
    HistoryAnnounceExtension,
    RovingTabIndexExtension,
} from "@lexical/a11y";
import {
    AutoFocusExtension,
    configExtension,
    defineExtension,
    type InitialEditorStateType,
} from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { $generateNodesFromDOM } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { useLexicalFocusManagerRef } from "@lexical/react/useLexicalFocusManagerRef";
import { useLexicalIsTextContentEmpty } from "@lexical/react/useLexicalIsTextContentEmpty";
import { useLexicalRovingTabIndexRef } from "@lexical/react/useLexicalRovingTabIndexRef";
import {
    $createHeadingNode,
    $isHeadingNode,
    RichTextExtension,
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
    type EditorState,
    type LexicalEditor,
    type PasteCommandType,
    type RangeSelection,
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
    use,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
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
    isSaving: boolean;
    note: LibraryItemWithCollections | null;
    onOpenChange: (open: boolean) => void | Promise<void>;
    onSave: (
        draft: NoteDraft,
        noteId: string | null
    ) =>
        | LibraryItemWithCollections
        | null
        | Promise<LibraryItemWithCollections | null>;
    onUrlPaste: (url: string) => Promise<void> | void;
    open: boolean;
}

interface NoteContextValue {
    contentEditableRef?: React.RefObject<HTMLDivElement | null>;
    contentHtml: string;
    editorKey: number;
    initialDraft: NoteDraft;
    isBusy: boolean;
    isDirty: boolean;
    onDraftChange: (draft: NoteDraft) => void;
    onOpenChange: (open: boolean) => Promise<void>;
    onUrlPaste: (url: string) => Promise<void>;
    query: string;
    saveStatus: SaveStatus;
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

const NOTE_EDITOR_NAMESPACE = "cache-library-note";
const NOTE_READING_WORDS_PER_MINUTE = 250;
const NOTE_WORD_SEPARATOR = /\s+/;

/**
 * Strings announced to assistive tech when the matching action happens.
 *
 * The wording is concise on purpose so screen-reader users hear a short,
 * unambiguous event rather than a verbose sentence.
 */
const NOTE_HISTORY_ANNOUNCE_UNDONE = "Undone";
const NOTE_HISTORY_ANNOUNCE_REDONE = "Redone";

/**
 * Root Lexical extension tree for the note editor.
 *
 * `RichTextExtension` owns the rich-text nodes (heading, quote, paragraph),
 * `HistoryExtension` powers undo/redo, and `AutoFocusExtension` sets the
 * initial selection. The `@lexical/a11y` extensions add screen-reader
 * announcements (`HistoryAnnounceExtension` via the shared
 * `AriaLiveRegionExtension`) and the WAI-ARIA toolbar pattern
 * (`RovingTabIndexExtension` + `FocusManagerExtension`).
 *
 * The per-note `$initialEditorState` is *not* baked in here: this constant
 * describes the static shape of the editor. `NoteEditor` injects the
 * initial state through `configExtension` keyed on `editorKey` so each note
 * session rebuilds the tree from a content-specific snapshot, while the
 * editor never re-creates mid-session (which would discard editor state).
 */
const NOTE_EDITOR_EXTENSION = defineExtension({
    dependencies: [
        RichTextExtension,
        HistoryExtension,
        configExtension(AutoFocusExtension, {
            defaultSelection: "rootEnd",
        }),
        configExtension(AriaLiveRegionExtension, {
            owner: null,
            politeness: "polite",
        }),
        configExtension(HistoryAnnounceExtension, {
            disabled: false,
            redone: NOTE_HISTORY_ANNOUNCE_REDONE,
            undone: NOTE_HISTORY_ANNOUNCE_UNDONE,
        }),
        RovingTabIndexExtension,
        FocusManagerExtension,
    ],
    name: NOTE_EDITOR_NAMESPACE,
    namespace: NOTE_EDITOR_NAMESPACE,
    onError(error: Error) {
        log.error("Unexpected note editor error", error);
    },
    theme: NOTE_EDITOR_THEME,
});

const log = createLogger("library:notes");

const NOTE_NON_EMPTY_BLOCK_TAG_REGEX =
    /<(h[1-3]|p)>(?!(?:\s|<br\s*\/?>)*<\/\1>)[\s\S]*?<\/\1>/i;

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
        createUrl: (query) =>
            `https://cursor.com/link/prompt?${new URLSearchParams({ text: query })}`,
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

function getInitialEditorState(
    initialDraft: NoteDraft
): InitialEditorStateType {
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

function haveDraftsChanged(left: NoteDraft, right: NoteDraft): boolean {
    return (
        normalizeNoteHtml(left.contentHtml) !==
        normalizeNoteHtml(right.contentHtml)
    );
}

function isDraftEmpty(draft: NoteDraft): boolean {
    return extractNoteText(draft.contentHtml).length === 0;
}

function getNotionNoteTitle(plainText: string): string {
    const firstLine = plainText
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0);

    return firstLine ?? "Cache note";
}

function shouldCloseWithoutSaving(
    currentDraft: NoteDraft,
    initialDraft: NoteDraft,
    hasPersistedNote: boolean
): boolean {
    if (!haveDraftsChanged(currentDraft, initialDraft)) {
        return true;
    }

    return !hasPersistedNote && isDraftEmpty(currentDraft);
}

function getSelectionBlockType(selection: RangeSelection): NoteBlockType {
    const anchorNode = selection.anchor.getNode();
    const topLevelNode = $isRootNode(anchorNode)
        ? anchorNode
        : anchorNode.getTopLevelElement();

    if (!(topLevelNode && $isHeadingNode(topLevelNode))) {
        return "paragraph";
    }

    const headingTag = topLevelNode.getTag();
    if (headingTag === "h1" || headingTag === "h2" || headingTag === "h3") {
        return headingTag;
    }
    return "paragraph";
}

function downloadMarkdownFile(contentHtml: string) {
    const markdown = convertNoteHtmlToMarkdown(contentHtml);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const ownerDocument = getOwnerDocument();
    const link = ownerDocument.createElement("a");

    link.href = url;
    link.download = "note.md";
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Renders the block-type and inline-format toolbar for the note editor.
 *
 * Implements the WAI-ARIA toolbar pattern: `role="toolbar"` with
 * `aria-orientation="horizontal"`, a roving `tabindex` managed by
 * `@lexical/a11y`'s `RovingTabIndexExtension` (one tab stop, ArrowLeft /
 * ArrowRight move between items), and an editor-to-toolbar focus jump wired
 * by `FocusManagerExtension` (Alt+F10 enters the toolbar, Escape returns to
 * the editor).
 *
 * Listens to selection changes and only re-renders when the format state
 * actually differs, which is important because Lexical fires many selection
 * events during typing.
 */
function FormattingToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [formats, setFormats] = useState<FormatState>(INITIAL_FORMAT_STATE);

    const rovingTabIndexRef = useLexicalRovingTabIndexRef();
    const focusManagerRef = useLexicalFocusManagerRef();
    const toolbarRef = useStableCallback((element: HTMLDivElement | null) => {
        rovingTabIndexRef(element);
        focusManagerRef(element);
    });

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

                const nextFormats: FormatState = {
                    blockType: getSelectionBlockType(selection),
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

    const toggleTextFormat = useStableCallback((format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    });

    const setBlockType = useStableCallback((blockType: NoteBlockType) => {
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
    });

    const handleBlockTypeMouseDown = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            const blockType = event.currentTarget.dataset.blockType;
            if (blockType) {
                setBlockType(blockType as NoteBlockType);
            }
        }
    );

    const handleFormatMouseDown = useStableCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            const format = event.currentTarget.dataset.format as TextFormatType;
            if (format) {
                toggleTextFormat(format);
            }
        }
    );

    return (
        <div
            aria-label="Text formatting"
            aria-orientation="horizontal"
            className="-mx-2 mb-3 flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/35 p-1"
            ref={toolbarRef}
            role="toolbar"
        >
            {NOTE_BLOCK_OPTIONS.map((option) => (
                <Button
                    aria-label={option.ariaLabel}
                    className={cn(
                        "rounded-full px-3 font-medium text-xs",
                        formats.blockType === option.value && "bg-accent"
                    )}
                    data-block-type={option.value}
                    key={option.value}
                    onMouseDown={handleBlockTypeMouseDown}
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
                        data-format={option.format}
                        key={option.format}
                        onMouseDown={handleFormatMouseDown}
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
        pasteResult?.catch((error: unknown) => {
            log.error("Unexpected note URL paste failure", error);
        });
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

    const handleChange = useStableCallback((editorState: EditorState) => {
        const contentState = editorState.toJSON();
        onDraftChange(noteDraftFromEditorState(contentState));
    });

    return (
        <>
            <FormattingToolbarPlugin />
            <div className="relative min-h-96 flex-1">
                {/* The ContentEditable is mounted here rather than via the
                    `contentEditable` prop on LexicalExtensionComposer so the
                    placeholder overlay stays a sibling of the edit surface
                    inside this `relative` wrapper. The extensions
                    (RichTextExtension, HistoryExtension, AutoFocusExtension,
                    the @lexical/a11y extensions) own the editor's behavior;
                    this component only pipes paste and change events. */}
                <ContentEditable
                    className={cn(
                        "prose prose-stone h-full min-h-96 max-w-none overflow-y-auto text-[15px] leading-7 outline-none",
                        "prose-p:my-0 prose-p:min-h-[1.75rem]",
                        "prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5",
                        "prose-strong:font-semibold prose-em:italic prose-u:underline prose-s:line-through"
                    )}
                    ref={contentEditableRef}
                />
                <NotePlaceholder />
                <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
            </div>
        </>
    );
}

/**
 * Shows the "Start typing or paste a link..." hint only while the editor is
 * empty and editable, mirroring the legacy `RichTextPlugin` placeholder.
 */
function NotePlaceholder() {
    const [editor] = useLexicalComposerContext();
    const isEmpty = useLexicalIsTextContentEmpty(editor, true);
    const isEditable = useLexicalEditable();

    if (!(isEditable && isEmpty)) {
        return null;
    }

    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 text-base text-muted-foreground"
        >
            <T>Start typing or paste a link to add...</T>
        </div>
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
    isSaving,
}: NoteProps) {
    const [initialDraft, setInitialDraft] = useState<NoteDraft>(() =>
        noteDraftFromItem(note)
    );
    const [draft, setDraft] = useState<NoteDraft>(initialDraft);
    const [editorKey, setEditorKey] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    const initialDraftRef = useRef<NoteDraft>(draft);
    const latestDraftRef = useRef<NoteDraft>(draft);

    const noteId = note?.id ?? null;
    const savedNoteIdRef = useRef<string | null>(noteId);

    const updateInitialDraft = (nextDraft: NoteDraft) => {
        savedNoteIdRef.current = noteId;
        initialDraftRef.current = nextDraft;
        setInitialDraft(nextDraft);
    };

    const resetDraft = () => {
        const nextDraft = noteDraftFromItem(note);
        updateInitialDraft(nextDraft);
        latestDraftRef.current = nextDraft;
        setDraft(nextDraft);
        setEditorKey((key) => key + 1);
    };

    const syncDraftFromNote = () => {
        const nextDraft = noteDraftFromItem(note);
        const shouldPreserveLocalDraft =
            noteId !== null &&
            noteId === savedNoteIdRef.current &&
            haveDraftsChanged(
                latestDraftRef.current,
                initialDraftRef.current
            ) &&
            haveDraftsChanged(nextDraft, latestDraftRef.current);

        updateInitialDraft(nextDraft);

        if (shouldPreserveLocalDraft) {
            return;
        }

        if (!haveDraftsChanged(nextDraft, latestDraftRef.current)) {
            return;
        }

        latestDraftRef.current = nextDraft;
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
        if (open && open === prevOpen) {
            syncDraftFromNote();
        }
    }

    const handleDraftChange = (nextDraft: NoteDraft) => {
        const normalizedDraft = normalizeDraft(nextDraft);
        if (!haveDraftsChanged(normalizedDraft, latestDraftRef.current)) {
            return;
        }
        latestDraftRef.current = normalizedDraft;
        setDraft(normalizedDraft);
    };

    const handleUrlPaste = async (url: string) => {
        await onUrlPaste(url);
        resetDraft();
        await onOpenChange(false);
    };

    const shouldCreateBookmarkFromUrlPaste = () =>
        !savedNoteIdRef.current && isDraftEmpty(latestDraftRef.current);

    const saveLatestDraft = useStableCallback(async () => {
        const draftToSave = latestDraftRef.current;
        if (
            shouldCloseWithoutSaving(
                draftToSave,
                initialDraftRef.current,
                savedNoteIdRef.current !== null
            )
        ) {
            return true;
        }

        const savedNote = await onSave(draftToSave, savedNoteIdRef.current);
        if (!savedNote) {
            return false;
        }

        savedNoteIdRef.current = savedNote.id;
        initialDraftRef.current = draftToSave;
        setInitialDraft(draftToSave);

        return draftToSave.contentHtml;
    });

    const { isDirty, saveImmediately, saveStatus } = useAutosave({
        content: draft.contentHtml,
        enabled: open,
        onSave: saveLatestDraft,
        savedContent: initialDraft.contentHtml,
    });

    const handleSaveShortcut = useStableCallback((event: KeyboardEvent) => {
        if (
            event.defaultPrevented ||
            !(event.metaKey || event.ctrlKey) ||
            event.key.toLowerCase() !== "s"
        ) {
            return;
        }

        event.preventDefault();
        saveImmediately().catch((error: unknown) => {
            log.error("Unexpected note shortcut save failure", error);
        });
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const ownerDocument = getOwnerDocument(contentEditableRef?.current);
        ownerDocument.addEventListener("keydown", handleSaveShortcut);
        return () => {
            ownerDocument.removeEventListener("keydown", handleSaveShortcut);
        };
    }, [contentEditableRef, handleSaveShortcut, open]);

    const handleOpenChange = async (nextOpen: boolean) => {
        if (nextOpen) {
            onOpenChange(true);
            return;
        }

        if (isClosing || (isSaving && saveStatus !== "saving")) {
            return;
        }

        const currentDraft = latestDraftRef.current;
        const shouldSkipSave = shouldCloseWithoutSaving(
            currentDraft,
            initialDraftRef.current,
            savedNoteIdRef.current !== null
        );

        if (shouldSkipSave) {
            onOpenChange(false);
            return;
        }

        setIsClosing(true);
        try {
            const didSave = await saveImmediately();
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
    const isBusy = isSaving || isClosing;

    return (
        <NoteContext
            value={{
                contentEditableRef,
                contentHtml: draft.contentHtml,
                editorKey,
                initialDraft,
                isBusy,
                isDirty,
                onDraftChange: handleDraftChange,
                onOpenChange: handleOpenChange,
                onUrlPaste: handleUrlPaste,
                query,
                saveStatus,
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

function NoteSaveStatus() {
    const { isDirty, saveStatus } = useNoteContext();

    if (saveStatus === "saving") {
        return (
            <span
                aria-live="polite"
                className="hidden text-right text-muted-foreground text-xs sm:block"
            >
                <T>Saving...</T>
            </span>
        );
    }

    if (saveStatus === "error") {
        return (
            <span
                aria-live="polite"
                className="hidden text-right text-destructive text-xs sm:block"
            >
                <T>Not saved</T>
            </span>
        );
    }

    if (saveStatus === "saved") {
        return (
            <span
                aria-live="polite"
                className="hidden text-right text-muted-foreground text-xs sm:block"
            >
                <T>Saved</T>
            </span>
        );
    }

    if (!isDirty) {
        return null;
    }

    return (
        <span
            aria-live="polite"
            className="hidden text-right text-muted-foreground text-xs sm:block"
        >
            <T>Unsaved</T>
        </span>
    );
}

function NoteHeader() {
    const { contentHtml, onOpenChange, query, title } = useNoteContext();
    const hasQuery = query.length > 0;
    const [notionStatus, setNotionStatus] = useState<{
        message: string;
        tone: "error" | "success";
    } | null>(null);
    const [isSendingToNotion, startSendToNotion] = useTransition();

    const handleExportMarkdown = useStableCallback(() => {
        downloadMarkdownFile(contentHtml);
    });

    const handleSendToNotion = useStableCallback(() => {
        if (!(hasQuery && !isSendingToNotion)) {
            return;
        }

        setNotionStatus(null);
        startSendToNotion(async () => {
            const result = await sendNoteToNotion({
                contentHtml,
                title: getNotionNoteTitle(query),
            });

            if (result.status === "SUCCESS") {
                setNotionStatus({
                    message: "Sent to Notion.",
                    tone: "success",
                });
                openExternal(result.pageUrl);
                return;
            }

            setNotionStatus({
                message: result.message,
                tone: "error",
            });
        });
    });

    const handleClose = useStableCallback(async () => {
        await onOpenChange(false);
    });

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
                <NoteSaveStatus />
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
                                <ExportProviderMenuItem
                                    hasQuery={hasQuery}
                                    key={provider.title}
                                    provider={provider}
                                    query={query}
                                >
                                    <ProviderIcon className="size-4 text-muted-foreground" />
                                    <span className="flex-1">
                                        {provider.title}
                                    </span>
                                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                                </ExportProviderMenuItem>
                            );
                        })}
                        <MenuItem
                            disabled={!hasQuery || isSendingToNotion}
                            onClick={handleSendToNotion}
                        >
                            <NotionIcon className="size-4 text-muted-foreground" />
                            <span className="flex-1">
                                {isSendingToNotion
                                    ? "Sending to Notion..."
                                    : "Send to Notion"}
                            </span>
                            <ExternalLinkIcon className="size-4 text-muted-foreground" />
                        </MenuItem>
                        {notionStatus ? (
                            <p
                                aria-live={
                                    notionStatus.tone === "error"
                                        ? "assertive"
                                        : "polite"
                                }
                                className={cn(
                                    "px-2 py-1 text-xs leading-tight",
                                    notionStatus.tone === "error"
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                )}
                                role={
                                    notionStatus.tone === "error"
                                        ? "alert"
                                        : "status"
                                }
                            >
                                {notionStatus.message}
                            </p>
                        ) : null}
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
                        className="rounded-full"
                        onClick={handleClose}
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
 * Lexical composer that mounts the rich-text editor with a11y wiring and the
 * correct initial state for the current note.
 *
 * The root extension is rebuilt per `editorKey` (`getInitialEditorState`
 * returns content-specific state) via `useMemo`, which is safe because
 * `key={editorKey}` on `LexicalExtensionComposer` unmounts the previous
 * editor and builds a fresh one — the extension is never re-created during a
 * note session, so editor state (selection, history, focus) is preserved
 * across renders of `NoteEditor` for the same note.
 *
 * The `contentEditable` prop is intentionally null: `ContentPlugin` mounts
 * the `ContentEditable` inside a `relative` wrapper that co-locates the
 * empty-state placeholder overlay. The a11y extensions live in
 * `NOTE_EDITOR_EXTENSION`.
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

    // We only want `initialDraft`'s value at the moment the editor is built
    // (Lexical applies `$initialEditorState` once, at construction time —
    // exactly like the legacy `LexicalComposer` that created the editor in a
    // `useMemo([])` and read `initialConfig` from the first render).
    // A ref lets the memo body read the latest snapshot without putting
    // `initialDraft` in the dep list — which would rebuild the editor mid
    // session when a save commits the working draft (initialDraft would
    // change with no editorKey change) and discard focus, selection, and
    // undo history.
    const initialDraftRef = useRef(initialDraft);
    initialDraftRef.current = initialDraft;

    const extension = useMemo(
        () =>
            defineExtension({
                $initialEditorState: getInitialEditorState(
                    initialDraftRef.current
                ),
                dependencies: [NOTE_EDITOR_EXTENSION],
                // Per-session extension name (unique across remounts) so the
                // LexicalBuilder can resolve it in devtools; the *editor*
                // `namespace` (the clipboard-interchange identifier) stays
                // the shared `NOTE_EDITOR_NAMESPACE` below, so undo/redo history
                // and clipboard formats remain stable across notes.
                name: `${NOTE_EDITOR_NAMESPACE}-${editorKey}`,
                namespace: NOTE_EDITOR_NAMESPACE,
            }),
        // Rebuild only when `editorKey` changes — which forces
        // `LexicalExtensionComposer` (keyed on `editorKey`) to unmount and
        // mount a fresh editor with this extension's `$initialEditorState`.
        [editorKey]
    );

    return (
        <LexicalExtensionComposer
            contentEditable={null}
            extension={extension}
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
        </LexicalExtensionComposer>
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

function ExportProviderMenuItem({
    hasQuery,
    provider,
    query,
    children,
}: {
    hasQuery: boolean;
    provider: ExportContentProvider;
    query: string;
    children: React.ReactNode;
}) {
    const href = provider.createUrl(query);

    const renderLink = useStableCallback((props: React.ComponentProps<"a">) => (
        <a {...props} href={href} rel="noopener noreferrer" target="_blank" />
    ));

    return (
        <MenuItem disabled={!hasQuery} render={renderLink}>
            {children}
        </MenuItem>
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
