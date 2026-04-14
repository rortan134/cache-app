import { auth } from "@/lib/auth/server";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/library/chrome-bookmarks";
import { autoTagLibraryItemsByIds } from "@/lib/library/smart-collections";
import type { GooglePhotosPickedMediaItem } from "@/lib/integrations/google-photos/picker-api";
import {
    deletePickerSession,
    getPickerSession,
    GooglePhotosPickerApiError,
    listPickedMediaItems,
} from "@/lib/integrations/google-photos/picker-api";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import { headers } from "next/headers";
import { after } from "next/server";
import * as z from "zod";

const bodySchema = z.object({
    sessionId: z.string().min(1),
});

interface GooglePhotosImportCandidate {
    readonly caption: string | null;
    readonly externalId: string;
    readonly scrapedAt: Date | null;
    readonly sourceMetadata: Record<string, unknown>;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

interface GooglePhotosLibraryItemDelegate {
    findMany(args: {
        select: {
            externalId: true;
        };
        where: {
            browserProfileId: string;
            externalId: {
                in: string[];
            };
            source: LibraryItemSource;
            userId: string;
        };
    }): Promise<
        {
            externalId: string;
        }[]
    >;
    upsert(args: {
        create: {
            browserProfileId: string;
            caption: string | null;
            externalId: string;
            scrapedAt: Date | null;
            source: LibraryItemSource;
            sourceMetadata: Record<string, unknown> | null;
            thumbnailUrl: string | null;
            url: string;
            userId: string;
        };
        select: {
            id: true;
        };
        update: {
            browserProfileId: string;
            caption: string | null;
            scrapedAt: Date | null;
            sourceMetadata: Record<string, unknown> | null;
            thumbnailUrl: string | null;
            url: string;
        };
        where: {
            userId_source_browserProfileId_externalId: {
                browserProfileId: string;
                externalId: string;
                source: LibraryItemSource;
                userId: string;
            };
        };
    }): Promise<{
        id: string;
    }>;
}

function mediaUrlFromItem(item: GooglePhotosPickedMediaItem): string | null {
    const baseUrl = item.mediaFile?.baseUrl;
    if (!baseUrl) {
        return null;
    }
    if (item.mediaFile?.mimeType?.startsWith("video/")) {
        return `${baseUrl}=dv`;
    }
    return `${baseUrl}=w2048-h2048`;
}

function mediaThumbnailFromItem(
    item: GooglePhotosPickedMediaItem
): string | null {
    const baseUrl = item.mediaFile?.baseUrl;
    if (!baseUrl) {
        return null;
    }
    return `${baseUrl}=w640-h640-c`;
}

function googlePhotosSourceMetadata(
    item: GooglePhotosPickedMediaItem
): Record<string, unknown> {
    return {
        googlePhotos: {
            filename: item.mediaFile?.filename ?? null,
            mimeType: item.mediaFile?.mimeType ?? null,
        },
    };
}

function buildGooglePhotosImportCandidate(
    item: GooglePhotosPickedMediaItem
): GooglePhotosImportCandidate | null {
    const url = mediaUrlFromItem(item);
    if (!url) {
        return null;
    }

    return {
        caption: item.mediaFile?.filename ?? null,
        externalId: item.id,
        scrapedAt: item.createTime ? new Date(item.createTime) : null,
        sourceMetadata: googlePhotosSourceMetadata(item),
        thumbnailUrl: mediaThumbnailFromItem(item),
        url,
    };
}

function collectGooglePhotosImportCandidates(
    items: GooglePhotosPickedMediaItem[]
): {
    candidates: GooglePhotosImportCandidate[];
    skippedCount: number;
} {
    const candidates: GooglePhotosImportCandidate[] = [];
    let skippedCount = 0;

    for (const item of items) {
        const candidate = buildGooglePhotosImportCandidate(item);
        if (!candidate) {
            skippedCount += 1;
            continue;
        }

        candidates.push(candidate);
    }

    return {
        candidates,
        skippedCount,
    };
}

async function importGooglePhotosCandidates(args: {
    readonly candidates: GooglePhotosImportCandidate[];
    readonly delegate: GooglePhotosLibraryItemDelegate;
    readonly userId: string;
}): Promise<{
    importedCount: number;
    smartCollectionItemIds: string[];
}> {
    const existingRows =
        args.candidates.length > 0
            ? await args.delegate.findMany({
                  select: {
                      externalId: true,
                  },
                  where: {
                      browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                      externalId: {
                          in: args.candidates.map(
                              (candidate) => candidate.externalId
                          ),
                      },
                      source: LibraryItemSource.google_photos,
                      userId: args.userId,
                  },
              })
            : [];
    const existingExternalIds = new Set(
        existingRows.map((row) => row.externalId)
    );
    const smartCollectionItemIds = new Set<string>();

    for (const candidate of args.candidates) {
        const savedRow = await args.delegate.upsert({
            create: {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: candidate.caption,
                externalId: candidate.externalId,
                scrapedAt: candidate.scrapedAt,
                source: LibraryItemSource.google_photos,
                sourceMetadata: candidate.sourceMetadata,
                thumbnailUrl: candidate.thumbnailUrl,
                url: candidate.url,
                userId: args.userId,
            },
            select: {
                id: true,
            },
            update: {
                browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                caption: candidate.caption,
                scrapedAt: candidate.scrapedAt,
                sourceMetadata: candidate.sourceMetadata,
                thumbnailUrl: candidate.thumbnailUrl,
                url: candidate.url,
            },
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
                    externalId: candidate.externalId,
                    source: LibraryItemSource.google_photos,
                    userId: args.userId,
                },
            },
        });

        if (!existingExternalIds.has(candidate.externalId)) {
            smartCollectionItemIds.add(savedRow.id);
        }
    }

    return {
        importedCount: args.candidates.length,
        smartCollectionItemIds: [...smartCollectionItemIds],
    };
}

async function resolveGoogleAccessToken(): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: { providerId: "google" },
        headers: await headers(),
    });
    return tokenResponse?.accessToken ?? null;
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyRaw = await request.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(bodyRaw);
    if (!parsedBody.success) {
        return Response.json(
            { error: parsedBody.error.flatten() },
            { status: 400 }
        );
    }

    const accessToken = await resolveGoogleAccessToken();
    if (!accessToken) {
        return Response.json(
            { error: "Missing Google access token. Reconnect Google first." },
            { status: 403 }
        );
    }

    try {
        const libraryItemDelegate =
            prisma.libraryItem as unknown as GooglePhotosLibraryItemDelegate;
        const pickerSession = await getPickerSession(
            accessToken,
            parsedBody.data.sessionId
        );
        if (!pickerSession.mediaItemsSet) {
            return Response.json(
                { error: "Selection is not complete yet." },
                { status: 409 }
            );
        }

        const pickedItems = await listPickedMediaItems(
            accessToken,
            parsedBody.data.sessionId
        );
        const { candidates, skippedCount } =
            collectGooglePhotosImportCandidates(pickedItems);
        const { importedCount, smartCollectionItemIds } =
            await importGooglePhotosCandidates({
                candidates,
                delegate: libraryItemDelegate,
                userId: session.user.id,
            });

        await deletePickerSession(accessToken, parsedBody.data.sessionId);

        if (smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: smartCollectionItemIds,
                    userId: session.user.id,
                });
            });
        }

        return Response.json({
            importedCount,
            skippedCount,
            totalPicked: pickedItems.length,
        });
    } catch (error) {
        if (error instanceof GooglePhotosPickerApiError) {
            const message =
                error.status === 401
                    ? "Your Google account needs Photos permission. Please sign out and sign back in to reconnect."
                    : error.message;
            return Response.json({ error: message }, { status: error.status });
        }
        throw error;
    }
}
