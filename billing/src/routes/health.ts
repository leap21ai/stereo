import { Hono } from "hono";

import type { AppEnv } from "../types";

const health = new Hono<AppEnv>();

health.get("/", (c) => {
  return c.json({ status: "ok", version: "0.1.0" });
});

export { health };
