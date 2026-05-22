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
    name: string;
    requestId: string;
}

const log = createLogger("Procedure");

const tracer = trace.getTracer("procedure");

const base = os.$context<ProcedureContext>();

z.config({ customError: createErrorMap() });

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
            const prefix = `(Procedure: ${context.name})`;

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
                    await stringifyProcedureErrorLog(error, payload)
                );

                if (isZodErrorLike(error)) {
                    throw fromZodError(error);
                }
                throw error;
            }

            log.error(
                prefix,
                await stringifyProcedureErrorLog(
                    error,
                    payload,
                    `[Unknown error: ${String(error)}]`
                )
            );
        } finally {
            if (shouldEndSpan) {
                span.end();
            }
        }
    })
);

async function stringifyProcedureErrorLog(
    error: unknown,
    payload: unknown,
    errorFallback?: string
): Promise<string> {
    const [sanitizedError, sanitizedPayload] = await Promise.all([
        safeSanitize(error, errorFallback),
        safeSanitize(payload),
    ]);

    return JSON.stringify({
        error: sanitizedError,
        payload: sanitizedPayload,
    });
}

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
