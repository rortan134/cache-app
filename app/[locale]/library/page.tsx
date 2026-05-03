import { buildPageMetadata } from "@/app/metadata";
import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { Root } from "@/components/library/browser";
import { CollectionsListRoot } from "@/components/library/collections";
import {
    IntegrationsList,
    IntegrationsListFeedback,
    IntegrationsListItem,
    IntegrationsListItemAction,
    IntegrationsListPanel,
    IntegrationsListPrivacyNotice,
    IntegrationsListTrigger,
} from "@/components/library/integrations";
import { WorkspaceProvider } from "@/components/library/workspace-provider";
import { ActivePathname } from "@/components/ui/active-pathname";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CtrlKbd, Kbd } from "@/components/ui/kbd";
import { PageShell } from "@/components/ui/page-shell";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
} from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/server";
import { userHasActiveSubscription } from "@/lib/billing/subscriptions/subscription-access";
import {
    getLibraryPageData,
    getUserSmartCollectionsPreference,
} from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { listLinkedIntegrationAccounts } from "@/lib/integrations/service";
import {
    INTEGRATIONS,
    listConnectedIntegrationIds,
} from "@/lib/integrations/support";
import { T } from "gt-next";
import { Compass, History, House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "library.metadata.description",
            "Saved items from your connected accounts and extension imports appear below by source."
        ),
        keywords: [
            "my library",
            "saved content",
            "bookmark library",
            "collections",
            "Cache App",
        ],
        locale,
        path: "/library",
        title: gtPublicString(locale, "library.metadata.title", "My library"),
    });
}

export default async function LibraryPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const [hasAccess, linkedAccounts, smartCollectionsDisabled] =
        await Promise.all([
            userHasActiveSubscription(userId),
            listLinkedIntegrationAccounts({ userId }),
            getUserSmartCollectionsPreference({ userId }),
        ]);

    const { collections, itemSources, items, lockedItemCount, totalItemCount } =
        await getLibraryPageData({
            hasAccess,
            userId,
        });

    const connectedIntegrationIds = listConnectedIntegrationIds("source", {
        libraryItemSources: itemSources.map((item) => item.source),
        linkedProviderIds: linkedAccounts.map((account) => account.providerId),
    });
    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <WorkspaceProvider
                    hasAccess={hasAccess}
                    initialCollections={collections}
                    initialItems={items}
                >
                    <Sidebar>
                        <SidebarHeader className="gap-3">
                            <UserMenu>
                                <UserMenuHeader />
                                <UserMenuContent />
                                <UserMenuFooter />
                            </UserMenu>
                            <SidebarGroup>
                                <Link
                                    className="contents"
                                    href="/library"
                                    prefetch
                                >
                                    <ActivePathname href="/library">
                                        <SidebarItem>
                                            <House
                                                aria-hidden
                                                className="inline-block size-4 shrink-0"
                                                focusable="false"
                                            />
                                            <span>
                                                <T>Home</T>
                                            </span>
                                        </SidebarItem>
                                    </ActivePathname>
                                </Link>
                                <Link className="contents" href="/review">
                                    <ActivePathname href="/review">
                                        <SidebarItem>
                                            <Compass
                                                aria-hidden
                                                className="inline-block size-4 shrink-0"
                                                focusable="false"
                                            />
                                            <span>
                                                <T>Review</T>
                                            </span>
                                        </SidebarItem>
                                    </ActivePathname>
                                </Link>
                                <Link
                                    className="contents"
                                    href="/activity"
                                    prefetch
                                >
                                    <ActivePathname href="/activity">
                                        <SidebarItem>
                                            <History
                                                aria-hidden
                                                className="inline-block size-4 shrink-0"
                                                focusable="false"
                                            />
                                            <span>
                                                <T>Activity</T>
                                            </span>
                                        </SidebarItem>
                                    </ActivePathname>
                                </Link>
                            </SidebarGroup>
                            <IntegrationsList>
                                <IntegrationsListTrigger>
                                    <span className="min-w-0 text-xs">
                                        <T>Integrations</T>
                                    </span>
                                    <ChevronDownFilledIcon className="-ml-0.5" />
                                    <Kbd className="ml-auto bg-transparent opacity-0 group-hover:opacity-50 group-data-panel-open:opacity-0!">
                                        <CtrlKbd />I
                                    </Kbd>
                                </IntegrationsListTrigger>
                                <IntegrationsListPanel>
                                    {INTEGRATIONS.map(
                                        ({ id, label, description, Icon }) => (
                                            <IntegrationsListItem
                                                className="group"
                                                key={id}
                                            >
                                                <Avatar
                                                    aria-label={label}
                                                    className="size-6 rounded-md"
                                                >
                                                    <AvatarFallback className="rounded-md">
                                                        <Icon
                                                            aria-hidden="true"
                                                            className="size-3.5 shrink-0"
                                                            focusable="false"
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                                                    {label}
                                                </span>
                                                <span className="relative flex items-center text-muted-foreground leading-snug">
                                                    <span className="absolute right-0 text-[11px] group-hover:opacity-0">
                                                        {description}
                                                    </span>
                                                    <IntegrationsListItemAction
                                                        className="absolute right-0 opacity-0 group-hover:opacity-100"
                                                        id={id}
                                                        isConnected={connectedIntegrationIdSet.has(
                                                            id
                                                        )}
                                                    />
                                                </span>
                                            </IntegrationsListItem>
                                        )
                                    )}
                                    <IntegrationsListFeedback />
                                    <IntegrationsListPrivacyNotice />
                                </IntegrationsListPanel>
                            </IntegrationsList>
                            <CollectionsListRoot
                                isSmartCollectionsDisabled={
                                    smartCollectionsDisabled
                                }
                            />
                        </SidebarHeader>
                    </Sidebar>
                    <div className="flex w-full max-w-[1024px] flex-col items-center gap-12 p-8 2xl:mx-auto">
                        <Root
                            lockedItemCount={lockedItemCount}
                            totalItemCount={totalItemCount}
                        />
                    </div>
                </WorkspaceProvider>
            </div>
        </PageShell>
    );
}
