// lib/auth/credentials.ts
// Email + password check used by the NextAuth credentials provider.
// Kept separate from auth.ts so it can be tested without NextAuth.

import bcrypt from 'bcryptjs'
import { query } from '@/lib/db/client'
import { allow, MINUTE } from '@/lib/rate-limit'

export interface VerifiedUser {
  id: string
  email: string
  name: string
  unitNumber: string
}

// bcrypt hash of a random string, compared against when the email is unknown
// so both failure paths take the same ~100 ms (no account enumeration by timing).
const DUMMY_HASH = '$2b$12$pjyKk2Vaog3PePuex7JDp.URIPgR7puk0QAhPQQFI3J28bceWT956'

/**
 * Returns the user for a correct email + password, otherwise null.
 * Limits: 5 attempts per email and 20 per IP per 15 minutes.
 */
export async function verifyCredentials(
  emailInput: unknown,
  passwordInput: unknown,
  ip = 'unknown'
): Promise<VerifiedUser | null> {
  if (typeof emailInput !== 'string' || typeof passwordInput !== 'string') return null
  const email = emailInput.trim().toLowerCase()
  if (!email || !passwordInput) return null

  const [emailOk, ipOk] = await Promise.all([
    allow(`login:email:${email}`, 5, 15 * MINUTE),
    allow(`login:ip:${ip}`, 20, 15 * MINUTE),
  ])
  if (!emailOk || !ipOk) return null

  const result = await query<{ id: string; email: string; name: string; unit_number: string; password_hash: string }>(
    `SELECT id, email, name, unit_number, password_hash FROM user_profiles WHERE LOWER(email) = $1`,
    [email]
  )
  const user = result.rows[0]
  const valid = await bcrypt.compare(passwordInput, user ? user.password_hash : DUMMY_HASH)
  if (!user || !valid) return null

  return { id: user.id, email: user.email, name: user.name, unitNumber: user.unit_number }
}
