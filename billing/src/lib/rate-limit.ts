/**
 * Simple in-memory rate limiter using CF Worker request-scoped approach.
 * Uses D1 for persistence since we don't have KV binding for this project.
 *
 * For production scale, replace with CF Rate Limiting product or KV-based approach.
 * This D1-based approach works for moderate traffic (<1000 req/min).
 */
export const checkRateLimit = async (
  db: D1Database,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Ensure rate_limits table exists (idempotent)
  await db.exec(
    "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT NOT NULL, timestamp INTEGER NOT NULL);",
  );

  // Clean old entries and count current window
  await db
    .prepare("DELETE FROM rate_limits WHERE key = ? AND timestamp < ?")
    .bind(key, windowStart)
    .run();

  const countResult = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND timestamp >= ?")
    .bind(key, windowStart)
    .first<{ count: number }>();

  const currentCount = countResult?.count ?? 0;
  const remaining = Math.max(0, maxRequests - currentCount);
  const resetAt = now + windowSeconds;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Record this request
  await db
    .prepare("INSERT INTO rate_limits (key, timestamp) VALUES (?, ?)")
    .bind(key, now)
    .run();

  return { allowed: true, remaining: remaining - 1, resetAt };
};
