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
import {
    deleteAccountAction,
    type DeleteAccountActionState,
} from "@/lib/account/actions";
import { authClient } from "@/lib/auth/client";
import { createLogger } from "@/lib/common/logs/console/logger";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { useRouter } from "next/navigation";
import * as React from "react";

const log = createLogger("auth-delete-account");

/**
 * Confirmation dialog that hard-deletes the current account.
 *
 * Placed in the user-menu footer as a destructive menu item. The dialog
 * surfaces the irreversible outcome and centralizes the auth/billing work
 * behind a single server action so the user either keeps their account or
 * fully leaves — no half-deleted state.
 */
export function DeleteAccountDialogTrigger(
    props: React.ComponentProps<typeof DialogTrigger>
) {
    const router = useRouter();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();
    const [errorMessage, setErrorMessage] = React.useState<null | string>(null);

    const handleConfirm = useStableCallback(() => {
        setErrorMessage(null);
        startTransition(async () => {
            const result: DeleteAccountActionState =
                await deleteAccountAction();

            if (result.status === "error") {
                setErrorMessage(result.message);
                return;
            }

            try {
                await authClient.signOut();
            } catch (error) {
                log.error("signOut after account deletion failed", error);
            }

            router.push(result.redirect ?? "/logout");
        });
    });

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        setIsOpen(nextOpen);
        if (!nextOpen) {
            setErrorMessage(null);
        }
    });

    return (
        <Dialog onOpenChange={handleOpenChange} open={isOpen}>
            <DialogTrigger {...props} />
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>
                        <T context="Delete account dialog title">
                            Delete your account?
                        </T>
                    </DialogTitle>
                    <DialogDescription>
                        <T context="Delete account dialog description">
                            This cancels any active subscription and permanently
                            deletes your library, collections, and account data.
                            This can't be undone.
                        </T>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose
                        disabled={isPending}
                        render={<Button variant="ghost" />}
                    >
                        <T context="Cancel button">Cancel</T>
                    </DialogClose>
                    <Button
                        loading={isPending}
                        onClick={handleConfirm}
                        variant="destructive"
                    >
                        <T context="Confirm delete account button">
                            Delete account
                        </T>
                    </Button>
                </DialogFooter>
                {errorMessage ? (
                    <p
                        aria-live="assertive"
                        className="px-6 pb-6 text-destructive text-xs"
                        role="alert"
                    >
                        {errorMessage}
                    </p>
                ) : null}
            </DialogPopup>
        </Dialog>
    );
}
