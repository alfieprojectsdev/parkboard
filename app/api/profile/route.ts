/**
 * User Profile API - View and Update Endpoints
 *
 * GET /api/profile
 * - Returns authenticated user's own profile
 * - No tenant isolation needed (user-specific data)
 * - Validates authentication via getSessionWithCommunity
 *
 * PATCH /api/profile
 * - Updates authenticated user's profile
 * - CRITICAL: ONLY allows updating name and phone
 * - PREVENTS changing: email, unit_number, community_code
 * - Validation enforced by UpdateProfileSchema
 *
 * Security Checklist:
 * ✅ Session validation using getSessionWithCommunity()
 * ✅ Request body validation with UpdateProfileSchema
 * ✅ User can only access/update their own profile (userId from session)
 * ✅ PREVENTS changing sensitive fields (email, unit_number, community_code)
 * ✅ Appropriate HTTP status codes (200, 400, 401, 403, 404, 500)
 * ✅ Error handling with sanitized messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import {
  UpdateProfileSchema,
  validateRequest,
  formatZodError
} from '@/lib/validation/api-schemas'
import { z } from 'zod'

/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - User can only access their own profile (userId from session)
 * - No tenant isolation needed (user-specific data, not community-scoped)
 *
 * Response:
 * - 200 OK: { data: UserProfile }
 *   UserProfile = {
 *     id: UUID,
 *     name: string,
 *     email: string,
 *     phone: string,
 *     unit_number: string,
 *     created_at: timestamp,
 *     updated_at: timestamp
 *   }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' }
 * - 404 Not Found: { error: 'Profile not found' }
 * - 500 Internal Server Error: { error: 'Failed to fetch profile' }
 */
export async function GET() {
  // 1. Validate session and get user context
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { userId } = authResult

  try {
    // 2. Query user's own profile
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Database error fetching profile:', error)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile
 *
 * Request Body:
 * {
 *   name?: string,      // Optional - display name (min 1 character)
 *   phone?: string      // Optional - contact number (validated format)
 * }
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * - UpdateProfileSchema PREVENTS changing:
 *   - email (identity field, managed by auth system)
 *   - unit_number (tenant identifier, immutable after creation)
 *   - community_code (tenant isolation boundary, immutable)
 * - Schema.refine() explicitly rejects these fields if present in request
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - User can only update their own profile (userId from session)
 * - Validates request body with UpdateProfileSchema
 * - Only allows updating: name, phone
 *
 * Response:
 * - 200 OK: { data: UserProfile } (updated profile)
 * - 400 Bad Request: { error: 'Validation error message' }
 *   Examples:
 *   - "name: Name cannot be empty"
 *   - "phone: Invalid phone number format"
 *   - "Cannot change email, unit_number, or community_code - these fields are immutable"
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' }
 * - 500 Internal Server Error: { error: 'Failed to update profile' }
 */
export async function PATCH(request: NextRequest) {
  // 1. Validate session and get user context
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { userId } = authResult

  try {
    // 2. Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(UpdateProfileSchema, body)

    // 3. Update user's own profile
    // UpdateProfileSchema already prevents changing email, unit_number, community_code
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .update(validatedData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Database error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: formatZodError(error) },
        { status: 400 }
      )
    }

    console.error('Unexpected error in PATCH /api/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
