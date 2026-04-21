"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { LIBRARY_ITEM_COLLECTIONS_INCLUDE } from "@/lib/collections/shared";
import { extractNamedErrorMessage } from "@/lib/error";
import {
    applyChromeBookmarkSyncEvents,
    DEFAULT_BROWSER_PROFILE_ID,
} from "@/lib/integrations/chrome/service";
import type { LibraryItemWithCollections } from "@/lib/types";
import { createLogger } from "@/lib/logs/console/logger";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { parseStandaloneUrl } from "@/lib/url";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";

import { after } from "next/server";
import * as z from "zod";

const log = createLogger("integrations:standalone:actions");
const PASTED_BOOKMARK_URL_MAX_LENGTH = 4096;
const NOTE_PASTED_BOOKMARK_EXTERNAL_ID_PREFIX = "cache_pasted_url:";

const CreateChromeBookmarkFromUrlInputSchema = z.object({
    url: z.string().trim().min(1).max(PASTED_BOOKMARK_URL_MAX_LENGTH),
});

export type CreateChromeBookmarkFromUrlResult =
    | {
          item: LibraryItemWithCollections;
          outcome: "CREATED" | "MERGED" | "UPDATED";
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "UNAUTHORIZED";
      };

async function getChromeBookmarkItemForUserByExternalId(
    userId: string,
    externalId: string
): Promise<LibraryItemWithCollections | null> {
    return (await prisma.libraryItem.findFirst({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        where: {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            OR: [
                {
                    externalId,
                },
                {
                    sourceAliasIds: {
                        has: externalId,
                    },
                },
            ],
            source: LibraryItemSource.chrome_bookmarks,
            userId,
        },
    })) as LibraryItemWithCollections | null;
}

function pastedChromeBookmarkExternalId(url: string): string {
    return `${NOTE_PASTED_BOOKMARK_EXTERNAL_ID_PREFIX}${url}`;
}

export async function createChromeBookmarkFromUrl(input: {
    url: string;
}): Promise<CreateChromeBookmarkFromUrlResult> {
    const parsed = CreateChromeBookmarkFromUrlInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Paste a valid URL to save it as a bookmark.",
            status: "INVALID",
        };
    }

    const normalizedUrl = parseStandaloneUrl(parsed.data.url);
    if (!normalizedUrl) {
        return {
            message: "Paste a valid URL to save it as a bookmark.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to save links.",
            status: "UNAUTHORIZED",
        };
    }

    const occurredAt = new Date().toISOString();
    const externalId = pastedChromeBookmarkExternalId(normalizedUrl.href);

    try {
        const syncResult = await applyChromeBookmarkSyncEvents(userId, {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            events: [
                {
                    bookmark: {
                        dateAdded: Date.now(),
                        externalId,
                        kind: "bookmark",
                        url: normalizedUrl.href,
                    },
                    occurredAt,
                    type: "upsert",
                },
            ],
            mode: "continuous_sync",
            syncedAt: occurredAt,
        });

        const item = await getChromeBookmarkItemForUserByExternalId(
            userId,
            externalId
        );
        if (!item) {
            throw new Error(
                "We saved the bookmark but couldn't load it back into the library."
            );
        }

        if (syncResult.smartCollectionItemIds.length > 0) {
            after(async () => {
                await autoTagLibraryItemsByIds({
                    itemIds: syncResult.smartCollectionItemIds,
                    userId,
                });
            });
        }

        let outcome: "CREATED" | "MERGED" | "UPDATED" = "UPDATED";
        if (syncResult.smartCollectionItemIds.length > 0) {
            outcome = "CREATED";
        } else if (syncResult.deduped > 0) {
            outcome = "MERGED";
        }

        return {
            item,
            outcome,
            status: "SUCCESS",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        log.error("Unexpected pasted bookmark create failure", error);
        return {
            message: details.message || "We couldn't save this URL right now.",
            status: "ERROR",
        };
    }
}
