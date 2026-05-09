import { buildPageMetadata } from "@/app/metadata";
import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { ApplicationSidebar } from "@/components/ui/application-sidebar";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarHeader } from "@/components/ui/sidebar";
import { WorkflowComposerDialog } from "@/components/workflows/workflow-composer-dialog";
import { WorkflowsList } from "@/components/workflows/workflows";
import { getServerSession } from "@/lib/auth/session";
import { listCollections } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { Workflow } from "lucide-react";
import type { Metadata } from "next";
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
            "workflows.metadata.description",
            "Manage lightweight automations that organize and summarize your saved content."
        ),
        keywords: ["workflows", "automation", "smart collections", "digest"],
        locale,
        path: "/workflows",
        title: gtPublicString(locale, "workflows.metadata.title", "Workflows"),
    });
}

export default async function WorkflowsPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const collections = await listCollections({ userId });
    const workflowCollectionOptions = collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
    }));

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader className="gap-3">
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                        <ApplicationSidebar />
                    </SidebarHeader>
                </Sidebar>
                <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                    <header className="flex items-center justify-between gap-4 border-border border-b pb-6">
                        <div className="flex items-center gap-2">
                            <Workflow
                                aria-hidden
                                className="size-5"
                                focusable="false"
                            />
                            <h1 className="font-semibold text-foreground text-xl">
                                Workflows
                            </h1>
                        </div>
                        <WorkflowComposerDialog
                            collections={workflowCollectionOptions}
                        />
                    </header>
                    <WorkflowsList collections={workflowCollectionOptions} />
                </div>
            </div>
        </PageShell>
    );
}
