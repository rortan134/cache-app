"use client";

import { LogoutDialogTrigger } from "@/components/auth/logout-dialog-trigger";
import { WithUserSessionOnly } from "@/components/auth/session";
import {
    BillingPortalButton,
    SubscribedOnly,
    SubscriptionStatusBadge,
    SubscriptionUpgradeButton,
    UnsubscribedOnly,
} from "@/components/billing/subscription";
import { KeyboardShortcutsDialogTrigger } from "@/components/ui/shortcuts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AltKbd, CmdKbd, Kbd, ShiftKbd } from "@/components/ui/kbd";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { cn } from "@/lib/common/cn";
import { getInitials } from "@/lib/common/strings";
import { LocaleSelector, T } from "gt-next";
import { ArrowUpRight, ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

export const UserMenu: typeof Popover = Popover;

export function UserMenuTrigger(
    props: React.ComponentProps<typeof PopoverTrigger>
) {
    return (
        <PopoverTrigger {...props}>
            <WithUserSessionOnly loadingRender={<UserMenuTriggerSkeleton />}>
                {(user) => (
                    <span className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-5.5 rounded-md">
                            <AvatarImage
                                alt={user.name ?? user.email}
                                loading="lazy"
                                src={user.image ?? undefined}
                            />
                            <AvatarFallback className="rounded-md">
                                {getInitials(user.name, user.email)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 truncate text-left font-medium text-sm">
                            {user.name ?? <T>Account</T>}
                        </span>
                    </span>
                )}
            </WithUserSessionOnly>
            <ChevronDown
                aria-hidden
                className="pointer-events-none inline-block size-3.5 shrink-0 opacity-80 group-data-popup-open:opacity-0"
                focusable="false"
            />
        </PopoverTrigger>
    );
}

export function UserMenuPopup({
    children,
    align = "start",
    className,
    positionMethod = "fixed",
    side = "top",
    ...props
}: React.ComponentProps<typeof PopoverPopup>) {
    return (
        <PopoverPopup
            align={align}
            className={cn("min-w-[248px]", className)}
            positionMethod={positionMethod}
            side={side}
            {...props}
        >
            <div className="flex flex-col gap-4">{children}</div>
        </PopoverPopup>
    );
}

export function UserMenuHeader() {
    return (
        <WithUserSessionOnly>
            {(user) => (
                <div className="w-full min-w-0 flex-1">
                    <div className="-mx-2">
                        <Button
                            className="h-11 w-full min-w-0 flex-1 justify-start text-left sm:h-11"
                            variant="ghost"
                        >
                            <div>
                                <p className="truncate font-medium text-sm">
                                    {user.name ?? <T>Cache account</T>}
                                </p>
                                <p className="truncate text-muted-foreground text-sm">
                                    {user.email}
                                </p>
                            </div>
                        </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
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
            <UserMenuSection>
                <div className="flex items-center justify-between pr-2 pl-2.5">
                    <span className="font-medium text-foreground text-sm">
                        <T>Theme</T>
                    </span>
                    <ThemeSelector />
                </div>
            </UserMenuSection>
            <UserMenuSection>
                <SubscribedOnly>
                    <BillingPortalButton />
                </SubscribedOnly>
                <UnsubscribedOnly>
                    <SubscriptionUpgradeButton>
                        <T>Upgrade to Pro</T>
                    </SubscriptionUpgradeButton>
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
                <LogoutDialogTrigger
                    render={
                        <Button className="justify-between" variant="ghost" />
                    }
                >
                    <T context="User Log out/Sign out of the app">Log out</T>
                    <span
                        aria-hidden
                        className="ml-auto inline-flex items-center gap-2"
                    >
                        <Kbd>
                            <AltKbd />
                            <ShiftKbd />Q
                        </Kbd>
                        <LogOut className="inline-block size-4 shrink-0 text-muted-foreground" />
                    </span>
                </LogoutDialogTrigger>
            </UserMenuSection>
        </>
    );
}

export function UserMenuFooter() {
    return (
        <>
            <UserMenuSectionSeparator />
            <LocaleSelector />
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

/** @internal */
function UserMenuTriggerSkeleton() {
    return (
        <SidebarItem className="justify-between px-2">
            <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="size-5.5 rounded-md" />
                <Skeleton className="h-4 w-24" />
            </div>
            <ChevronDown
                aria-hidden
                className="pointer-events-none inline-block size-3.5 shrink-0 opacity-80 group-data-popup-open:opacity-0"
                focusable="false"
            />
        </SidebarItem>
    );
}

/** @internal */
function UserMenuSection({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <>
            <UserMenuSectionSeparator />
            <div
                className={cn("-mx-2 flex flex-col gap-1", className)}
                {...props}
            />
        </>
    );
}

/** @internal */
function UserMenuSectionSeparator() {
    return (
        <div className="relative -my-1">
            <Separator className="absolute left-1/2 -translate-x-1/2 data-horizontal:w-[400px]" />
        </div>
    );
}
