import { serverEnv } from "@/env/server";
import { createLogger } from "@/lib/logs/console/logger";
import Stripe from "stripe";
import { StripeError } from "./error";

const logger = createLogger("Stripe");

let stripeInstance: Stripe | null = null;

export const isStripeEnabled = () => !!serverEnv.STRIPE_SECRET_KEY;

/**
 * Get configured Stripe client instance
 * @throws {StripeError} If configuration is invalid
 * @internal
 */
export const getStripeClient = (): Stripe => {
    if (stripeInstance) {
        return stripeInstance;
    }

    if (!isStripeEnabled()) {
        throw new StripeError({
            message: "Stripe disabled: Missing STRIPE_SECRET_KEY",
            operation: "core::getStripeClient::enabled_check",
        });
    }

    stripeInstance = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
        apiVersion: "2026-03-25.dahlia",
        typescript: true,
    });

    return stripeInstance;
};

type WithStripeCallback<T> = (client: Stripe) => Promise<T> | T;

/**
 * Executes a function with a Stripe client
 * @throws {StripeError} If configuration is invalid
 */
export const withStripe = async <T>(
    callbackFn: WithStripeCallback<T>
): Promise<T | null> => {
    try {
        if (!isStripeEnabled()) {
            logger.warn("Stripe operations disabled by configuration");
            return null;
        }

        const stripeClient = getStripeClient();
        return await callbackFn(stripeClient);
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
    if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
        throw new StripeError({
            message: "Stripe webhook secret is not set",
            operation: "core::getStripeWebhookSecret",
        });
    }
    return serverEnv.STRIPE_WEBHOOK_SECRET;
};
