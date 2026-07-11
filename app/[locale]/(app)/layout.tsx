import { BackToTopButton } from "@/components/ui/back-to-top-button";
import { MotionProvider } from "@/components/ui/motion-provider";
import { PageShell } from "@/components/ui/page-shell";
import { SidebarProvider } from "@/components/ui/sidebar";
import { T } from "gt-next";
import { ChevronUp } from "lucide-react";
import type * as React from "react";

export default function ApplicationLayout({
    children,
}: React.PropsWithChildren) {
    return (
        <MotionProvider>
            <PageShell className="flex-1 gap-8 lg:flex-row lg:justify-between">
                <SidebarProvider>{children}</SidebarProvider>
                <BackToTopButton>
                    <ChevronUp
                        aria-hidden
                        className="size-4.5"
                        focusable="false"
                    />
                    <T>Back to top</T>
                </BackToTopButton>
            </PageShell>
        </MotionProvider>
    );
}
