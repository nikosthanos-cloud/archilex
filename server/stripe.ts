import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("⚠️ STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.");
}

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16" as any,
});

export const PLAN_PRICES: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
    unlimited: process.env.STRIPE_PRICE_ID_UNLIMITED,
};

export async function createCheckoutSession(userId: string, email: string, plan: string) {
    const priceId = PLAN_PRICES[plan];
    if (!priceId) throw new Error("Invalid plan or missing price ID");

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: "subscription",
        success_url: `${process.env.APP_URL}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/dashboard?status=cancel`,
        customer_email: email,
        client_reference_id: userId,
        metadata: {
            userId,
            plan,
        },
    });

    return session;
}

export async function cancelSubscription(subscriptionId: string) {
    return await stripe.subscriptions.cancel(subscriptionId);
}
