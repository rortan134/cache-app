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

export type DownloadMediaResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
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
