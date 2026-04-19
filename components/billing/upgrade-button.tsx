"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import type * as React from "react";
import { useState, useTransition } from "react";

export function UpgradeButton({
    children = "Upgrade to Pro",
    className,
    fullWidth = true,
    locale,
    size = "xl",
    variant,
}: Readonly<{
    children?: React.ReactNode;
    className?: string;
    fullWidth?: boolean;
    locale: string;
    size?: ButtonProps["size"];
    variant?: ButtonProps["variant"];
}>) {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleUpgrade = () => {
        startTransition(async () => {
            setErrorMessage(null);

            try {
                const returnPath = `${window.location.origin}/${locale}/library`;
                const { data, error } = await authClient.subscription.upgrade({
                    cancelUrl: returnPath,
                    plan: "pro",
                    successUrl: returnPath,
                });

                if (error) {
                    setErrorMessage(
                        error.message ?? "We couldn't open checkout right now."
                    );
                    return;
                }

                if (data?.url) {
                    window.location.assign(data.url);
                    return;
                }

                setErrorMessage("We couldn't open checkout right now.");
            } catch {
                setErrorMessage("We couldn't open checkout right now.");
            }
        });
    };

    return (
        <div className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
            <Button
                className={cn(fullWidth && "w-full", className)}
                loading={isPending}
                onClick={handleUpgrade}
                size={size}
                type="button"
                variant={variant}
            >
                {children}
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="text-destructive text-sm"
                    role="alert"
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
