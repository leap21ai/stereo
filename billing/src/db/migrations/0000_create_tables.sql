-- Migration: Create initial tables for stereo-billing
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  features TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS activations (
  id TEXT PRIMARY KEY,
  license_key TEXT NOT NULL REFERENCES licenses(license_key),
  machine_id TEXT NOT NULL,
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(license_key, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_stripe ON licenses(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_activations_key ON activations(license_key);

-- Rate limiting table (used by the in-Worker rate limiter)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key, timestamp);

PRAGMA optimize;
