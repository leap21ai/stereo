import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const licenses = sqliteTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    licenseKey: text("license_key").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    tier: text("tier", { enum: ["free", "pro", "enterprise"] })
      .notNull()
      .default("free"),
    status: text("status", { enum: ["active", "canceled", "past_due", "expired"] })
      .notNull()
      .default("active"),
    features: text("features").notNull().default("[]"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    expiresAt: text("expires_at"),
  },
  (table) => ({
    stripeSubIdx: index("idx_licenses_stripe").on(table.stripeSubscriptionId),
  }),
);

export const activations = sqliteTable(
  "activations",
  {
    id: text("id").primaryKey(),
    licenseKey: text("license_key")
      .notNull()
      .references(() => licenses.licenseKey),
    machineId: text("machine_id").notNull(),
    activatedAt: text("activated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    uniqueKeyMachine: uniqueIndex("idx_activations_key_machine").on(
      table.licenseKey,
      table.machineId,
    ),
    keyIdx: index("idx_activations_key").on(table.licenseKey),
  }),
);
