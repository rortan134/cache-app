import { NamedError } from "@/lib/common/error";
import * as z from "zod";
import type { IntegrationId } from "./support";

const IntegrationErrorData = z.object({
    cause: z.unknown().optional(),
    integrationId: z.custom<IntegrationId>().optional(),
    message: z.string(),
    operation: z.string().optional(),
});

export const IntegrationConnectionError = NamedError.create(
    "IntegrationConnectionError",
    IntegrationErrorData
);
export type IntegrationConnectionError = InstanceType<
    typeof IntegrationConnectionError
>;

export const IntegrationApiError = NamedError.create(
    "IntegrationApiError",
    IntegrationErrorData.extend({
        status: z.number().optional(),
    })
);
export type IntegrationApiError = InstanceType<typeof IntegrationApiError>;

export const IntegrationUserError = NamedError.create(
    "IntegrationUserError",
    IntegrationErrorData.extend({
        accountId: z.string().optional(),
        capability: z.string().optional(),
        resource: z.string().optional(),
        retryAfter: z.number().optional(),
    })
);
export type IntegrationUserError = InstanceType<typeof IntegrationUserError>;
