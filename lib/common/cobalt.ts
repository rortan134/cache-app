import { toUsableStaticPreviewUrl } from "@/lib/common/preview-url";

const COBALT_API_BASE = "https://cache-cobalt-cache.unkey.app";

interface CobaltResponse {
    error?: {
        code?: string;
        context?: unknown;
    };
    picker?: Array<{
        thumb?: string;
        type?: string;
        url?: string;
    }>;
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
    url: string
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

export type CobaltPreviewMediaType = "gif" | "image" | "unknown" | "video";

type ResolveCobaltPreviewResult =
    | {
          mediaType: CobaltPreviewMediaType;
          sourceUrl: string;
          staticImageUrl: string | null;
          status: "SUCCESS";
          videoPreviewUrl: string | null;
      }
    | {
          errorCode: string | null;
          message: string;
          status: "ERROR" | "UNAVAILABLE";
      };

function normalizeCandidateType(
    value: string | undefined
): CobaltPreviewMediaType {
    switch (value) {
        case "gif":
        case "photo":
        case "image":
            return value === "gif" ? "gif" : "image";
        case "video":
            return "video";
        default:
            return "unknown";
    }
}

function normalizeCobaltMediaUrl(url: string): string {
    return new URL(url, COBALT_API_BASE).href;
}

function previewFromDirectUrl(
    url: string
): Extract<ResolveCobaltPreviewResult, { status: "SUCCESS" }> {
    const sourceUrl = normalizeCobaltMediaUrl(url);
    return {
        mediaType: "video",
        sourceUrl,
        staticImageUrl: null,
        status: "SUCCESS",
        videoPreviewUrl: sourceUrl,
    };
}

function previewFromPicker(
    picker: NonNullable<CobaltResponse["picker"]>
): ResolveCobaltPreviewResult {
    const usableCandidates = picker
        .map((candidate) => ({
            mediaType: normalizeCandidateType(candidate.type),
            thumb: candidate.thumb
                ? normalizeCobaltMediaUrl(candidate.thumb)
                : null,
            url: candidate.url ? normalizeCobaltMediaUrl(candidate.url) : null,
        }))
        .filter((candidate) => candidate.url || candidate.thumb);

    const videoCandidate = usableCandidates.find(
        (candidate) =>
            candidate.url &&
            (candidate.mediaType === "video" || candidate.mediaType === "gif")
    );
    if (videoCandidate?.url) {
        return {
            mediaType: videoCandidate.mediaType,
            sourceUrl: videoCandidate.url,
            staticImageUrl: toUsableStaticPreviewUrl(videoCandidate.thumb),
            status: "SUCCESS",
            videoPreviewUrl: videoCandidate.url,
        };
    }

    const imageCandidate = usableCandidates.find(
        (candidate) =>
            (candidate.mediaType === "image" ||
                candidate.mediaType === "unknown") &&
            (candidate.url || candidate.thumb)
    );
    const staticImageUrl = toUsableStaticPreviewUrl(
        imageCandidate?.thumb ?? imageCandidate?.url
    );
    if (staticImageUrl) {
        return {
            mediaType: imageCandidate?.mediaType ?? "image",
            sourceUrl: imageCandidate?.url ?? staticImageUrl,
            staticImageUrl,
            status: "SUCCESS",
            videoPreviewUrl: null,
        };
    }

    return {
        errorCode: null,
        message: "Could not find preview media for this item.",
        status: "UNAVAILABLE",
    };
}

export function resolveCobaltPreviewFromResponse(
    data: CobaltResponse
): ResolveCobaltPreviewResult {
    if (data.status === "error") {
        return {
            errorCode: data.error?.code ?? null,
            message:
                data.text || "Failed to resolve preview media for this item.",
            status: "ERROR",
        };
    }

    if (data.status === "local-processing") {
        return {
            errorCode: "local_processing",
            message: "This media requires local processing before previewing.",
            status: "UNAVAILABLE",
        };
    }

    if (data.status === "picker") {
        return previewFromPicker(data.picker ?? []);
    }

    if (
        (data.status === "redirect" ||
            data.status === "tunnel" ||
            data.status === "stream") &&
        data.url
    ) {
        return previewFromDirectUrl(data.url);
    }

    return {
        errorCode: null,
        message: "Could not find preview media for this item.",
        status: "UNAVAILABLE",
    };
}

async function readCobaltJsonResponse(
    response: Response
): Promise<CobaltResponse | null> {
    try {
        return (await response.json()) as CobaltResponse;
    } catch {
        return null;
    }
}

export async function resolveCobaltPreview(
    url: string
): Promise<ResolveCobaltPreviewResult> {
    const normalizedUrl = url.trim();
    if (normalizedUrl.length === 0) {
        return {
            errorCode: "invalid_url",
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

        const data = await readCobaltJsonResponse(response);

        if (!response.ok) {
            if (data?.status === "error") {
                return resolveCobaltPreviewFromResponse(data);
            }

            return {
                errorCode: `http_${response.status}`,
                message:
                    "The media resolver is currently unavailable right now.",
                status: "ERROR",
            };
        }

        return resolveCobaltPreviewFromResponse(data ?? {});
    } catch (error) {
        return {
            errorCode: "unexpected",
            message:
                error instanceof Error
                    ? error.message
                    : "Unexpected media resolver failure.",
            status: "ERROR",
        };
    }
}
