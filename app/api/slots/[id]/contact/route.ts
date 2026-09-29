// GET /api/slots/:id/contact
//
// The only endpoint that returns a resident's phone or Viber (plan DL-004,
// invariant R-004). Requires a login. Works for slots that are still
// available, or for the owner's own slot. Limited to 30 reveals per hour per
// resident so the board can't be scraped for phone numbers.

import { query } from '@/lib/db/client'
import { isUuid } from '@/lib/slots'
import { allow, HOUR } from '@/lib/rate-limit'
import { currentUserId, error, json } from '@/lib/api'
import type { SlotContact } from '@/types/database'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const userId = await currentUserId()
  if (!userId) return error('Log in to see contact details', 401)

  const { id } = await params
  if (!isUuid(id)) return error('Slot not found', 404)

  if (!(await allow(`contact:${userId}`, 30, HOUR))) {
    return error('You have looked up a lot of contacts this hour. Please try again later.', 429)
  }

  const result = await query<SlotContact & { owner_id: string; open: boolean }>(
    `SELECT u.name, u.unit_number, u.phone, u.contact_viber, s.owner_id,
            (s.status = 'available' AND s.available_until > NOW()) AS open
     FROM parking_slots s JOIN user_profiles u ON u.id = s.owner_id
     WHERE s.id = $1`,
    [id]
  )
  const row = result.rows[0]
  if (!row || (!row.open && row.owner_id !== userId)) return error('This slot is no longer available', 404)

  const contact: SlotContact = {
    name: row.name,
    unit_number: row.unit_number,
    phone: row.phone,
    contact_viber: row.contact_viber,
  }
  return json({ contact })
}
