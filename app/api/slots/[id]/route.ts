// GET    /api/slots/:id   slot detail (anyone; no contact details)
// PATCH  /api/slots/:id   owner edits fields or marks it taken / available again
// DELETE /api/slots/:id   owner removes it (soft: status = expired)
//
// Ownership is checked here in app code (owner_id = session user), not by
// the database; a non-owner gets 403 before anything is written.

import { query } from '@/lib/db/client'
import { getSlot, getSlotForWrite } from '@/lib/slots'
import { UpdateSlotSchema, firstError, windowProblem } from '@/lib/validation/api-schemas'
import { currentUserId, error, json, readJson } from '@/lib/api'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const slot = await getSlot(id, await currentUserId())
  if (!slot) return error('Slot not found', 404)
  return json({ slot })
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return error('Log in to edit this slot', 401)

  const existing = await getSlotForWrite(id)
  if (!existing || existing.status === 'expired') return error('Slot not found', 404)
  if (existing.owner_id !== userId) return error('Only the owner can change this slot', 403)

  const body = await readJson(request)
  if (body === null) return error('Invalid request body', 400)
  const parsed = UpdateSlotSchema.safeParse(body)
  if (!parsed.success) return error(firstError(parsed.error), 400)
  const input = parsed.data
  const raw = body as Record<string, unknown>

  if (input.available_from || input.available_until) {
    const problem = windowProblem(
      new Date(input.available_from ?? existing.available_from),
      new Date(input.available_until ?? existing.available_until)
    )
    if (problem) return error(problem, 400)
  }

  const sets: string[] = []
  const values: unknown[] = []
  const set = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }
  if (input.location_level) set('location_level', input.location_level)
  if (input.location_tower) set('location_tower', input.location_tower)
  if ('location_landmark' in raw) set('location_landmark', input.location_landmark ?? null)
  if (input.available_from) set('available_from', input.available_from)
  if (input.available_until) set('available_until', input.available_until)
  if ('notes' in raw) set('notes', input.notes ?? null)
  if (input.status) set('status', input.status)
  if (sets.length === 0) return error('Nothing to update', 400)

  values.push(id)
  await query(`UPDATE parking_slots SET ${sets.join(', ')} WHERE id = $${values.length}`, values)
  return json({ slot: await getSlot(id, userId) })
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params
  const userId = await currentUserId()
  if (!userId) return error('Log in to remove this slot', 401)

  const existing = await getSlotForWrite(id)
  if (!existing || existing.status === 'expired') return error('Slot not found', 404)
  if (existing.owner_id !== userId) return error('Only the owner can remove this slot', 403)

  // Soft retire (DL-005): the row stays for history, browse filters it out.
  await query(`UPDATE parking_slots SET status = 'expired' WHERE id = $1`, [id])
  return json({ ok: true })
}
