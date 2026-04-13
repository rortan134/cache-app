"use client";

import { GooglePhotosImportButton } from "@/components/library/google-photos-import-button";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { CACHE_EXTENSION_DOWNLOAD_URL } from "@/lib/constants";
import type { IntegrationId } from "@/lib/integrations/supports";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface SidebarIntegrationActionProps {
    connected: boolean;
    extensionInstalled?: boolean;
    id: IntegrationId;
    parked?: boolean;
}

type ExtensionIntegrationId = Extract<
    IntegrationId,
    "chrome" | "instagram" | "tiktok" | "youtube"
>;
type OAuthIntegrationId = Extract<
    IntegrationId,
    "google-photos" | "pinterest" | "x"
>;

const EXTENSION_OPEN_URL: Record<ExtensionIntegrationId, string> = {
    chrome: CACHE_EXTENSION_DOWNLOAD_URL,
    instagram: "https://www.instagram.com/explore/saved/",
    tiktok: "https://www.tiktok.com/profile",
    youtube: "https://www.youtube.com/playlist?list=WL",
};

function readRedirectUrl(response: unknown): string | null {
    const root =
        typeof response === "object" && response !== null
            ? (response as Record<string, unknown>)
            : null;
    const payload =
        typeof root?.data === "object" && root.data !== null
            ? (root.data as Record<string, unknown>)
            : root;
    const url = payload?.url;
    return typeof url === "string" && url.length > 0 ? url : null;
}

function openExternal(url: string) {
    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to a normal browser navigation when the desktop bridge is unavailable.
    }

    window.location.assign(url);
}

function isExtensionIntegration(
    id: IntegrationId
): id is ExtensionIntegrationId {
    return (
        id === "chrome" ||
        id === "instagram" ||
        id === "tiktok" ||
        id === "youtube"
    );
}

function isOAuthIntegration(id: IntegrationId): id is OAuthIntegrationId {
    return id === "google-photos" || id === "pinterest" || id === "x";
}

function providerIdForIntegration(id: OAuthIntegrationId) {
    if (id === "google-photos") {
        return "google";
    }
    return id;
}

function extensionButtonLabel(extensionInstalled: boolean) {
    if (extensionInstalled) {
        return "Open";
    }
    return "Get Extension";
}

export function SidebarIntegrationAction({
    connected,
    extensionInstalled = false,
    id,
    parked = false,
}: SidebarIntegrationActionProps) {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isImportingX, setIsImportingX] = useState(false);
    const [isImportingPinterest, setIsImportingPinterest] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const isGooglePhotosIntegration = id === "google-photos";
    const isPinterestIntegration = id === "pinterest";
    const isXIntegration = id === "x";

    const handleExtensionClick = useCallback(() => {
        if (!isExtensionIntegration(id)) {
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        openExternal(
            extensionInstalled
                ? EXTENSION_OPEN_URL[id]
                : CACHE_EXTENSION_DOWNLOAD_URL
        );
    }, [extensionInstalled, id]);

    const handleGoogleConnect = useCallback(async () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsConnecting(true);

        try {
            const result = await authClient.signIn.social({
                callbackURL: "/library",
                errorCallbackURL: "/library",
                provider: "google",
            });

            if (result.error) {
                setErrorMessage(
                    result.error.message ??
                        "Could not start the Google connection flow."
                );
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not start the Google connection flow."
            );
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const handleGenericOAuthConnect = useCallback(async () => {
        if (!isOAuthIntegration(id) || id === "google-photos") {
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        setIsConnecting(true);

        try {
            const response = await authClient.$fetch("/oauth2/link", {
                body: {
                    callbackURL: "/library",
                    disableRedirect: true,
                    errorCallbackURL: "/library",
                    providerId: providerIdForIntegration(id),
                },
                method: "POST",
            });

            const redirectUrl = readRedirectUrl(response);
            if (!redirectUrl) {
                setErrorMessage("Could not start the account connection flow.");
                return;
            }

            window.location.assign(redirectUrl);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not start the account connection flow."
            );
        } finally {
            setIsConnecting(false);
        }
    }, [id]);

    const handlePinterestImport = useCallback(async () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsImportingPinterest(true);

        try {
            const response = await fetch("/api/pinterest/import", {
                method: "POST",
            });
            const payload = (await response.json()) as
                | {
                      boardsCount: number;
                      error?: string;
                      importedCount: number;
                      skippedCount: number;
                  }
                | { error: string };

            if (!(response.ok && "importedCount" in payload)) {
                throw new Error(
                    payload.error ??
                        "Could not import pins from Pinterest right now."
                );
            }

            setSuccessMessage(
                `Imported ${payload.importedCount} pin${payload.importedCount === 1 ? "" : "s"} from ${payload.boardsCount} board${payload.boardsCount === 1 ? "" : "s"}.`
            );
            router.refresh();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not import pins from Pinterest right now."
            );
        } finally {
            setIsImportingPinterest(false);
        }
    }, [router]);

    const handleXImport = useCallback(async () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsImportingX(true);

        try {
            const response = await fetch("/api/integrations/x/import", {
                method: "POST",
            });
            const payload = (await response.json()) as
                | {
                      error?: string;
                      importedCount: number;
                      prunedCount: number;
                      updatedCount: number;
                  }
                | { error: string };

            if (!(response.ok && "importedCount" in payload)) {
                throw new Error(
                    payload.error ??
                        "Could not import bookmarks from X right now."
                );
            }

            setSuccessMessage(
                `Synced ${payload.importedCount + payload.updatedCount} X bookmark${payload.importedCount + payload.updatedCount === 1 ? "" : "s"}${payload.prunedCount > 0 ? ` and pruned ${payload.prunedCount}` : ""}.`
            );
            router.refresh();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not import bookmarks from X right now."
            );
        } finally {
            setIsImportingX(false);
        }
    }, [router]);

    if (isExtensionIntegration(id)) {
        const extensionLabel = extensionButtonLabel(extensionInstalled);

        return (
            <div className="ml-auto flex flex-col items-start gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={handleExtensionClick}
                        size="sm"
                        type="button"
                        variant="ghost"
                    >
                        {extensionLabel}
                    </Button>
                </div>
            </div>
        );
    }

    const connectLabel = connected ? "Reconnect" : "Connect";

    return (
        <div className="ml-auto flex flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    disabled={parked}
                    loading={isConnecting}
                    onClick={
                        isGooglePhotosIntegration
                            ? handleGoogleConnect
                            : handleGenericOAuthConnect
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                >
                    {parked ? "Soon" : connectLabel}
                </Button>
                {isGooglePhotosIntegration && connected ? (
                    <GooglePhotosImportButton variant="outline" />
                ) : null}
                {isXIntegration && connected ? (
                    <Button
                        loading={isImportingX}
                        onClick={handleXImport}
                        size="icon"
                        type="button"
                        variant="outline"
                    >
                        <RefreshCw className="size-4" />
                    </Button>
                ) : null}
                {isPinterestIntegration && connected ? (
                    <Button
                        loading={isImportingPinterest}
                        onClick={handlePinterestImport}
                        size="icon"
                        type="button"
                        variant="outline"
                    >
                        <RefreshCw className="size-4" />
                    </Button>
                ) : null}
            </div>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="text-destructive text-xs underline decoration-dotted"
                    role="alert"
                >
                    {errorMessage}
                </p>
            ) : null}
            {successMessage ? (
                <p
                    aria-live="polite"
                    className="text-emerald-600 text-xs"
                    role="status"
                >
                    {successMessage}
                </p>
            ) : null}
        </div>
    );
}
