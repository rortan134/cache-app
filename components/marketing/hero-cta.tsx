"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { T } from "gt-next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

interface HeroCtaProps {
    isAuthenticated: boolean;
}

export function HeroCta({ isAuthenticated }: HeroCtaProps) {
    const router = useRouter();

    useHotkeys("p", () => {
        if (isAuthenticated) {
            router.push("/library");
        } else {
            authClient.signIn.social({
                callbackURL: "/library",
                errorCallbackURL: "/",
                provider: "google",
            });
        }
    });

    if (isAuthenticated) {
        return (
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
        );
    }

    return (
        <GoogleSignInButton>
            <T context="Sign in/up CTA button">Continue with Google</T>
        </GoogleSignInButton>
    );
}
