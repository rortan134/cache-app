import { withStripe } from "@/lib/billing/client";
import { StripeError } from "@/lib/billing/error";

export async function createPaymentIntent({
    amountInCents,
    currency = "usd",
    description,
    metadata,
    customerId,
    stripeAccount,
    idempotencyKey,
}: {
    amountInCents: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, string>;
    customerId?: string;
    stripeAccount?: string;
    idempotencyKey?: string;
}) {
    const paymentIntent = await withStripe(async (stripe) => {
        if (customerId) {
            const [cards, links] = await Promise.all([
                stripe.paymentMethods.list({
                    customer: customerId,
                    type: "card",
                }),
                stripe.paymentMethods.list({
                    customer: customerId,
                    type: "link",
                }),
            ]);

            if (cards.data.length === 0 && links.data.length === 0) {
                throw new StripeError({
                    message: `No valid payment methods found for customer ${customerId}.`,
                    operation: "payment::createPaymentIntent",
                });
            }
        }

        return stripe.paymentIntents.create(
            {
                amount: amountInCents,
                automatic_payment_methods: {
                    enabled: true,
                },
                currency,
                customer: customerId,
                description,
                metadata,
            },
            { idempotencyKey, stripeAccount }
        );
    });

    return {
        client_secret: paymentIntent.client_secret,
        id: paymentIntent.id,
    };
}

export async function verifyPaymentSession(sessionId: string) {
    const session = await withStripe((stripe) =>
        stripe.checkout.sessions.retrieve(sessionId)
    );

    return {
        metadata: session.metadata,
        status: session.payment_status,
    };
}

export async function createStripeCheckoutSession({
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    metadata = {},
}: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
}) {
    const session = await withStripe((stripe) =>
        stripe.checkout.sessions.create({
            cancel_url: cancelUrl,
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata,
            mode: "payment",
            success_url: successUrl,
        })
    );

    if (!session.url) {
        throw new StripeError({
            message: "Failed to create checkout session",
            operation: "payment::createStripeCheckoutSession",
        });
    }

    return {
        sessionId: session.id,
        url: session.url,
    };
}

export async function createBillingPortalSession({
    customerId,
    returnUrl,
}: {
    customerId: string;
    returnUrl?: string;
}) {
    const session = await withStripe((stripe) =>
        stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        })
    );

    if (!session.url) {
        throw new StripeError({
            message: "Failed to create billing portal session",
            operation: "payment::createBillingPortalSession",
        });
    }

    return { url: session.url };
}

export async function cancelSubscription(customerId?: string) {
    if (!customerId) {
        return;
    }

    return await withStripe(async (stripe) => {
        const { data: subscriptions } = await stripe.subscriptions.list({
            customer: customerId,
        });
        const subscriptionId = subscriptions[0]?.id;

        if (!subscriptionId) {
            throw new StripeError({
                message: "Subscription not found",
                operation: "payment::cancelSubscription",
            });
        }

        return stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
            cancellation_details: {
                comment: "Customer deleted their workspace.",
            },
        });
    });
}
