import { createLogger } from "@/lib/common/logs/console/logger";
import Stripe from "stripe";
import { StripeError } from "./error";

const logger = createLogger("Stripe:client");

let stripeInstance: Stripe | null = null;

/**
 * Get configured Stripe client instance.
 * @throws {StripeError} If STRIPE_SECRET_KEY is missing
 * @internal
 */
export const getStripeClient = (): Stripe => {
    if (stripeInstance) {
        return stripeInstance;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        throw new StripeError({
            message: "Stripe disabled: Missing STRIPE_SECRET_KEY",
            operation: "core::getStripeClient",
        });
    }

    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-03-25.dahlia",
        typescript: true,
    });

    return stripeInstance;
};

type WithStripeCallback<T> = (client: Stripe) => Promise<T> | T;

/**
 * Executes a callback with the Stripe client, normalizing errors to StripeError.
 * @throws {StripeError} If Stripe is not configured or the callback fails
 */
export const withStripe = async <T>(
    callbackFn: WithStripeCallback<T>
): Promise<T> => {
    try {
        const client = getStripeClient();
        return await callbackFn(client);
    } catch (error) {
        logger.error("Stripe operation failed:", error);

        if (error instanceof StripeError) {
            throw error;
        }

        throw new StripeError({
            cause: error,
            message: error instanceof Error ? error.message : String(error),
            operation: "core::withStripe",
        });
    }
};

export const getStripeWebhookSecret = (): string => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new StripeError({
            message: "Stripe webhook secret is not set",
            operation: "core::getStripeWebhookSecret",
        });
    }
    return process.env.STRIPE_WEBHOOK_SECRET;
};
