import {
    Chrome,
    Instagram,
    Photos,
    Pinterest,
    TikTok,
    XSocial,
    YouTube,
} from "@/components/ui/integration-icons";
import type { ComponentType, SVGProps } from "react";
import { LibraryItemSource } from "@/prisma/client/enums";

export type IntegrationCategory = "media" | "social";

export type IntegrationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type IntegrationId =
    | "chrome"
    | "google-photos"
    | "instagram"
    | "pinterest"
    | "tiktok"
    | "x"
    | "youtube";

/**
 * Bookmark-capable integrations that contribute items to the unified library.
 */
export const LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS = [
    "chrome",
    "x",
    "youtube",
    "instagram",
    "pinterest",
    "tiktok",
] as const satisfies readonly IntegrationId[];

export interface SupportedIntegration {
    readonly capabilities: {
        readonly bookmarks: boolean;
    };
    readonly category: IntegrationCategory;
    readonly description: string;
    readonly Icon: IntegrationIcon;
    readonly id: IntegrationId;
    readonly label: string;
}

export const INTEGRATIONS = [
    {
        capabilities: { bookmarks: true },
        category: "social",
        description: "Bookmarks from your browser profile",
        Icon: Chrome,
        id: "chrome",
        label: "Chrome",
    },
    {
        capabilities: { bookmarks: true },
        category: "social",
        description: "Posts you save to Favorites",
        Icon: Instagram,
        id: "instagram",
        label: "Instagram",
    },
    {
        capabilities: { bookmarks: true },
        category: "social",
        description: "Videos in your Favorites",
        Icon: TikTok,
        id: "tiktok",
        label: "TikTok",
    },
    {
        capabilities: { bookmarks: true },
        category: "social",
        description: "Posts you save to Bookmarks",
        Icon: XSocial,
        id: "x",
        label: "X",
    },
    {
        capabilities: { bookmarks: true },
        category: "media",
        description: "Videos in your playlists",
        Icon: YouTube,
        id: "youtube",
        label: "YouTube",
    },
    {
        capabilities: { bookmarks: true },
        category: "media",
        description: "Photos and albums you have starred",
        Icon: Photos,
        id: "google-photos",
        label: "Google Photos",
    },
    {
        capabilities: { bookmarks: true },
        category: "social",
        description: "Pins you save to boards",
        Icon: Pinterest,
        id: "pinterest",
        label: "Pinterest",
    },
] satisfies readonly SupportedIntegration[];

const INTEGRATION_BY_ID = new Map<IntegrationId, SupportedIntegration>(
    INTEGRATIONS.map((item) => [item.id, item])
);

const INTEGRATION_ID_SET = new Set<IntegrationId>(
    INTEGRATIONS.map((item) => item.id)
);

export function isIntegrationId(value: unknown): value is IntegrationId {
    return (
        typeof value === "string" &&
        INTEGRATION_ID_SET.has(value as IntegrationId)
    );
}

export function assertIntegrationId(value: unknown): IntegrationId {
    if (!isIntegrationId(value)) {
        throw new TypeError(
            `Expected IntegrationId, received: ${String(value)}`
        );
    }
    return value;
}

export function getIntegration(id: IntegrationId): SupportedIntegration {
    const row = INTEGRATION_BY_ID.get(id);
    if (!row) {
        throw new TypeError(`Missing integration definition for id: ${id}`);
    }
    return row;
}

export function findIntegrationById(
    value: unknown
): SupportedIntegration | undefined {
    if (!isIntegrationId(value)) {
        return undefined;
    }
    return INTEGRATION_BY_ID.get(value);
}

export function listIntegrations(
    predicate?: (item: SupportedIntegration) => boolean
): readonly SupportedIntegration[] {
    return predicate ? INTEGRATIONS.filter(predicate) : INTEGRATIONS;
}

export function integrationsInCategory(
    category: IntegrationCategory
): readonly SupportedIntegration[] {
    return INTEGRATIONS.filter((item) => item.category === category);
}

export function integrationIds(): readonly IntegrationId[] {
    return INTEGRATIONS.map((item) => item.id);
}

export function filterToIntegrationIds(
    values: readonly string[]
): IntegrationId[] {
    return values.filter(isIntegrationId);
}

export function integrationCapability<
    K extends keyof SupportedIntegration["capabilities"],
>(id: IntegrationId, key: K): SupportedIntegration["capabilities"][K] {
    return getIntegration(id).capabilities[key];
}

export function integrationHasCapability<
    K extends keyof SupportedIntegration["capabilities"],
>(id: IntegrationId, key: K): boolean {
    return Boolean(getIntegration(id).capabilities[key]);
}

export function recordHasIntegrationId<K extends string>(
    record: Record<K, unknown>,
    key: K
): record is Record<K, IntegrationId> & typeof record {
    return isIntegrationId(record[key]);
}

export function getSourceLabel(source: LibraryItemSource): string {
    switch (source) {
        case LibraryItemSource.cache_note:
            return "Notes";
        case LibraryItemSource.chrome_bookmarks:
            return "Chrome";
        case LibraryItemSource.google_photos:
            return "Google Photos";
        case LibraryItemSource.instagram:
            return "Instagram";
        case LibraryItemSource.pinterest:
            return "Pinterest";
        case LibraryItemSource.tiktok:
            return "TikTok";
        case LibraryItemSource.x_bookmarks:
            return "X";
        case LibraryItemSource.youtube_watch_later:
            return "YouTube";
        default:
            return "Other";
    }
}
