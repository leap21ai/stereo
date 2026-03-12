import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../db/schema";
import { TIER_FEATURES } from "../types";

import type { LicenseTier, LicenseStatus } from "../types";

export const generateLicenseKey = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `stereo_live_${hex}`;
};

export const generateId = (): string => {
  return crypto.randomUUID();
};

export const getLicenseByKey = async (
  db: D1Database,
  licenseKey: string,
) => {
  const d = drizzle(db, { schema });
  const results = await d
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.licenseKey, licenseKey))
    .limit(1);

  return results[0] ?? null;
};

export const getLicenseBySubscriptionId = async (
  db: D1Database,
  subscriptionId: string,
) => {
  const d = drizzle(db, { schema });
  const results = await d
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.stripeSubscriptionId, subscriptionId))
    .limit(1);

  return results[0] ?? null;
};

export const upsertLicense = async (
  db: D1Database,
  data: {
    licenseKey: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    tier: LicenseTier;
    status: LicenseStatus;
    expiresAt: string | null;
  },
) => {
  const existing = await getLicenseBySubscriptionId(db, data.stripeSubscriptionId);
  const features = JSON.stringify(TIER_FEATURES[data.tier]);
  const now = new Date().toISOString();

  if (existing) {
    const d = drizzle(db, { schema });
    await d
      .update(schema.licenses)
      .set({
        tier: data.tier,
        status: data.status,
        features,
        expiresAt: data.expiresAt,
        updatedAt: now,
      })
      .where(eq(schema.licenses.stripeSubscriptionId, data.stripeSubscriptionId));

    return { ...existing, tier: data.tier, status: data.status, features, updatedAt: now };
  }

  const d = drizzle(db, { schema });
  const id = generateId();
  await d.insert(schema.licenses).values({
    id,
    licenseKey: data.licenseKey,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    tier: data.tier,
    status: data.status,
    features,
    expiresAt: data.expiresAt,
  });

  return { id, ...data, features };
};

export const isCacheExpired = (updatedAt: string, ttlMs = 3600000): boolean => {
  const updated = new Date(updatedAt).getTime();
  return Date.now() - updated > ttlMs;
};

export const getActivationCount = async (
  db: D1Database,
  licenseKey: string,
): Promise<number> => {
  const d = drizzle(db, { schema });
  const results = await d
    .select()
    .from(schema.activations)
    .where(eq(schema.activations.licenseKey, licenseKey));

  return results.length;
};

export const activateMachine = async (
  db: D1Database,
  licenseKey: string,
  machineId: string,
) => {
  const now = new Date().toISOString();

  // Try upsert — update lastSeenAt if already activated, otherwise insert
  const d = drizzle(db, { schema });
  const existing = await d
    .select()
    .from(schema.activations)
    .where(eq(schema.activations.licenseKey, licenseKey))
    .limit(100);

  const existingMachine = existing.find((a) => a.machineId === machineId);

  if (existingMachine) {
    await d
      .update(schema.activations)
      .set({ lastSeenAt: now })
      .where(eq(schema.activations.id, existingMachine.id));

    return { alreadyActivated: true, count: existing.length };
  }

  const id = generateId();
  await d.insert(schema.activations).values({
    id,
    licenseKey,
    machineId,
    activatedAt: now,
    lastSeenAt: now,
  });

  return { alreadyActivated: false, count: existing.length + 1 };
};
