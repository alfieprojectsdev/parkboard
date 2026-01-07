/**
 * In-memory rate limiter for authentication endpoints
 *
 * Usage:
 * ```typescript
 * // In API route:
 * const email = req.body.email;
 * if (!checkRateLimit(email)) {
 *   return res.status(429).json({ error: 'Too many attempts. Try again later.' });
 * }
 * ```
 *
 * Limitations:
 * - Resets on server restart
 * - Doesn't work across multiple server instances
 * - For production, consider Upstash Redis (@upstash/ratelimit)
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimit = new Map<string, RateLimitRecord>();

/**
 * Check if request is allowed under rate limit
 * @param identifier - Unique identifier (IP address, email, etc.)
 * @param maxAttempts - Maximum attempts allowed (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 min)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  // No record or expired → allow and create new record
  if (!record || now > record.resetAt) {
    rateLimit.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Already exceeded → deny
  if (record.count >= maxAttempts) {
    return false;
  }

  // Increment count and allow
  record.count++;
  return true;
}

/**
 * Get rate limit info for an identifier
 * @param identifier - Unique identifier
 * @param maxAttempts - Maximum attempts allowed (default: 5, must match checkRateLimit calls)
 * @returns Rate limit info or null if no record
 */
export function getRateLimitInfo(
  identifier: string,
  maxAttempts: number = 5
): { remaining: number; resetAt: number } | null {
  const record = rateLimit.get(identifier);
  if (!record) return null;

  const now = Date.now();
  if (now > record.resetAt) {
    rateLimit.delete(identifier);
    return null;
  }

  return {
    remaining: Math.max(0, maxAttempts - record.count),
    resetAt: record.resetAt
  };
}

/**
 * Clean up expired records every 5 minutes to prevent memory leaks
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of Array.from(rateLimit.entries())) {
      if (now > record.resetAt) {
        rateLimit.delete(key);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
}
