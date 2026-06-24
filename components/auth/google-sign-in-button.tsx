"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth/client";
import { AuthErrorMessage } from "@/components/auth/auth-error-message";
import { cn } from "@/lib/common/cn";
import { getErrorMessage } from "@/lib/common/error";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const GOOGLE_SIGN_IN_ERROR_MESSAGE = "Could not start Google sign-in.";

export function GoogleSignInButton({
    callbackURL = "/library",
    className,
    children,
    size = "xl",
    ...props
}: ButtonProps & { callbackURL?: string }) {
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleSignIn = useStableCallback(() => {
        setErrorMessage(null);
        startTransition(async () => {
            try {
                const result = await authClient.signIn.social({
                    callbackURL,
                    errorCallbackURL: "/",
                    provider: "google",
                });

                if (result.error) {
                    setErrorMessage(
                        result.error.message ?? GOOGLE_SIGN_IN_ERROR_MESSAGE
                    );
                }
            } catch (error) {
                setErrorMessage(
                    getErrorMessage(error, GOOGLE_SIGN_IN_ERROR_MESSAGE)
                );
            }
        });
    });

    return (
        <div className="flex flex-col gap-1">
            <Button
                {...props}
                className={cn(
                    "border border-[#747775] bg-white text-[#1f1f1f] shadow-xs hover:bg-[#f8f9fa] dark:border-input dark:bg-popover dark:text-foreground dark:hover:bg-accent/50",
                    className
                )}
                loading={isPending}
                onClick={handleSignIn}
                size={size}
            >
                <GoogleIcon />
                {children}
            </Button>
            <AuthErrorMessage>{errorMessage}</AuthErrorMessage>
        </div>
    );
}
