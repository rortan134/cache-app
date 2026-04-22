"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { resolveCobaltDownloadUrl } from "@/lib/common/cobalt";
import { createLogger } from "@/lib/common/logs/console/logger";

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

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to download media.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const result = await resolveCobaltDownloadUrl(normalizedUrl);
        if (result.status === "ERROR") {
            return {
                message:
                    result.message ||
                    "The download service is currently unavailable. Please try again later.",
                status: "ERROR",
            };
        }

        return {
            downloadUrl: result.downloadUrl,
            status: "SUCCESS",
        };
    } catch (error) {
        log.error("Unexpected download failure", error);
        return {
            message:
                "We hit an unexpected error while preparing your download.",
            status: "ERROR",
        };
    }
}
