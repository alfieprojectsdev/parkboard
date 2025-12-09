// lib/auth/tenant-access.ts
// ============================================================================
// TENANT ACCESS HELPERS FOR MULTI-TENANT SECURITY
// ============================================================================
// Reusable helper functions that enforce tenant isolation in API routes.
// These utilities ensure users can only access data from their own community.
//
// Usage:
//   import { getSessionWithCommunity, ensureCommunityAccess } from '@/lib/auth/tenant-access'
//
//   // In API routes:
//   const authResult = await getSessionWithCommunity()
//   if ('error' in authResult) {
//     return NextResponse.json({ error: authResult.error }, { status: authResult.status })
//   }
//   const { userId, communityCode } = authResult
//
//   // Validate community access:
//   const accessResult = ensureCommunityAccess(requestedCommunity, communityCode)
//   if ('error' in accessResult) {
//     return NextResponse.json({ error: accessResult.error }, { status: accessResult.status })
//   }
// ============================================================================

import { auth } from '@/lib/auth/auth'
import type { Session } from 'next-auth'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Success response from getSessionWithCommunity
 */
export interface SessionWithCommunity {
  session: Session
  userId: string
  communityCode: string
}

/**
 * Error response from tenant access helpers
 */
export interface TenantAccessError {
  error: string
  status: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets the current session with community context
 *
 * This function:
 * 1. Retrieves the current NextAuth session
 * 2. Validates that the user is authenticated
 * 3. Validates that the user has a community assigned
 * 4. Returns session data with userId and communityCode
 *
 * @returns {Promise<SessionWithCommunity | TenantAccessError>}
 *   - On success: { session, userId, communityCode }
 *   - On auth failure: { error: 'Unauthorized', status: 401 }
 *   - On missing community: { error: 'No community assigned', status: 403 }
 *
 * @example
 * ```typescript
 * const authResult = await getSessionWithCommunity()
 * if ('error' in authResult) {
 *   return NextResponse.json(
 *     { error: authResult.error },
 *     { status: authResult.status }
 *   )
 * }
 * const { userId, communityCode } = authResult
 * ```
 */
export async function getSessionWithCommunity(): Promise<
  SessionWithCommunity | TenantAccessError
> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  // Note: communityCode will be added to session type in future migration
  // See MULTI_TENANCY_IMPROVEMENTS.md Phase 2: Session Management Updates
  if (!session.user.communityCode) {
    return { error: 'No community assigned', status: 403 }
  }

  return {
    session,
    userId: session.user.id,
    communityCode: session.user.communityCode,
  }
}

/**
 * Ensures user has access to the requested community
 *
 * This function validates that the user's community matches the requested
 * community, preventing cross-community data access.
 *
 * @param {string} requestedCommunity - The community code from the request (e.g., URL parameter)
 * @param {string} userCommunity - The user's community code from their session
 * @returns {{ error?: string; status?: number }}
 *   - On success: {} (empty object)
 *   - On access denied: { error: 'Access denied to other communities', status: 403 }
 *
 * @example
 * ```typescript
 * const accessResult = ensureCommunityAccess('LMR', session.user.communityCode)
 * if ('error' in accessResult) {
 *   return NextResponse.json(
 *     { error: accessResult.error },
 *     { status: accessResult.status }
 *   )
 * }
 * // Continue with community-scoped query...
 * ```
 */
export function ensureCommunityAccess(
  requestedCommunity: string,
  userCommunity: string
): { error?: string; status?: number } {
  if (requestedCommunity !== userCommunity) {
    return {
      error: 'Access denied to other communities',
      status: 403,
    }
  }
  return {}
}
