const COBALT_API_BASE = "https://cache-cobalt-cache.unkey.app";

interface CobaltResponse {
    status?: string;
    text?: string;
    url?: string;
}

type ResolveCobaltDownloadUrlResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
      }
    | {
          message: string;
          status: "ERROR";
      };

export async function resolveCobaltDownloadUrl(
    url: string,
): Promise<ResolveCobaltDownloadUrlResult> {
    const normalizedUrl = url.trim();
    if (normalizedUrl.length === 0) {
        return {
            message: "A valid URL is required to resolve media.",
            status: "ERROR",
        };
    }

    try {
        const response = await fetch(`${COBALT_API_BASE}/`, {
            body: JSON.stringify({ url: normalizedUrl }),
            cache: "no-store",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        if (!response.ok) {
            return {
                message:
                    "The media resolver is currently unavailable right now.",
                status: "ERROR",
            };
        }

        const data = (await response.json()) as CobaltResponse;

        if (data.status === "error") {
            return {
                message:
                    data.text || "Failed to resolve a media URL for this item.",
                status: "ERROR",
            };
        }

        if (!data.url) {
            return {
                message:
                    "Could not find a downloadable media URL for this item.",
                status: "ERROR",
            };
        }

        return {
            downloadUrl: data.url,
            status: "SUCCESS",
        };
    } catch (error) {
        return {
            message:
                error instanceof Error
                    ? error.message
                    : "Unexpected media resolver failure.",
            status: "ERROR",
        };
    }
}
