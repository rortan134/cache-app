import { serverEnv } from "@/env/server";
import type * as React from "react";
import { Resend, type Attachment } from "resend";

const resend = new Resend(serverEnv.EMAIL_SERVER_PASSWORD);

interface SendEmailOptions {
    attachments?: Attachment[];
    body: React.ReactNode;
    cc?: readonly string[];
    from?: string;
    scheduledAt?: string;
    subject: string;
    to: string | string[];
}

export async function sendEmail({
    to,
    subject,
    body,
    from = serverEnv.EMAIL_FROM,
    cc,
    attachments,
    scheduledAt,
}: SendEmailOptions) {
    const { error } = await resend.emails.send({
        attachments,
        cc: cc && cc.length > 0 ? [...cc] : undefined,
        from,
        react: body,
        scheduledAt,
        subject,
        to,
    });

    if (error) {
        throw new Error(error.message);
    }
}
