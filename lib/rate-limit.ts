type Bucket = { count: number; resetAt: number };

// Simple in-memory sliding-window rate limiter. Adequate for a single-instance
// deployment; for multi-instance, replace with a shared store (Redis etc.).
const buckets = new Map<string, Bucket>();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) {
    if (existing.count >= max) {
      return { ok: false, retryAfter: existing.resetAt - now };
    }
    existing.count += 1;
    return { ok: true };
  }

  buckets.set(key, { count: 1, resetAt: now + windowMs });
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
