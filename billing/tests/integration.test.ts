/// <reference types="@cloudflare/vitest-pool-workers" />
import { env, createExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import app from "../src/index";

// --- Helpers ---

async function callWorker(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, init);
  const ctx = createExecutionContext();
  return app.fetch(request, env, ctx);
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return callWorker(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- D1 Seeding ---

beforeAll(async () => {
  // Create tables — single-line SQL for D1 exec()
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, license_key TEXT UNIQUE NOT NULL, stripe_customer_id TEXT, stripe_subscription_id TEXT, tier TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'active', features TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT);",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS activations (id TEXT PRIMARY KEY, license_key TEXT NOT NULL REFERENCES licenses(license_key), machine_id TEXT NOT NULL, activated_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(license_key, machine_id));",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS idx_licenses_stripe ON licenses(stripe_subscription_id);",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS idx_activations_key ON activations(license_key);",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT NOT NULL, timestamp INTEGER NOT NULL);",
  );
});

beforeEach(async () => {
  // Clean tables between tests
  await env.DB.exec("DELETE FROM activations;");
  await env.DB.exec("DELETE FROM licenses;");
  await env.DB.exec("DELETE FROM rate_limits;");
});

// --- Tests ---

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await callWorker("/api/health");
    expect(res.status).toBe(200);

    const body = await res.json() as { status: string; version: string };
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0");
  });
});

describe("POST /api/validate", () => {
  it("returns 400 for missing body", async () => {
    const res = await callWorker("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json{",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing licenseKey", async () => {
    const res = await postJson("/api/validate", {});
    expect(res.status).toBe(400);
  });

  it("returns free tier for unknown license key", async () => {
    const res = await postJson("/api/validate", {
      licenseKey: "stereo_live_0000000000000000aaaaaaaaaaaaaaaa",
    });
    expect(res.status).toBe(200);

    const body = await res.json() as { valid: boolean; tier: string; features: string[] };
    expect(body.valid).toBe(false);
    expect(body.tier).toBe("free");
    expect(body.features).toContain("local-execution");
  });

  it("returns cached license data for known key", async () => {
    // Seed a license
    await env.DB.prepare(
      "INSERT INTO licenses (id, license_key, tier, status, features, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
    )
      .bind(
        "test-id-1",
        "stereo_live_cachedkey1234567890abcdef",
        "pro",
        "active",
        JSON.stringify(["local-execution", "team-sync"]),
      )
      .run();

    const res = await postJson("/api/validate", {
      licenseKey: "stereo_live_cachedkey1234567890abcdef",
    });
    expect(res.status).toBe(200);

    const body = await res.json() as { valid: boolean; tier: string };
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("pro");
  });
});

describe("POST /api/activate", () => {
  beforeEach(async () => {
    // Seed an active license
    await env.DB.prepare(
      "INSERT INTO licenses (id, license_key, tier, status, features) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        "test-license-1",
        "stereo_live_activatetest1234567890abc",
        "pro",
        "active",
        "[]",
      )
      .run();
  });

  it("activates a machine successfully", async () => {
    const res = await postJson("/api/activate", {
      licenseKey: "stereo_live_activatetest1234567890abc",
      machineId: "machine-001",
    });
    expect(res.status).toBe(200);

    const body = await res.json() as { activated: boolean; machineCount: number };
    expect(body.activated).toBe(true);
    expect(body.machineCount).toBe(1);
  });

  it("returns 404 for unknown license", async () => {
    const res = await postJson("/api/activate", {
      licenseKey: "stereo_live_doesnotexist000000000000",
      machineId: "machine-001",
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 for inactive license", async () => {
    await env.DB.prepare(
      "INSERT INTO licenses (id, license_key, tier, status, features) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        "test-license-canceled",
        "stereo_live_canceledtest123456789000",
        "pro",
        "canceled",
        "[]",
      )
      .run();

    const res = await postJson("/api/activate", {
      licenseKey: "stereo_live_canceledtest123456789000",
      machineId: "machine-001",
    });
    expect(res.status).toBe(403);
  });

  it("allows re-activation of same machine", async () => {
    await postJson("/api/activate", {
      licenseKey: "stereo_live_activatetest1234567890abc",
      machineId: "machine-001",
    });

    const res = await postJson("/api/activate", {
      licenseKey: "stereo_live_activatetest1234567890abc",
      machineId: "machine-001",
    });
    expect(res.status).toBe(200);

    const body = await res.json() as { activated: boolean; machineCount: number };
    expect(body.activated).toBe(true);
    expect(body.machineCount).toBe(1);
  });

  it("returns 400 for missing fields", async () => {
    const res = await postJson("/api/activate", { licenseKey: "test" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/webhook/stripe", () => {
  it("rejects requests without signature", async () => {
    const res = await postJson("/api/webhook/stripe", { type: "test" });
    expect(res.status).toBe(400);
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await callWorker("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
