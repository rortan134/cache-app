"use client";

import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { T } from "gt-next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

interface SignInButtonProps {
    hasServerSession: boolean;
}

export function SignInButton({ hasServerSession }: SignInButtonProps) {
    const router = useRouter();

    useHotkeys("p", () => {
        if (hasServerSession) {
            router.push("/library");
        }
    });

    if (hasServerSession) {
        return (
            <>
                <Button
                    render={
                        <Link href="/library">
                            Go to my library
                            <ChevronRight className="size-4" />
                        </Link>
                    }
                    size="xl"
                    suppressHydrationWarning
                />
                <span className="mx-auto -mt-4 text-center text-muted-foreground text-xs italic opacity-80">
                    Press <Kbd>P</Kbd>
                </span>
            </>
        );
    }

    return (
        <>
            <GoogleSignInButton>
                <T context="Sign in/up CTA button">Continue with Google</T>
            </GoogleSignInButton>
            <AppleSignInButton>
                <T context="Sign in/up CTA button">Continue with Apple</T>
            </AppleSignInButton>
        </>
    );
}
