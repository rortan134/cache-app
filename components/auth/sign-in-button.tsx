"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export function SignInButton({ hasServerSession }: SignInButtonProps) {
    const router = useRouter();

    const handleLibraryShortcut = useStableCallback(() => {
        if (hasServerSession) {
            router.push("/library");
        }
    });

    useHotkeys("p", handleLibraryShortcut, {
        description: "Go to library",
    });

    if (hasServerSession) {
        return (
            <div className="flex w-full flex-col items-stretch gap-2">
                <Button
                    nativeButton={false}
                    render={
                        <Link href="/library">
                            Go to my library
                            <ChevronRight className="size-4" />
                        </Link>
                    }
                    size="xl"
                />
                <span className="mx-auto hidden text-center text-muted-foreground text-xs md:block">
                    Press <Kbd>P</Kbd>
                </span>
            </div>
        );
    }

    return (
        <>
            <GoogleSignInButton>
                <T context="Sign in/up CTA button">Continue with Google</T>
            </GoogleSignInButton>
            <span className="-mt-3 inline-flex items-center gap-1 text-muted-foreground text-xs">
                <Check className="size-3.5" />
                <T>Get started now for free</T>
            </span>
        </>
    );
}

interface SignInButtonProps {
    hasServerSession: boolean;
}
