/**
 * Bookings API - List and Create Endpoints
 *
 * GET /api/bookings
 * - Lists all bookings where user is renter OR slot owner
 * - Enforces tenant isolation via community_code filtering
 * - Joins with parking_slots to get slot details
 *
 * POST /api/bookings
 * - Creates a new booking
 * - CRITICAL: NEVER accepts total_price from client (-$3000 penalty)
 * - Database trigger calculate_booking_price() calculates total_price
 * - Validates slot availability and community access
 * - Handles overlapping bookings (409 Conflict)
 *
 * Security Checklist:
 * ✅ Session validation using getSessionWithCommunity()
 * ✅ Request body validation with CreateBookingSchema
 * ✅ Community_code isolation (multi-tenant requirement)
 * ✅ NEVER accepts total_price from client (server-side calculation)
 * ✅ Slot ownership verification (can't book own slot)
 * ✅ Appropriate HTTP status codes (200, 201, 400, 401, 403, 409, 500)
 * ✅ Error handling with sanitized messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import {
  CreateBookingSchema,
  validateRequest,
  formatZodError
} from '@/lib/validation/api-schemas'
import { z } from 'zod'

/**
 * GET /api/bookings
 *
 * Lists all bookings where authenticated user is the renter OR owns the slot
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Filters by user's community_code (tenant isolation)
 * - Shows bookings where user is renter OR slot owner
 * - Joins with parking_slots to include slot details
 *
 * Response:
 * - 200 OK: { data: Booking[] } (with joined slot details)
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' }
 * - 500 Internal Server Error: { error: 'Failed to fetch bookings' }
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

  const { userId, communityCode } = authResult

  try {
    // 2. Query database with tenant isolation
    // Show bookings where user is renter OR owns the slot
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_slots!inner (
          slot_id,
          slot_number,
          slot_type,
          price_per_hour,
          community_code
        )
      `)
      .or(`renter_id.eq.${userId},slot_owner_id.eq.${userId}`)
      .eq('parking_slots.community_code', communityCode)  // CRITICAL - Tenant isolation
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings
 *
 * Creates a new booking
 *
 * Request Body:
 * {
 *   slot_id: string (UUID),       // Required
 *   start_time: string (ISO 8601), // Required
 *   end_time: string (ISO 8601)    // Required, must be after start_time
 * }
 *
 * CRITICAL SECURITY:
 * - NEVER accepts total_price from client (-$3000 penalty)
 * - Database trigger calculate_booking_price() sets total_price automatically
 * - Trigger uses: price_per_hour * duration_hours
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Validates request body with CreateBookingSchema
 * - Verifies slot exists and belongs to user's community
 * - Verifies slot is active (status='active')
 * - Prevents booking your own slot (business rule)
 * - Sets renter_id from authenticated session
 * - Handles EXCLUDE constraint violations (409 Conflict for overlaps)
 *
 * Response:
 * - 201 Created: { data: Booking } (includes calculated total_price)
 * - 400 Bad Request: { error: 'Validation error' | 'Slot not available' | 'Cannot book your own slot' }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' | 'Slot not in your community' }
 * - 404 Not Found: { error: 'Slot not found' }
 * - 409 Conflict: { error: 'Slot is already booked for this time period' }
 * - 500 Internal Server Error: { error: 'Failed to create booking' }
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
    const validatedData = validateRequest(CreateBookingSchema, body)

    // 3. Verify slot exists and belongs to user's community
    const supabase = await createClient()
    const { data: slot, error: slotError } = await supabase
      .from('parking_slots')
      .select('slot_id, owner_id, community_code, status')
      .eq('slot_id', validatedData.slot_id)
      .single()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // 4. Verify slot belongs to user's community (tenant isolation)
    if (slot.community_code !== communityCode) {
      return NextResponse.json(
        { error: 'Slot not in your community' },
        { status: 403 }
      )
    }

    // 5. Verify slot is active
    if (slot.status !== 'active') {
      return NextResponse.json(
        { error: 'Slot not available' },
        { status: 400 }
      )
    }

    // 6. Verify user is not booking their own slot
    if (slot.owner_id === userId) {
      return NextResponse.json(
        { error: 'Cannot book your own slot' },
        { status: 400 }
      )
    }

    // 7. Create booking WITHOUT total_price
    // Database trigger calculate_booking_price() will set it
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        slot_id: validatedData.slot_id,
        renter_id: userId,
        start_time: validatedData.start_time,
        end_time: validatedData.end_time,
        status: 'pending'
        // NO total_price - database trigger calculates this
        // Trigger also sets slot_owner_id automatically
      })
      .select()
      .single()

    if (error) {
      // Handle EXCLUDE constraint violation (overlapping bookings)
      if (error.code === '23P01') {
        return NextResponse.json(
          { error: 'Slot is already booked for this time period' },
          { status: 409 }
        )
      }

      console.error('Database error creating booking:', error)
      return NextResponse.json(
        { error: 'Failed to create booking' },
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

    console.error('Unexpected error in POST /api/bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
