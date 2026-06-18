import { PageShell } from "@/components/ui/page-shell";
import { SidebarProvider } from "@/components/ui/sidebar";
import type * as React from "react";

export default function ApplicationLayout({
    children,
}: React.PropsWithChildren) {
    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <SidebarProvider>{children}</SidebarProvider>
            </div>
        </PageShell>
    );
}
