"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function LogoutDialogTrigger(
    props: React.ComponentProps<typeof DialogTrigger>
) {
    const router = useRouter();

    const handleLogout = useStableCallback(() => {
        router.push("/logout");
    });

    useHotkeys("alt+shift+q", handleLogout, {
        description: "Log out",
    });

    return (
        <Dialog>
            <DialogTrigger {...props} />
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Log out?</DialogTitle>
                    <DialogDescription>
                        You will need to sign in again to access your library.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>
                        Cancel
                    </DialogClose>
                    <DialogClose
                        onClick={handleLogout}
                        render={<Button variant="destructive" />}
                    >
                        Log out
                    </DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
