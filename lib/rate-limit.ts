// lib/rate-limit.ts
// Fixed-window rate limits stored in Postgres (rate_limits table).
//
// The previous version kept counters in a Map, which on Vercel starts empty
// on every cold start and is not shared between instances, so a brute-force
// attempt spread over a few minutes was effectively unlimited.

import { query } from '@/lib/db/client'

/**
 * Count one hit against `key`; returns false once more than `max` hits land
 * in the current window. Fails open on database errors so a hiccup does not
 * lock everyone out of logging in.
 */
export async function allow(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const result = await query<{ count: number }>(
      `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, NOW())
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2)
                      THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2)
                             THEN NOW() ELSE rate_limits.window_start END
       RETURNING count`,
      [key, windowMs / 1000]
    )

    if (Math.random() < 0.02) {
      query(`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`).catch(() => {})
    }

    return result.rows[0].count <= max
  } catch (error) {
    console.error('[rate-limit] check failed:', error instanceof Error ? error.message : error)
    return true
  }
}

/** Client IP as reported by Vercel's edge (x-real-ip), falling back to x-forwarded-for. */
export function clientIp(headers: Headers): string {
  return headers.get('x-real-ip') || headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
