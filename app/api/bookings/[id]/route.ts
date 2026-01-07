/**
 * Booking Detail API - Cancel Endpoint
 *
 * PATCH /api/bookings/[id]
 * - Cancels an existing booking
 * - CRITICAL: Only allows status='cancelled' (prevents status manipulation)
 * - User must be renter OR slot owner
 * - Enforces tenant isolation via community_code filtering
 *
 * Security Checklist:
 * ✅ Session validation using getSessionWithCommunity()
 * ✅ Request body validation with UpdateBookingSchema (only status='cancelled')
 * ✅ Booking ID validation with BookingIdSchema
 * ✅ Community_code isolation (multi-tenant requirement)
 * ✅ Authorization: user must be renter OR slot owner
 * ✅ Business logic: can't cancel already cancelled/completed bookings
 * ✅ Appropriate HTTP status codes (200, 400, 401, 403, 404, 500)
 * ✅ Error handling with sanitized messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import {
  BookingIdSchema,
  UpdateBookingSchema,
  validateRequest,
  formatZodError
} from '@/lib/validation/api-schemas'
import { z } from 'zod'

/**
 * PATCH /api/bookings/[id]
 *
 * Cancels an existing booking
 *
 * Path Parameter:
 * - id: UUID of the booking
 *
 * Request Body:
 * {
 *   status: 'cancelled'  // ONLY 'cancelled' is allowed
 * }
 *
 * Authorization:
 * - User must be the renter OR own the slot
 * - Both parties can cancel a booking
 *
 * Business Rules:
 * - Cannot cancel already cancelled bookings (idempotent - returns 200)
 * - Cannot cancel completed bookings (400 error)
 * - Cannot cancel no_show bookings (400 error)
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Validates booking ID format (400 if invalid UUID)
 * - Validates request body (400 if not status='cancelled')
 * - Verifies booking belongs to user's community (403 if not)
 * - Verifies user is renter OR slot owner (403 if not)
 *
 * Response:
 * - 200 OK: { data: Booking } (updated booking)
 * - 400 Bad Request: { error: 'Invalid booking ID' | 'Cannot cancel completed/no_show bookings' }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'No community assigned' | 'Not authorized to cancel this booking' }
 * - 404 Not Found: { error: 'Booking not found' }
 * - 500 Internal Server Error: { error: 'Failed to cancel booking' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // 2. Validate booking ID parameter
    const validatedParams = validateRequest(BookingIdSchema, { id: params.id })

    // 3. Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(UpdateBookingSchema, body)

    // 4. Fetch booking with slot details for authorization
    const supabase = await createClient()
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_slots!inner (
          community_code
        )
      `)
      .eq('booking_id', validatedParams.id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 5. Verify booking belongs to user's community (tenant isolation)
    if (booking.parking_slots.community_code !== communityCode) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this booking' },
        { status: 403 }
      )
    }

    // 6. Verify user is renter OR slot owner
    const isRenter = booking.renter_id === userId
    const isOwner = booking.slot_owner_id === userId

    if (!isRenter && !isOwner) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this booking' },
        { status: 403 }
      )
    }

    // 7. Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      // Idempotent - already cancelled, return success
      return NextResponse.json({ data: booking })
    }

    if (booking.status === 'completed' || booking.status === 'no_show') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or no_show bookings' },
        { status: 400 }
      )
    }

    // 8. Update booking status to cancelled
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: validatedData.status })
      .eq('booking_id', validatedParams.id)
      .select()
      .single()

    if (error) {
      console.error('Database error cancelling booking:', error)
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
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

    console.error('Unexpected error in PATCH /api/bookings/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
