"use client";

import {
    useCollectionsContext,
    useLibraryItemsContext,
} from "@/components/library/collections";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFieldError,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { LibraryCollectionSummary } from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    createMarkdownImport,
    importMarkdownBatch,
    listMarkdownImports,
} from "@/lib/integrations/markdown/actions";
import type { MarkdownImportResult } from "@/lib/integrations/markdown/service";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { FileText, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createStore } from "stan-js";

const log = createLogger("library:markdown-import-dialog");

const { useStore: useMarkdownImportStore, actions: mdImportStoreActions } =
    createStore({
        isOpen: false,
    });

export function openMarkdownImportDialog() {
    mdImportStoreActions.setIsOpen(true);
}

type ImportStep = "choose" | "create-new" | "pick-files" | "importing" | "done";

interface ImportFileEntry {
    markdown: string;
    relativePath: string;
}

const MARKDOWN_FILE_EXTENSIONS = [".md", ".markdown"];
const MAX_FILE_SIZE_BYTES = 500_000;
const MAX_FILES_PER_BATCH = 100;
const MAX_BATCH_BYTES = 3_000_000;
const BATCH_IMPORT_FAILURE_MESSAGE = "We couldn't import these files.";
const FILE_SIZE_SKIP_MESSAGE = `Exceeds the ${(MAX_FILE_SIZE_BYTES / 1000).toFixed(0)} KB file size limit.`;
const EMPTY_FILE_SKIP_MESSAGE = "This file is empty.";

interface SkippedFilePath {
    message: string;
    relativePath: string;
}

export function MarkdownImportDialog() {
    const { isOpen, setIsOpen } = useMarkdownImportStore();

    const [step, setStep] = React.useState<ImportStep>("choose");
    const [imports, setImports] = React.useState<
        Array<{ id: string; name: string; createdAt: Date }>
    >([]);
    const [selectedImportId, setSelectedImportId] = React.useState<
        string | null
    >(null);
    const [newImportName, setNewImportName] = React.useState("");
    const [files, setFiles] = React.useState<ImportFileEntry[]>([]);
    const [sourceCount, setSourceCount] = React.useState(0);
    const [result, setResult] = React.useState<MarkdownImportResult | null>(
        null
    );
    const [isLoading, startLoading] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [skippedFiles, setSkippedFiles] = React.useState<SkippedFilePath[]>(
        []
    );
    const { replaceCollections } = useCollectionsContext();
    const { mergeImportedItems: mergeLibraryItems } = useLibraryItemsContext();
    const router = useRouter();
    const importSessionIdRef = React.useRef(0);
    const createSubmissionPendingRef = React.useRef(false);
    const importSubmissionPendingRef = React.useRef(false);

    const loadImports = useStableCallback(() => {
        startLoading(async () => {
            try {
                const response = await listMarkdownImports();
                if (response.status === "SUCCESS") {
                    setImports(response.data);
                } else {
                    log.error("Failed to load imports", response);
                }
            } catch (err) {
                log.error("Failed to load imports unexpectedly", err);
            }
        });
    });

    const resetDialog = useStableCallback(() => {
        importSessionIdRef.current += 1;
        importSubmissionPendingRef.current = false;
        createSubmissionPendingRef.current = false;
        setStep("choose");
        setSelectedImportId(null);
        setNewImportName("");
        setFiles([]);
        setSourceCount(0);
        setResult(null);
        setErrorMessage(null);
        setSkippedFiles([]);
    });

    const handleOpenChange = useStableCallback((open: boolean) => {
        setIsOpen(open);
        if (open) {
            loadImports();
        } else {
            resetDialog();
        }
    });

    const handleCreateNew = useStableCallback(() => {
        setStep("create-new");
    });

    const handleCreateAndSelectFiles = useStableCallback(() => {
        const trimmed = newImportName.trim();
        if (!trimmed) {
            setErrorMessage("Enter a name for this import.");
            return;
        }
        if (createSubmissionPendingRef.current) {
            return;
        }

        setErrorMessage(null);
        createSubmissionPendingRef.current = true;
        startLoading(async () => {
            try {
                const response = await createMarkdownImport({ name: trimmed });
                if (response.status === "SUCCESS") {
                    setSelectedImportId(response.data.id);
                    setImports((prev) => [
                        ...prev,
                        {
                            createdAt: new Date(),
                            id: response.data.id,
                            name: trimmed,
                        },
                    ]);
                    setStep("pick-files");
                } else {
                    setErrorMessage(response.message);
                }
            } catch (err) {
                log.error("Failed to create import", err);
                setErrorMessage("We couldn't create this import.");
            } finally {
                createSubmissionPendingRef.current = false;
            }
        });
    });

    const handleSelectExisting = useStableCallback((id: string) => {
        setSelectedImportId(id);
        setStep("pick-files");
    });

    const handleEntriesReady = useStableCallback(
        (entries: ImportFileEntry[], skipped: SkippedFilePath[]) => {
            setSkippedFiles(skipped);
            setFiles(entries);
            setSourceCount(entries.length);
            if (entries.length === 0) {
                setErrorMessage(
                    skipped.length > 0
                        ? "None of the files there can be imported. Check the file sizes and content."
                        : "No Markdown files found there. Choose a folder that contains .md or .markdown files."
                );
            }
        }
    );

    const handlePickFiles = useStableCallback(async () => {
        setErrorMessage(null);
        try {
            const { directoryOpen, fileOpen, supported } = await import(
                "browser-fs-access"
            );

            if (!supported) {
                const openedFiles = await fileOpen({
                    extensions: MARKDOWN_FILE_EXTENSIONS,
                    mimeTypes: ["text/markdown", "text/plain"],
                    multiple: true,
                });
                const picked = Array.isArray(openedFiles)
                    ? openedFiles
                    : [openedFiles];
                const { entries, skippedPaths } = await readMarkdownFileEntries(
                    picked,
                    false
                );
                handleEntriesReady(entries, skippedPaths);
                return;
            }

            const dirFiles = await directoryOpen({ recursive: true });
            const { entries, skippedPaths } = await readMarkdownFileEntries(
                dirFiles,
                true
            );
            handleEntriesReady(entries, skippedPaths);
        } catch (error) {
            if (isPickerAbortError(error)) {
                return;
            }
            log.error("Failed to pick Markdown files", error);
            setErrorMessage("We couldn't open those files. Try again.");
        }
    });

    const handleImport = useStableCallback(async () => {
        if (!selectedImportId || files.length === 0) {
            return;
        }
        if (importSubmissionPendingRef.current) {
            return;
        }

        importSubmissionPendingRef.current = true;

        try {
            const sessionId = importSessionIdRef.current + 1;
            importSessionIdRef.current = sessionId;
            setStep("importing");

            const aggregatedResult: MarkdownImportResult = {
                createdCount: 0,
                errors: [],
                failedCount: 0,
                items: [],
                skipped: [],
                skippedCount: 0,
                unsupportedReport: {
                    htmlCount: 0,
                    imageCount: 0,
                    tableCount: 0,
                    taskListCount: 0,
                },
                updatedCount: 0,
            };

            for (const skippedFile of skippedFiles) {
                aggregatedResult.skippedCount += 1;
                aggregatedResult.skipped.push(skippedFile);
            }

            let collectionsFromImport: LibraryCollectionSummary[] | null = null;

            for (const batch of buildImportBatches(files)) {
                try {
                    const response = await importMarkdownBatch({
                        files: batch,
                        importId: selectedImportId,
                    });

                    if (response.status === "SUCCESS") {
                        const data = response.data;
                        aggregatedResult.createdCount += data.createdCount;
                        aggregatedResult.updatedCount += data.updatedCount;
                        aggregatedResult.skippedCount += data.skippedCount;
                        aggregatedResult.failedCount += data.failedCount;
                        aggregatedResult.items.push(...data.items);
                        aggregatedResult.skipped.push(...data.skipped);
                        aggregatedResult.errors.push(...data.errors);
                        aggregatedResult.unsupportedReport.imageCount +=
                            data.unsupportedReport.imageCount;
                        aggregatedResult.unsupportedReport.tableCount +=
                            data.unsupportedReport.tableCount;
                        aggregatedResult.unsupportedReport.htmlCount +=
                            data.unsupportedReport.htmlCount;
                        aggregatedResult.unsupportedReport.taskListCount +=
                            data.unsupportedReport.taskListCount;
                        collectionsFromImport = data.collections;
                    } else {
                        for (const file of batch) {
                            aggregatedResult.failedCount += 1;
                            aggregatedResult.errors.push({
                                message: response.message,
                                relativePath: file.relativePath,
                            });
                        }
                    }
                } catch (err) {
                    log.error("Failed to import markdown batch", err);
                    for (const file of batch) {
                        aggregatedResult.failedCount += 1;
                        aggregatedResult.errors.push({
                            message: BATCH_IMPORT_FAILURE_MESSAGE,
                            relativePath: file.relativePath,
                        });
                    }
                }
            }

            if (aggregatedResult.items.length > 0) {
                mergeLibraryItems(aggregatedResult.items);
            }
            if (collectionsFromImport !== null) {
                replaceCollections(collectionsFromImport);
            }
            router.refresh();

            if (importSessionIdRef.current === sessionId) {
                setResult(aggregatedResult);
                setStep("done");
            }
        } finally {
            importSubmissionPendingRef.current = false;
        }
    });

    const handleNewImportKeyDown = useStableCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                handleCreateAndSelectFiles();
            }
        }
    );

    const handleNewImportChange = useStableCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setNewImportName(e.target.value);
        }
    );

    const handleBack = useStableCallback(() => {
        if (step === "create-new" || step === "pick-files") {
            setStep("choose");
            setFiles([]);
            setSkippedFiles([]);
            setSourceCount(0);
            setErrorMessage(null);
        }
    });

    const stepTitle = (() => {
        switch (step) {
            case "choose":
                return "Import Markdown files";
            case "create-new":
                return "New import";
            case "pick-files":
                return "Select files";
            case "importing":
                return "Importing...";
            case "done":
                return "Import complete";
            default:
                return "";
        }
    })();

    const stepDescription = (() => {
        switch (step) {
            case "choose":
                return "Create a new import namespace or choose an existing one. Each namespace keeps imports from a folder separate.";
            case "create-new":
                return 'Name this import. For example, "Obsidian vault", "Bear notes", or "Research papers".';
            case "pick-files":
                return "Choose a folder or .md files to import. Nested folders create matching collections.";
            case "done":
                return result ? buildResultSummary(result) : "";
            default:
                return "";
        }
    })();

    const renderChooseStep = (
        <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
                {imports.length === 0 && !isLoading && (
                    <p className="px-1 py-4 text-center text-muted-foreground text-sm">
                        No previous imports.
                    </p>
                )}
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-4 animate-spin" />
                    </div>
                ) : null}
                {imports.map((imp) => (
                    <ImportItemButton
                        id={imp.id}
                        key={imp.id}
                        name={imp.name}
                        onSelect={handleSelectExisting}
                    />
                ))}
            </div>
            <div className="-mx-6 border-t" />
            <Button
                className="gap-2"
                onClick={handleCreateNew}
                size="sm"
                variant="ghost"
            >
                <Plus className="size-4" />
                New import
            </Button>
        </div>
    );

    const renderCreateNewStep = (
        <div className="flex flex-col gap-3 py-2">
            <Input
                onChange={handleNewImportChange}
                onKeyDown={handleNewImportKeyDown}
                placeholder='e.g. "Obsidian vault"'
                value={newImportName}
            />
            {errorMessage ? (
                <DialogFieldError>{errorMessage}</DialogFieldError>
            ) : null}
            <Button
                disabled={isLoading || !newImportName.trim()}
                isLoading={isLoading}
                onClick={handleCreateAndSelectFiles}
                size="sm"
            >
                Create and select files
            </Button>
        </div>
    );

    const renderPickFilesStep = (
        <div className="flex flex-col gap-3 py-2">
            <Button onClick={handlePickFiles} size="sm">
                Choose folder or files
            </Button>
            {errorMessage ? (
                <DialogFieldError>{errorMessage}</DialogFieldError>
            ) : null}
        </div>
    );

    const renderImportingStep = (
        <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-muted-foreground text-sm">
                Importing {sourceCount} file
                {sourceCount === 1 ? "" : "s"}...
            </span>
        </div>
    );

    const renderDoneStep = result !== null && (
        <div className="flex flex-col gap-2 py-2 text-sm">
            <p>
                <strong>{result.createdCount}</strong> created
                {result.updatedCount > 0 && (
                    <span>
                        , <strong>{result.updatedCount}</strong> updated
                    </span>
                )}
                {result.skippedCount > 0 && (
                    <span>
                        , <strong>{result.skippedCount}</strong> skipped
                    </span>
                )}
                {result.failedCount > 0 && (
                    <span>
                        , <strong>{result.failedCount}</strong> failed
                    </span>
                )}
            </p>
            {result.unsupportedReport.imageCount > 0 && (
                <p className="text-muted-foreground">
                    {result.unsupportedReport.imageCount} image
                    {result.unsupportedReport.imageCount === 1 ? "" : "s"}{" "}
                    skipped (alt text preserved)
                </p>
            )}
            {result.unsupportedReport.tableCount > 0 && (
                <p className="text-muted-foreground">
                    {result.unsupportedReport.tableCount} table
                    {result.unsupportedReport.tableCount === 1 ? "" : "s"}{" "}
                    skipped (text preserved)
                </p>
            )}
            {result.unsupportedReport.htmlCount > 0 && (
                <p className="text-muted-foreground">
                    {result.unsupportedReport.htmlCount} raw HTML block
                    {result.unsupportedReport.htmlCount === 1 ? "" : "s"}{" "}
                    skipped
                </p>
            )}
            {result.unsupportedReport.taskListCount > 0 && (
                <p className="text-muted-foreground">
                    {result.unsupportedReport.taskListCount} task-list item
                    {result.unsupportedReport.taskListCount === 1 ? "" : "s"}{" "}
                    rendered as text markers
                </p>
            )}
            {result.skipped.length > 0 && (
                <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground text-xs">
                        {result.skipped.length} file
                        {result.skipped.length === 1 ? "" : "s"} left out
                    </summary>
                    <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-muted-foreground text-xs">
                        {result.skipped.map((skippedFile) => (
                            <li
                                key={`${skippedFile.relativePath}-${skippedFile.message}`}
                            >
                                <code>{skippedFile.relativePath}</code>:{" "}
                                {skippedFile.message}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            {result.errors.length > 0 && (
                <details className="mt-1">
                    <summary className="cursor-pointer text-destructive text-xs">
                        {result.errors.length} error
                        {result.errors.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-muted-foreground text-xs">
                        {result.errors.map(
                            (err: {
                                relativePath: string;
                                message: string;
                            }) => (
                                <li key={`${err.relativePath}-${err.message}`}>
                                    <code>{err.relativePath}</code>:{" "}
                                    {err.message}
                                </li>
                            )
                        )}
                    </ul>
                </details>
            )}
        </div>
    );

    const renderFooter = () => {
        if (step === "done") {
            return (
                <DialogClose render={<Button size="sm" />}>Done</DialogClose>
            );
        }

        if (step === "importing") {
            return null;
        }

        return (
            <>
                {step !== "choose" && (
                    <Button onClick={handleBack} size="sm" variant="ghost">
                        Back
                    </Button>
                )}
                {step === "pick-files" && files.length > 0 && (
                    <Button onClick={handleImport} size="sm">
                        Import {files.length} file
                        {files.length === 1 ? "" : "s"}
                    </Button>
                )}
            </>
        );
    };

    return (
        <Dialog onOpenChange={handleOpenChange} open={isOpen}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>{stepTitle}</DialogTitle>
                    <DialogDescription>{stepDescription}</DialogDescription>
                </DialogHeader>

                <DialogPanel>
                    {step === "choose" && renderChooseStep}
                    {step === "create-new" && renderCreateNewStep}
                    {step === "pick-files" && renderPickFilesStep}
                    {step === "importing" && renderImportingStep}
                    {step === "done" && renderDoneStep}
                </DialogPanel>

                <DialogFooter>{renderFooter()}</DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}

function ImportItemButton({
    id,
    name,
    onSelect,
}: {
    id: string;
    name: string;
    onSelect: (id: string) => void;
}) {
    const handleClick = useStableCallback(() => onSelect(id));

    return (
        <Button
            className="justify-start gap-2 text-left!"
            onClick={handleClick}
            size="sm"
            variant="ghost"
        >
            <FileText className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{name}</span>
        </Button>
    );
}

function buildResultSummary(result: MarkdownImportResult): string {
    const parts: string[] = [];
    if (result.createdCount > 0) {
        parts.push(`${result.createdCount} created`);
    }
    if (result.updatedCount > 0) {
        parts.push(`${result.updatedCount} updated`);
    }
    if (result.skippedCount > 0) {
        parts.push(`${result.skippedCount} skipped`);
    }
    if (result.failedCount > 0) {
        parts.push(`${result.failedCount} failed`);
    }
    return parts.length > 0
        ? `Import finished: ${parts.join(", ")}.`
        : "Import finished with no changes.";
}

function isMarkdownFile(fileName: string): boolean {
    return MARKDOWN_FILE_EXTENSIONS.some((extension) =>
        fileName.endsWith(extension)
    );
}

function getFileRelativePath(file: File): string {
    return (
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name
    );
}

async function readMarkdownFileEntries(
    files: File[],
    stripRootSegment: boolean
): Promise<{ entries: ImportFileEntry[]; skippedPaths: SkippedFilePath[] }> {
    const entries: ImportFileEntry[] = [];
    const skippedPaths: SkippedFilePath[] = [];
    for (const file of files) {
        if (!isMarkdownFile(file.name)) {
            continue;
        }
        let relativePath = getFileRelativePath(file);
        if (stripRootSegment) {
            relativePath = relativePath.split("/").slice(1).join("/");
        }
        const resolvedPath = relativePath || file.name;
        if (file.size > MAX_FILE_SIZE_BYTES) {
            skippedPaths.push({
                message: FILE_SIZE_SKIP_MESSAGE,
                relativePath: resolvedPath,
            });
            continue;
        }
        const markdown = await file.text();
        if (markdown.trim().length === 0) {
            skippedPaths.push({
                message: EMPTY_FILE_SKIP_MESSAGE,
                relativePath: resolvedPath,
            });
            continue;
        }
        entries.push({ markdown, relativePath: resolvedPath });
    }
    return { entries, skippedPaths };
}

function buildImportBatches(files: ImportFileEntry[]): ImportFileEntry[][] {
    const batches: ImportFileEntry[][] = [];
    let currentBatch: ImportFileEntry[] = [];
    let currentBatchBytes = 0;
    for (const file of files) {
        const fileBytes = new TextEncoder().encode(file.markdown).length;
        if (
            currentBatch.length > 0 &&
            (currentBatch.length >= MAX_FILES_PER_BATCH ||
                currentBatchBytes + fileBytes > MAX_BATCH_BYTES)
        ) {
            batches.push(currentBatch);
            currentBatch = [];
            currentBatchBytes = 0;
        }
        currentBatch.push(file);
        currentBatchBytes += fileBytes;
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    return batches;
}

function isPickerAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
}
