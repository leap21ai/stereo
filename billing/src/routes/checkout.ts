import { Hono } from "hono";
import { z } from "zod";

import { generateLicenseKey } from "../lib/license";

import type { AppEnv } from "../types";

const checkoutSchema = z.object({
  tier: z.enum(["pro", "enterprise"]),
  quantity: z.number().min(1).max(100).optional().default(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const checkout = new Hono<AppEnv>();

checkout.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { tier, quantity, successUrl, cancelUrl } = parsed.data;

  const priceId =
    tier === "pro" ? c.env.STRIPE_PRO_PRICE_ID : c.env.STRIPE_ENTERPRISE_PRICE_ID;

  // Generate a license key for this checkout
  const licenseKey = generateLicenseKey();

  // Create Stripe Checkout Session via fetch
  const params = new URLSearchParams({
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": String(quantity),
    "metadata[license_key]": licenseKey,
    "metadata[tier]": tier,
    "subscription_data[metadata][license_key]": licenseKey,
    "subscription_data[metadata][tier]": tier,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const session = (await res.json()) as { url: string; id: string; error?: unknown };

  if (!res.ok) {
    console.error("Stripe checkout error:", session);
    return c.json({ error: "Failed to create checkout session" }, 502);
  }

  return c.json({
    checkoutUrl: session.url,
    licenseKey,
    sessionId: session.id,
  });
});

export { checkout };
