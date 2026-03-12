import { Hono } from "hono";
import { z } from "zod";

import { getLicenseByKey, isCacheExpired, upsertLicense } from "../lib/license";
import { checkRateLimit } from "../lib/rate-limit";
import { fetchSubscription, resolveSubscriptionTier, isSubscriptionActive } from "../lib/stripe";
import { TIER_FEATURES } from "../types";

import type { AppEnv, LicenseStatus } from "../types";

const validateSchema = z.object({
  licenseKey: z.string().min(1).max(200),
});

const validate = new Hono<AppEnv>();

validate.post("/", async (c) => {
  // Parse and validate input
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { licenseKey } = parsed.data;

  // Rate limit: 60 req/min per license key
  const rateLimit = await checkRateLimit(c.env.DB, `validate:${licenseKey}`, 60, 60);
  if (!rateLimit.allowed) {
    return c.json(
      { error: "Rate limit exceeded", retryAfter: rateLimit.resetAt },
      429,
    );
  }

  // Check D1 cache
  const cached = await getLicenseByKey(c.env.DB, licenseKey);

  if (cached && !isCacheExpired(cached.updatedAt)) {
    const features: string[] = JSON.parse(cached.features);
    return c.json({
      valid: cached.status === "active",
      tier: cached.tier,
      features,
      expiresAt: cached.expiresAt,
    });
  }

  // Cache miss or expired — verify with Stripe
  if (!cached?.stripeSubscriptionId) {
    // No Stripe subscription linked — return cached state or invalid
    if (cached) {
      const features: string[] = JSON.parse(cached.features);
      return c.json({
        valid: cached.status === "active",
        tier: cached.tier,
        features,
        expiresAt: cached.expiresAt,
      });
    }

    return c.json({
      valid: false,
      tier: "free",
      features: TIER_FEATURES.free,
      expiresAt: null,
    });
  }

  try {
    const subscription = await fetchSubscription(
      cached.stripeSubscriptionId,
      c.env.STRIPE_SECRET_KEY,
    );

    const tier = resolveSubscriptionTier(
      subscription,
      c.env.STRIPE_PRO_PRICE_ID,
      c.env.STRIPE_ENTERPRISE_PRICE_ID,
    );

    const active = isSubscriptionActive(subscription.status);
    const status: LicenseStatus = active ? "active" : "expired";
    const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

    // Update D1 cache
    await upsertLicense(c.env.DB, {
      licenseKey,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      tier,
      status,
      expiresAt,
    });

    return c.json({
      valid: active,
      tier,
      features: TIER_FEATURES[tier],
      expiresAt,
    });
  } catch (err) {
    console.error("Stripe verification failed:", err);

    // Fall back to cached data if Stripe is unreachable
    if (cached) {
      const features: string[] = JSON.parse(cached.features);
      return c.json({
        valid: cached.status === "active",
        tier: cached.tier,
        features,
        expiresAt: cached.expiresAt,
      });
    }

    return c.json({ error: "License verification failed" }, 502);
  }
});

export { validate };
