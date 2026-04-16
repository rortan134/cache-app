import {
    Chrome,
    Github,
    Instagram,
    Photos,
    Pinterest,
    TikTok,
    XSocial,
    YouTube,
} from "@/components/ui/icons";
import { CACHE_EXTENSION_DOWNLOAD_URL } from "@/lib/constants";
import { LibraryItemSource } from "@/prisma/client/enums";
import type { ComponentType, SVGProps } from "react";

export type IntegrationCategory = "developer" | "media" | "social";
export type IntegrationDirection = "destination" | "source";
export type IntegrationIcon = ComponentType<SVGProps<SVGSVGElement>>;
export type IntegrationId =
    | "chrome"
    | "github"
    | "google-photos"
    | "instagram"
    | "pinterest"
    | "tiktok"
    | "x"
    | "youtube";
export type IntegrationActionRole = "connect" | "open" | "sync";
export type IntegrationActionIcon = "images" | "refresh";
export type IntegrationActionSize = "icon" | "sm";
export type IntegrationActionVariant = "ghost" | "outline";

export type IntegrationConnectionSignal =
    | {
          kind: "library-item-source";
          source: LibraryItemSource;
      }
    | {
          kind: "linked-provider";
          providerId: string;
      };

export interface IntegrationDirectionDefinition {
    connectedWhen: IntegrationConnectionSignal[];
}

export interface IntegrationSourceDefinition
    extends IntegrationDirectionDefinition {
    libraryItemSources: LibraryItemSource[];
    syncable: boolean;
}

export interface IntegrationDestinationDefinition
    extends IntegrationDirectionDefinition {}

export interface SupportedIntegrationAction {
    for: IntegrationDirection;
    icon?: IntegrationActionIcon;
    label?: string;
    role: IntegrationActionRole;
    size: IntegrationActionSize;
    variant: IntegrationActionVariant;
    visibleWhen?: "always" | "connected";
}

export interface ExtensionOpenBehavior {
    installUrl: string;
    kind: "extension-entry";
    openUrl: string;
}

export interface OAuthLinkConnectBehavior {
    callbackURL: string;
    errorCallbackURL: string;
    kind: "oauth-link";
    providerId: string;
}

export interface SocialSignInConnectBehavior {
    callbackURL: string;
    errorCallbackURL: string;
    kind: "social-sign-in";
    provider: string;
}

export interface RouteSyncBehavior {
    errorMessage: string;
    kind: "route";
    method: "POST";
    path: string;
    successKey: string;
    successMessage?: (payload: Record<string, unknown>) => string | null;
}

export interface GooglePhotosPickerSyncBehavior {
    kind: "google-photos-picker";
}

export interface SupportedIntegration {
    actions: SupportedIntegrationAction[];
    behaviors: {
        connect?: OAuthLinkConnectBehavior | SocialSignInConnectBehavior;
        open?: ExtensionOpenBehavior;
        sync?: GooglePhotosPickerSyncBehavior | RouteSyncBehavior;
    };
    category: IntegrationCategory;
    description: string;
    destination?: IntegrationDestinationDefinition;
    Icon: IntegrationIcon;
    id: IntegrationId;
    label: string;
    source?: IntegrationSourceDefinition;
}

export interface IntegrationConnectionContext {
    libraryItemSources: Iterable<LibraryItemSource>;
    linkedProviderIds: Iterable<string>;
}

const LIBRARY_CALLBACK_URL = "/library";

function formatImportedCountMessage(
    payload: Record<string, unknown>,
    noun: string
): string | null {
    const importedCount = payload.importedCount;
    if (typeof importedCount !== "number") {
        return null;
    }

    return `Imported ${importedCount} ${noun}${importedCount === 1 ? "" : "s"}.`;
}

export const INTEGRATIONS = [
    {
        actions: [
            {
                for: "source",
                role: "open",
                size: "sm",
                variant: "ghost",
            },
        ],
        behaviors: {
            open: {
                installUrl: CACHE_EXTENSION_DOWNLOAD_URL,
                kind: "extension-entry",
                openUrl: CACHE_EXTENSION_DOWNLOAD_URL,
            },
        },
        category: "social",
        description: "Bookmarks from your browser",
        Icon: Chrome,
        id: "chrome",
        label: "Chrome",
        source: {
            connectedWhen: [
                {
                    kind: "library-item-source",
                    source: LibraryItemSource.chrome_bookmarks,
                },
            ],
            libraryItemSources: [LibraryItemSource.chrome_bookmarks],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "connect",
                size: "sm",
                variant: "ghost",
            },
            {
                for: "source",
                icon: "refresh",
                role: "sync",
                size: "icon",
                variant: "outline",
                visibleWhen: "connected",
            },
        ],
        behaviors: {
            connect: {
                callbackURL: LIBRARY_CALLBACK_URL,
                errorCallbackURL: LIBRARY_CALLBACK_URL,
                kind: "oauth-link",
                providerId: "github",
            },
            sync: {
                errorMessage:
                    "Could not import starred repositories from GitHub right now.",
                kind: "route",
                method: "POST",
                path: "/api/integrations/github/import",
                successKey: "importedCount",
                successMessage: (payload) =>
                    formatImportedCountMessage(payload, "repository"),
            },
        },
        category: "developer",
        description: "Repositories you star to revisit later",
        Icon: Github,
        id: "github",
        label: "GitHub",
        source: {
            connectedWhen: [
                {
                    kind: "linked-provider",
                    providerId: "github",
                },
            ],
            libraryItemSources: [LibraryItemSource.github_starred_repositories],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "connect",
                size: "sm",
                variant: "ghost",
            },
            {
                for: "source",
                icon: "images",
                role: "sync",
                size: "icon",
                variant: "outline",
                visibleWhen: "connected",
            },
        ],
        behaviors: {
            connect: {
                callbackURL: LIBRARY_CALLBACK_URL,
                errorCallbackURL: LIBRARY_CALLBACK_URL,
                kind: "social-sign-in",
                provider: "google",
            },
            sync: {
                kind: "google-photos-picker",
            },
        },
        category: "media",
        description: "Starred photos and albums",
        Icon: Photos,
        id: "google-photos",
        label: "Google Photos",
        source: {
            connectedWhen: [
                {
                    kind: "linked-provider",
                    providerId: "google",
                },
            ],
            libraryItemSources: [LibraryItemSource.google_photos],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "open",
                size: "sm",
                variant: "ghost",
            },
        ],
        behaviors: {
            open: {
                installUrl: CACHE_EXTENSION_DOWNLOAD_URL,
                kind: "extension-entry",
                openUrl: "https://www.instagram.com/explore/saved/",
            },
        },
        category: "social",
        description: "Posts you save to Favorites",
        Icon: Instagram,
        id: "instagram",
        label: "Instagram",
        source: {
            connectedWhen: [
                {
                    kind: "library-item-source",
                    source: LibraryItemSource.instagram,
                },
            ],
            libraryItemSources: [LibraryItemSource.instagram],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "connect",
                size: "sm",
                variant: "ghost",
            },
            {
                for: "source",
                icon: "refresh",
                role: "sync",
                size: "icon",
                variant: "outline",
                visibleWhen: "connected",
            },
        ],
        behaviors: {
            connect: {
                callbackURL: LIBRARY_CALLBACK_URL,
                errorCallbackURL: LIBRARY_CALLBACK_URL,
                kind: "oauth-link",
                providerId: "pinterest",
            },
            sync: {
                errorMessage: "Could not import pins from Pinterest right now.",
                kind: "route",
                method: "POST",
                path: "/api/pinterest/import",
                successKey: "importedCount",
                successMessage: (payload) =>
                    formatImportedCountMessage(payload, "pin"),
            },
        },
        category: "social",
        description: "Pins saved to boards",
        Icon: Pinterest,
        id: "pinterest",
        label: "Pinterest",
        source: {
            connectedWhen: [
                {
                    kind: "linked-provider",
                    providerId: "pinterest",
                },
            ],
            libraryItemSources: [LibraryItemSource.pinterest],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "open",
                size: "sm",
                variant: "ghost",
            },
        ],
        behaviors: {
            open: {
                installUrl: CACHE_EXTENSION_DOWNLOAD_URL,
                kind: "extension-entry",
                openUrl: "https://www.tiktok.com/profile",
            },
        },
        category: "social",
        description: "Videos in your Favorites",
        Icon: TikTok,
        id: "tiktok",
        label: "TikTok",
        source: {
            connectedWhen: [
                {
                    kind: "library-item-source",
                    source: LibraryItemSource.tiktok,
                },
            ],
            libraryItemSources: [LibraryItemSource.tiktok],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "connect",
                size: "sm",
                variant: "ghost",
            },
            {
                for: "source",
                icon: "refresh",
                role: "sync",
                size: "icon",
                variant: "outline",
                visibleWhen: "connected",
            },
        ],
        behaviors: {
            connect: {
                callbackURL: LIBRARY_CALLBACK_URL,
                errorCallbackURL: LIBRARY_CALLBACK_URL,
                kind: "oauth-link",
                providerId: "x",
            },
            sync: {
                errorMessage: "Could not import bookmarks from X right now.",
                kind: "route",
                method: "POST",
                path: "/api/integrations/x/import",
                successKey: "importedCount",
                successMessage: (payload) =>
                    formatImportedCountMessage(payload, "bookmark"),
            },
        },
        category: "social",
        description: "Posts you save to Bookmarks",
        Icon: XSocial,
        id: "x",
        label: "X",
        source: {
            connectedWhen: [
                {
                    kind: "linked-provider",
                    providerId: "x",
                },
            ],
            libraryItemSources: [LibraryItemSource.x_bookmarks],
            syncable: true,
        },
    },
    {
        actions: [
            {
                for: "source",
                role: "open",
                size: "sm",
                variant: "ghost",
            },
        ],
        behaviors: {
            open: {
                installUrl: CACHE_EXTENSION_DOWNLOAD_URL,
                kind: "extension-entry",
                openUrl: "https://www.youtube.com/playlist?list=WL",
            },
        },
        category: "media",
        description: "Videos in your playlists",
        Icon: YouTube,
        id: "youtube",
        label: "YouTube",
        source: {
            connectedWhen: [
                {
                    kind: "library-item-source",
                    source: LibraryItemSource.youtube_watch_later,
                },
            ],
            libraryItemSources: [LibraryItemSource.youtube_watch_later],
            syncable: true,
        },
    },
] as const satisfies SupportedIntegration[];

const INTEGRATION_BY_ID = new Map<IntegrationId, SupportedIntegration>(
    INTEGRATIONS.map((item) => [item.id, item])
);

const INTEGRATION_ID_SET = new Set<IntegrationId>(
    INTEGRATIONS.map((item) => item.id)
);

const INTEGRATION_ACCOUNT_PROVIDER_IDS = Array.from(
    new Set(
        INTEGRATIONS.flatMap((integration) =>
            listDirectionDefinitions(integration).flatMap((definition) =>
                definition.connectedWhen.flatMap((signal) =>
                    signal.kind === "linked-provider" ? [signal.providerId] : []
                )
            )
        )
    )
);

export const LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS = INTEGRATIONS.filter(
    (item) => item.source?.syncable
).map((item) => item.id);

function listDirectionDefinitions(
    integration: SupportedIntegration
): IntegrationDirectionDefinition[] {
    return [integration.source, integration.destination].filter(
        (definition): definition is IntegrationDirectionDefinition =>
            definition !== undefined
    );
}

function getDirectionDefinition(
    integration: SupportedIntegration,
    direction: IntegrationDirection
): IntegrationDestinationDefinition | IntegrationSourceDefinition | undefined {
    return direction === "source"
        ? integration.source
        : integration.destination;
}

function integrationMatchesSignal(
    signal: IntegrationConnectionSignal,
    context: {
        libraryItemSources: Set<LibraryItemSource>;
        linkedProviderIds: Set<string>;
    }
): boolean {
    if (signal.kind === "library-item-source") {
        return context.libraryItemSources.has(signal.source);
    }

    return context.linkedProviderIds.has(signal.providerId);
}

function buildConnectionSets(context: IntegrationConnectionContext): {
    libraryItemSources: Set<LibraryItemSource>;
    linkedProviderIds: Set<string>;
} {
    return {
        libraryItemSources: new Set(context.libraryItemSources),
        linkedProviderIds: new Set(context.linkedProviderIds),
    };
}

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
        return;
    }
    return INTEGRATION_BY_ID.get(value);
}

export function listIntegrations(
    predicate?: (item: SupportedIntegration) => boolean
): SupportedIntegration[] {
    return predicate ? INTEGRATIONS.filter(predicate) : [...INTEGRATIONS];
}

export function integrationsInCategory(
    category: IntegrationCategory
): SupportedIntegration[] {
    return INTEGRATIONS.filter((item) => item.category === category);
}

export function integrationIds(): IntegrationId[] {
    return INTEGRATIONS.map((item) => item.id);
}

export function filterToIntegrationIds(values: string[]): IntegrationId[] {
    return values.filter(isIntegrationId);
}

export function listIntegrationActions(
    id: IntegrationId,
    direction: IntegrationDirection
): SupportedIntegrationAction[] {
    return getIntegration(id).actions.filter(
        (action) => action.for === direction
    );
}

export function integrationSupportsDirection(
    id: IntegrationId,
    direction: IntegrationDirection
): boolean {
    return getDirectionDefinition(getIntegration(id), direction) !== undefined;
}

export function listIntegrationAccountProviderIds(): string[] {
    return [...INTEGRATION_ACCOUNT_PROVIDER_IDS];
}

export function listSyncableIntegrations(): SupportedIntegration[] {
    return INTEGRATIONS.filter((item) => item.source?.syncable);
}

export function integrationOwnsLibraryItemSource(
    id: IntegrationId,
    source: LibraryItemSource
): boolean {
    const libraryItemSources = getIntegration(id).source?.libraryItemSources;
    return libraryItemSources?.includes(source) ?? false;
}

export function isIntegrationConnected(
    id: IntegrationId,
    direction: IntegrationDirection,
    context: IntegrationConnectionContext
): boolean {
    const definition = getDirectionDefinition(getIntegration(id), direction);
    if (!definition) {
        return false;
    }

    const sets = buildConnectionSets(context);
    return definition.connectedWhen.some((signal) =>
        integrationMatchesSignal(signal, sets)
    );
}

export function listConnectedIntegrationIds(
    direction: IntegrationDirection,
    context: IntegrationConnectionContext
): IntegrationId[] {
    return INTEGRATIONS.flatMap((integration) =>
        isIntegrationConnected(integration.id, direction, context)
            ? [integration.id]
            : []
    );
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
        case LibraryItemSource.github_starred_repositories:
            return "GitHub";
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
