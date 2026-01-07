/**
 * Parking Slots API - List and Create Endpoints
 *
 * GET /api/slots
 * - Lists all active parking slots in the authenticated user's community
 * - Enforces tenant isolation via community_code filtering
 * - Returns only active slots (status='active')
 *
 * POST /api/slots
 * - Creates a new parking slot
 * - Validates request body with CreateSlotSchema
 * - Sets owner_id and community_code from authenticated session
 * - Never accepts community_code from client (security requirement)
 *
 * Security Checklist:
 * ✅ Session validation using getSessionWithCommunity()
 * ✅ Request body validation with Zod schemas
 * ✅ Community_code isolation (multi-tenant requirement)
 * ✅ Appropriate HTTP status codes (200, 201, 400, 401, 403, 500)
 * ✅ Error handling with sanitized messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import {
  CreateSlotSchema,
  validateRequest,
  formatZodError
} from '@/lib/validation/api-schemas'
import { z } from 'zod'

/**
 * GET /api/slots
 *
 * Lists all active parking slots in the authenticated user's community
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Filters by user's community_code (tenant isolation)
 * - Only returns active slots (status='active')
 *
 * Response:
 * - 200 OK: { data: ParkingSlot[] }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' }
 * - 500 Internal Server Error: { error: 'Failed to fetch slots' }
 */
export async function GET() {
  // 1. Validate session and get community context
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { communityCode } = authResult

  try {
    // 2. Query database with tenant isolation
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*')
      .eq('community_code', communityCode)  // CRITICAL - Tenant isolation
      .eq('status', 'active')  // Only show active slots
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching slots:', error)
      return NextResponse.json(
        { error: 'Failed to fetch slots' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/slots
 *
 * Creates a new parking slot
 *
 * Request Body:
 * {
 *   slot_number: string,       // Required, e.g., "A-10"
 *   slot_type: 'covered' | 'uncovered' | 'tandem',  // Required
 *   price_per_hour: number,    // Required, must be > 0
 *   description?: string       // Optional
 * }
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Validates request body with CreateSlotSchema
 * - Sets owner_id from authenticated session
 * - Sets community_code from authenticated session (NEVER from client)
 * - Sets status='active' by default
 *
 * Response:
 * - 201 Created: { data: ParkingSlot }
 * - 400 Bad Request: { error: 'Validation error message' }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' }
 * - 500 Internal Server Error: { error: 'Failed to create slot' }
 */
export async function POST(request: NextRequest) {
  // 1. Validate session and get community context
  const authResult = await getSessionWithCommunity()
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { userId, communityCode } = authResult

  try {
    // 2. Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(CreateSlotSchema, body)

    // 3. Insert slot with server-side fields
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('parking_slots')
      .insert({
        ...validatedData,
        owner_id: userId,                    // From session, not client
        community_code: communityCode,       // CRITICAL - Server-side, NEVER from client
        status: 'active'                     // Default status
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating slot:', error)

      // Handle unique constraint violations (e.g., duplicate slot_number)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Slot number already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create slot' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: formatZodError(error) },
        { status: 400 }
      )
    }

    console.error('Unexpected error in POST /api/slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
