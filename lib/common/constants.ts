/**
 * BCP-47 locales enabled in General Translation.
 * Keep in sync with `locales` in `gt.config.json`.
 */
export const SUPPORTED_LOCALES = ["en-US", "fr-FR", "es-ES", "pt-BR"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en-US";

export const FOUNDING_DATE = new Date("2026-04-09T00:00:00.000Z");

/** Shown after the page-specific title, e.g. "Settings | Cache". */
export const APP_NAME = "Cache App";

/** Root / default document title when a segment does not override `title`. */
export const SITE_DEFAULT_TITLE = `Bookmark manager | ${APP_NAME}`;

export const CACHE_EXTENSION_DOWNLOAD_URL = "https://cachd.app";
export const CACHE_EXTENSION_READY_EVENT = "CACHE_EXTENSION_READY";

const VERCEL_URL =
    process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

export const BASE_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : `https://${VERCEL_URL}`;

export const FALLBACK_URL = "about:blank";

export const SORT_ASC = "asc" as const;
export const SORT_DESC = "desc" as const;

export const ITEM_KIND_BOOKMARK = "bookmark" as const;
export const ITEM_KIND_FOLDER = "folder" as const;
export const ITEM_KIND_NOTE = "note" as const;

export const DESCRIPTION_MAX_LENGTH = 1024;

export const DEFAULT_CURRENCY = "usd";

export const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

export const FREE_LIBRARY_PREVIEW_ITEMS = 12;

export const MAX_COLLECTIONS_PER_ITEM = 100;

export const BATCH_UPDATE_MAX_ITEMS = 500;

export const MAX_COLLECTIONS_PER_BATCH = 100;

export const IMAGE_MIME_TYPES = {
    avif: "image/avif",
    bmp: "image/bmp",
    gif: "image/gif",
    ico: "image/x-icon",
    jfif: "image/jfif",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
} as const;

export const STRING_MIME_TYPES = {
    csv: "text/csv",
    html: "text/html",
    json: "application/json",
    text: "text/plain",
} as const;

export const MIME_TYPES = {
    ...STRING_MIME_TYPES,
    // binary
    binary: "application/octet-stream",
    // image
    ...IMAGE_MIME_TYPES,
} as const;

export const EXPORT_IMAGE_TYPES = {
    clipboard: "clipboard",
    png: "png",
    svg: "svg",
} as const;
