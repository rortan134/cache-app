"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import {
    PrivilegedOnly,
    UnprivilegedOnly,
} from "@/components/billing/privilege";
import { KeyboardShortcutsDialogTrigger } from "@/components/library/shortcuts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { CrownFilledIcon } from "@/components/ui/icons";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { authClient } from "@/lib/auth/client";
import { getInitials } from "@/lib/strings";
import { LocaleSelector, T, Var, useLocale } from "gt-next";
import { ArrowUpRight, ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";

function SubscriptionBadge() {
    const { subscription } = useAccess();

    if (!subscription) {
        return (
            <Badge className="h-6! w-full" variant="secondary">
                <T context="Free plan label">Free plan</T>
            </Badge>
        );
    }

    const planLabel = subscription.plan
        ? subscription.plan[0]?.toUpperCase() + subscription.plan.slice(1)
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
                    <Var>{planLabel}</Var> ends <Var>{expiresAt ?? "soon"}</Var>
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
                    <Var>{planLabel}</Var> <Var>{intervalLabel}</Var>
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
                    {subscription.status?.replaceAll("_", " ") ?? "Unknown"}
                </Var>
            </T>
        </Badge>
    );
}

function UpgradeButton({ returnPath }: { returnPath: string }) {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleUpgrade = () => {
        startTransition(async () => {
            setErrorMessage(null);
            try {
                const { data, error } = await authClient.subscription.upgrade({
                    cancelUrl: returnPath,
                    plan: "pro",
                    successUrl: returnPath,
                });

                if (error) {
                    setErrorMessage(
                        error.message ?? "We couldn't open checkout right now."
                    );
                    return;
                }

                if (data?.url) {
                    window.location.assign(data.url);
                    return;
                }

                setErrorMessage("We couldn't open checkout right now.");
            } catch {
                setErrorMessage("We couldn't open checkout right now.");
            }
        });
    };

    return (
        <>
            <Button
                className="justify-start"
                loading={isPending}
                onClick={handleUpgrade}
                variant="ghost"
            >
                <T>Upgrade to Pro</T>
            </Button>
            {errorMessage && (
                <p className="px-2 text-destructive text-xs">{errorMessage}</p>
            )}
        </>
    );
}

function BillingPortalButton({ returnPath }: { returnPath: string }) {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleBillingPortal = () => {
        startTransition(async () => {
            setErrorMessage(null);
            try {
                const { data, error } =
                    await authClient.subscription.billingPortal({
                        returnUrl: returnPath,
                    });

                if (error) {
                    setErrorMessage(
                        error.message ?? "We couldn't open billing right now."
                    );
                    return;
                }

                if (data?.url) {
                    window.location.assign(data.url);
                    return;
                }

                setErrorMessage("We couldn't open billing right now.");
            } catch {
                setErrorMessage("We couldn't open billing right now.");
            }
        });
    };

    return (
        <>
            <Button
                className="justify-start"
                loading={isPending}
                onClick={handleBillingPortal}
                variant="ghost"
            >
                <T>Billing</T>
            </Button>
            {errorMessage && (
                <p className="px-2 text-destructive text-xs">{errorMessage}</p>
            )}
        </>
    );
}

function MenuSection({ children }: { children: ReactNode }) {
    return (
        <>
            <div className="relative -my-1">
                <Separator className="absolute left-1/2 -translate-x-1/2 data-horizontal:w-[400px]" />
            </div>
            <div className="-mx-2 flex flex-col gap-1">{children}</div>
        </>
    );
}

function UserMenuSkeleton() {
    return (
        <div className="flex w-full items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <Skeleton className="size-4" />
        </div>
    );
}

export function UserMenuHeader() {
    const { session } = useAccess();

    if (!session?.user) {
        return null;
    }

    const { user } = session;

    return (
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
                <PrivilegedOnly>
                    <BillingPortalButton returnPath={returnPath} />
                </PrivilegedOnly>
                <UnprivilegedOnly>
                    <UpgradeButton returnPath={returnPath} />
                    <Button
                        className="justify-between"
                        render={<Link href="/pricing" />}
                        variant="ghost"
                    >
                        <T>Pricing</T>
                        <ArrowUpRight className="ml-auto inline-block size-4.5 shrink-0 text-muted-foreground" />
                    </Button>
                </UnprivilegedOnly>
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
                        </Button>
                    }
                />
                <LogoutButton
                    render={
                        <Button className="justify-start" variant="ghost" />
                    }
                >
                    <T context="User Log out/Sign out of the app">Log out</T>
                </LogoutButton>
            </MenuSection>
        </>
    );
}

export function UserMenuFooter() {
    return (
        <>
            <div className="relative -my-1">
                <Separator className="absolute left-1/2 -translate-x-1/2 data-horizontal:w-[400px]" />
            </div>
            <LocaleSelector />
            <div className="relative -my-1">
                <Separator className="absolute left-1/2 -translate-x-1/2 data-horizontal:w-[400px]" />
            </div>
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
    const { isLoading, session } = useAccess();

    if (isLoading) {
        return <UserMenuSkeleton />;
    }

    if (!session?.user) {
        return null;
    }

    const { user } = session;

    return (
        <Popover>
            <PopoverTrigger
                className="w-full justify-between"
                render={<Button size="xl" variant="ghost" />}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-8 ring-1 ring-border/50">
                        <AvatarImage
                            alt={user.name ?? user.email}
                            src={user.image ?? undefined}
                        />
                        <AvatarFallback>
                            {getInitials(user.name, user.email)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-col items-start text-left">
                        <span className="truncate font-medium text-sm">
                            {user.name ?? <T>Account</T>}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                            {user.email}
                        </span>
                    </span>
                </span>
                <ChevronsUpDown
                    aria-hidden
                    className="size-4 text-muted-foreground"
                />
            </PopoverTrigger>
            <PopoverPopup align="start" positionMethod="fixed" side="top">
                <div className="flex flex-col gap-4">{children}</div>
            </PopoverPopup>
        </Popover>
    );
}
