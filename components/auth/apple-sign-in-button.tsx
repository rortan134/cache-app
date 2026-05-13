"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { AppleIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const APPLE_SIGN_IN_ERROR_MESSAGE = "Could not start Apple sign-in.";

export function AppleSignInButton({
    className,
    children,
    size = "xl",
    ...props
}: ButtonProps) {
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleSignIn = useStableCallback(() => {
        setErrorMessage(null);
        startTransition(async () => {
            try {
                const result = await authClient.signIn.social({
                    callbackURL: "/library",
                    errorCallbackURL: "/",
                    provider: "apple",
                });

                if (result.error) {
                    setErrorMessage(
                        result.error.message ?? APPLE_SIGN_IN_ERROR_MESSAGE
                    );
                }
            } catch (error) {
                setErrorMessage(
                    getErrorMessage(error, APPLE_SIGN_IN_ERROR_MESSAGE)
                );
            }
        });
    });

    return (
        <div className="flex flex-col gap-1">
            <Button
                className={cn(
                    "border border-[#747775] bg-white text-[#1f1f1f] shadow-xs hover:bg-[#f8f9fa] dark:border-input dark:bg-popover dark:text-foreground dark:hover:bg-accent/50",
                    className
                )}
                loading={isPending}
                onClick={handleSignIn}
                size={size}
                {...props}
            >
                <AppleIcon />
                {children}
            </Button>
            <AuthErrorMessage>{errorMessage}</AuthErrorMessage>
        </div>
    );
}

function getErrorMessage(error: unknown, defaultErrorMessage: string): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error) || defaultErrorMessage;
}

function AuthErrorMessage(props: React.ComponentProps<"p">) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            aria-live="polite"
            className="text-destructive text-sm underline decoration-dotted underline-offset-4"
            role="status"
            {...props}
        />
    );
}
