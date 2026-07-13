"use server";

import { ACTION_STATUS } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import type { DesktopReleaseDownloads } from "@/lib/desktop/releases";
import * as service from "@/lib/desktop/service";

const log = createLogger("desktop:actions");

export type GetDesktopDownloadsResult =
    | {
          data: DesktopReleaseDownloads;
          status: typeof ACTION_STATUS.SUCCESS;
      }
    | {
          data: null;
          status: typeof ACTION_STATUS.NOT_FOUND;
      }
    | {
          message: string;
          status: typeof ACTION_STATUS.ERROR;
      };

/**
 * Public read of the latest desktop installers. No auth — assets are public.
 */
export async function getDesktopDownloads(): Promise<GetDesktopDownloadsResult> {
    try {
        const data = await service.getLatestDesktopDownloads();
        if (!data) {
            return { data: null, status: ACTION_STATUS.NOT_FOUND };
        }
        return { data, status: ACTION_STATUS.SUCCESS };
    } catch (error) {
        log.error("getDesktopDownloads failed", error);
        return {
            message: "Could not load desktop downloads.",
            status: ACTION_STATUS.ERROR,
        };
    }
}
