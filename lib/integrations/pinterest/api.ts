import "server-only";
import { IntegrationApiError } from "@/lib/integrations/error";

const PINTEREST_API_BASE_URL = "https://api.pinterest.com/v5";
const PINTEREST_PAGE_SIZE = 100;
const MAX_BOARD_PAGES = 20;
const MAX_PIN_PAGES_PER_BOARD = 20;

interface PinterestPaginatedResponse {
    bookmark?: string | null;
    items?: unknown[];
}

export interface PinterestBoardSummary {
    id: string;
    name: string | null;
    updatedAt: Date | null;
}

export interface PinterestImportablePin {
    caption: string | null;
    externalId: string;
    scrapedAt: Date | null;
    thumbnailUrl: string | null;
    url: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function readDate(value: unknown): Date | null {
    const raw = readString(value);
    if (!raw) {
        return null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePinterestApiError(
    payload: unknown,
    status: number
): IntegrationApiError {
    const record = asRecord(payload);
    const message =
        readString(record?.message) ??
        readString(asRecord(record?.error)?.message) ??
        `Pinterest API request failed with status ${status}.`;
    return new IntegrationApiError({
        integrationId: "pinterest",
        message,
        operation: "fetchPinterestPage",
        status,
    });
}

async function fetchPinterestPage(
    path: string,
    accessToken: string,
    searchParams: URLSearchParams
): Promise<PinterestPaginatedResponse> {
    const response = await fetch(
        `${PINTEREST_API_BASE_URL}${path}?${searchParams.toString()}`,
        {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw parsePinterestApiError(payload, response.status);
    }

    const record = asRecord(payload);
    return {
        bookmark: readString(record?.bookmark),
        items: Array.isArray(record?.items) ? record.items : [],
    };
}

async function listPinterestCollection(
    path: string,
    accessToken: string,
    maxPages: number
): Promise<unknown[]> {
    const items: unknown[] = [];
    let bookmark: string | null = null;

    for (let page = 0; page < maxPages; page += 1) {
        const searchParams = new URLSearchParams({
            page_size: String(PINTEREST_PAGE_SIZE),
        });
        if (bookmark) {
            searchParams.set("bookmark", bookmark);
        }

        const payload = await fetchPinterestPage(
            path,
            accessToken,
            searchParams
        );
        items.push(...(payload.items ?? []));

        bookmark = payload.bookmark ?? null;
        if (!bookmark || (payload.items?.length ?? 0) === 0) {
            break;
        }
    }

    return items;
}

function readImageUrl(value: unknown): string | null {
    if (typeof value === "string" && value.startsWith("http")) {
        return value;
    }

    const record = asRecord(value);
    if (!record) {
        return null;
    }

    const directUrl =
        readString(record.url) ??
        readString(record.image_url) ??
        readString(record.image_thumbnail_url) ??
        readString(record.image_cover_url);
    if (directUrl?.startsWith("http")) {
        return directUrl;
    }

    const hintedKeys = [
        "media",
        "images",
        "image",
        "cover",
        "thumbnail",
        "image_cover_url",
    ] as const;
    for (const key of hintedKeys) {
        const nested = readImageUrl(record[key]);
        if (nested) {
            return nested;
        }
    }

    for (const nested of Object.values(record)) {
        const candidate = readImageUrl(nested);
        if (candidate) {
            return candidate;
        }
    }

    return null;
}

function parseBoard(candidate: unknown): PinterestBoardSummary | null {
    const record = asRecord(candidate);
    const id = readString(record?.id);
    if (!id) {
        return null;
    }

    return {
        id,
        name: readString(record?.name),
        updatedAt:
            readDate(record?.updated_at) ??
            readDate(record?.created_at) ??
            null,
    };
}

function parsePin(
    candidate: unknown,
    boardName: string | null
): PinterestImportablePin | null {
    const record = asRecord(candidate);
    const externalId = readString(record?.id);
    if (!externalId) {
        return null;
    }

    const title = readString(record?.title);
    const description = readString(record?.description);
    const destinationUrl =
        readString(record?.link) ??
        readString(record?.original_link) ??
        `https://www.pinterest.com/pin/${externalId}/`;

    const captionBase = title ?? description ?? null;
    const caption =
        captionBase && boardName
            ? `${captionBase} • ${boardName}`
            : (captionBase ?? boardName);

    return {
        caption,
        externalId,
        scrapedAt:
            readDate(record?.created_at) ??
            readDate(record?.updated_at) ??
            null,
        thumbnailUrl: readImageUrl(record),
        url: destinationUrl,
    };
}

export async function listPinterestBoards(
    accessToken: string
): Promise<PinterestBoardSummary[]> {
    const boards = (
        await listPinterestCollection("/boards", accessToken, MAX_BOARD_PAGES)
    )
        .map(parseBoard)
        .filter((item): item is PinterestBoardSummary => item !== null);

    return boards.sort((a, b) => {
        const left = a.updatedAt?.getTime() ?? 0;
        const right = b.updatedAt?.getTime() ?? 0;
        return right - left;
    });
}

export async function listPinterestBoardPins(
    accessToken: string,
    board: PinterestBoardSummary
): Promise<PinterestImportablePin[]> {
    return (
        await listPinterestCollection(
            `/boards/${encodeURIComponent(board.id)}/pins`,
            accessToken,
            MAX_PIN_PAGES_PER_BOARD
        )
    )
        .map((item) => parsePin(item, board.name))
        .filter((item): item is PinterestImportablePin => item !== null);
}
