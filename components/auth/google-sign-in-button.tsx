"use client";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const DEFAULT_ERROR_MESSAGE = "Could not start Google sign-in.";

/* @internal */
function getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        return err.message;
    }
    return String(err) || DEFAULT_ERROR_MESSAGE;
}

export function GoogleSignInButton({
    className,
    children,
    size = "xl",
    ...props
}: React.ComponentProps<typeof Button>) {
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const handleSignIn = useStableCallback(() => {
        setErrorMessage(null);
        startTransition(async () => {
            try {
                const result = await authClient.signIn.social({
                    callbackURL: "/library",
                    errorCallbackURL: "/",
                    provider: "google",
                });
                if (result.error) {
                    setErrorMessage(
                        result.error.message ?? DEFAULT_ERROR_MESSAGE
                    );
                }
            } catch (error) {
                setErrorMessage(getErrorMessage(error));
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
                <GoogleIcon />
                {children}
            </Button>
            <AuthErrorMessage>{errorMessage}</AuthErrorMessage>
        </div>
    );
}

/* @internal */
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
