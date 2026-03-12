import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { activate } from "./routes/activate";
import { health } from "./routes/health";
import { validate } from "./routes/validate";
import { webhook } from "./routes/webhook";

import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// --- Global Middleware ---

app.use("*", logger());
app.use("*", secureHeaders());

// Request ID for tracing
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

// CORS — only for non-webhook routes
app.use("/api/validate/*", async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
  const corsMiddleware = cors({ origin: origins, credentials: true });
  return corsMiddleware(c, next);
});

app.use("/api/activate/*", async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
  const corsMiddleware = cors({ origin: origins, credentials: true });
  return corsMiddleware(c, next);
});

// --- Routes ---

app.route("/api/health", health);
app.route("/api/validate", validate);
app.route("/api/activate", activate);
app.route("/api/webhook/stripe", webhook);

// --- Error Handling ---

app.onError((err, c) => {
  const requestId = c.get("requestId");
  console.error(`[${requestId}] Unhandled error:`, err.message, err.stack);

  return c.json(
    {
      error: "Internal server error",
      requestId,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;
