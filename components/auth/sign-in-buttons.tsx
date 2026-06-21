"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

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
            <>
                <Button
                    render={
                        <Link href="/library">
                            Go to my library
                            <ChevronRight className="size-4" />
                        </Link>
                    }
                    size="xl"
                />
                <span className="mx-auto -mt-5 hidden text-center text-muted-foreground text-xs italic opacity-80 md:block">
                    Press <Kbd>P</Kbd>
                </span>
            </>
        );
    }

    return (
        <GoogleSignInButton>
            <T context="Sign in/up CTA button">Continue with Google</T>
        </GoogleSignInButton>
    );
}

interface SignInButtonProps {
    hasServerSession: boolean;
}
