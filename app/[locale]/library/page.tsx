import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { LibraryWorkspace } from "@/components/library/browser";
import {
    IntegrationAction,
    IntegrationItem,
    Integrations,
    IntegrationsNotice,
    IntegrationsPanel,
    IntegrationsTrigger,
} from "@/components/library/entry/integrations";
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
import { INTEGRATIONS } from "@/lib/integrations/support";
import { getLibraryItemsForUser } from "@/lib/library/get-library-items";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
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
                    in: ["google", "pinterest", "x"],
                },
                userId,
            },
        }),
    ]);

    const providers = new Set(
        linkedAccounts.map((account) => account.providerId)
    );

    const isIntegrationConnected = (
        id: (typeof INTEGRATIONS)[number]["id"]
    ) => {
        if (id === "google-photos") {
            return providers.has("google");
        }
        if (id === "pinterest") {
            return providers.has("pinterest");
        }
        if (id === "chrome") {
            return items.some(
                (item) => item.source === LibraryItemSource.chrome_bookmarks
            );
        }
        if (id === "x") {
            return providers.has("x");
        }
        if (id === "youtube") {
            return items.some(
                (item) => item.source === LibraryItemSource.youtube_watch_later
            );
        }
        return false;
    };

    const connectedIntegrationIds = INTEGRATIONS.flatMap(({ id }) =>
        isIntegrationConnected(id) ? [id] : []
    );
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
                            <Integrations>
                                <IntegrationsTrigger className="flex select-none items-center gap-1.5 rounded-full bg-muted/94 px-3 py-2 text-left text-foreground hover:bg-input/50 active:bg-input/30">
                                    <span
                                        aria-hidden="true"
                                        className="shrink-0 leading-none"
                                    >
                                        <RadialChart
                                            size={36}
                                            value={progressPercent}
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1 font-medium text-sm leading-tight">
                                        {text}
                                    </span>
                                    <ChevronDownFilledIcon />
                                </IntegrationsTrigger>
                                <IntegrationsPanel>
                                    {INTEGRATIONS.map(
                                        ({ id, label, description, Icon }) => (
                                            <IntegrationItem key={id}>
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
                                                <IntegrationAction
                                                    id={id}
                                                    isConnected={connectedIntegrationIds.includes(
                                                        id
                                                    )}
                                                />
                                            </IntegrationItem>
                                        )
                                    )}
                                    <IntegrationsNotice />
                                </IntegrationsPanel>
                            </Integrations>
                        </>
                    }
                />
            </div>
        </PageShell>
    );
}
