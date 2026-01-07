/**
 * Parking Slots API - Update and Delete Endpoints
 *
 * PATCH /api/slots/[id]
 * - Updates an existing parking slot
 * - Validates slot ownership (owner_id === userId)
 * - Validates tenant isolation (community_code)
 * - Prevents unauthorized field changes (community_code, owner_id)
 *
 * DELETE /api/slots/[id]
 * - Soft-deletes a parking slot (status='deleted')
 * - Validates slot ownership
 * - Prevents deletion if active bookings exist
 *
 * Security Checklist:
 * ✅ Session validation using getSessionWithCommunity()
 * ✅ Request body validation with Zod schemas
 * ✅ Community_code isolation (multi-tenant requirement)
 * ✅ Resource ownership verification
 * ✅ Active booking check (DELETE)
 * ✅ Appropriate HTTP status codes (200, 204, 400, 401, 403, 404, 409, 500)
 * ✅ Error handling with sanitized messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import {
  UpdateSlotSchema,
  SlotIdSchema,
  validateRequest,
  formatZodError
} from '@/lib/validation/api-schemas'
import { z } from 'zod'

/**
 * PATCH /api/slots/[id]
 *
 * Updates an existing parking slot
 *
 * Request Body (all fields optional):
 * {
 *   slot_number?: string,
 *   slot_type?: 'covered' | 'uncovered' | 'tandem',
 *   price_per_hour?: number,
 *   description?: string,
 *   status?: 'active' | 'maintenance' | 'disabled'
 * }
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Validates slot ID format (400 if invalid UUID)
 * - Validates slot exists and belongs to user's community (404 if not found)
 * - Validates user owns the slot (403 if not owner)
 * - Prevents community_code changes (validated by schema)
 * - Validates request body with UpdateSlotSchema
 *
 * Response:
 * - 200 OK: { data: ParkingSlot }
 * - 400 Bad Request: { error: 'Validation error message' }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'You do not own this slot' }
 * - 404 Not Found: { error: 'Slot not found' }
 * - 500 Internal Server Error: { error: 'Failed to update slot' }
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
    // 2. Validate slot ID format
    const idValidation = validateRequest(SlotIdSchema, { id: params.id })

    // 3. Parse and validate request body
    const body = await request.json()
    const validatedData = validateRequest(UpdateSlotSchema, body)

    // 4. Check slot exists and belongs to user's community
    const supabase = await createClient()
    const { data: existingSlot, error: fetchError } = await supabase
      .from('parking_slots')
      .select('slot_id, owner_id, community_code')
      .eq('slot_id', idValidation.id)
      .eq('community_code', communityCode)  // CRITICAL - Tenant isolation
      .single()

    if (fetchError || !existingSlot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // 5. Verify ownership
    if (existingSlot.owner_id !== userId) {
      return NextResponse.json(
        { error: 'You do not own this slot' },
        { status: 403 }
      )
    }

    // 6. Update slot with validated data
    const { data, error } = await supabase
      .from('parking_slots')
      .update(validatedData)
      .eq('slot_id', idValidation.id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating slot:', error)

      // Handle unique constraint violations (e.g., duplicate slot_number)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Slot number already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update slot' },
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

    console.error('Unexpected error in PATCH /api/slots/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/slots/[id]
 *
 * Soft-deletes a parking slot (sets status='deleted')
 *
 * Security:
 * - Requires authentication (401 if not authenticated)
 * - Requires community assignment (403 if no community)
 * - Validates slot ID format (400 if invalid UUID)
 * - Validates slot exists and belongs to user's community (404 if not found)
 * - Validates user owns the slot (403 if not owner)
 * - Prevents deletion if active bookings exist (409 Conflict)
 *
 * Response:
 * - 204 No Content: Slot successfully deleted
 * - 400 Bad Request: { error: 'Invalid slot ID format' }
 * - 401 Unauthorized: { error: 'Unauthorized' }
 * - 403 Forbidden: { error: 'You do not own this slot' }
 * - 404 Not Found: { error: 'Slot not found' }
 * - 409 Conflict: { error: 'Cannot delete slot with active bookings' }
 * - 500 Internal Server Error: { error: 'Failed to delete slot' }
 */
export async function DELETE(
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
    // 2. Validate slot ID format
    const idValidation = validateRequest(SlotIdSchema, { id: params.id })

    // 3. Check slot exists and belongs to user's community
    const supabase = await createClient()
    const { data: existingSlot, error: fetchError } = await supabase
      .from('parking_slots')
      .select('slot_id, owner_id, community_code')
      .eq('slot_id', idValidation.id)
      .eq('community_code', communityCode)  // CRITICAL - Tenant isolation
      .single()

    if (fetchError || !existingSlot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // 4. Verify ownership
    if (existingSlot.owner_id !== userId) {
      return NextResponse.json(
        { error: 'You do not own this slot' },
        { status: 403 }
      )
    }

    // 5. Check for active bookings
    const { data: activeBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('slot_id', idValidation.id)
      .neq('status', 'cancelled')  // Any status except cancelled
      .limit(1)

    if (bookingError) {
      console.error('Database error checking active bookings:', bookingError)
      return NextResponse.json(
        { error: 'Failed to delete slot' },
        { status: 500 }
      )
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete slot with active bookings' },
        { status: 409 }
      )
    }

    // 6. Soft delete: Update status to 'deleted'
    const { error: deleteError } = await supabase
      .from('parking_slots')
      .update({ status: 'deleted' })
      .eq('slot_id', idValidation.id)

    if (deleteError) {
      console.error('Database error deleting slot:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete slot' },
        { status: 500 }
      )
    }

    // 7. Return 204 No Content (successful deletion)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: formatZodError(error) },
        { status: 400 }
      )
    }

    console.error('Unexpected error in DELETE /api/slots/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
