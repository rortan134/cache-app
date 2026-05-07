"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { WithSessionUser } from "@/components/auth/session";
import {
    SubscriptionOnly,
    UnsubscribedOnly,
    WithSubscription,
} from "@/components/billing/privilege";
import { KeyboardShortcutsDialogTrigger } from "@/components/library/shortcuts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { CrownFilledIcon } from "@/components/ui/icons";
import { AltKbd, CmdKbd, Kbd, KbdGroup, ShiftKbd } from "@/components/ui/kbd";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { getInitials } from "@/lib/common/strings";
import { LocaleSelector, T, Var, useLocale } from "gt-next";
import {
    ArrowUpRight,
    ChevronDown,
    LogOut,
    Monitor,
    Moon,
    Sun,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";

function subscriptionErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== "object" || !("message" in error)) {
        return;
    }
    const message = Reflect.get(error, "message");
    return typeof message === "string" ? message : undefined;
}

function subscriptionRedirectUrl(data: unknown): string | undefined {
    if (!data || typeof data !== "object" || !("url" in data)) {
        return;
    }
    const url = Reflect.get(data, "url");
    return typeof url === "string" && url.length > 0 ? url : undefined;
}

function useSubscriptionRedirectAction(
    request: () => Promise<{ data?: unknown; error?: unknown }>,
    fallbackMessage: string
) {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const execute = () => {
        startTransition(async () => {
            setErrorMessage(null);
            try {
                const { data, error } = await request();

                if (error) {
                    setErrorMessage(
                        subscriptionErrorMessage(error) ?? fallbackMessage
                    );
                    return;
                }

                const url = subscriptionRedirectUrl(data);
                if (url) {
                    window.location.assign(url);
                    return;
                }

                setErrorMessage(fallbackMessage);
            } catch {
                setErrorMessage(fallbackMessage);
            }
        });
    };

    return { errorMessage, execute, isPending };
}

function MenuSeparator() {
    return (
        <div className="relative -my-1">
            <Separator className="absolute left-1/2 -translate-x-1/2 data-horizontal:w-[400px]" />
        </div>
    );
}

function SubscriptionBadge() {
    return (
        <WithSubscription>
            {(subscription) => {
                if (!subscription) {
                    return (
                        <Badge className="h-6! w-full" variant="secondary">
                            <T context="Free plan label">Free plan</T>
                        </Badge>
                    );
                }

                const planLabel = subscription.plan
                    ? subscription.plan[0]?.toUpperCase() +
                      subscription.plan.slice(1)
                    : "Subscription";

                let intervalLabel: ReactNode | null = null;
                if (subscription.billingInterval === "year") {
                    intervalLabel = <T>yearly</T>;
                } else if (subscription.billingInterval === "month") {
                    intervalLabel = <T>monthly</T>;
                }

                const expiresAt = subscription.periodEnd
                    ? new Intl.DateTimeFormat(undefined, {
                          day: "numeric",
                          month: "short",
                      }).format(new Date(subscription.periodEnd))
                    : null;

                if (subscription.cancelAtPeriodEnd) {
                    return (
                        <Badge
                            className="h-6! w-full bg-amber-100 text-amber-900"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Subscription ends message">
                                <Var>{planLabel}</Var> ends{" "}
                                <Var>{expiresAt ?? "soon"}</Var>
                            </T>
                        </Badge>
                    );
                }

                if (subscription.status === "trialing") {
                    return (
                        <Badge
                            className="h-6! w-full bg-primary/10 text-primary"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Trialing status label">
                                <Var>{planLabel}</Var> trial, then{" "}
                                <Var>{intervalLabel}</Var>
                            </T>
                        </Badge>
                    );
                }

                if (subscription.status === "active") {
                    return (
                        <Badge
                            className="h-6! w-full bg-primary/10 text-primary"
                            variant="secondary"
                        >
                            <CrownFilledIcon />
                            <T context="Active status label">
                                <Var>{planLabel}</Var>{" "}
                                <Var>{intervalLabel}</Var>
                            </T>
                        </Badge>
                    );
                }

                return (
                    <Badge
                        className="h-6! w-full bg-muted text-muted-foreground"
                        variant="secondary"
                    >
                        <CrownFilledIcon />
                        <T context="Other subscription status">
                            <Var>{planLabel}</Var>{" "}
                            <Var>
                                {subscription.status?.replaceAll("_", " ") ??
                                    "Unknown"}
                            </Var>
                        </T>
                    </Badge>
                );
            }}
        </WithSubscription>
    );
}

function UpgradeButton({ returnPath }: { returnPath: string }) {
    const checkoutError = "We couldn't open checkout right now.";
    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.upgrade({
                cancelUrl: returnPath,
                plan: "pro",
                successUrl: returnPath,
            }),
        checkoutError
    );

    return (
        <>
            <Button
                className="justify-start"
                loading={isPending}
                onClick={execute}
                variant="ghost"
            >
                <T>Upgrade to Pro</T>
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="px-2 text-destructive text-xs"
                    role="status"
                >
                    {errorMessage}
                </p>
            ) : null}
        </>
    );
}

function BillingPortalButton({ returnPath }: { returnPath: string }) {
    const billingError = "We couldn't open billing right now.";
    const { errorMessage, execute, isPending } = useSubscriptionRedirectAction(
        () =>
            authClient.subscription.billingPortal({
                returnUrl: returnPath,
            }),
        billingError
    );

    return (
        <>
            <Button
                className="justify-start"
                loading={isPending}
                onClick={execute}
                variant="ghost"
            >
                <T>Billing</T>
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="px-2 text-destructive text-xs"
                    role="status"
                >
                    {errorMessage}
                </p>
            ) : null}
        </>
    );
}

function MenuSection({ children }: { children: ReactNode }) {
    return (
        <>
            <MenuSeparator />
            <div className="-mx-2 flex flex-col gap-1">{children}</div>
        </>
    );
}

function UserMenuSkeleton() {
    return (
        <SidebarItem className="justify-between px-2">
            <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="size-4" />
        </SidebarItem>
    );
}

export function UserMenuHeader() {
    return (
        <WithSessionUser>
            {(user) => (
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                        {user.name ?? <T>Cache account</T>}
                    </p>
                    <p className="truncate text-muted-foreground text-sm">
                        {user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <SubscriptionBadge />
                    </div>
                </div>
            )}
        </WithSessionUser>
    );
}

export function UserMenuContent() {
    const locale = useLocale();
    const returnPath = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/library`;

    return (
        <>
            <MenuSection>
                <div className="flex items-center justify-between pr-2 pl-2.5">
                    <span className="font-medium text-foreground text-sm">
                        <T>Theme</T>
                    </span>
                    <Group>
                        <Button className="rounded-full" variant="secondary">
                            <Sun className="size-4" />
                        </Button>
                        <Button className="rounded-full" variant="secondary">
                            <Moon className="size-4" />
                        </Button>
                        <Button className="rounded-full" variant="secondary">
                            <Monitor className="size-4" />
                        </Button>
                    </Group>
                </div>
            </MenuSection>
            <MenuSection>
                <SubscriptionOnly>
                    <BillingPortalButton returnPath={returnPath} />
                </SubscriptionOnly>
                <UnsubscribedOnly>
                    <UpgradeButton returnPath={returnPath} />
                    <Button
                        className="justify-between"
                        render={<Link href="/pricing" />}
                        variant="ghost"
                    >
                        <T>Pricing</T>
                        <ArrowUpRight className="ml-auto inline-block size-4.5 shrink-0 text-muted-foreground" />
                    </Button>
                </UnsubscribedOnly>
                <Button
                    className="justify-between"
                    render={<Link href="/changelog" />}
                    variant="ghost"
                >
                    <T>Changelog</T>
                    <ArrowUpRight className="ml-auto inline-block size-4.5 shrink-0 text-muted-foreground" />
                </Button>
                <Button
                    className="justify-between"
                    render={<Link href="mailto:gsmt.dev@gmail.com" />}
                    variant="ghost"
                >
                    <T>Support</T>
                    <ArrowUpRight className="ml-auto inline-block size-4.5 shrink-0 text-muted-foreground" />
                </Button>
                <KeyboardShortcutsDialogTrigger
                    render={
                        <Button className="justify-between" variant="ghost">
                            <T>Keyboard shortcuts</T>
                            <span
                                aria-hidden
                                className="ml-auto inline-flex items-center gap-1"
                            >
                                <Kbd>
                                    <CmdKbd />/
                                </Kbd>
                            </span>
                        </Button>
                    }
                />
                <LogoutButton
                    render={
                        <Button className="justify-between" variant="ghost" />
                    }
                >
                    <T context="User Log out/Sign out of the app">Log out</T>
                    <span
                        aria-hidden
                        className="ml-auto inline-flex items-center gap-1.5"
                    >
                        <KbdGroup>
                            <Kbd>
                                <AltKbd />
                            </Kbd>
                            <Kbd>
                                <ShiftKbd />
                            </Kbd>
                            <Kbd>Q</Kbd>
                        </KbdGroup>
                        <LogOut className="inline-block size-4 shrink-0 text-muted-foreground" />
                    </span>
                </LogoutButton>
            </MenuSection>
        </>
    );
}

export function UserMenuFooter() {
    return (
        <>
            <MenuSeparator />
            <LocaleSelector />
            <MenuSeparator />
            <div className="-mx-1 -mb-1 flex flex-wrap opacity-80">
                <Button
                    render={<Link href="/legal/privacy-policy" />}
                    size="xs"
                    variant="ghost"
                >
                    <T>Privacy</T>
                </Button>
                <Button
                    render={<Link href="/legal/terms-of-service" />}
                    size="xs"
                    variant="ghost"
                >
                    <T>Terms</T>
                </Button>
                <Button
                    render={<Link href="/security" />}
                    size="xs"
                    variant="ghost"
                >
                    <T>Security</T>
                </Button>
            </div>
        </>
    );
}

export function UserMenu({ children }: { children: ReactNode }) {
    return (
        <WithSessionUser loadingRender={<UserMenuSkeleton />}>
            {(user) => (
                <Popover>
                    <PopoverTrigger
                        className="justify-between px-2 opacity-100 data-popup-open:before:opacity-100"
                        nativeButton={false}
                        render={<SidebarItem />}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-5.5 rounded-md">
                                <AvatarImage
                                    alt={user.name ?? user.email}
                                    src={user.image ?? undefined}
                                />
                                <AvatarFallback className="rounded-md">
                                    {getInitials(user.name, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex min-w-0 flex-col items-start text-left">
                                <span className="truncate font-medium text-sm">
                                    {user.name ?? <T>Account</T>}
                                </span>
                            </span>
                        </span>
                        <ChevronDown
                            aria-hidden
                            className="pointer-events-none inline-block size-3.5 shrink-0 opacity-80"
                            focusable="false"
                        />
                    </PopoverTrigger>
                    <PopoverPopup
                        align="start"
                        className="min-w-[240px]"
                        positionMethod="fixed"
                        side="top"
                    >
                        <div className="flex flex-col gap-4">{children}</div>
                    </PopoverPopup>
                </Popover>
            )}
        </WithSessionUser>
    );
}
