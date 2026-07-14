import "server-only";

import { createLogger } from "@/lib/common/logs/console/logger";
import { fetchWithTimeout } from "@/lib/common/timeout";
import {
    buildDesktopReleaseDownloads,
    getDesktopLatestReleaseApiUrl,
    type DesktopReleaseDownloads,
    type GitHubRelease,
} from "@/lib/desktop/releases";

const log = createLogger("desktop:releases");

const GITHUB_RELEASE_TIMEOUT_MS = 8000;
const GITHUB_RELEASE_REVALIDATE_SECONDS = 300;

/**
 * Resolve the latest desktop installers from GitHub Releases.
 * Returns null when there is no release or no matching assets yet.
 */
export async function getLatestDesktopDownloads(): Promise<DesktopReleaseDownloads | null> {
    try {
        const response = await fetchWithTimeout(
            getDesktopLatestReleaseApiUrl(),
            {
                headers: {
                    Accept: "application/vnd.github+json",
                    "User-Agent": "Cache-App-Desktop-Downloads",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                next: { revalidate: GITHUB_RELEASE_REVALIDATE_SECONDS },
            },
            GITHUB_RELEASE_TIMEOUT_MS
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            log.warn("GitHub latest release request failed", {
                status: response.status,
            });
            return null;
        }

        const release = (await response.json()) as GitHubRelease;
        if (
            !Array.isArray(release.assets) ||
            typeof release.tag_name !== "string"
        ) {
            log.warn("GitHub latest release payload was invalid");
            return null;
        }

        return buildDesktopReleaseDownloads(release);
    } catch (error) {
        log.error("Failed to load desktop release downloads", error);
        return null;
    }
}
