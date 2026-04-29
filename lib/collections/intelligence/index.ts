import "server-only";

import { COLLECTION_NAME_MAX_LENGTH } from "@/lib/collections/utils";

import { serverEnv } from "@/env/server";
import { GenAiProtectionError } from "@/lib/collections/intelligence/error";
import {
    estimateGenAiTokens,
    protectGenAiRequest,
} from "@/lib/collections/intelligence/protection";
import { resolveCobaltDownloadUrl } from "@/lib/common/cobalt";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    decodeHtmlEntities,
    normalizeCollectionName,
    normalizeWhitespace,
} from "@/lib/common/strings";
import { isHttpUrl } from "@/lib/common/url";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    ApiError,
    createPartFromText,
    createPartFromUri,
    FileState,
    GoogleGenAI,
    type Part,
} from "@google/genai";
import { randomUUID } from "node:crypto";
import { open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import * as z from "zod";

const log = createLogger("library:smart-collections");
const SMART_COLLECTIONS_DEFAULT_MODEL = "gemini-2.5-flash";
const SMART_COLLECTIONS_FALLBACK_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
] as const;
const SMART_COLLECTIONS_MAX_APPLY_COLLECTIONS = 4;
const SMART_COLLECTIONS_MAX_NEW_COLLECTIONS = 2;
const SMART_COLLECTIONS_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const SMART_COLLECTIONS_MAX_TEXT_LENGTH = 12_000;
const SMART_COLLECTIONS_FILE_READY_ATTEMPTS = 20;
const SMART_COLLECTIONS_FILE_READY_DELAY_MS = 1500;
const SMART_COLLECTIONS_FETCH_TIMEOUT_MS = 20_000;
const SMART_COLLECTIONS_MODEL_TIMEOUT_MS = 45_000;
const HTML_TITLE_PATTERN = /<title[^>]*>([\s\S]*?)<\/title>/i;
const HTML_DESCRIPTION_PATTERN =
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i;

const SmartCollectionDecisionSchema = z.object({
    applyCollectionNames: z
        .array(z.string().trim().min(1))
        .max(SMART_COLLECTIONS_MAX_APPLY_COLLECTIONS),
    createCollectionNames: z
        .array(z.string().trim().min(1).max(COLLECTION_NAME_MAX_LENGTH))
        .max(SMART_COLLECTIONS_MAX_NEW_COLLECTIONS),
});

const smartCollectionDecisionJsonSchema = (() => {
    const { $schema: _ignoredSchema, ...schema } = z.toJSONSchema(
        SmartCollectionDecisionSchema
    ) as Record<string, unknown>;

    return schema;
})();

type SmartCollectionDecision = z.infer<typeof SmartCollectionDecisionSchema>;

interface SmartCollectionCatalogEntry {
    description: string | null;
    id: string;
    name: string;
    nameKey: string;
}

interface SmartCollectionItem {
    caption: string | null;
    collections: Array<{
        id: string;
        name: string;
    }>;
    id: string;
    kind: "bookmark" | "folder" | "note";
    source: LibraryItemSource;
    sourceMetadata: unknown;
    thumbnailUrl: string | null;
    url: string;
}

interface DownloadedRemoteAsset {
    cleanup: () => Promise<void>;
    mimeType: string;
    path: string;
    sourceUrl: string;
}

interface SmartCollectionAttachment {
    cleanup?: () => Promise<void>;
    parts: Part[];
    protectionText?: string;
}

interface SmartCollectionsModelErrorInfo {
    details?: unknown;
    message: string;
    status: number | null;
}

function resolveGeminiApiKey(): string | null {
    return serverEnv.GEMINI_API_KEY ?? null;
}

function resolveSmartCollectionsModels(): string[] {
    return [
        ...new Set(
            [
                SMART_COLLECTIONS_DEFAULT_MODEL,
                ...SMART_COLLECTIONS_FALLBACK_MODELS,
            ].filter((model): model is string =>
                Boolean(model && model.length > 0)
            )
        ),
    ];
}

function getSmartCollectionsModelErrorInfo(
    error: unknown
): SmartCollectionsModelErrorInfo {
    if (error instanceof ApiError) {
        return {
            message: error.message,
            status: error.status,
        };
    }

    if (error instanceof z.ZodError) {
        return {
            details: error.flatten(),
            message:
                "Smart collections response did not match the expected schema.",
            status: null,
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            status: null,
        };
    }

    return {
        message: "Unknown model response error",
        status: null,
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMimeType(value: string | null | undefined): string | null {
    const normalized = value?.split(";")[0]?.trim().toLocaleLowerCase();
    return normalized && normalized.length > 0 ? normalized : null;
}

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
    "application/json": ".json",
    "application/pdf": ".pdf",
    "application/xml": ".xml",
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "text/csv": ".csv",
    "text/html": ".html",
    "text/plain": ".txt",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
};

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
    ".avif": "image/avif",
    ".csv": "text/csv",
    ".gif": "image/gif",
    ".htm": "text/html",
    ".html": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".mov": "video/quicktime",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".xml": "application/xml",
};

function inferMimeTypeFromUrl(url: string): string | null {
    try {
        const extension = extname(new URL(url).pathname).toLocaleLowerCase();
        return EXTENSION_TO_MIME_TYPE[extension] ?? null;
    } catch {
        return null;
    }
}

function tempExtensionForMimeType(mimeType: string): string {
    return MIME_TYPE_TO_EXTENSION[mimeType] ?? ".bin";
}

function extractHtmlContent(input: string): string {
    const title = input.match(HTML_TITLE_PATTERN)?.[1]?.trim() ?? "";
    const description =
        input.match(HTML_DESCRIPTION_PATTERN)?.[1]?.trim() ?? "";
    const body = input
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ");

    return normalizeWhitespace(
        decodeHtmlEntities(
            [
                title && `Title: ${title}`,
                description && `Description: ${description}`,
                body,
            ]
                .filter(Boolean)
                .join("\n")
        )
    );
}

function extractTextContent(input: string, mimeType: string): string {
    if (
        mimeType === "text/html" ||
        mimeType === "application/xhtml+xml" ||
        mimeType === "application/xml"
    ) {
        return extractHtmlContent(input);
    }

    return normalizeWhitespace(input);
}

function isTextLikeMimeType(mimeType: string): boolean {
    return (
        mimeType.startsWith("text/") ||
        mimeType === "application/json" ||
        mimeType === "application/ld+json" ||
        mimeType === "application/xml" ||
        mimeType === "application/xhtml+xml"
    );
}

function isTaggableItem(item: SmartCollectionItem): boolean {
    return (
        item.kind === "bookmark" && item.source !== LibraryItemSource.cache_note
    );
}

function sourceLabel(source: LibraryItemSource): string {
    switch (source) {
        case LibraryItemSource.cache_note:
            return "Note";
        case LibraryItemSource.chrome_bookmarks:
            return "Chrome bookmark";
        case LibraryItemSource.github_starred_repositories:
            return "GitHub repository";
        case LibraryItemSource.google_photos:
            return "Google Photos item";
        case LibraryItemSource.instagram:
            return "Instagram save";
        case LibraryItemSource.other:
            return "Saved item";
        case LibraryItemSource.pinterest:
            return "Pinterest pin";
        case LibraryItemSource.tiktok:
            return "TikTok favorite";
        case LibraryItemSource.x_bookmarks:
            return "X bookmark";
        case LibraryItemSource.youtube_watch_later:
            return "YouTube video";
        default:
            return "Saved item";
    }
}

function summarizeJson(value: unknown, maxLength = 1500): string {
    if (!value) {
        return "";
    }

    try {
        const serialized = JSON.stringify(value);
        if (!serialized) {
            return "";
        }
        return serialized.length > maxLength
            ? `${serialized.slice(0, maxLength)}…`
            : serialized;
    } catch {
        return "";
    }
}

function buildPrompt(
    item: SmartCollectionItem,
    collections: SmartCollectionCatalogEntry[]
): string {
    const currentCollectionNames = item.collections.map(
        (collection) => collection.name
    );
    const collectionCatalog = collections.map((collection) => ({
        description: collection.description,
        name: collection.name,
    }));
    const sourceMetadata = summarizeJson(item.sourceMetadata);

    return [
        "Classify this single saved library item into user collections.",
        "Return strict JSON only.",
        "Always return both arrays, even when they are empty.",
        "Use applyCollectionNames only for exact matches from AVAILABLE_COLLECTIONS.",
        "Prefer existing collections over creating new ones.",
        `Choose at most ${SMART_COLLECTIONS_MAX_APPLY_COLLECTIONS} existing collections and at most ${SMART_COLLECTIONS_MAX_NEW_COLLECTIONS} new collections.`,
        "Create a new collection only if it is clearly reusable for future items and not a near-duplicate of an existing collection.",
        "Avoid vague names like Misc, Random, or Interesting.",
        "",
        `Item source: ${sourceLabel(item.source)}`,
        `Item URL: ${item.url}`,
        `Item caption: ${item.caption ?? "None"}`,
        `Item thumbnail URL: ${item.thumbnailUrl ?? "None"}`,
        `Already assigned collections: ${currentCollectionNames.length > 0 ? currentCollectionNames.join(", ") : "None"}`,
        sourceMetadata.length > 0
            ? `Item source metadata: ${sourceMetadata}`
            : "",
        "",
        "AVAILABLE_COLLECTIONS:",
        JSON.stringify(collectionCatalog),
    ]
        .filter((segment) => segment.length > 0)
        .join("\n");
}

async function downloadRemoteAsset(
    url: string
): Promise<DownloadedRemoteAsset | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        SMART_COLLECTIONS_FETCH_TIMEOUT_MS
    );

    try {
        const response = await fetch(url, {
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,video/*,application/pdf,*/*;q=0.8",
            },
            redirect: "follow",
            signal: controller.signal,
        });

        if (!(response.ok && response.body)) {
            return null;
        }

        const mimeType =
            normalizeMimeType(response.headers.get("content-type")) ??
            inferMimeTypeFromUrl(response.url || url) ??
            "application/octet-stream";
        const filePath = join(
            /* turbopackIgnore: true */ tmpdir(),
            `cache-smart-collections-${randomUUID()}${tempExtensionForMimeType(mimeType)}`
        );
        const fileHandle = await open(
            /* turbopackIgnore: true */ filePath,
            "w"
        );
        const reader = response.body.getReader();
        let downloadedBytes = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                if (!value) {
                    continue;
                }

                downloadedBytes += value.byteLength;
                if (downloadedBytes > SMART_COLLECTIONS_MAX_DOWNLOAD_BYTES) {
                    await reader.cancel(
                        "Smart collections asset exceeded the maximum download size."
                    );
                    await fileHandle.close();
                    await rm(/* turbopackIgnore: true */ filePath, {
                        force: true,
                    });
                    return null;
                }

                await fileHandle.write(value);
            }
        } finally {
            await fileHandle.close();
        }

        return {
            cleanup: async () => {
                await rm(/* turbopackIgnore: true */ filePath, {
                    force: true,
                });
            },
            mimeType,
            path: filePath,
            sourceUrl: response.url || url,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function waitForGeminiFile(
    ai: GoogleGenAI,
    file: {
        error?: { message?: string } | null;
        mimeType?: string;
        name?: string;
        state?: FileState;
        uri?: string;
    }
): Promise<{
    mimeType: string;
    name: string;
    uri: string;
}> {
    if (!file.name) {
        throw new Error("Gemini upload did not return a file name.");
    }

    let currentFile = file;
    for (
        let attempt = 0;
        attempt < SMART_COLLECTIONS_FILE_READY_ATTEMPTS;
        attempt += 1
    ) {
        if (
            currentFile.state === undefined ||
            currentFile.state === FileState.ACTIVE
        ) {
            if (!currentFile.uri) {
                throw new Error("Gemini upload did not return a file URI.");
            }

            return {
                mimeType: currentFile.mimeType ?? "application/octet-stream",
                name: currentFile.name ?? file.name,
                uri: currentFile.uri,
            };
        }

        if (currentFile.state === FileState.FAILED) {
            throw new Error(
                currentFile.error?.message ||
                    "Gemini failed to process the uploaded asset."
            );
        }

        await delay(SMART_COLLECTIONS_FILE_READY_DELAY_MS);
        currentFile = await ai.files.get({ name: file.name });
    }

    throw new Error("Gemini file processing timed out.");
}

async function uploadRemoteAsset(
    ai: GoogleGenAI,
    asset: DownloadedRemoteAsset,
    displayName: string
): Promise<{
    cleanup: () => Promise<void>;
    part: ReturnType<typeof createPartFromUri>;
}> {
    const upload = await ai.files.upload({
        config: {
            displayName,
            mimeType: asset.mimeType,
        },
        file: asset.path,
    });

    const readyFile = await waitForGeminiFile(ai, upload);
    await asset.cleanup();

    return {
        cleanup: async () => {
            await ai.files
                .delete({ name: readyFile.name })
                .catch(() => undefined);
        },
        part: createPartFromUri(readyFile.uri, readyFile.mimeType),
    };
}

function displayNameForItem(item: SmartCollectionItem, url: string): string {
    const base =
        item.caption?.trim() ||
        basename(new URL(url).pathname) ||
        `${sourceLabel(item.source)}-${item.id}`;

    return base.slice(0, 128);
}

async function resolveContentCandidates(
    item: SmartCollectionItem
): Promise<string[]> {
    const candidates: string[] = [];
    const addUrl = (url: string | null | undefined) => {
        if (isHttpUrl(url)) {
            candidates.push(url);
        }
    };

    switch (item.source) {
        case LibraryItemSource.google_photos:
        case LibraryItemSource.github_starred_repositories:
            addUrl(item.url);
            addUrl(item.thumbnailUrl);
            break;
        case LibraryItemSource.pinterest:
            addUrl(item.thumbnailUrl);
            addUrl(item.url);
            break;
        case LibraryItemSource.chrome_bookmarks:
            addUrl(item.url);
            break;
        default:
            if (isHttpUrl(item.url)) {
                const cobaltResult = await resolveCobaltDownloadUrl(item.url);
                if (cobaltResult.status === "SUCCESS") {
                    candidates.push(cobaltResult.downloadUrl);
                }
            }
            addUrl(item.thumbnailUrl);
            if (item.source === LibraryItemSource.other) {
                addUrl(item.url);
            }
    }

    return [...new Set(candidates)];
}

async function createAttachmentForItem(
    ai: GoogleGenAI,
    item: SmartCollectionItem
): Promise<SmartCollectionAttachment | null> {
    if (
        item.source === LibraryItemSource.youtube_watch_later &&
        isHttpUrl(item.url)
    ) {
        return {
            parts: [
                {
                    fileData: {
                        fileUri: item.url,
                    },
                },
            ],
        };
    }

    const candidates = await resolveContentCandidates(item);
    for (const candidateUrl of candidates) {
        const asset = await downloadRemoteAsset(candidateUrl);
        if (!asset) {
            continue;
        }

        if (isTextLikeMimeType(asset.mimeType)) {
            try {
                const rawText = await readFile(
                    /* turbopackIgnore: true */ asset.path,
                    "utf8"
                );
                const extractedText = extractTextContent(
                    rawText,
                    asset.mimeType
                );
                await asset.cleanup();

                if (extractedText.length === 0) {
                    continue;
                }

                return {
                    parts: [
                        createPartFromText(
                            `Attached textual content (truncated if necessary):\n${extractedText.slice(0, SMART_COLLECTIONS_MAX_TEXT_LENGTH)}`
                        ),
                    ],
                    protectionText: extractedText.slice(
                        0,
                        SMART_COLLECTIONS_MAX_TEXT_LENGTH
                    ),
                };
            } catch {
                await asset.cleanup();
                continue;
            }
        }

        try {
            const upload = await uploadRemoteAsset(
                ai,
                asset,
                displayNameForItem(item, candidateUrl)
            );

            return {
                cleanup: upload.cleanup,
                parts: [upload.part],
            };
        } catch (error) {
            await asset.cleanup();
            log.warn("Smart collections asset upload failed", {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown upload error",
                itemId: item.id,
                source: item.source,
                url: candidateUrl,
            });
        }
    }

    return null;
}

async function decideCollectionsForItem(
    ai: GoogleGenAI,
    item: SmartCollectionItem,
    collections: SmartCollectionCatalogEntry[],
    userId: string
): Promise<SmartCollectionDecision | null> {
    const attachment = await createAttachmentForItem(ai, item);
    const promptText = buildPrompt(item, collections);
    const prompt = createPartFromText(promptText);
    const protectionPrompt = [promptText, attachment?.protectionText]
        .filter((segment) => segment && segment.length > 0)
        .join("\n\n");
    const contentVariants = [
        ...(attachment
            ? [
                  {
                      contents: [prompt, ...attachment.parts],
                      label: "with_attachment",
                  },
              ]
            : []),
        {
            contents: [prompt],
            label: "metadata_only",
        },
    ];

    try {
        await protectGenAiRequest({
            feature: "smart_collections",
            prompt: protectionPrompt,
            request: new Request(
                "https://cache.local/internal/smart-collections"
            ),
            requestedTokens: estimateGenAiTokens(protectionPrompt, 256),
            userId,
        });

        for (const model of resolveSmartCollectionsModels()) {
            for (const variant of contentVariants) {
                try {
                    const response = await ai.models.generateContent({
                        config: {
                            httpOptions: {
                                retryOptions: {
                                    attempts: 2,
                                },
                                timeout: SMART_COLLECTIONS_MODEL_TIMEOUT_MS,
                            },
                            maxOutputTokens: 256,
                            responseJsonSchema:
                                smartCollectionDecisionJsonSchema,
                            responseMimeType: "application/json",
                            systemInstruction:
                                "You organize a user's saved media into focused collections. Be conservative, prefer existing collections, and create new collections only when there is a strong reusable theme.",
                            temperature: 0.1,
                        },
                        contents: variant.contents,
                        model,
                    });

                    const responseText = response.text?.trim();
                    if (!responseText) {
                        log.warn(
                            "Smart collections decision returned an empty response",
                            {
                                itemId: item.id,
                                model,
                                source: item.source,
                                variant: variant.label,
                            }
                        );
                        continue;
                    }

                    return SmartCollectionDecisionSchema.parse(
                        JSON.parse(responseText)
                    );
                } catch (error) {
                    const errorInfo = getSmartCollectionsModelErrorInfo(error);

                    log.warn("Smart collections decision attempt failed", {
                        details: errorInfo.details,
                        error: errorInfo.message,
                        itemId: item.id,
                        model,
                        source: item.source,
                        status: errorInfo.status,
                        variant: variant.label,
                    });
                }
            }
        }
        return null;
    } finally {
        await attachment?.cleanup?.();
    }
}

function mergeCollections(
    current: SmartCollectionCatalogEntry[],
    nextEntries: SmartCollectionCatalogEntry[]
): SmartCollectionCatalogEntry[] {
    const byNameKey = new Map(
        current.map((collection) => [collection.nameKey, collection])
    );

    for (const collection of nextEntries) {
        byNameKey.set(collection.nameKey, collection);
    }

    return [...byNameKey.values()].sort((left, right) =>
        left.name.localeCompare(right.name)
    );
}

async function applyDecisionToItem(args: {
    collections: SmartCollectionCatalogEntry[];
    decision: SmartCollectionDecision;
    itemId: string;
    userId: string;
}): Promise<SmartCollectionCatalogEntry[]> {
    const collectionsByNameKey = new Map(
        args.collections.map((collection) => [collection.nameKey, collection])
    );
    const desiredCollectionIds = new Set<string>();
    const normalizedNewCollectionNames = [
        ...new Map(
            args.decision.createCollectionNames
                .map((name) =>
                    normalizeCollectionName(
                        name.slice(0, COLLECTION_NAME_MAX_LENGTH)
                    )
                )
                .filter((collection) => collection.name.length > 0)
                .map((collection) => [collection.nameKey, collection])
        ).values(),
    ];

    for (const collectionName of args.decision.applyCollectionNames) {
        const normalized = normalizeCollectionName(collectionName);
        const match = collectionsByNameKey.get(normalized.nameKey);
        if (match) {
            desiredCollectionIds.add(match.id);
        }
    }

    const createdCollections = await prisma.$transaction(async (tx) => {
        const upsertedCollections: SmartCollectionCatalogEntry[] = [];

        for (const nextCollection of normalizedNewCollectionNames) {
            const collection = await tx.collection.upsert({
                create: {
                    name: nextCollection.name,
                    nameKey: nextCollection.nameKey,
                    userId: args.userId,
                },
                select: {
                    description: true,
                    id: true,
                    name: true,
                    nameKey: true,
                },
                update: {},
                where: {
                    userId_nameKey: {
                        nameKey: nextCollection.nameKey,
                        userId: args.userId,
                    },
                },
            });

            desiredCollectionIds.add(collection.id);
            upsertedCollections.push(collection);
        }

        const item = await tx.libraryItem.findFirst({
            select: {
                collections: {
                    select: {
                        id: true,
                    },
                },
                id: true,
            },
            where: {
                id: args.itemId,
                userId: args.userId,
            },
        });

        if (!item) {
            return upsertedCollections;
        }

        const nextCollectionIds = [
            ...new Set([
                ...item.collections.map((collection) => collection.id),
                ...desiredCollectionIds,
            ]),
        ];

        if (
            nextCollectionIds.length !== item.collections.length &&
            nextCollectionIds.length > 0
        ) {
            await tx.libraryItem.update({
                data: {
                    collections: {
                        set: nextCollectionIds.map((collectionId) => ({
                            id: collectionId,
                        })),
                    },
                },
                where: {
                    id: item.id,
                },
            });
        }

        return upsertedCollections;
    });

    return mergeCollections(args.collections, createdCollections);
}

export async function autoTagLibraryItemsByIds(args: {
    itemIds: string[];
    userId: string;
}) {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
        return;
    }

    const itemIds = [
        ...new Set(args.itemIds.filter((itemId) => itemId.trim().length > 0)),
    ];
    if (itemIds.length === 0) {
        return;
    }

    const [items, initialCollections] = await Promise.all([
        prisma.libraryItem.findMany({
            orderBy: {
                createdAt: "asc",
            },
            select: {
                caption: true,
                collections: {
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                },
                id: true,
                kind: true,
                source: true,
                sourceMetadata: true,
                thumbnailUrl: true,
                url: true,
            },
            where: {
                id: {
                    in: itemIds,
                },
                userId: args.userId,
            },
        }),
        prisma.collection.findMany({
            orderBy: {
                name: "asc",
            },
            select: {
                description: true,
                id: true,
                name: true,
                nameKey: true,
            },
            where: {
                userId: args.userId,
            },
        }),
    ]);

    if (items.length === 0) {
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let collections = initialCollections;

    for (const itemId of itemIds) {
        const rawItem = items.find((i) => i.id === itemId);
        if (!rawItem) {
            continue;
        }

        const item: SmartCollectionItem = {
            ...rawItem,
            kind: rawItem.kind as SmartCollectionItem["kind"],
        };

        if (!isTaggableItem(item)) {
            continue;
        }

        let decision: SmartCollectionDecision | null;
        try {
            decision = await decideCollectionsForItem(
                ai,
                item,
                collections,
                args.userId
            );
        } catch (error) {
            if (error instanceof GenAiProtectionError) {
                log.warn("Smart collections request denied", {
                    itemId: item.id,
                    reason: error.data.reason,
                    userId: args.userId,
                });
                break;
            }
            throw error;
        }

        if (!decision) {
            continue;
        }

        collections = await applyDecisionToItem({
            collections,
            decision,
            itemId: item.id,
            userId: args.userId,
        });
    }
}
