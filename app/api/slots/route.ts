// GET  /api/slots          available slots (anyone; owner names only when logged in)
// GET  /api/slots?mine=1   the logged-in resident's own slots, every status
// POST /api/slots          post a slot (logged in)
//
// Responses never include phone or Viber; see /api/slots/[id]/contact.

import { query } from '@/lib/db/client'
import { listAvailableSlots, listOwnSlots, getSlot } from '@/lib/slots'
import { CreateSlotSchema, firstError } from '@/lib/validation/api-schemas'
import { allow, HOUR } from '@/lib/rate-limit'
import { currentUserId, error, json, readJson } from '@/lib/api'

export async function GET(request: Request) {
  const userId = await currentUserId()
  const mine = new URL(request.url).searchParams.get('mine') === '1'

  if (mine) {
    if (!userId) return error('Log in to see your slots', 401)
    return json({ slots: await listOwnSlots(userId) })
  }
  return json({ slots: await listAvailableSlots(userId) })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return error('Log in to post a slot', 401)

  const body = await readJson(request)
  if (body === null) return error('Invalid request body', 400)
  const parsed = CreateSlotSchema.safeParse(body)
  if (!parsed.success) return error(firstError(parsed.error), 400)

  if (!(await allow(`post-slot:${userId}`, 20, HOUR))) {
    return error('You have posted a lot of slots this hour. Please try again later.', 429)
  }

  const s = parsed.data
  // owner_id always comes from the session, never from the request body.
  const result = await query<{ id: string }>(
    `INSERT INTO parking_slots
       (owner_id, location_level, location_tower, location_landmark, available_from, available_until, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, s.location_level, s.location_tower, s.location_landmark, s.available_from, s.available_until, s.notes]
  )
  return json({ slot: await getSlot(result.rows[0].id, userId) }, 201)
}
