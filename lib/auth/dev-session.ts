/**
 * Dev-Mode Authentication Session Manager
 *
 * SECURITY: Only works when DEV_MODE_AUTH=true AND NODE_ENV=development
 * SECURITY: Automatically disabled in production builds
 *
 * Purpose: Allows local MVP testing without Supabase connection
 * Approved by: Root instance 2025-10-31 (shared-alerts.md)
 */

import Cookies from 'js-cookie'

const DEV_SESSION_COOKIE = 'parkboard_dev_session'
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE_AUTH === 'true'

export interface DevUser {
  id: string
  email: string
  name: string
  unit_number: string
  phone: string
}

/**
 * Test users from database (scripts/seed-test-data-bypass-rls.sql)
 */
export const TEST_USERS: DevUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'maria.santos@test.local',
    name: 'Maria Santos',
    unit_number: '10A',
    phone: '+63 917 123 4567'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'juan.delacruz@test.local',
    name: 'Juan dela Cruz',
    unit_number: '15B',
    phone: '+63 917 234 5678'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'elena.rodriguez@test.local',
    name: 'Elena Rodriguez',
    unit_number: '20C',
    phone: '+63 917 345 6789'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'ben.alvarez@test.local',
    name: 'Ben Alvarez',
    unit_number: '12D',
    phone: '+63 917 456 7890'
  }
]

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  const isEnabled = DEV_MODE && process.env.NODE_ENV === 'development'

  // Production safety check (root requirement)
  if (process.env.NODE_ENV === 'production' && DEV_MODE) {
    console.error(
      '🚨 SECURITY ERROR: DEV_MODE_AUTH=true in production build! ' +
      'This bypasses all authentication. Set DEV_MODE_AUTH=false immediately!'
    )
    return false
  }

  if (isEnabled) {
    console.log('🚧 Dev mode authentication active')
  }

  return isEnabled
}

/**
 * Set dev session (login as test user)
 */
export function setDevSession(userId: string): void {
  if (!isDevMode()) {
    console.warn('Dev mode not enabled - ignoring setDevSession')
    return
  }

  const user = TEST_USERS.find(u => u.id === userId)
  if (!user) {
    throw new Error(`Test user not found: ${userId}`)
  }

  const session = {
    user_id: user.id,
    user_email: user.email,
    user_name: user.name,
    dev_mode: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  }

  Cookies.set(DEV_SESSION_COOKIE, JSON.stringify(session), {
    expires: 1, // 1 day
    sameSite: 'strict'
  })

  console.log('✅ Dev session set:', user.name)
}

/**
 * Get current dev session
 */
export function getDevSession(): { user_id: string; user_name: string } | null {
  if (!isDevMode()) {
    return null
  }

  const cookie = Cookies.get(DEV_SESSION_COOKIE)
  if (!cookie) {
    return null
  }

  try {
    const session = JSON.parse(cookie)

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      clearDevSession()
      return null
    }

    return {
      user_id: session.user_id,
      user_name: session.user_name
    }
  } catch (error) {
    console.error('Failed to parse dev session:', error)
    return null
  }
}

/**
 * Clear dev session (logout)
 */
export function clearDevSession(): void {
  Cookies.remove(DEV_SESSION_COOKIE)
  console.log('🚪 Dev session cleared')
}

/**
 * Get dev user for middleware (server-side)
 * Returns user object that mimics Supabase user structure
 */
export function getDevUserForMiddleware(cookieValue: string | undefined): { id: string } | null {
  if (!isDevMode() || !cookieValue) {
    return null
  }

  try {
    const session = JSON.parse(cookieValue)

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return { id: session.user_id }
  } catch {
    return null
  }
}
