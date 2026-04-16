"use client";

import { Button } from "@/components/ui/button";
import { GoogleMarkIcon } from "@/components/ui/icons";
import { authClient } from "@/lib/auth/client";
import { useState, useTransition } from "react";

function GoogleSignInButton({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSignIn = () => {
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
                        result.error.message ??
                            "Could not start Google sign-in."
                    );
                }
            } catch (err) {
                setErrorMessage(
                    err instanceof Error
                        ? err.message
                        : "Could not start Google sign-in."
                );
            }
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                aria-label="Continue with Google"
                className="border border-[#747775] bg-white text-[#1f1f1f] shadow-xs hover:bg-[#f8f9fa] dark:border-input dark:bg-popover dark:text-foreground dark:hover:bg-accent/50"
                loading={isPending}
                onClick={handleSignIn}
                size="xl"
                type="button"
            >
                <GoogleMarkIcon />
                {children}
            </Button>
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="text-destructive text-sm underline decoration-dotted underline-offset-4"
                    role="alert"
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

export { GoogleSignInButton };
