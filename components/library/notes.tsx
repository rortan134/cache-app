"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { GoogleDocsIcon, NotionIcon } from "@/components/ui/icons";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import type { LibraryItemWithCollections } from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { parseStandaloneUrl } from "@/lib/common/url";
import {
    NOTE_EMPTY_HTML,
    extractNoteText,
    isNoteSerializedEditorState,
    normalizeNoteHtml,
    serializeNoteEditorStateToHtml,
    type NoteSerializedEditorState,
} from "@/lib/integrations/notes/utils";
import AppIconSmall from "@/public/cache-icon-small.png";
import { $generateNodesFromDOM } from "@lexical/html";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
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
    SELECTION_CHANGE_COMMAND,
    mergeRegister,
    type LexicalEditor,
    type TextFormatType,
} from "lexical";
import {
    BoldIcon,
    ChevronDownIcon,
    ChevronRight,
    ExternalLinkIcon,
    ItalicIcon,
    Maximize2,
    MessageCircleIcon,
    Minimize2,
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
    type ClipboardEvent,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from "react";

interface NoteDraft {
    contentHtml: string;
    contentState: NoteSerializedEditorState | null;
}

interface NoteProps {
    children: ReactNode;
    note: LibraryItemWithCollections | null;
    onOpenChange: (open: boolean) => void | Promise<void>;
    onSave: (draft: NoteDraft) => Promise<boolean> | boolean;
    onUrlPaste: (url: string) => Promise<void> | void;
    open: boolean;
    saving: boolean;
}

interface NoteContextValue {
    editorKey: number;
    initialDraft: NoteDraft;
    isBusy: boolean;
    isExpanded: boolean;
    onDraftChange: (draft: NoteDraft) => void;
    onOpenChange: (open: boolean) => Promise<void>;
    onUrlPaste: (url: string) => Promise<void> | void;
    query: string;
    textMetrics: NoteTextMetrics;
    title: string;
    toggleExpanded: () => void;
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
    wordCount: number;
}

type NoteBlockType = "h1" | "h2" | "h3" | "paragraph";
type NoteInlineFormatStateKey = Exclude<keyof FormatState, "blockType">;

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
const NOTE_WORD_SEPARATOR = /\s+/;

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

interface ExportContentProvider {
    createUrl: (query: string) => string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
}

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

const NOTE_NON_EMPTY_BLOCK_TAG_REGEX =
    /<(h[1-3]|p)>(?!(?:\s|<br\s*\/?>)*<\/\1>)[\s\S]*?<\/\1>/gi;

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

    // If there is text but no matched block tags, treat it as a single implicit paragraph.
    const paragraphCount =
        plainText.length === 0 ? 0 : Math.max(1, matchedBlocks?.length ?? 0);

    return {
        characterCount: plainText.length,
        paragraphCount,
        plainText,
        wordCount:
            plainText.length === 0
                ? 0
                : plainText.split(NOTE_WORD_SEPARATOR).length,
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
function NoteFormattingToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [formats, setFormats] = useState<FormatState>(INITIAL_FORMAT_STATE);

    useEffect(() => {
        const updateToolbarState = () => {
            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    setFormats(INITIAL_FORMAT_STATE);
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
        <div className="-mx-2 flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-muted/35 p-1">
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
function NoteContentPlugin({
    onDraftChange,
    onUrlPaste,
}: {
    onDraftChange: (draft: NoteDraft) => void;
    onUrlPaste: (url: string) => Promise<void> | void;
}) {
    const handlePaste = async (event: ClipboardEvent<HTMLDivElement>) => {
        const pastedText = event.clipboardData.getData("text/plain");
        const parsedUrl = parseStandaloneUrl(pastedText);
        if (!parsedUrl) {
            return;
        }
        event.preventDefault();
        await onUrlPaste(parsedUrl.href);
    };

    return (
        <>
            <NoteFormattingToolbarPlugin />
            <div className="relative flex min-h-96 flex-1">
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable
                            className="prose prose-stone prose-p:my-0 prose-p:min-h-[1.75rem] max-w-none flex-1 overflow-y-auto prose-mark:rounded-sm prose-mark:bg-amber-200/90 prose-mark:px-0.5 prose-strong:font-semibold text-[15px] prose-em:italic leading-7 prose-u:underline prose-s:line-through outline-none"
                            onPaste={handlePaste}
                        />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                    placeholder={
                        <div className="pointer-events-none absolute inset-0 text-base text-muted-foreground">
                            <T>Start typing or paste a URL...</T>
                        </div>
                    }
                />
                <HistoryPlugin />
                <AutoFocusPlugin />
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
    note,
    onOpenChange,
    onSave,
    onUrlPaste,
    open,
    saving,
}: NoteProps) {
    const [draft, setDraft] = useState<NoteDraft>(() =>
        noteDraftFromItem(note)
    );
    const [editorKey, setEditorKey] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const initialDraftRef = useRef<NoteDraft>(draft);
    const latestDraftRef = useRef<NoteDraft>(draft);

    useEffect(() => {
        if (!open) {
            setIsExpanded(false);
            return;
        }

        const nextDraft = noteDraftFromItem(note);
        initialDraftRef.current = nextDraft;
        latestDraftRef.current = nextDraft;
        setDraft(nextDraft);
        setEditorKey((key) => key + 1);
    }, [note, open]);

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

    const toggleExpanded = () => setIsExpanded((prev) => !prev);

    const deferredContentHtml = useDeferredValue(draft.contentHtml);
    const textMetrics = getNoteTextMetrics(deferredContentHtml);
    const query = textMetrics.plainText;
    const title = note ? "Edit note" : "New entry";
    const isBusy = saving || isClosing;

    return (
        <NoteContext
            value={{
                editorKey,
                initialDraft: initialDraftRef.current,
                isBusy,
                isExpanded,
                onDraftChange: handleDraftChange,
                onOpenChange: handleOpenChange,
                onUrlPaste,
                query,
                textMetrics,
                title,
                toggleExpanded,
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

/**
 * Header bar with the note title, "Open in..." export menu, and panel
 * controls (expand / close).
 */
function NoteHeader() {
    const { isBusy, isExpanded, onOpenChange, query, title, toggleExpanded } =
        useNoteContext();
    const ExpandIcon = isExpanded ? Minimize2 : Maximize2;
    const hasQuery = query.length > 0;

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
                    </MenuPopup>
                </Menu>
                <Group aria-label="Panel actions">
                    <Button
                        aria-label={
                            isExpanded
                                ? "Restore note width"
                                : "Expand note width"
                        }
                        aria-pressed={isExpanded}
                        className="ml-0.5 rounded-full"
                        disabled={isBusy}
                        onClick={toggleExpanded}
                        size="icon-sm"
                        variant="secondary"
                    >
                        <ExpandIcon className="inline-block size-3.5" />
                    </Button>
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
    const { editorKey, initialDraft, onDraftChange, onUrlPaste } =
        useNoteContext();
    const initialEditorState = getInitialEditorState(initialDraft);

    return (
        <LexicalComposer
            initialConfig={{
                editorState: initialEditorState,
                namespace: NOTE_EDITOR_NAMESPACE,
                nodes: NOTE_EDITOR_NODES,
                onError(error: Error) {
                    console.error("Unexpected note editor error", error);
                },
                theme: NOTE_EDITOR_THEME,
            }}
            key={editorKey}
        >
            <NoteContentPlugin
                onDraftChange={onDraftChange}
                onUrlPaste={onUrlPaste}
            />
        </LexicalComposer>
    );
}

/**
 * Footer metrics bar showing word, paragraph, and character counts.
 */
function NoteMetrics() {
    const { textMetrics } = useNoteContext();

    return (
        <div className="flex items-center justify-end gap-4 border-border/60 border-t pt-3 text-muted-foreground text-xs">
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

/**
 * Base SVG wrapper that injects an accessible `<title>` for brand icons.
 */
function BrandIcon({
    children,
    title,
    ...props
}: SVGProps<SVGSVGElement> & { title: string; children: ReactNode }) {
    return (
        <svg role="img" xmlns="http://www.w3.org/2000/svg" {...props}>
            <title>{title}</title>
            {children}
        </svg>
    );
}

/**
 * OpenAI logo icon.
 */
function OpenAIIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <BrandIcon
            fill="currentColor"
            title="OpenAI"
            viewBox="0 0 24 24"
            {...props}
        >
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </BrandIcon>
    );
}

/**
 * Anthropic Claude logo icon.
 */
function ClaudeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <BrandIcon
            fill="currentColor"
            title="Claude"
            viewBox="0 0 12 12"
            {...props}
        >
            <path
                clipRule="evenodd"
                d="M2.3545 7.9775L4.7145 6.654L4.7545 6.539L4.7145 6.475H4.6L4.205 6.451L2.856 6.4145L1.6865 6.366L0.5535 6.305L0.268 6.2445L0 5.892L0.0275 5.716L0.2675 5.5555L0.6105 5.5855L1.3705 5.637L2.5095 5.716L3.3355 5.7645L4.56 5.892H4.7545L4.782 5.8135L4.715 5.7645L4.6635 5.716L3.4845 4.918L2.2085 4.074L1.5405 3.588L1.1785 3.3425L0.9965 3.1115L0.9175 2.6075L1.2455 2.2465L1.686 2.2765L1.7985 2.307L2.245 2.65L3.199 3.388L4.4445 4.3045L4.627 4.4565L4.6995 4.405L4.709 4.3685L4.627 4.2315L3.9495 3.0085L3.2265 1.7635L2.9045 1.2475L2.8195 0.938C2.78711 0.819128 2.76965 0.696687 2.7675 0.5735L3.1415 0.067L3.348 0L3.846 0.067L4.056 0.249L4.366 0.956L4.867 2.0705L5.6445 3.5855L5.8725 4.0345L5.994 4.4505L6.0395 4.578H6.1185V4.505L6.1825 3.652L6.301 2.6045L6.416 1.257L6.456 0.877L6.644 0.422L7.0175 0.176L7.3095 0.316L7.5495 0.6585L7.516 0.8805L7.373 1.806L7.0935 3.2575L6.9115 4.2285H7.0175L7.139 4.1075L7.6315 3.4545L8.4575 2.4225L8.8225 2.0125L9.2475 1.5605L9.521 1.345H10.0375L10.4175 1.9095L10.2475 2.4925L9.7155 3.166L9.275 3.737L8.643 4.587L8.248 5.267L8.2845 5.322L8.3785 5.312L9.8065 5.009L10.578 4.869L11.4985 4.7115L11.915 4.9055L11.9605 5.103L11.7965 5.5065L10.812 5.7495L9.6575 5.9805L7.938 6.387L7.917 6.402L7.9415 6.4325L8.716 6.5055L9.047 6.5235H9.858L11.368 6.636L11.763 6.897L12 7.216L11.9605 7.4585L11.353 7.7685L10.533 7.574L8.6185 7.119L7.9625 6.9545H7.8715V7.0095L8.418 7.5435L9.421 8.4485L10.6755 9.6135L10.739 9.9025L10.578 10.13L10.408 10.1055L9.3055 9.277L8.88 8.9035L7.917 8.0935H7.853V8.1785L8.075 8.503L9.2475 10.2635L9.3085 10.8035L9.2235 10.98L8.9195 11.0865L8.5855 11.0255L7.8985 10.063L7.191 8.9795L6.6195 8.008L6.5495 8.048L6.2125 11.675L6.0545 11.86L5.69 12L5.3865 11.7695L5.2255 11.396L5.3865 10.658L5.581 9.696L5.7385 8.931L5.8815 7.981L5.9665 7.665L5.9605 7.644L5.8905 7.653L5.1735 8.6365L4.0835 10.109L3.2205 11.0315L3.0135 11.1135L2.655 10.9285L2.6885 10.5975L2.889 10.303L4.083 8.785L4.803 7.844L5.268 7.301L5.265 7.222H5.2375L2.066 9.28L1.501 9.353L1.2575 9.125L1.288 8.752L1.4035 8.6305L2.3575 7.9745L2.3545 7.9775Z"
                fillRule="evenodd"
            />
        </BrandIcon>
    );
}

/**
 * Cursor IDE logo icon.
 */
function CursorIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <BrandIcon title="Cursor" viewBox="0 0 466.73 532.09" {...props}>
            <path
                d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"
                fill="currentColor"
            />
        </BrandIcon>
    );
}

/**
 * Scira AI logo icon.
 */
function SciraIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <BrandIcon
            fill="none"
            title="Scira AI"
            viewBox="0 0 910 934"
            {...props}
        >
            <path
                d="M647.664 197.775C569.13 189.049 525.5 145.419 516.774 66.8849C508.048 145.419 464.418 189.049 385.884 197.775C464.418 206.501 508.048 250.131 516.774 328.665C525.5 250.131 569.13 206.501 647.664 197.775Z"
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="8"
            />
            <path
                d="M516.774 304.217C510.299 275.491 498.208 252.087 480.335 234.214C462.462 216.341 439.058 204.251 410.333 197.775C439.059 191.3 462.462 179.209 480.335 161.336C498.208 143.463 510.299 120.06 516.774 91.334C523.25 120.059 535.34 143.463 553.213 161.336C571.086 179.209 594.49 191.3 623.216 197.775C594.49 204.251 571.086 216.341 553.213 234.214C535.34 252.087 523.25 275.491 516.774 304.217Z"
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="8"
            />
            <path
                d="M857.5 508.116C763.259 497.644 710.903 445.288 700.432 351.047C689.961 445.288 637.605 497.644 543.364 508.116C637.605 518.587 689.961 570.943 700.432 665.184C710.903 570.943 763.259 518.587 857.5 508.116Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="20"
            />
            <path
                d="M700.432 615.957C691.848 589.05 678.575 566.357 660.383 548.165C642.191 529.973 619.499 516.7 592.593 508.116C619.499 499.533 642.191 486.258 660.383 468.066C678.575 449.874 691.848 427.181 700.432 400.274C709.015 427.181 722.289 449.874 740.481 468.066C758.673 486.258 781.365 499.533 808.271 508.116C781.365 516.7 758.673 529.973 740.481 548.165C722.289 566.357 709.015 589.05 700.432 615.957Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="20"
            />
            <path
                d="M889.949 121.237C831.049 114.692 798.326 81.9698 791.782 23.0692C785.237 81.9698 752.515 114.692 693.614 121.237C752.515 127.781 785.237 160.504 791.782 219.404C798.326 160.504 831.049 127.781 889.949 121.237Z"
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="8"
            />
            <path
                d="M791.782 196.795C786.697 176.937 777.869 160.567 765.16 147.858C752.452 135.15 736.082 126.322 716.226 121.237C736.082 116.152 752.452 107.324 765.16 94.6152C777.869 81.9065 786.697 65.5368 791.782 45.6797C796.867 65.5367 805.695 81.9066 818.403 94.6152C831.112 107.324 847.481 116.152 867.338 121.237C847.481 126.322 831.112 135.15 818.403 147.858C805.694 160.567 796.867 176.937 791.782 196.795Z"
                fill="currentColor"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="8"
            />
            <path
                d="M760.632 764.337C720.719 814.616 669.835 855.1 611.872 882.692C553.91 910.285 490.404 924.255 426.213 923.533C362.022 922.812 298.846 907.419 241.518 878.531C184.19 849.643 134.228 808.026 95.4548 756.863C56.6815 705.7 30.1238 646.346 17.8129 583.343C5.50207 520.339 7.76433 455.354 24.4266 393.359C41.089 331.364 71.7099 274.001 113.947 225.658C156.184 177.315 208.919 139.273 268.117 114.442"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="30"
            />
        </BrandIcon>
    );
}

/**
 * Vercel v0 logo icon.
 */
function V0Icon(props: SVGProps<SVGSVGElement>) {
    return (
        <BrandIcon
            fill="currentColor"
            title="v0"
            viewBox="0 0 147 70"
            {...props}
        >
            <path d="M56 50.2031V14H70V60.1562C70 65.5928 65.5928 70 60.1562 70C57.5605 70 54.9982 68.9992 53.1562 67.1573L0 14H19.7969L56 50.2031Z" />
            <path d="M147 56H133V23.9531L100.953 56H133V70H96.6875C85.8144 70 77 61.1856 77 50.3125V14H91V46.1562L123.156 14H91V0H127.312C138.186 0 147 8.81439 147 19.6875V56Z" />
        </BrandIcon>
    );
}
