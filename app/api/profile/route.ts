// GET/PATCH /api/profile - the logged-in resident's own profile.

import bcrypt from 'bcryptjs'
import { query } from '@/lib/db/client'
import { ProfileUpdateSchema, firstError } from '@/lib/validation/api-schemas'
import { currentUserId, error, json, readJson } from '@/lib/api'
import type { Profile } from '@/types/database'

const COLUMNS = 'id, email, name, unit_number, phone, contact_viber'

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return error('Log in to see your profile', 401)

  const result = await query<Profile>(`SELECT ${COLUMNS} FROM user_profiles WHERE id = $1`, [userId])
  if (!result.rows[0]) return error('Profile not found', 404)
  return json(result.rows[0])
}

export async function PATCH(request: Request) {
  const userId = await currentUserId()
  if (!userId) return error('Log in to update your profile', 401)

  const body = await readJson(request)
  if (body === null) return error('Invalid request body', 400)
  const parsed = ProfileUpdateSchema.safeParse(body)
  if (!parsed.success) return error(firstError(parsed.error), 400)
  const input = parsed.data
  const raw = body as Record<string, unknown>

  const current = await query<Profile & { password_hash: string }>(
    `SELECT ${COLUMNS}, password_hash FROM user_profiles WHERE id = $1`,
    [userId]
  )
  const existing = current.rows[0]
  if (!existing) return error('Profile not found', 404)

  // Only fields present in the request change; phone/Viber may be cleared,
  // but not both.
  const next = {
    name: input.name ?? existing.name,
    unit_number: input.unit_number ?? existing.unit_number,
    phone: 'phone' in raw ? input.phone : existing.phone,
    contact_viber: 'contact_viber' in raw ? input.contact_viber : existing.contact_viber,
  }
  if (!next.phone && !next.contact_viber) {
    return error('Keep a phone number or Viber so neighbours can reach you', 400)
  }

  let passwordHash = existing.password_hash
  if (input.new_password) {
    if (!(await bcrypt.compare(input.current_password ?? '', existing.password_hash))) {
      return error('Current password is not correct', 400)
    }
    passwordHash = await bcrypt.hash(input.new_password, 12)
  }

  const result = await query<Profile>(
    `UPDATE user_profiles
     SET name = $1, unit_number = $2, phone = $3, contact_viber = $4, password_hash = $5
     WHERE id = $6
     RETURNING ${COLUMNS}`,
    [next.name, next.unit_number, next.phone, next.contact_viber, passwordHash, userId]
  )
  return json(result.rows[0])
}
