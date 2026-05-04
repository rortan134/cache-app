import "server-only";

import { getSessionUserId } from "@/lib/auth/server";
import { extractNamedErrorMessage } from "@/lib/common/error";
import type { Logger } from "@/lib/common/logs/console/logger";
import type * as z from "zod";

interface ErrorWithCode<Code extends string> {
    data: {
        code: Code;
    };
}

interface ErrorFactory<Code extends string> {
    isInstance(error: unknown): error is ErrorWithCode<Code>;
}

type ActionErrorStatus<Status extends string> = "ERROR" | Status;

export async function requireActionUserId(unauthorizedMessage: string): Promise<
    | {
          status: "UNAUTHORIZED";
          message: string;
      }
    | {
          userId: string;
      }
> {
    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: unauthorizedMessage,
            status: "UNAUTHORIZED",
        };
    }

    return { userId };
}

export function getValidationErrorMessage(
    parsed: z.ZodSafeParseError<unknown>,
    fallbackMessage: string
): string {
    return parsed.error.issues[0]?.message ?? fallbackMessage;
}

export function handleActionError<Code extends string, Status extends string>({
    codeToStatus,
    error,
    errorFactory,
    fallbackMessage,
    log,
}: {
    codeToStatus: Partial<Record<Code, Status>>;
    error: unknown;
    errorFactory: ErrorFactory<Code>;
    fallbackMessage: string;
    log: Logger;
}): {
    message: string;
    status: ActionErrorStatus<Status>;
} {
    const named = extractNamedErrorMessage(error);
    if (errorFactory.isInstance(error)) {
        const status = codeToStatus[error.data.code];
        if (status) {
            return {
                message: named.message,
                status,
            };
        }
    }

    log.error(fallbackMessage, error);
    return {
        message: fallbackMessage,
        status: "ERROR",
    };
}
