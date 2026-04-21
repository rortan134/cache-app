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
import { useRouter } from "next/navigation";
import type * as React from "react";

function LogoutButton(props: React.ComponentProps<typeof DialogTrigger>) {
    const router = useRouter();

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
                        onClick={() => {
                            router.push("/logout");
                        }}
                        render={<Button variant="destructive" />}
                    >
                        Log out
                    </DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}

export { LogoutButton };
