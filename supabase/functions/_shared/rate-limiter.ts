/**
 * In-memory rate limiter for Edge Functions.
 * Each function instance maintains its own sliding window.
 * For distributed rate limiting, use a database-backed approach.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const buckets = new Map<string, number[]>();

// Cleanup old entries periodically to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // 1 minute

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, times] of buckets) {
    const valid = times.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, valid);
    }
  }
}

/**
 * Check if a request should be rate limited.
 * @param key - Unique identifier (IP, email, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with `limited` boolean and `retryAfter` seconds
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { limited: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  cleanup(config.windowMs);

  const times = (buckets.get(key) || []).filter(
    (t) => now - t < config.windowMs,
  );

  if (times.length >= config.maxRequests) {
    const oldestInWindow = times[0];
    const retryAfter = Math.ceil(
      (oldestInWindow + config.windowMs - now) / 1000,
    );
    return {
      limited: true,
      retryAfter,
      remaining: 0,
    };
  }

  times.push(now);
  buckets.set(key, times);

  return {
    limited: false,
    retryAfter: 0,
    remaining: config.maxRequests - times.length,
  };
}

/**
 * Extract client IP from request headers (Vercel/Cloudflare/Supabase).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Create a 429 Too Many Requests response.
 */
export function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Trop de requêtes. Réessayez plus tard.",
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
