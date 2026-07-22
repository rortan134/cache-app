"use client";

import { DeleteAccountDialogTrigger } from "@/components/auth/delete-account-dialog-trigger";
import { LogoutDialogTrigger } from "@/components/auth/logout-dialog-trigger";
import { WithUserSessionOnly } from "@/components/auth/session";
import {
    SubscribedOnly,
    SubscriptionBillingPortalButton,
    SubscriptionStatusBadge,
    SubscriptionUpgradeButton,
    UnsubscribedOnly,
} from "@/components/billing/subscription";
import { FeedbackWidget } from "@/components/support/feedback-widget";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AltKbd, CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuRadioGroup,
    MenuRadioItem,
    MenuSeparator,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import { KeyboardShortcutsDialogTrigger } from "@/components/ui/shortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { authClient, useSession } from "@/lib/auth/client";
import type { auth } from "@/lib/auth/server";
import { cn } from "@/lib/common/cn";
import { ACTION_STATUS } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { getInitials } from "@/lib/common/strings";
import { getDesktopDownloads } from "@/lib/desktop/actions";
import { DESKTOP_ASSETS } from "@/lib/desktop/constants";
import { detectDesktopPlatform } from "@/lib/desktop/platform";
import {
    getDesktopReleasesPageUrl,
    getStaticDesktopDownloads,
    type DesktopDownload,
} from "@/lib/desktop/releases";
import AppIconSmall from "@/public/cache-icon-small.png";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { LocaleSelector, T, Var } from "gt-next";
import {
    ArrowUpRight,
    ChevronDown,
    Download,
    Ellipsis,
    Globe,
    LoaderCircle,
    LogOut,
    UserRoundPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import useSWR from "swr";

const log = createLogger("auth-user-menu");

type Session = typeof auth.$Infer.Session;
type AccountMenuError = "add" | "load" | "switch";

type AccountUser = NonNullable<Session>["user"];

interface DeviceSession {
    session: {
        token: string;
    };
    user: AccountUser;
}

const FOOTER_LINKS = [
    { href: "/legal/privacy-policy", label: "Privacy" },
    { href: "/legal/terms-of-service", label: "Terms" },
    { href: "/security", label: "Security" },
] as const;

const DEVICE_SESSIONS_SWR_KEY = ["auth-user-menu:device-sessions"] as const;
const DESKTOP_DOWNLOADS_SWR_KEY = ["desktop:downloads"] as const;

export function UserMenu(
    props: Omit<React.ComponentProps<typeof Menu>, "open" | "onOpenChange">
) {
    const [isOpen, setIsOpen] = React.useState(false);

    const toggle = useStableCallback(() => {
        setIsOpen((prev) => !prev);
    });

    useHotkeys("mod+alt+g", toggle, {
        description: "Open account menu",
        preventDefault: true,
    });

    return <Menu {...props} onOpenChange={setIsOpen} open={isOpen} />;
}

export function UserMenuTrigger(
    props: React.ComponentProps<typeof MenuTrigger>
) {
    return (
        <MenuTrigger {...props} openOnHover>
            <WithUserSessionOnly loadingRender={<UserMenuTriggerSkeleton />}>
                {(user) => (
                    <span className="flex min-w-0 items-center gap-2">
                        <AccountAvatar user={user} />
                        <span className="min-w-0 max-w-full truncate text-left font-medium text-sm">
                            {user.name ?? <T>Account</T>}
                        </span>
                    </span>
                )}
            </WithUserSessionOnly>
            <ChevronDown
                aria-hidden
                className="pointer-events-none inline-block size-3.5 opacity-0 group-hover:opacity-80 group-data-popup-open:opacity-30"
                focusable="false"
            />
            <Kbd
                className="ml-auto bg-transparent opacity-0 group-hover:opacity-50"
                data-sidebar-label=""
            >
                <CmdKbd />
                <AltKbd />G
            </Kbd>
        </MenuTrigger>
    );
}

export function UserMenuPopup({
    children,
    align = "start",
    className,
    side = "top",
    ...props
}: React.ComponentProps<typeof MenuPopup>) {
    return (
        <MenuPopup
            {...props}
            align={align}
            className={cn("min-w-62", className)}
            side={side}
        >
            <div className="flex flex-col gap-1">{children}</div>
        </MenuPopup>
    );
}

export function UserMenuHeader() {
    return (
        <WithUserSessionOnly>
            {(user) => (
                <div className="w-full min-w-0 flex-1 pb-2">
                    <UserMenuAccountSwitcherSubMenu className="h-11 gap-5 rounded-xl">
                        <div className="min-w-0">
                            <span className="block truncate font-medium text-sm">
                                {user.name ?? <T>Cache account</T>}
                            </span>
                            <span className="block truncate text-muted-foreground text-xs">
                                {user.email}
                            </span>
                        </div>
                    </UserMenuAccountSwitcherSubMenu>
                    <div className="mx-2 mt-2 flex items-center gap-2">
                        <SubscriptionStatusBadge />
                    </div>
                </div>
            )}
        </WithUserSessionOnly>
    );
}

export function UserMenuContent() {
    return (
        <>
            <FeedbackWidget
                context="user-menu"
                nativeButton={false}
                render={<MenuItem closeOnClick={false} />}
            >
                Give feedback
                <Globe className="ml-auto inline-block size-3.5 text-muted-foreground" />
            </FeedbackWidget>
            <MenuSeparator />
            <MenuGroup>
                <div className="flex items-center justify-between pr-2 pl-2.5">
                    <span className="font-regular text-foreground text-sm">
                        <T>Theme</T>
                    </span>
                    <ThemeSelector />
                </div>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
                <SubscribedOnly>
                    <SubscriptionBillingPortalButton
                        className="w-full justify-start font-normal"
                        render={<MenuItem closeOnClick={false} />}
                    >
                        <T>Billing</T>
                        <ArrowUpRight className="ml-auto! inline-block size-4 text-muted-foreground" />
                    </SubscriptionBillingPortalButton>
                </SubscribedOnly>
                <UnsubscribedOnly>
                    <SubscriptionUpgradeButton
                        className="w-full justify-start font-normal"
                        render={<MenuItem closeOnClick={false} />}
                    >
                        <T>Upgrade to premium</T>
                        <div className="ml-auto inline-flex items-center justify-end gap-1">
                            <Image
                                alt=""
                                height={12}
                                src={AppIconSmall}
                                width={12}
                            />
                            <ArrowUpRight className="inline-block size-4 text-muted-foreground" />
                        </div>
                    </SubscriptionUpgradeButton>
                </UnsubscribedOnly>
                <MenuSub>
                    <MenuSubTrigger>
                        <T>Resources</T>
                    </MenuSubTrigger>
                    <MenuSubPopup>
                        <MenuItem
                            className="justify-between"
                            render={
                                <Link
                                    href="/changelog"
                                    prefetch={false}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                />
                            }
                        >
                            <T>Changelog</T>
                            <ArrowUpRight className="ml-auto! inline-block size-4 text-muted-foreground" />
                        </MenuItem>
                        <MenuItem
                            className="justify-between"
                            render={
                                <Link
                                    href="https://docs.cachd.app/docs/privacy"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                />
                            }
                        >
                            <T>Support</T>
                            <ArrowUpRight className="ml-auto! inline-block size-4 text-muted-foreground" />
                        </MenuItem>
                        <MenuItem
                            className="justify-between"
                            render={
                                <Link
                                    href="https://github.com/rortan134/cache-app"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                />
                            }
                        >
                            <T>GitHub</T>
                            <ArrowUpRight className="ml-auto! inline-block size-4 text-muted-foreground" />
                        </MenuItem>
                        <KeyboardShortcutsDialogTrigger
                            nativeButton={false}
                            render={
                                <MenuItem
                                    className="justify-between"
                                    closeOnClick={false}
                                >
                                    <T>Keyboard shortcuts</T>
                                    <Kbd className="ml-auto inline-flex items-center gap-1 bg-transparent px-0">
                                        <CmdKbd />/
                                    </Kbd>
                                </MenuItem>
                            }
                        />
                    </MenuSubPopup>
                </MenuSub>
                <UserMenuDesktopDownloadSubMenu />
                <LogoutDialogTrigger
                    nativeButton={false}
                    render={
                        <MenuItem
                            className="justify-between"
                            closeOnClick={false}
                        />
                    }
                >
                    <T context="User Log out/Sign out of the app">Log out</T>
                    <LogOut className="ml-auto inline-block size-3.5 text-muted-foreground" />
                </LogoutDialogTrigger>
            </MenuGroup>
        </>
    );
}

export function UserMenuFooter() {
    return (
        <>
            <MenuSeparator />
            <div className="flex w-full items-center px-1.5 pt-1 font-medium opacity-80 *:w-full *:text-sm">
                <LocaleSelector id="language-selector" name="language" />
            </div>
            <MenuSeparator className="mt-2" />
            <div className="flex flex-wrap items-center -space-x-0.5 p-1 opacity-50">
                {FOOTER_LINKS.map(({ href, label }) => (
                    <Button
                        key={href}
                        render={
                            <Link
                                href={href}
                                prefetch={false}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                        size="xs"
                        variant="ghost"
                    >
                        <T>
                            <Var>{label}</Var>
                        </T>
                    </Button>
                ))}
                <UserMenuAccountActionsSubMenu className="ml-auto">
                    <Ellipsis
                        aria-hidden
                        className="inline-block size-3.5 shrink-0"
                        focusable="false"
                    />
                </UserMenuAccountActionsSubMenu>
            </div>
        </>
    );
}

/* @internal */
function UserMenuDesktopDownloadSubMenu() {
    const recommendedPlatform = detectDesktopPlatform();
    const { data } = useSWR(DESKTOP_DOWNLOADS_SWR_KEY, fetchDesktopDownloads, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    });

    const downloads = data?.downloads ?? getStaticDesktopDownloads();
    const versionLabel = data?.version;

    return (
        <MenuSub>
            <MenuSubTrigger>
                <T>Download desktop app</T>
            </MenuSubTrigger>
            <MenuSubPopup align="end" className="min-w-50">
                <MenuGroup>
                    {versionLabel ? (
                        <MenuGroupLabel>
                            <T>
                                Version <Var>{versionLabel}</Var>
                            </T>
                        </MenuGroupLabel>
                    ) : null}
                    {downloads.map((download) => (
                        <DesktopDownloadMenuItem
                            download={download}
                            isRecommended={
                                download.platform === recommendedPlatform
                            }
                            key={download.platform}
                        />
                    ))}
                    <MenuSeparator />
                    <MenuItem
                        className="justify-between"
                        render={
                            <a
                                href={getDesktopReleasesPageUrl()}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                    >
                        <T>All releases</T>
                        <ArrowUpRight className="ml-auto inline-block size-4 text-muted-foreground" />
                    </MenuItem>
                </MenuGroup>
            </MenuSubPopup>
        </MenuSub>
    );
}

/* @internal */
function DesktopDownloadMenuItem({
    download,
    isRecommended,
}: {
    download: DesktopDownload;
    isRecommended: boolean;
}) {
    return (
        <MenuItem
            className="justify-between"
            render={
                <a
                    download={download.fileName}
                    href={download.url}
                    rel="noopener noreferrer"
                    target="_blank"
                />
            }
        >
            <span className="flex min-w-0 items-center gap-2">
                <span>{DESKTOP_ASSETS[download.platform].label}</span>
                {isRecommended ? (
                    <span className="text-muted-foreground text-xs">
                        <T>Recommended</T>
                    </span>
                ) : null}
            </span>
            <Download className="ml-auto inline-block size-3.5 text-muted-foreground" />
        </MenuItem>
    );
}

async function fetchDesktopDownloads(): Promise<{
    downloads: DesktopDownload[];
    status: "ok" | "fallback";
    version?: string;
}> {
    try {
        const result = await getDesktopDownloads();

        if (result.status === ACTION_STATUS.SUCCESS) {
            return {
                downloads: result.data.downloads,
                status: "ok",
                version: result.data.version,
            };
        }
    } catch (error) {
        log.warn("Desktop downloads action failed; using static URLs", error);
    }

    return {
        downloads: getStaticDesktopDownloads(),
        status: "fallback",
    };
}

/* @internal */
function UserMenuAccountActionsSubMenu(
    props: React.ComponentProps<typeof MenuSubTrigger>
) {
    return (
        <MenuSub>
            <MenuSubTrigger
                {...props}
                nativeButton
                render={<Button size="xs" variant="ghost" />}
                title="Account actions"
            />
            <MenuSubPopup align="end">
                <MenuGroup>
                    <DeleteAccountDialogTrigger
                        nativeButton={false}
                        render={
                            <MenuItem
                                closeOnClick={false}
                                nativeButton={false}
                                variant="destructive"
                            />
                        }
                    >
                        <T context="Delete account menu item">Delete account</T>
                    </DeleteAccountDialogTrigger>
                </MenuGroup>
            </MenuSubPopup>
        </MenuSub>
    );
}

/* @internal */
function UserMenuTriggerSkeleton() {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <Skeleton className="size-5.5 rounded-md" />
            <Skeleton className="h-4 w-16" />
        </span>
    );
}

/* @internal */
function AccountAvatar({ user }: { user: AccountUser }) {
    const label = user.name ?? user.email;

    return (
        <Avatar className="size-5.5 rounded-md">
            <AvatarImage
                alt={label}
                loading="lazy"
                src={user.image ?? undefined}
            />
            <AvatarFallback className="rounded-md text-xs">
                {getInitials(user.name, user.email)}
            </AvatarFallback>
        </Avatar>
    );
}

/* @internal */
function useUserMenuAccounts() {
    const { data: activeSession, refetch } = useSession();
    const router = useRouter();
    const [, startTransition] = React.useTransition();
    const [pendingSessionToken, setPendingSessionToken] = React.useState<
        null | string
    >(null);
    const [switchAccountError, setSwitchAccountError] =
        React.useState<unknown>(null);
    const [addAccountError, setAddAccountError] = React.useState<unknown>(null);
    const [isAddingAccount, setIsAddingAccount] = React.useState(false);
    const {
        data: deviceSessions = [],
        error: deviceSessionsError,
        isLoading: isLoadingDeviceSessions,
        mutate: refreshDeviceSessions,
    } = useSWR(
        activeSession ? DEVICE_SESSIONS_SWR_KEY : null,
        listDeviceSessions
    );

    const handleAccountChange = useStableCallback((sessionToken: unknown) => {
        if (
            !activeSession ||
            pendingSessionToken !== null ||
            typeof sessionToken !== "string" ||
            sessionToken === activeSession.session.token
        ) {
            return;
        }

        setPendingSessionToken(sessionToken);
        setSwitchAccountError(null);

        startTransition(async () => {
            try {
                const result = await authClient.multiSession.setActive({
                    sessionToken,
                });

                if (result.error) {
                    log.error("Failed to switch active session", result.error);
                    setSwitchAccountError(result.error);
                    return;
                }

                await Promise.all([refetch(), refreshDeviceSessions()]);
                router.refresh();
            } catch (error) {
                log.error("Failed to switch active session", error);
                setSwitchAccountError(error);
            } finally {
                setPendingSessionToken(null);
            }
        });
    });

    const handleAddAccount = useStableCallback(async () => {
        if (isAddingAccount) {
            return;
        }
        setAddAccountError(null);
        setIsAddingAccount(true);

        try {
            const result = await authClient.signIn.social({
                callbackURL: "/library",
                errorCallbackURL: "/library",
                provider: "google",
            });

            if (result.error) {
                log.error("Failed to add account session", result.error);
                setAddAccountError(result.error);
            }
        } catch (error) {
            log.error("Failed to add account session", error);
            setAddAccountError(error);
        } finally {
            setIsAddingAccount(false);
        }
    });

    const accountMenuError = getAccountMenuError(
        addAccountError,
        deviceSessionsError,
        switchAccountError
    );

    const accountOptions = activeSession
        ? getAccountOptions(deviceSessions, activeSession)
        : [];

    return {
        accountMenuError,
        accountOptions,
        activeSession,
        handleAccountChange,
        handleAddAccount,
        isAddingAccount,
        isLoadingDeviceSessions,
        pendingSessionToken,
    };
}

/* @internal */
function UserMenuAccountSwitcherSubMenu(
    props: React.ComponentProps<typeof MenuSubTrigger>
) {
    return (
        <MenuSub>
            <MenuSubTrigger {...props} />
            <MenuSubPopup align="end">
                <MenuGroup>
                    <MenuGroupLabel>
                        <T>Your accounts</T>
                    </MenuGroupLabel>
                    <UserMenuAccountSwitcherContent />
                </MenuGroup>
            </MenuSubPopup>
        </MenuSub>
    );
}

/* @internal */
function UserMenuAccountSwitcherContent() {
    const {
        accountMenuError,
        accountOptions,
        activeSession,
        handleAccountChange,
        handleAddAccount,
        isAddingAccount,
        isLoadingDeviceSessions,
        pendingSessionToken,
    } = useUserMenuAccounts();

    if (!activeSession) {
        return null;
    }

    if (isLoadingDeviceSessions) {
        return (
            <MenuItem disabled>
                <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                <T>Loading accounts</T>
            </MenuItem>
        );
    }

    if (accountMenuError) {
        return (
            <MenuItem disabled>
                <AccountMenuErrorMessage error={accountMenuError} />
            </MenuItem>
        );
    }

    return (
        <>
            <MenuRadioGroup
                disabled={Boolean(pendingSessionToken)}
                onValueChange={handleAccountChange}
                value={activeSession.session.token}
            >
                {accountOptions.map((deviceSession) => {
                    const accountLabel =
                        deviceSession.user.name ?? deviceSession.user.email;
                    const isPendingSession =
                        pendingSessionToken === deviceSession.session.token;

                    return (
                        <MenuRadioItem
                            closeOnClick={false}
                            key={deviceSession.user.id}
                            label={accountLabel}
                            value={deviceSession.session.token}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <AccountAvatar user={deviceSession.user} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">
                                        {deviceSession.user.name ?? (
                                            <T>Cache account</T>
                                        )}
                                    </span>
                                    <span className="block truncate text-muted-foreground text-xs">
                                        {deviceSession.user.email}
                                    </span>
                                </span>
                                {isPendingSession ? (
                                    <LoaderCircle className="ml-auto size-4 animate-spin text-muted-foreground" />
                                ) : null}
                            </span>
                        </MenuRadioItem>
                    );
                })}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem
                closeOnClick={false}
                disabled={isAddingAccount}
                onClick={handleAddAccount}
            >
                {isAddingAccount ? (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                ) : (
                    <UserRoundPlus className="size-4 text-muted-foreground" />
                )}
                <T>Add another account...</T>
            </MenuItem>
        </>
    );
}

function AccountMenuErrorMessage({ error }: { error: AccountMenuError }) {
    switch (error) {
        case "add":
            return <T>Could not add another account.</T>;
        case "load":
            return <T>Could not load saved accounts.</T>;
        case "switch":
            return <T>Could not switch accounts.</T>;
        default:
            return null;
    }
}

function getAccountOptions(
    deviceSessions: DeviceSession[],
    activeSession: Session
): DeviceSession[] {
    const hasActiveSession = deviceSessions.some(
        (deviceSession) =>
            deviceSession.session.token === activeSession.session.token
    );

    if (hasActiveSession) {
        return deviceSessions;
    }

    return [
        {
            session: {
                token: activeSession.session.token,
            },
            user: activeSession.user,
        },
        ...deviceSessions,
    ];
}

async function listDeviceSessions(): Promise<DeviceSession[]> {
    const result = await authClient.multiSession.listDeviceSessions();
    if (result.error) {
        log.error("Failed to load device sessions", result.error);
        throw new Error("Failed to load device sessions.");
    }
    return result.data ?? [];
}

function getAccountMenuError(
    addAccountError: unknown,
    deviceSessionsError: unknown,
    switchAccountError: unknown
): AccountMenuError | null {
    if (addAccountError) {
        return "add";
    }
    if (deviceSessionsError) {
        return "load";
    }
    if (switchAccountError) {
        return "switch";
    }
    return null;
}
