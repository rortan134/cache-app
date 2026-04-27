"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import { requireActionUserId } from "@/lib/common/procedure";
import * as service from "./service";

const log = createLogger("library:actions:media");

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
    const normalizedUrl = url.trim();
    if (normalizedUrl.length === 0) {
        return {
            message: "A valid URL is required to download media.",
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId("Sign in again to download media.");
    if ("status" in auth) {
        return auth;
    }

    try {
        const downloadUrl = await service.downloadMedia(normalizedUrl);
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
