import { Hono } from "hono";

import { generateLicenseKey, getLicenseBySubscriptionId, upsertLicense } from "../lib/license";
import { verifyWebhookSignature, resolveSubscriptionTier, isSubscriptionActive } from "../lib/stripe";
import { TIER_FEATURES } from "../types";

import type { AppEnv, LicenseStatus, LicenseTier } from "../types";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
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
    };
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
  const subscription = event.data.object;

  const handledEvents = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  if (!handledEvents.includes(event.type)) {
    // Acknowledge but ignore unhandled event types
    return c.json({ received: true, handled: false });
  }

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
