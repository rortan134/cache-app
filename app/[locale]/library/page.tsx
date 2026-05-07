import { buildPageMetadata } from "@/app/metadata";
import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { Browser } from "@/components/library/browser";
import { Collections } from "@/components/library/collections";
import {
    IntegrationsList,
    IntegrationsListFeedback,
    IntegrationsListItem,
    IntegrationsListItemAction,
    IntegrationsListPanel,
    IntegrationsListPrivacyNotice,
    IntegrationsListTrigger,
} from "@/components/library/integrations";
import { WorkspaceProvider } from "@/components/library/workspace";
import { AppSidebarNavigation } from "@/components/ui/app-sidebar-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DisclosureList } from "@/components/ui/disclosure-list";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import { PageShell } from "@/components/ui/page-shell";
import {
    Sidebar,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/session";
import { userHasActiveSubscription } from "@/lib/billing/service";
import { getLibraryItems, listCollections } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { listLinkedIntegrationAccounts } from "@/lib/integrations/service";
import {
    INTEGRATIONS,
    listConnectedIntegrationIds,
} from "@/lib/integrations/support";
import { T } from "gt-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

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
    await connection();

    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const hasAccess = await userHasActiveSubscription(userId);

    const [
        { itemSources, items, lockedItemCount, totalItemCount },
        collections,
        linkedAccounts,
    ] = await Promise.all([
        getLibraryItems({
            hasAccess,
            userId,
        }),
        listCollections({ userId }),
        listLinkedIntegrationAccounts({ userId }),
    ]);

    const connectedIntegrationIdSet = new Set(
        listConnectedIntegrationIds("source", {
            libraryItemSources: itemSources.map((item) => item.source),
            linkedProviderIds: linkedAccounts.map(
                (account) => account.providerId
            ),
        })
    );

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <WorkspaceProvider
                    hasAccess={hasAccess}
                    initialCollections={collections}
                    initialItems={items}
                >
                    <SidebarProvider>
                        <Sidebar>
                            <SidebarHeader className="gap-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="min-w-0 flex-1"
                                        data-sidebar-collapsible=""
                                    >
                                        <UserMenu>
                                            <UserMenuHeader />
                                            <UserMenuContent />
                                            <UserMenuFooter />
                                        </UserMenu>
                                    </div>
                                    <SidebarTrigger />
                                </div>
                                <AppSidebarNavigation />
                                <div data-sidebar-collapsible="">
                                    <IntegrationsList>
                                        <IntegrationsListTrigger>
                                            <span className="min-w-0 text-xs">
                                                <T>Integrations</T>
                                            </span>
                                            <ChevronDownFilledIcon className="-ml-0.5" />
                                            <Kbd className="ml-auto bg-transparent opacity-0 group-hover:opacity-50">
                                                <CmdKbd />I
                                            </Kbd>
                                        </IntegrationsListTrigger>
                                        <IntegrationsListPanel>
                                            <DisclosureList maxVisible={6}>
                                                {INTEGRATIONS.map(
                                                    ({
                                                        id,
                                                        label,
                                                        description,
                                                        Icon,
                                                    }) => (
                                                        <IntegrationsListItem
                                                            className="group"
                                                            key={id}
                                                        >
                                                            <Avatar
                                                                aria-label={
                                                                    label
                                                                }
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
                                                                    {
                                                                        description
                                                                    }
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
                                            </DisclosureList>
                                            <IntegrationsListFeedback />
                                            <IntegrationsListPrivacyNotice />
                                        </IntegrationsListPanel>
                                    </IntegrationsList>
                                </div>
                                <div data-sidebar-collapsible="">
                                    <Collections />
                                </div>
                            </SidebarHeader>
                        </Sidebar>
                    </SidebarProvider>
                    <Browser
                        lockedItemCount={lockedItemCount}
                        totalItemCount={totalItemCount}
                    />
                </WorkspaceProvider>
            </div>
        </PageShell>
    );
}
