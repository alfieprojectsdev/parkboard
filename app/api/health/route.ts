// GET /api/health        -> {"ok":true} without touching the database
// GET /api/health?db=1   -> also runs SELECT 1 (503 if unreachable)
//
// Point uptime monitors at the plain URL: checking ?db=1 every few minutes
// keeps Neon's compute awake and uses up the free plan's compute hours.

import { query } from '@/lib/db/client'
import { json } from '@/lib/api'

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get('db') !== '1') return json({ ok: true })
  try {
    await query('SELECT 1')
    return json({ ok: true, db: 'ok' })
  } catch {
    return json({ ok: false, db: 'unreachable' }, 503)
  }
}
