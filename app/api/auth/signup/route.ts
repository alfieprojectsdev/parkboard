// POST /api/auth/signup
// Create a resident account in user_profiles (bcrypt cost 12). The register
// page then signs in through NextAuth with the same email + password, so
// signup and login share one contract: this hash, compared by
// lib/auth/credentials.ts.

import bcrypt from 'bcryptjs'
import { query } from '@/lib/db/client'
import { allow, clientIp, HOUR } from '@/lib/rate-limit'
import { SignupSchema, firstError } from '@/lib/validation/api-schemas'
import { error, json, readJson } from '@/lib/api'
import { inviteMatches, inviteRequired } from '@/lib/auth/invite'

export async function POST(request: Request) {
  const body = await readJson(request)
  if (body === null) return error('Invalid request body', 400)

  if (!(await allow(`signup:${clientIp(request.headers)}`, 5, HOUR))) {
    return error('Too many sign-ups from this connection. Please try again in an hour.', 429)
  }

  if (inviteRequired() && !inviteMatches((body as Record<string, unknown>).invite_code)) {
    return error("That residents' code is not right. Ask in the building group chat.", 403)
  }

  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) return error(firstError(parsed.error), 400)

  const { email, password, name, unit_number, phone, contact_viber } = parsed.data
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO user_profiles (email, password_hash, name, unit_number, phone, contact_viber)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [email, await bcrypt.hash(password, 12), name, unit_number, phone, contact_viber]
    )
    return json({ id: result.rows[0].id }, 201)
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      // Same wording whether or not the address exists elsewhere in the flow.
      return error('Could not create an account with these details. If you already have one, log in instead.', 409)
    }
    console.error('[signup] failed:', err instanceof Error ? err.message : err)
    return error('Could not create your account. Please try again.', 500)
  }
}
