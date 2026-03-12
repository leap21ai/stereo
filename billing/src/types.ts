import type { D1Database } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRO_PRICE_ID: string;
  STRIPE_ENTERPRISE_PRICE_ID: string;
  ALLOWED_ORIGINS: string;
};

export type Variables = {
  requestId: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

export type LicenseTier = "free" | "pro" | "enterprise";

export type LicenseStatus = "active" | "canceled" | "past_due" | "expired";

export const TIER_FEATURES: Record<LicenseTier, string[]> = {
  free: ["local-execution", "built-in-components"],
  pro: [
    "local-execution",
    "built-in-components",
    "team-sync",
    "shared-secrets",
    "component-registry",
    "output-history",
    "scheduled-runs",
  ],
  enterprise: [
    "local-execution",
    "built-in-components",
    "team-sync",
    "shared-secrets",
    "component-registry",
    "output-history",
    "scheduled-runs",
    "sso",
    "audit-logs",
    "self-hosted-sidecar",
    "rbac",
  ],
};

export const MAX_MACHINES_PER_LICENSE = 5;
