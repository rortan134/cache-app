"use client";

import { GooglePhotosImportButton } from "@/components/library/entry/google-photos-import-button";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { authClient } from "@/lib/auth/client";
import { CACHE_EXTENSION_DOWNLOAD_URL } from "@/lib/constants";
import { type IntegrationId } from "@/lib/integrations/support";
import { Info, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

export function Integrations(props: React.ComponentProps<typeof Collapsible>) {
    return <Collapsible defaultOpen {...props} />;
}

export function IntegrationsTrigger(
    props: React.ComponentProps<typeof CollapsibleTrigger>,
) {
    return <CollapsibleTrigger {...props} />;
}

export function IntegrationsPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>,
) {
    return <CollapsiblePanel {...props} />;
}

export function IntegrationsNotice() {
    const [isConnectAccountNoteOpen, setIsConnectAccountNoteOpen] =
        React.useState(true);

    return (
        <Collapsible
            onOpenChange={setIsConnectAccountNoteOpen}
            open={isConnectAccountNoteOpen}
        >
            <CollapsiblePanel className="mt-1.5">
                <div className="flex gap-1.5">
                    <Info className="mt-0.5 inline-block size-3.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                        Please only connect accounts you trust. Cache can access
                        what you choose to save with connected apps. You can
                        always change your mind.
                        <Button
                            className="h-fit! leading-tight sm:text-[11px]"
                            onClick={() => setIsConnectAccountNoteOpen(false)}
                            size="xs"
                            type="button"
                            variant="link"
                        >
                            Dismiss
                        </Button>
                    </p>
                </div>
            </CollapsiblePanel>
        </Collapsible>
    );
}

interface IntegrationActionProps {
    isConnected: boolean;
    id: IntegrationId;
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
    id: IntegrationId,
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

export function IntegrationItem(props: React.ComponentProps<"div">) {
    return (
        <div
            className="flex items-center gap-2.5 first:mt-3.5 pt-1"
            {...props}
        />
    );
}

export function IntegrationAction({ isConnected, id }: IntegrationActionProps) {
    const router = useRouter();
    const isExtensionInstalled = useIsExtensionInstalled();
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [isImportingX, setIsImportingX] = React.useState(false);
    const [isImportingPinterest, setIsImportingPinterest] =
        React.useState(false);
    const isGooglePhotosIntegration = id === "google-photos";
    const isPinterestIntegration = id === "pinterest";
    const isXIntegration = id === "x";

    const handleExtensionClick = () => {
        if (!isExtensionIntegration(id)) {
            return;
        }

        openExternal(
            isExtensionInstalled
                ? EXTENSION_OPEN_URL[id]
                : CACHE_EXTENSION_DOWNLOAD_URL,
        );
    };

    const handleGoogleConnect = async () => {
        setIsConnecting(true);

        try {
            const result = await authClient.signIn.social({
                callbackURL: "/library",
                errorCallbackURL: "/library",
                provider: "google",
            });

            if (result.error) {
            }
        } catch (error) {
        } finally {
            setIsConnecting(false);
        }
    };

    const handleGenericOAuthConnect = async () => {
        if (!isOAuthIntegration(id) || id === "google-photos") {
            return;
        }

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
                return;
            }

            window.location.assign(redirectUrl);
        } catch (error) {
        } finally {
            setIsConnecting(false);
        }
    };

    const handlePinterestImport = async () => {
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
                        "Could not import pins from Pinterest right now.",
                );
            }

            router.refresh();
        } catch (error) {
        } finally {
            setIsImportingPinterest(false);
        }
    };

    const handleXImport = async () => {
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
                        "Could not import bookmarks from X right now.",
                );
            }

            router.refresh();
        } catch (error) {
        } finally {
            setIsImportingX(false);
        }
    };

    if (isExtensionIntegration(id)) {
        const extensionLabel = extensionButtonLabel(isExtensionInstalled);

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

    return (
        <div className="ml-auto flex items-center gap-1">
            <Button
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
                {isConnected ? "Reconnect" : "Connect"}
            </Button>
            {isGooglePhotosIntegration && isConnected ? (
                <GooglePhotosImportButton variant="outline" />
            ) : null}
            {isXIntegration && isConnected ? (
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
            {isPinterestIntegration && isConnected ? (
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
    );
}
