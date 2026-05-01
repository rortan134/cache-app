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

export const IntegrationAuthError = NamedError.create(
    "IntegrationAuthError",
    IntegrationErrorData
);
export type IntegrationAuthError = InstanceType<typeof IntegrationAuthError>;

export const IntegrationApiError = NamedError.create(
    "IntegrationApiError",
    IntegrationErrorData.extend({
        status: z.number().optional(),
    })
);
export type IntegrationApiError = InstanceType<typeof IntegrationApiError>;

export const IntegrationNotConnectedError = NamedError.create(
    "IntegrationNotConnectedError",
    IntegrationErrorData
);
export type IntegrationNotConnectedError = InstanceType<
    typeof IntegrationNotConnectedError
>;

export const IntegrationSessionExpiredError = NamedError.create(
    "IntegrationSessionExpiredError",
    IntegrationErrorData
);
export type IntegrationSessionExpiredError = InstanceType<
    typeof IntegrationSessionExpiredError
>;

export const IntegrationAccessDeniedError = NamedError.create(
    "IntegrationAccessDeniedError",
    IntegrationErrorData
);
export type IntegrationAccessDeniedError = InstanceType<
    typeof IntegrationAccessDeniedError
>;

export const IntegrationRateLimitError = NamedError.create(
    "IntegrationRateLimitError",
    IntegrationErrorData.extend({
        retryAfter: z.number().optional(),
    })
);
export type IntegrationRateLimitError = InstanceType<
    typeof IntegrationRateLimitError
>;

export const IntegrationInternalError = NamedError.create(
    "IntegrationInternalError",
    IntegrationErrorData
);
export type IntegrationInternalError = InstanceType<
    typeof IntegrationInternalError
>;

export const IntegrationCapabilityMissingError = NamedError.create(
    "IntegrationCapabilityMissingError",
    IntegrationErrorData.extend({
        capability: z.string(),
    })
);
export type IntegrationCapabilityMissingError = InstanceType<
    typeof IntegrationCapabilityMissingError
>;

export const IntegrationResourceNotFoundError = NamedError.create(
    "IntegrationResourceNotFoundError",
    IntegrationErrorData.extend({
        resource: z.string().optional(),
    })
);
export type IntegrationResourceNotFoundError = InstanceType<
    typeof IntegrationResourceNotFoundError
>;

export const IntegrationProviderDownError = NamedError.create(
    "IntegrationProviderDownError",
    IntegrationErrorData
);
export type IntegrationProviderDownError = InstanceType<
    typeof IntegrationProviderDownError
>;

export const IntegrationAccountAlreadyConnectedError = NamedError.create(
    "IntegrationAccountAlreadyConnectedError",
    IntegrationErrorData.extend({
        accountId: z.string(),
    })
);
export type IntegrationAccountAlreadyConnectedError = InstanceType<
    typeof IntegrationAccountAlreadyConnectedError
>;
