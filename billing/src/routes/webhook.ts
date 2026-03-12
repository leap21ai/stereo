import { Hono } from "hono";

import { generateLicenseKey, getLicenseBySubscriptionId, upsertLicense } from "../lib/license";
import { verifyWebhookSignature, resolveSubscriptionTier, isSubscriptionActive } from "../lib/stripe";
import { TIER_FEATURES } from "../types";

import type { AppEnv, LicenseStatus, LicenseTier } from "../types";

interface StripeSubscriptionObject {
  id: string;
  status: string;
  customer: string;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
  current_period_end: number;
}

interface StripeCheckoutSessionObject {
  id: string;
  subscription: string;
  customer: string;
  metadata: {
    license_key?: string;
    tier?: string;
  };
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeSubscriptionObject | StripeCheckoutSessionObject;
  };
}

const webhook = new Hono<AppEnv>();

webhook.post("/", async (c) => {
  const signatureHeader = c.req.header("stripe-signature");
  if (!signatureHeader) {
    return c.json({ error: "Missing Stripe signature" }, 400);
  }

  const rawBody = await c.req.text();

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(
    rawBody,
    signatureHeader,
    c.env.STRIPE_WEBHOOK_SECRET,
  );

  if (!isValid) {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  const event: StripeEvent = JSON.parse(rawBody);

  const handledEvents = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  if (!handledEvents.includes(event.type)) {
    // Acknowledge but ignore unhandled event types
    return c.json({ received: true, handled: false });
  }

  // Handle checkout.session.completed — create license from checkout metadata
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSessionObject;
    const licenseKey = session.metadata?.license_key;
    const tierStr = session.metadata?.tier;

    if (!licenseKey || !tierStr) {
      console.error("checkout.session.completed missing metadata:", session.id);
      return c.json({ received: true, handled: false });
    }

    const tier = (tierStr === "enterprise" ? "enterprise" : "pro") as LicenseTier;

    // Fetch the subscription to get current_period_end
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${session.subscription}`,
      {
        headers: { Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}` },
      },
    );
    const sub = (await subRes.json()) as StripeSubscriptionObject;
    const expiresAt = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    await upsertLicense(c.env.DB, {
      licenseKey,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      tier,
      status: "active",
      expiresAt,
    });

    console.log(
      `Webhook processed: checkout.session.completed sub=${session.subscription} tier=${tier}`,
    );

    return c.json({ received: true, handled: true });
  }

  // Handle subscription lifecycle events
  const subscription = event.data.object as StripeSubscriptionObject;

  const tier: LicenseTier = resolveSubscriptionTier(
    subscription,
    c.env.STRIPE_PRO_PRICE_ID,
    c.env.STRIPE_ENTERPRISE_PRICE_ID,
  );

  const active = isSubscriptionActive(subscription.status);

  let status: LicenseStatus;
  if (event.type === "customer.subscription.deleted") {
    status = "canceled";
  } else if (active) {
    status = "active";
  } else if (subscription.status === "past_due") {
    status = "past_due";
  } else {
    status = "expired";
  }

  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

  // Check if license already exists for this subscription
  const existing = await getLicenseBySubscriptionId(c.env.DB, subscription.id);
  const licenseKey = existing?.licenseKey ?? generateLicenseKey();

  await upsertLicense(c.env.DB, {
    licenseKey,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    tier,
    status,
    expiresAt,
  });

  console.log(
    `Webhook processed: ${event.type} sub=${subscription.id} tier=${tier} status=${status}`,
  );

  return c.json({ received: true, handled: true });
});

export { webhook };
