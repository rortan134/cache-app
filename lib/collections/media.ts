"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    requireActionUserId,
} from "@/lib/common/procedure";
import * as z from "zod";
import * as service from "./service";

const log = createLogger("library:actions:media");
const DownloadMediaInputSchema = z.object({
    url: z.string().trim().min(1, "A valid URL is required to download media."),
});
const ResolveLibraryItemPreviewInputSchema = z.object({
    itemId: z
        .string()
        .trim()
        .min(1, "A saved item is required to preview media."),
    refreshIfMissingVideo: z.boolean().optional(),
});

export type DownloadMediaResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "UNAUTHORIZED";
      };

export type ResolveLibraryItemPreviewResult =
    | {
          errorCode: string | null;
          mediaType: "gif" | "image" | "unknown" | "video";
          providerStatus: "error" | "success" | "unavailable";
          sourceUrl: string;
          staticImageUrl: string | null;
          status: "SUCCESS";
          videoPreviewUrl: string | null;
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "UNAUTHORIZED";
      };

export async function downloadMedia(url: string): Promise<DownloadMediaResult> {
    const parsed = DownloadMediaInputSchema.safeParse({ url });
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
        log.error("Unexpected download failure", error);
        return {
            message:
                error instanceof Error
                    ? error.message
                    : "We hit an unexpected error while preparing your download.",
            status: "ERROR",
        };
    }
}

export async function resolveLibraryItemPreview(
    itemId: string,
    options?: { refreshIfMissingVideo?: boolean }
): Promise<ResolveLibraryItemPreviewResult> {
    const parsed = ResolveLibraryItemPreviewInputSchema.safeParse({
        itemId,
        refreshIfMissingVideo: options?.refreshIfMissingVideo,
    });
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "A saved item is required to preview media."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId("Sign in again to preview media.");
    if ("status" in auth) {
        return auth;
    }

    try {
        const preview = await service.resolveLibraryItemPreview({
            itemId: parsed.data.itemId,
            refreshIfMissingVideo: parsed.data.refreshIfMissingVideo,
            userId: auth.userId,
        });

        return {
            errorCode: preview.errorCode,
            mediaType: preview.mediaType,
            providerStatus: preview.providerStatus,
            sourceUrl: preview.sourceUrl,
            staticImageUrl: preview.staticImageUrl,
            status: "SUCCESS",
            videoPreviewUrl: preview.videoPreviewUrl,
        };
    } catch (error) {
        log.error("Unexpected preview resolution failure", error);
        return {
            message:
                error instanceof Error
                    ? error.message
                    : "We hit an unexpected error while preparing your preview.",
            status: "ERROR",
        };
    }
}
