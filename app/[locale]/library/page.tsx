import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { LibraryWorkspace } from "@/components/library/browser";
import {
    IntegrationsListEmpty,
    IntegrationsList,
    IntegrationsListItem,
    IntegrationsListItemAction,
    IntegrationsListNoticeCallout,
    IntegrationsListPanel,
    IntegrationsListTrigger,
} from "@/components/library/integrations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import { RadialChart } from "@/components/ui/radial-chart";
import { buildLocaleAlternates } from "@/lib/alternates";
import { getServerSession } from "@/lib/auth/server";
import { gtPublicString } from "@/lib/gt-public-json";
import {
    integrationSetupHeadingText,
    integrationSetupProgressPercent,
    partitionLibrarySyncLabels,
    syncableLibrarySourceTotal,
} from "@/lib/integrations/progress";
import {
    INTEGRATIONS,
    listConnectedIntegrationIds,
    listIntegrationAccountProviderIds,
} from "@/lib/integrations/support";
import { getLibraryItemsForUser } from "@/lib/library/get-library-items";
import { prisma } from "@/prisma";
import LogoIconImage from "@/public/cache-app-icon.png";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return {
        alternates: buildLocaleAlternates("/library"),
        description: gtPublicString(
            locale,
            "library.metadata.description",
            "Saved items from your connected accounts and extension imports appear below by source."
        ),
        title: gtPublicString(locale, "library.metadata.title", "My library"),
    };
}

export default async function LibraryPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const [{ collections, items }, linkedAccounts] = await Promise.all([
        getLibraryItemsForUser(userId),
        prisma.account.findMany({
            select: { providerId: true },
            where: {
                providerId: {
                    in: listIntegrationAccountProviderIds(),
                },
                userId,
            },
        }),
    ]);

    const connectedIntegrationIds = listConnectedIntegrationIds("source", {
        libraryItemSources: items.map((item) => item.source),
        linkedProviderIds: linkedAccounts.map((account) => account.providerId),
    });

    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);
    const syncable = syncableLibrarySourceTotal();
    const { connectedLabels, missingLabels } = partitionLibrarySyncLabels(
        items,
        connectedIntegrationIds
    );
    const connectedCount = connectedLabels.length;
    const text = integrationSetupHeadingText({
        connectedCount,
        connectedLabels,
        missingLabels,
        syncable,
    });
    const progressPercent = integrationSetupProgressPercent(
        connectedCount,
        syncable
    );

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <LibraryWorkspace
                    initialCollections={collections}
                    initialItems={items}
                    sidebarBottom={
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                    }
                    sidebarHeader={
                        <>
                            <BrandLogo href="/library" src={LogoIconImage} />
                            <IntegrationsList className="group">
                                <IntegrationsListTrigger>
                                    <RadialChart
                                        className="inline-block shrink-0"
                                        size={36}
                                        value={progressPercent}
                                    />
                                    <div className="relative">
                                        <span className="min-w-0 flex-1 truncate font-medium text-sm leading-none transition-opacity group-data-open:opacity-0 group-data-closed:duration-300 group-data-open:duration-400">
                                            Integrations
                                        </span>
                                        <span className="absolute top-1/2 left-0 min-w-0 flex-1 -translate-y-1/2 truncate font-medium text-sm leading-none opacity-0 transition-opacity group-data-open:opacity-100 group-data-closed:duration-300 group-data-open:duration-400">
                                            {text}
                                        </span>
                                    </div>
                                    <ChevronDownFilledIcon />
                                </IntegrationsListTrigger>
                                <IntegrationsListPanel>
                                    {INTEGRATIONS.length > 0 ? (
                                        INTEGRATIONS.map(
                                            ({
                                                id,
                                                label,
                                                description,
                                                Icon,
                                            }) => (
                                                <IntegrationsListItem key={id}>
                                                    <Avatar
                                                        aria-label={label}
                                                        className="size-9 rounded-lg ring-1 ring-border/60"
                                                    >
                                                        <AvatarFallback className="rounded-xl bg-card">
                                                            <Icon
                                                                aria-hidden="true"
                                                                className="size-5 shrink-0"
                                                                focusable="false"
                                                            />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex min-w-0 flex-1 flex-col">
                                                        <span className="font-medium text-sm leading-tight">
                                                            {label}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground leading-tight">
                                                            {description}
                                                        </span>
                                                    </div>
                                                    <IntegrationsListItemAction
                                                        id={id}
                                                        isConnected={connectedIntegrationIdSet.has(
                                                            id
                                                        )}
                                                    />
                                                </IntegrationsListItem>
                                            )
                                        )
                                    ) : (
                                        <IntegrationsListEmpty />
                                    )}
                                    <IntegrationsListNoticeCallout />
                                </IntegrationsListPanel>
                            </IntegrationsList>
                        </>
                    }
                />
            </div>
        </PageShell>
    );
}
