/**
 * BCP-47 locales enabled in General Translation.
 * Keep in sync with `locales` in `gt.config.json`.
 */
export const SUPPORTED_LOCALES = [
    "en-US",
    "fr-FR",
    "de-DE",
    "es-ES",
    "pt-BR",
] as const;

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
