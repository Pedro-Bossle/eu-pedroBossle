type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Rate limit em memória por chave (IP + ação). Adequado a serverless warm instances. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: { headers: Record<string, string | string[] | undefined> }) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(xf) && xf[0]) {
    return xf[0].split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}
