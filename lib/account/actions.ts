"use server";

import { isUnauthenticated, requireActionUserId } from "@/lib/auth/service";
import { AccountError } from "@/lib/account/error";
import * as service from "@/lib/account/service";

export interface DeleteAccountActionState {
    message: string;
    redirect: null | string;
    status: "error" | "success";
}

export async function deleteAccountAction(): Promise<DeleteAccountActionState> {
    const auth = await requireActionUserId(
        "Sign in again to delete your account."
    );
    if (isUnauthenticated(auth)) {
        return {
            message: auth.message,
            redirect: null,
            status: "error",
        };
    }

    try {
        const result = await service.deleteUserAccount(auth.userId);

        return {
            message: "",
            redirect: result.redirect,
            status: "success",
        };
    } catch (error) {
        if (error instanceof AccountError) {
            return {
                message: error.data.message,
                redirect: null,
                status: "error",
            };
        }

        return {
            message: "We couldn't delete your account. Please try again.",
            redirect: null,
            status: "error",
        };
    }
}
