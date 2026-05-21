import { getSessionUserId, type Session } from "@/lib/auth/session";
import { extractNamedErrorMessage, NamedError } from "@/lib/common/error";
import { createLogger, type Logger } from "@/lib/common/logs/console/logger";
import { safeSanitize } from "@/lib/common/logs/sanitize";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { onError, os } from "@orpc/server";
import * as z from "zod";
import {
    createErrorMap,
    fromZodError,
    isZodErrorLike,
} from "zod-validation-error";

interface ProcedureContext {
    actionName?: string;
    requestId?: string;
    session?: NonNullable<Session>["session"];
    subscription?: {
        plan: string;
        status: string | null;
    } | null;
    user?: NonNullable<Session>["user"];
}

const log = createLogger("ServerAction");

const tracer = trace.getTracer("procedure");

const base = os.$context<ProcedureContext>();

z.config({
    customError: createErrorMap(),
});

export const procedure = base.use(
    onError(async (error, { context }) => {
        const activeSpan = trace.getActiveSpan();
        const shouldEndSpan = !activeSpan;
        const span = activeSpan ?? tracer.startSpan("procedure-error");

        try {
            const payload =
                "data" in error
                    ? (error as unknown as { data?: unknown }).data
                    : undefined;
            const prefix = `(Server action: ${context.actionName})`;

            span.recordException(
                error instanceof Error ? error : { message: String(error) }
            );
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.addEvent("action.error", {
                error: error instanceof Error ? error.message : String(error),
            });

            if (error instanceof Error) {
                const message =
                    error instanceof NamedError
                        ? `[${JSON.stringify(error.toObject())}]`
                        : "";
                error.message += `${prefix} ${message}`;

                log.error(
                    prefix,
                    JSON.stringify(await safeSanitize(error)),
                    payload
                );

                if (isZodErrorLike(error)) {
                    throw fromZodError(error);
                }
                throw error;
            }

            log.error(
                prefix,
                JSON.stringify(
                    await safeSanitize(
                        error,
                        `[Unknown error: ${String(error)}]`
                    )
                ),
                payload
            );
        } finally {
            if (shouldEndSpan) {
                span.end();
            }
        }
    })
);

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
