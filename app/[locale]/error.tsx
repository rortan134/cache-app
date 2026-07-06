"use client";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { createLogger } from "@/lib/common/logs/console/logger";
import LogoIconImage from "@/public/cache-app-icon.png";
import Link from "next/link";
import { useEffect } from "react";

const log = createLogger("ErrorComponent");

type NextError = Error & { digest?: string };

export default function ErrorPage({
    error,
    reset,
}: {
    error: NextError;
    reset: () => void;
}) {
    useEffect(() => {
        log.error(JSON.stringify(error));
    }, [error]);

    return (
        <PageShell>
            <div className="mx-auto flex h-svh max-w-md flex-col items-center justify-center gap-5 text-center">
                <BrandLogo className="scale-80" src={LogoIconImage} />
                <h1 className="font-medium text-foreground text-lg">
                    Something went wrong
                </h1>
                <p className="text-base text-muted-foreground">
                    We encountered an unexpected error…
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button onClick={() => reset()}>Try again</Button>
                    <Button render={<Link href="/" />}>Home</Button>
                </div>
            </div>
        </PageShell>
    );
}
