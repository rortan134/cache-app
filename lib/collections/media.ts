"use server";

import type { ActionErrorWithoutNotFound } from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
    requireActionUserId,
} from "@/lib/common/procedure";
import * as z from "zod";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions:media");

const MediaDownloadInputSchema = z.object({
    url: z.string().trim().min(1, "A valid URL is required to download media."),
});

export type MediaDownloadResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
      }
    | ActionErrorWithoutNotFound;

export async function downloadMedia(url: string): Promise<MediaDownloadResult> {
    const parsed = MediaDownloadInputSchema.safeParse({ url });
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "A valid URL is required to download media."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId("Sign in again to download media.");
    if ("status" in auth) {
        return auth;
    }

    try {
        const downloadUrl = await service.downloadMedia(parsed.data.url);
        return {
            downloadUrl,
            status: "SUCCESS",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: {},
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We hit an unexpected error while preparing your download.",
            log,
        });
    }
}
