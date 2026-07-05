import { buildPageMetadata } from "@/app/metadata";
import { ApplicationSidebar } from "@/components/application-sidebar";
import { BrowserRoot } from "@/components/library/browser";
import { Collections } from "@/components/library/collections";
import { Integrations } from "@/components/library/integrations";
import { WorkspaceProvider } from "@/components/library/workspace";
import { getServerSession } from "@/lib/auth/session";
import { userHasActiveSubscription } from "@/lib/billing/service";
import { getLibrary, listCollections } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { listLinkedIntegrationAccounts } from "@/lib/integrations/account";
import {
    listConnectedIntegrationIds,
    type IntegrationId,
} from "@/lib/integrations/support";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

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
        locale,
        path: "/library",
        title: gtPublicString(locale, "library.metadata.title", "Library"),
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
        getLibrary({ hasAccess, userId }),
        listCollections({ userId }),
        listLinkedIntegrationAccounts({ userId }),
    ]);

    const integrationConnectionContext = {
        libraryItemSources: itemSources.map((item) => item.source),
        linkedProviderIds: linkedAccounts.map((account) => account.providerId),
    };
    const connectedIntegrations: Set<IntegrationId> = new Set([
        ...listConnectedIntegrationIds("source", integrationConnectionContext),
        ...listConnectedIntegrationIds(
            "destination",
            integrationConnectionContext
        ),
    ]);

    return (
        <WorkspaceProvider
            initialCollections={collections}
            initialItems={items}
            key={userId}
        >
            <ApplicationSidebar>
                <Integrations connectedIntegrations={connectedIntegrations} />
                <Collections />
            </ApplicationSidebar>
            <BrowserRoot
                connectedIntegrationCount={connectedIntegrations.size}
                lockedItemCount={lockedItemCount}
                totalItemCount={totalItemCount}
            />
        </WorkspaceProvider>
    );
}
