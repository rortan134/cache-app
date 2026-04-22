import { NamedError } from "@/lib/common/error";
import * as z from "zod";
import type { IntegrationId } from "./support";

const IntegrationErrorData = z.object({
    cause: z.unknown().optional(),
    integrationId: z.custom<IntegrationId>().optional(),
    message: z.string(),
    operation: z.string().optional(),
});

/**
 * Generic error for when an integration connection fails.
 */
export const IntegrationConnectionError = NamedError.create(
    "IntegrationConnectionError",
    IntegrationErrorData
);

/**
 * Generic error for when an integration authentication fails.
 */
export const IntegrationAuthError = NamedError.create(
    "IntegrationAuthError",
    IntegrationErrorData
);

/**
 * Generic error for when an integration API request fails.
 */
export const IntegrationApiError = NamedError.create(
    "IntegrationApiError",
    IntegrationErrorData.extend({
        status: z.number().optional(),
    })
);

/**
 * Generic error for when an integration is not connected.
 */
export const IntegrationNotConnectedError = NamedError.create(
    "IntegrationNotConnectedError",
    IntegrationErrorData
);

/**
 * Generic error for when an integration session has expired.
 */
export const IntegrationSessionExpiredError = NamedError.create(
    "IntegrationSessionExpiredError",
    IntegrationErrorData
);

/**
 * Generic error for when access is denied by the user or provider.
 */
export const IntegrationAccessDeniedError = NamedError.create(
    "IntegrationAccessDeniedError",
    IntegrationErrorData
);

/**
 * Generic error for when an integration provider rate limits requests.
 */
export const IntegrationRateLimitError = NamedError.create(
    "IntegrationRateLimitError",
    IntegrationErrorData.extend({
        retryAfter: z.number().optional(),
    })
);

/**
 * Generic error for when an integration provider has an internal error.
 */
export const IntegrationInternalError = NamedError.create(
    "IntegrationInternalError",
    IntegrationErrorData
);

/**
 * Generic error for when a required integration capability is missing.
 */
export const IntegrationCapabilityMissingError = NamedError.create(
    "IntegrationCapabilityMissingError",
    IntegrationErrorData.extend({
        capability: z.string(),
    })
);

/**
 * Generic error for when the integration provider is down or unavailable.
 */
export const IntegrationProviderDownError = NamedError.create(
    "IntegrationProviderDownError",
    IntegrationErrorData
);

/**
 * Generic error for when an account is already connected for the same integration.
 */
export const IntegrationAccountAlreadyConnectedError = NamedError.create(
    "IntegrationAccountAlreadyConnectedError",
    IntegrationErrorData.extend({
        accountId: z.string(),
    })
);
