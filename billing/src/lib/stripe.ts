import type { LicenseTier } from "../types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

interface StripeSubscription {
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

export const fetchSubscription = async (
  subscriptionId: string,
  stripeKey: string,
): Promise<StripeSubscription> => {
  const res = await fetch(`${STRIPE_API_BASE}/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${stripeKey}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<StripeSubscription>;
};

export const resolveSubscriptionTier = (
  subscription: StripeSubscription,
  proPriceId: string,
  enterprisePriceId: string,
): LicenseTier => {
  const priceIds = subscription.items.data.map((item) => item.price.id);

  if (priceIds.includes(enterprisePriceId)) {
    return "enterprise";
  }
  if (priceIds.includes(proPriceId)) {
    return "pro";
  }
  return "free";
};

export const isSubscriptionActive = (status: string): boolean => {
  return status === "active" || status === "trialing";
};

/**
 * Verify Stripe webhook signature using crypto.subtle (Workers-compatible).
 * Implements Stripe's v1 HMAC-SHA256 signature scheme.
 */
export const verifyWebhookSignature = async (
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> => {
  const elements = signatureHeader.split(",");
  const timestampStr = elements.find((e) => e.startsWith("t="))?.slice(2);
  const signatures = elements
    .filter((e) => e.startsWith("v1="))
    .map((e) => e.slice(3));

  if (!timestampStr || signatures.length === 0) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  const now = Math.floor(Date.now() / 1000);

  // Reject if timestamp is too old (replay attack prevention)
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestampStr}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload),
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  return timingSafeEqual(expectedSignature, signatures[0]);
};

/**
 * Timing-safe string comparison to prevent timing side-channel attacks.
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  // Use crypto.subtle.timingSafeEqual if available, otherwise manual XOR
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }

  return result === 0;
};
