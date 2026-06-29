import { extractNamedErrorMessage } from "@/lib/common/error";
import { createLogger, type Logger } from "@/lib/common/logs/console/logger";
import type * as z from "zod";

const log = createLogger("common:action");

export function getValidationErrorMessage(
    parsed: z.ZodSafeParseError<unknown>,
    fallbackMessage: string
): string {
    return parsed.error.issues[0]?.message ?? fallbackMessage;
}

interface ErrorWithCode<Code extends string> {
    data: {
        code: Code;
    };
}

interface ErrorFactory<Code extends string> {
    isInstance(error: unknown): error is ErrorWithCode<Code>;
}

type ActionErrorStatus<Status extends string> = "ERROR" | Status;

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

export function tryAction<TInput, TOutput extends { status: string }>(
    action: (input: TInput) => Promise<TOutput>,
    errorMessage: string
): (input: TInput) => Promise<TOutput | { message: string; status: "ERROR" }> {
    return async (input) => {
        try {
            return await action(input);
        } catch (error) {
            log.error("Server action failed before returning a result", {
                error,
            });
            return { message: errorMessage, status: "ERROR" as const };
        }
    };
}
