import { buildPageMetadata } from "@/app/metadata";
import { ApplicationSidebar } from "@/components/application-sidebar";
import { AutomationComposerDialog } from "@/components/automations/automation-composer-dialog";
import { AutomationsList } from "@/components/automations/automations";
import { getServerSession } from "@/lib/auth/session";
import { listCollections } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import {
    listAutomationRuns,
    listAutomations,
} from "@/lib/intelligence/automations/service";
import { Bot } from "lucide-react";
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

    const automationCollectionOptions = collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
    }));

    const runsByAutomationId = Object.fromEntries(
        await Promise.all(
            automations.map(async (automation) => [
                automation.id,
                await listAutomationRuns({
                    automationId: automation.id,
                    limit: 5,
                    userId,
                }),
            ])
        )
    );

    return (
        <>
            <ApplicationSidebar />
            <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                <header className="flex items-center justify-between gap-4 border-border border-b pb-6">
                    <div className="flex items-center gap-2">
                        <Bot aria-hidden className="size-5" focusable="false" />
                        <h1 className="font-semibold text-foreground text-xl">
                            Automations
                        </h1>
                    </div>
                    <AutomationComposerDialog
                        collections={automationCollectionOptions}
                    />
                </header>
                <AutomationsList
                    automations={automations}
                    collections={automationCollectionOptions}
                    runsByAutomationId={runsByAutomationId}
                />
            </div>
        </>
    );
}
