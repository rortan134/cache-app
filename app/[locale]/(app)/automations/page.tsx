import { buildPageMetadata } from "@/app/metadata";
import { AutomationComposerDialog } from "@/components/automations/automation-composer-dialog";
import { AutomationsList } from "@/components/automations/automations";
import { ApplicationSidebar } from "@/components/sidebar/application-sidebar";
import { getServerSession } from "@/lib/auth/session";
import { listCollections } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { listAutomations } from "@/lib/intelligence/automations/service";
import { T } from "gt-next";
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
            "automations.metadata.description",
            "Manage lightweight automations that organize and summarize your saved content."
        ),
        locale,
        path: "/automations",
        title: gtPublicString(
            locale,
            "automations.metadata.title",
            "Automations"
        ),
    });
}

export default async function AutomationsPage() {
    await connection();

    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const [automations, collections] = await Promise.all([
        listAutomations({ userId }),
        listCollections({ userId }),
    ]);

    const collectionOptions = collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
    }));

    return (
        <>
            <ApplicationSidebar />
            <div className="relative z-0 flex w-full min-w-0 flex-1 flex-col gap-4 p-8">
                <header className="flex items-end justify-between gap-4 border-border border-b pb-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="font-semibold text-foreground text-xl">
                            Automations
                        </h1>
                        <p className="text-muted-foreground text-xs">
                            <T>
                                Schedule tasks that organize your library,
                                research topics, summarize and much more — all
                                on autopilot
                            </T>
                        </p>
                    </div>
                    <AutomationComposerDialog collections={collectionOptions} />
                </header>
                <AutomationsList
                    automations={automations}
                    collections={collectionOptions}
                />
            </div>
        </>
    );
}
