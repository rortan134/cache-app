import "server-only";

import { serverEnv } from "@/env/server";
import { COLLECTION_NAME_LENGTH_MAX } from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import { GenAiProtectionError } from "@/lib/intelligence/error";
import {
    SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT,
    SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH,
} from "@/lib/intelligence/overview";
import {
    estimateGenAiTokens,
    protectGenAiRequest,
} from "@/lib/intelligence/protection";

import { unique } from "@/lib/common/arrays";
import {
    ITEM_KIND_BOOKMARK,
    MIME_TYPES,
    SORT_ASC,
} from "@/lib/common/constants";
import {
    decodeHtmlEntities,
    normalizeCollectionName,
    normalizeWhitespace,
    truncateText,
} from "@/lib/common/strings";
import { isHttpUrl } from "@/lib/common/url";
import { resolveCobaltDownloadUrl } from "@/lib/integrations/cobalt/service";
import { prisma } from "@/prisma";

import { type LibraryItemKind, LibraryItemSource } from "@/prisma/client/enums";
import {
    ApiError,
    createPartFromText,
    createPartFromUri,
    FileState,
    GoogleGenAI,
    type Part,
    Type,
} from "@google/genai";
import mime from "mime-types";
import { randomUUID } from "node:crypto";
import { open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import * as z from "zod";

const log = createLogger("library:smart-collections");
const serviceLog = createLogger("intelligence:service");

const SMART_COLLECTIONS_MODEL_DEFAULT = "gemini-3.1-flash-lite";
const SMART_COLLECTIONS_MODELS_FALLBACK = ["gemini-3.1-flash-lite"] as const;
const SMART_COLLECTIONS_APPLY_COLLECTION_COUNT_MAX = 4;
const SMART_COLLECTIONS_NEW_COLLECTION_COUNT_MAX = 1;
const SMART_COLLECTIONS_NEW_COLLECTION_WORD_COUNT_MAX = 3;
const SMART_COLLECTIONS_DOWNLOAD_BYTES_MAX = 100 * 1024 * 1024;
const SMART_COLLECTIONS_TEXT_LENGTH_MAX = 12_000;
const SMART_COLLECTIONS_FILE_READY_ATTEMPT_COUNT_MAX = 20;
const SMART_COLLECTIONS_FILE_READY_DELAY_MS = 1500;
const SMART_COLLECTIONS_FETCH_TIMEOUT_MS = 20_000;
const SMART_COLLECTIONS_MODEL_TIMEOUT_MS = 45_000;
const DEFAULT_SUMMARIZE_MAX_LENGTH = 1500;
const DISPLAY_NAME_MAX_LENGTH = 128;
const ESTIMATED_OUTPUT_TOKENS = 256;
const MODEL_RETRY_ATTEMPTS = 2;
const MODEL_TEMPERATURE = 0.1;
const SECTION_RETRY_ATTEMPTS = 2;
const SECTION_TEMPERATURE = 0.2;
const PATTERN_HTML_TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const PATTERN_HTML_DESCRIPTION =
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i;
const COLLECTION_NAME_TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const COLLECTION_NAME_LETTER_PATTERN = /\p{L}/u;
const COLLECTION_NAME_PUNCTUATION_NOISE_PATTERN =
    /[()[\]{}"'`.,:;!?@#]|https?:|www\./i;

const SmartCollectionDecisionSchema = z.object({
    applyCollectionNames: z
        .array(z.string().trim().min(1))
        .max(SMART_COLLECTIONS_APPLY_COLLECTION_COUNT_MAX),
    createCollectionNames: z
        .array(z.string().trim().min(1).max(COLLECTION_NAME_LENGTH_MAX))
        .max(SMART_COLLECTIONS_NEW_COLLECTION_COUNT_MAX),
});

const smartCollectionDecisionJsonSchema = (() => {
    const { $schema: _ignoredSchema, ...schema } = z.toJSONSchema(
        SmartCollectionDecisionSchema
    );
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
    kind: LibraryItemKind;
    source: LibraryItemSource;
    sourceMetadata: unknown;
    url: string;
}

interface DownloadedRemoteAsset {
    cleanup: () => Promise<void>;
    mimeType: string;
    path: string;
    sourceUrl: string;
}

interface ResolvedDownloadAssetType {
    extension: string;
    mimeType: string;
}

interface SmartCollectionAttachment {
    cleanup?: () => Promise<void>;
    parts: Part[];
    protectionText?: string;
}

interface SmartCollectionModelErrorInfo {
    details?: unknown;
    message: string;
    status: number | null;
}

let googleGenAi: GoogleGenAI | undefined;

function getGoogleGenAi(): GoogleGenAI {
    googleGenAi ??= new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY });
    return googleGenAi;
}

function resolveSmartCollectionModels(): string[] {
    return unique([
        SMART_COLLECTIONS_MODEL_DEFAULT,
        ...SMART_COLLECTIONS_MODELS_FALLBACK,
    ]);
}

function getSmartCollectionModelErrorInfo(
    error: unknown
): SmartCollectionModelErrorInfo {
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

function inferDownloadAssetType(
    contentTypeHeader: string | null,
    url: string
): ResolvedDownloadAssetType {
    const headerExt = contentTypeHeader
        ? mime.extension(contentTypeHeader)
        : false;
    if (headerExt) {
        return {
            extension: `.${headerExt}`,
            mimeType: mime.lookup(headerExt) || MIME_TYPES.binary,
        };
    }
    try {
        const pathExt = extname(new URL(url).pathname).toLowerCase();
        const lookupType = pathExt ? mime.lookup(pathExt) : false;
        if (lookupType) {
            return { extension: pathExt, mimeType: lookupType };
        }
    } catch {
        // URL parse failure — fall through
    }
    return { extension: ".bin", mimeType: MIME_TYPES.binary };
}

function extractHtmlContent(input: string): string {
    const title = input.match(PATTERN_HTML_TITLE)?.[1]?.trim();
    const description = input.match(PATTERN_HTML_DESCRIPTION)?.[1]?.trim();
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
        mimeType === MIME_TYPES.html ||
        mimeType === MIME_TYPES.xhtml ||
        mimeType === MIME_TYPES.xml
    ) {
        return extractHtmlContent(input);
    }

    return normalizeWhitespace(input);
}

function isTextLikeMimeType(mimeType: string): boolean {
    return (
        mimeType.startsWith("text/") ||
        mimeType === MIME_TYPES.json ||
        mimeType === "application/ld+json" ||
        mimeType === MIME_TYPES.xml ||
        mimeType === MIME_TYPES.xhtml
    );
}

function isTaggableItem(item: SmartCollectionItem): boolean {
    return (
        item.kind === ITEM_KIND_BOOKMARK &&
        item.source !== LibraryItemSource.cache_note
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

function summarizeJson(
    value: unknown,
    maxLength = DEFAULT_SUMMARIZE_MAX_LENGTH
): string {
    if (!value) {
        return "";
    }

    try {
        const serialized = JSON.stringify(value);
        if (!serialized) {
            return "";
        }
        return truncateText(serialized, maxLength);
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
        `Choose at most ${SMART_COLLECTIONS_APPLY_COLLECTION_COUNT_MAX} existing collections and at most ${SMART_COLLECTIONS_NEW_COLLECTION_COUNT_MAX} new collections.`,
        "Create a new collection only when the item has a broad, reusable topic that will likely group many future saved items.",
        `New collection names must be concise taxonomy labels of at most ${SMART_COLLECTIONS_NEW_COLLECTION_WORD_COUNT_MAX} words, such as Design Systems or Personal Finance.`,
        "Do not create collections for a single title, author, person, brand, source platform, website, format, product version, or passing mention.",
        "Apply a collection only when the item is centrally about that collection, not because of a loose keyword, brand, person, location, format, or passing mention.",
        "When uncertain, return empty arrays.",
        "Avoid vague names like Misc, Random, or Interesting.",
        "",
        `Item source: ${sourceLabel(item.source)}`,
        `Item URL: ${item.url}`,
        `Item caption: ${item.caption ?? "None"}`,
        `Already assigned collections: ${currentCollectionNames.length > 0 ? currentCollectionNames.join(", ") : "None"}`,
        sourceMetadata && `Item source metadata: ${sourceMetadata}`,
        "",
        "AVAILABLE_COLLECTIONS:",
        JSON.stringify(collectionCatalog),
    ]
        .filter(Boolean)
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
    let filePath: string | null = null;
    let shouldKeepFile = false;

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

        const resolvedUrl = response.url || url;
        const { extension, mimeType } = inferDownloadAssetType(
            response.headers.get("content-type"),
            resolvedUrl
        );
        filePath = join(
            /* turbopackIgnore: true */ tmpdir(),
            `cache-smart-collections-${randomUUID()}${extension}`
        );
        const fileHandle = await open(
            /* turbopackIgnore: true */ filePath,
            "w"
        );
        const reader = response.body.getReader();
        let downloadedBytes = 0;

        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                if (!value) {
                    continue;
                }

                downloadedBytes += value.byteLength;
                if (downloadedBytes > SMART_COLLECTIONS_DOWNLOAD_BYTES_MAX) {
                    await reader.cancel(
                        "Smart collections asset exceeded the maximum download size."
                    );
                    return null;
                }

                await fileHandle.write(value);
            }
        } finally {
            await fileHandle.close();
        }

        if (filePath === null) {
            throw new Error("Remote asset download did not create a file.");
        }

        const downloadedPath = filePath;
        shouldKeepFile = true;
        return {
            cleanup: async () => {
                await rm(/* turbopackIgnore: true */ downloadedPath, {
                    force: true,
                });
            },
            mimeType,
            path: downloadedPath,
            sourceUrl: resolvedUrl,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
        if (!(shouldKeepFile || filePath === null)) {
            await rm(/* turbopackIgnore: true */ filePath, {
                force: true,
            }).catch(() => undefined);
        }
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
        attempt < SMART_COLLECTIONS_FILE_READY_ATTEMPT_COUNT_MAX;
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
                mimeType: currentFile.mimeType ?? MIME_TYPES.binary,
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

    return base.slice(0, DISPLAY_NAME_MAX_LENGTH);
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
        case LibraryItemSource.pinterest:
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
            if (item.source === LibraryItemSource.other) {
                addUrl(item.url);
            }
    }

    return unique(candidates);
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
                            `Attached textual content (truncated if necessary):\n${extractedText.slice(0, SMART_COLLECTIONS_TEXT_LENGTH_MAX)}`
                        ),
                    ],
                    protectionText: extractedText.slice(
                        0,
                        SMART_COLLECTIONS_TEXT_LENGTH_MAX
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

async function tryModelVariant(
    ai: GoogleGenAI,
    model: string,
    variant: { contents: Part[]; label: string },
    item: SmartCollectionItem
): Promise<SmartCollectionDecision | null> {
    try {
        const response = await ai.models.generateContent({
            config: {
                httpOptions: {
                    retryOptions: {
                        attempts: MODEL_RETRY_ATTEMPTS,
                    },
                    timeout: SMART_COLLECTIONS_MODEL_TIMEOUT_MS,
                },
                maxOutputTokens: ESTIMATED_OUTPUT_TOKENS,
                responseJsonSchema: smartCollectionDecisionJsonSchema,
                responseMimeType: MIME_TYPES.json,
                systemInstruction:
                    "You organize a user's saved media into focused collections. Be conservative, prefer existing collections, and create new collections only when there is a strong reusable theme.",
                temperature: MODEL_TEMPERATURE,
            },
            contents: variant.contents,
            model,
        });

        const responseText = response.text?.trim();
        if (!responseText) {
            log.warn("Smart collections decision returned an empty response", {
                itemId: item.id,
                model,
                source: item.source,
                variant: variant.label,
            });
            return null;
        }

        return SmartCollectionDecisionSchema.parse(JSON.parse(responseText));
    } catch (error) {
        const errorInfo = getSmartCollectionModelErrorInfo(error);

        log.warn("Smart collections decision attempt failed", {
            details: errorInfo.details,
            error: errorInfo.message,
            itemId: item.id,
            model,
            source: item.source,
            status: errorInfo.status,
            variant: variant.label,
        });
        return null;
    }
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

    const contentVariants: Array<{ contents: Part[]; label: string }> = [
        { contents: [prompt], label: "metadata_only" },
    ];
    if (attachment) {
        contentVariants.unshift({
            contents: [prompt, ...attachment.parts],
            label: "with_attachment",
        });
    }

    try {
        await protectGenAiRequest({
            feature: "smart_collections",
            prompt: protectionPrompt,
            request: new Request(
                "https://cache.local/internal/smart-collections"
            ),
            requestedTokens: estimateGenAiTokens(
                protectionPrompt,
                ESTIMATED_OUTPUT_TOKENS
            ),
            // Scan only user/item content — not system instructions in the prompt.
            scanMessage: [
                item.caption,
                item.url,
                item.kind,
                item.source,
                attachment?.protectionText,
            ]
                .filter((part): part is string => typeof part === "string")
                .join(" "),
            userId,
        });

        for (const model of resolveSmartCollectionModels()) {
            for (const variant of contentVariants) {
                const decision = await tryModelVariant(
                    ai,
                    model,
                    variant,
                    item
                );
                if (decision) {
                    return decision;
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

    return [...byNameKey.values()].toSorted((left, right) =>
        left.name.localeCompare(right.name)
    );
}

function tokenizeCollectionName(name: string): string[] {
    return [
        ...name.toLocaleLowerCase().matchAll(COLLECTION_NAME_TOKEN_PATTERN),
    ].map((match) => match[0]);
}

function shouldCreateSmartCollection(args: {
    collectionsByNameKey: Map<string, SmartCollectionCatalogEntry>;
    name: string;
    nameKey: string;
}): boolean {
    if (args.collectionsByNameKey.has(args.nameKey)) {
        return true;
    }

    if (COLLECTION_NAME_PUNCTUATION_NOISE_PATTERN.test(args.name)) {
        return false;
    }

    const tokens = tokenizeCollectionName(args.name);
    if (
        tokens.length === 0 ||
        tokens.length > SMART_COLLECTIONS_NEW_COLLECTION_WORD_COUNT_MAX
    ) {
        return false;
    }

    if (!tokens.some((token) => COLLECTION_NAME_LETTER_PATTERN.test(token))) {
        return false;
    }

    for (const collection of args.collectionsByNameKey.values()) {
        const existingTokens = new Set(tokenizeCollectionName(collection.name));
        if (
            tokens.every((token) => existingTokens.has(token)) ||
            [...existingTokens].every((token) => tokens.includes(token))
        ) {
            return false;
        }
    }

    return true;
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

    const dedupMap = new Map<
        string,
        ReturnType<typeof normalizeCollectionName>
    >();
    for (const name of args.decision.createCollectionNames) {
        const normalized = normalizeCollectionName(
            name.slice(0, COLLECTION_NAME_LENGTH_MAX)
        );
        if (normalized.name.length === 0) {
            continue;
        }
        if (
            !shouldCreateSmartCollection({
                collectionsByNameKey,
                name: normalized.name,
                nameKey: normalized.nameKey,
            })
        ) {
            continue;
        }
        dedupMap.set(normalized.nameKey, normalized);
    }
    const normalizedNewCollectionNames = [...dedupMap.values()];

    for (const name of args.decision.applyCollectionNames) {
        const normalized = normalizeCollectionName(name);
        const match = collectionsByNameKey.get(normalized.nameKey);
        if (match) {
            desiredCollectionIds.add(match.id);
        }
    }

    const createdCollections = await prisma.$transaction(async (tx) => {
        const upsertedCollections: SmartCollectionCatalogEntry[] = [];

        for (const newCollection of normalizedNewCollectionNames) {
            const collection = await tx.collection.upsert({
                create: {
                    name: newCollection.name,
                    nameKey: newCollection.nameKey,
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
                        nameKey: newCollection.nameKey,
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
                deletedAt: null,
                id: args.itemId,
                userId: args.userId,
            },
        });

        if (!item) {
            return upsertedCollections;
        }

        const currentCollectionIds = new Set(
            item.collections.map((collection) => collection.id)
        );
        const hasNewCollections = [...desiredCollectionIds].some(
            (id) => !currentCollectionIds.has(id)
        );

        if (hasNewCollections) {
            await tx.libraryItem.update({
                data: {
                    collections: {
                        set: [
                            ...currentCollectionIds,
                            ...desiredCollectionIds,
                        ].map((id) => ({ id })),
                    },
                },
                where: { id: item.id },
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
    const apiKey = serverEnv.GEMINI_API_KEY;
    if (!apiKey) {
        return;
    }

    const validItemIds = unique(
        args.itemIds.filter((itemId) => itemId.trim().length > 0)
    );
    if (validItemIds.length === 0) {
        return;
    }

    const [items, initialCollections, user] = await Promise.all([
        prisma.libraryItem.findMany({
            orderBy: {
                createdAt: SORT_ASC,
            },
            select: {
                caption: true,
                collections: {
                    orderBy: {
                        name: SORT_ASC,
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
                url: true,
            },
            where: {
                deletedAt: null,
                id: {
                    in: validItemIds,
                },
                userId: args.userId,
            },
        }),
        prisma.collection.findMany({
            orderBy: {
                name: SORT_ASC,
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
        prisma.user.findUnique({
            select: { smartCollectionsEnabled: true },
            where: { id: args.userId },
        }),
    ]);

    if (!user?.smartCollectionsEnabled) {
        log.debug("Smart collections skipped: preference is off", {
            itemCount: validItemIds.length,
            userId: args.userId,
        });
        return;
    }

    if (items.length === 0) {
        return;
    }

    const ai = getGoogleGenAi();
    let collections = initialCollections;
    const itemsById = new Map(items.map((i) => [i.id, i]));

    for (const itemId of validItemIds) {
        const rawItem = itemsById.get(itemId);
        if (!rawItem) {
            continue;
        }

        const item: SmartCollectionItem = rawItem;

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

// ---------------------------------------------------------------------------
// Section description generation
// ---------------------------------------------------------------------------

const SECTION_DESCRIPTION_MODEL_DEFAULT = "gemini-3.1-flash-lite";
const SECTION_DESCRIPTION_MODELS_FALLBACK = ["gemini-3-flash-preview"] as const;
const SECTION_DESCRIPTION_OUTPUT_TOKEN_LIMIT = 96;
const SECTION_DESCRIPTION_TIMEOUT_MS = 30_000;

function resolveSectionDescriptionModels(): string[] {
    return unique([
        SECTION_DESCRIPTION_MODEL_DEFAULT,
        ...SECTION_DESCRIPTION_MODELS_FALLBACK,
    ]);
}

interface SectionDescriptionResult {
    rawSummary: string | undefined;
}

interface ExpandedSectionDescriptionResult {
    rawSummary: string | undefined;
}

interface ModelGenerationConfig {
    httpOptions: { retryOptions: { attempts: number }; timeout: number };
    logLabel: string;
    maxOutputTokens: number;
    responseSchema: object;
    systemInstruction: string;
}

async function generateModelContent(
    config: ModelGenerationConfig,
    prompt: string
): Promise<string | undefined> {
    const models = resolveSectionDescriptionModels();
    const ai = getGoogleGenAi();
    let lastError: unknown;

    for (const model of models) {
        try {
            serviceLog.info(config.logLabel, {
                maxOutputTokens: config.maxOutputTokens,
                model,
                promptLength: prompt.length,
            });

            const response = await ai.models.generateContent({
                config: {
                    ...config,
                    responseMimeType: MIME_TYPES.json,
                    temperature: SECTION_TEMPERATURE,
                },
                contents: prompt,
                model,
            });

            return response.text ?? undefined;
        } catch (error) {
            lastError = error;
            serviceLog.warn(`Model ${model} failed for ${config.logLabel}`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    throw lastError;
}

export async function generateSectionDescription(args: {
    prompt: string;
}): Promise<SectionDescriptionResult> {
    const rawText = await generateModelContent(
        {
            httpOptions: {
                retryOptions: {
                    attempts: SECTION_RETRY_ATTEMPTS,
                },
                timeout: SECTION_DESCRIPTION_TIMEOUT_MS,
            },
            logLabel: "generate-section-description",
            maxOutputTokens: SECTION_DESCRIPTION_OUTPUT_TOKEN_LIMIT,
            responseSchema: {
                description:
                    "A single-sentence summary of the shared themes across the provided items.",
                properties: {
                    summary: {
                        description:
                            "One brief sentence summarizing the shared themes and intent. Plain text only, no markdown, no item counts, no platform names, no quotes.",
                        maxLength: String(
                            SECTION_DESCRIPTION_RESPONSE_MAX_LENGTH
                        ),
                        type: Type.STRING,
                    },
                },
                required: ["summary"],
                type: Type.OBJECT,
            },
            systemInstruction:
                "You write one-sentence UI summaries. Return plain text only, with no preamble. Never mention item counts or platform names, and avoid stock lead-ins.",
        },
        args.prompt
    );

    return { rawSummary: rawText };
}

const SECTION_DESCRIPTION_EXPANDED_TIMEOUT_MS = 45_000;

export async function generateExpandedSectionDescription(args: {
    prompt: string;
}): Promise<ExpandedSectionDescriptionResult> {
    const rawText = await generateModelContent(
        {
            httpOptions: {
                retryOptions: {
                    attempts: SECTION_RETRY_ATTEMPTS,
                },
                timeout: SECTION_DESCRIPTION_EXPANDED_TIMEOUT_MS,
            },
            logLabel: "generate-expanded-section-description",
            maxOutputTokens: SECTION_DESCRIPTION_EXPANDED_OUTPUT_TOKEN_LIMIT,
            responseSchema: {
                description:
                    "A compact markdown overview of the shared themes and useful takeaways in the provided items.",
                properties: {
                    summary: {
                        description:
                            "A markdown string that starts with one concise overview sentence, followed by 3-6 useful bullet takeaways when supported.",
                        type: Type.STRING,
                    },
                },
                required: ["summary"],
                type: Type.OBJECT,
            },
            systemInstruction:
                "You write reliable at-a-glance markdown overviews. Return a JSON object with a 'summary' markdown string. No preamble, no commentary, no headings, no item counts, and no platform names.",
        },
        args.prompt
    );

    let rawSummary: string | undefined;
    try {
        const parsed = JSON.parse(rawText ?? "{}");
        rawSummary =
            typeof parsed.summary === "string" ? parsed.summary : undefined;
    } catch {
        rawSummary = rawText ?? undefined;
    }

    return { rawSummary };
}
