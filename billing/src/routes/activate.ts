import { Hono } from "hono";
import { z } from "zod";

import { getLicenseByKey, getActivationCount, activateMachine } from "../lib/license";
import { MAX_MACHINES_PER_LICENSE } from "../types";

import type { AppEnv } from "../types";

const activateSchema = z.object({
  licenseKey: z.string().min(1).max(200),
  machineId: z.string().min(1).max(500),
});

const activate = new Hono<AppEnv>();

activate.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { licenseKey, machineId } = parsed.data;

  // Verify license exists and is active
  const license = await getLicenseByKey(c.env.DB, licenseKey);
  if (!license) {
    return c.json({ error: "License not found" }, 404);
  }

  if (license.status !== "active") {
    return c.json({ error: "License is not active", status: license.status }, 403);
  }

  // Check activation count before attempting
  const currentCount = await getActivationCount(c.env.DB, licenseKey);

  // Allow re-activation of existing machine even if at limit
  const result = await activateMachine(c.env.DB, licenseKey, machineId);

  if (!result.alreadyActivated && currentCount >= MAX_MACHINES_PER_LICENSE) {
    return c.json(
      {
        activated: false,
        machineCount: currentCount,
        maxMachines: MAX_MACHINES_PER_LICENSE,
        error: `Maximum ${MAX_MACHINES_PER_LICENSE} machines per license`,
      },
      409,
    );
  }

  return c.json({
    activated: true,
    machineCount: result.count,
    maxMachines: MAX_MACHINES_PER_LICENSE,
  });
});

export { activate };
