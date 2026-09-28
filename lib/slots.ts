// lib/slots.ts
// Slot queries shared by the API routes.
//
// Privacy rule (plan invariant R-004): phone and contact_viber are never
// selected here. The only query that reads them is in
// app/api/slots/[id]/contact/route.ts.

import { query } from '@/lib/db/client'
import type { Slot } from '@/types/database'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Route params are user input; a non-UUID would make Postgres throw (500). */
export const isUuid = (id: string) => UUID.test(id)

const COLUMNS = `
  s.id, s.owner_id, s.location_level, s.location_tower, s.location_landmark,
  s.available_from, s.available_until, s.status, s.notes, s.created_at,
  u.name AS owner_name`

interface Row {
  id: string
  owner_id: string
  location_level: string
  location_tower: string
  location_landmark: string | null
  available_from: Date
  available_until: Date
  status: Slot['status']
  notes: string | null
  created_at: Date
  owner_name: string
}

/** Drops owner_id; shows the owner's name only to logged-in viewers. */
function shape(row: Row, viewerId: string | null): Slot {
  const slot: Slot = {
    id: row.id,
    location_level: row.location_level,
    location_tower: row.location_tower,
    location_landmark: row.location_landmark,
    available_from: new Date(row.available_from).toISOString(),
    available_until: new Date(row.available_until).toISOString(),
    // Reads don't wait for the expiry trigger to have run.
    status: row.status === 'available' && new Date(row.available_until) <= new Date() ? 'expired' : row.status,
    notes: row.notes,
    created_at: new Date(row.created_at).toISOString(),
    is_mine: viewerId !== null && row.owner_id === viewerId,
  }
  if (viewerId) slot.owner_name = row.owner_name
  return slot
}

export async function listAvailableSlots(viewerId: string | null): Promise<Slot[]> {
  const result = await query<Row>(
    `SELECT ${COLUMNS}
     FROM parking_slots s JOIN user_profiles u ON u.id = s.owner_id
     WHERE s.status = 'available' AND s.available_until > NOW()
     ORDER BY s.available_from ASC
     LIMIT 200`
  )
  return result.rows.map((row) => shape(row, viewerId))
}

export async function listOwnSlots(ownerId: string): Promise<Slot[]> {
  const result = await query<Row>(
    `SELECT ${COLUMNS}
     FROM parking_slots s JOIN user_profiles u ON u.id = s.owner_id
     WHERE s.owner_id = $1
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [ownerId]
  )
  return result.rows.map((row) => shape(row, ownerId))
}

export async function getSlot(id: string, viewerId: string | null): Promise<Slot | null> {
  if (!isUuid(id)) return null
  const result = await query<Row>(
    `SELECT ${COLUMNS}
     FROM parking_slots s JOIN user_profiles u ON u.id = s.owner_id
     WHERE s.id = $1`,
    [id]
  )
  return result.rows[0] ? shape(result.rows[0], viewerId) : null
}

/** Owner id and stored fields, for ownership checks before a write. */
export async function getSlotForWrite(id: string) {
  if (!isUuid(id)) return null
  const result = await query<{ owner_id: string; available_from: Date; available_until: Date; status: string }>(
    'SELECT owner_id, available_from, available_until, status FROM parking_slots WHERE id = $1',
    [id]
  )
  return result.rows[0] ?? null
}
