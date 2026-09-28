// Optional residents' code (SIGNUP_INVITE_CODE), shared in the building's
// group chat. Without it anyone on the internet could register and reveal
// residents' phone numbers. Unset = open registration.
import { createHash, timingSafeEqual } from 'node:crypto'

export function inviteRequired(): boolean {
  return Boolean(process.env.SIGNUP_INVITE_CODE)
}

/** Case- and whitespace-insensitive, constant-time comparison. */
export function inviteMatches(supplied: unknown): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE ?? ''
  const digest = (s: string) => createHash('sha256').update(s.trim().toLowerCase()).digest()
  return typeof supplied === 'string' && timingSafeEqual(digest(supplied), digest(expected))
}
