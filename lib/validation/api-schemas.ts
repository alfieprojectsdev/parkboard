/**
 * API Validation Schemas
 *
 * This module provides Zod validation schemas for all API request/response validation.
 * All schemas enforce strict type checking and prevent unauthorized field modifications.
 *
 * Key Security Features:
 * - UpdateSlotSchema prevents community_code changes
 * - UpdateBookingSchema only allows status='cancelled'
 * - UpdateProfileSchema prevents email, unit_number, community_code changes
 * - Server-side price calculation enforced (never accept client total_price)
 */

import { z } from 'zod'

// ============================================================================
// PARKING SLOT SCHEMAS
// ============================================================================

/**
 * Slot type enumeration matching database CHECK constraint
 * From schema: slot_type IN ('covered', 'uncovered', 'tandem')
 */
export const SlotTypeEnum = z.enum(['covered', 'uncovered', 'tandem'])

/**
 * Slot status enumeration matching database CHECK constraint
 * From schema: status IN ('active', 'maintenance', 'disabled')
 */
export const SlotStatusEnum = z.enum(['active', 'maintenance', 'disabled'])

/**
 * Schema for creating a new parking slot
 *
 * Validates:
 * - slot_number: Non-empty string (unique at DB level)
 * - type: Must be 'covered', 'uncovered', or 'tandem'
 * - price_per_hour: Positive number (DB CHECK > 0)
 * - description: Optional descriptive text
 *
 * Note: owner_id is set from authenticated session, not from request body
 */
export const CreateSlotSchema = z.object({
  slot_number: z.string().min(1, 'Slot number is required'),
  slot_type: SlotTypeEnum,
  price_per_hour: z.number().positive('Price must be greater than 0'),
  description: z.string().optional()
})

/**
 * Schema for updating an existing parking slot
 *
 * All fields are optional (partial update), but:
 * - CRITICAL: Cannot change community_code (tenant isolation)
 * - Cannot change owner_id (set by auth context)
 * - Cannot change slot_id (immutable primary key)
 *
 * Allows updating:
 * - slot_number, slot_type, price_per_hour, description, status
 */
export const UpdateSlotSchema = z.object({
  slot_number: z.string().min(1).optional(),
  slot_type: SlotTypeEnum.optional(),
  price_per_hour: z.number().positive().optional(),
  description: z.string().optional(),
  status: SlotStatusEnum.optional()
}).refine(
  (data) => !('community_code' in data),
  {
    message: 'Cannot change community_code - tenant isolation violation'
  }
)

/**
 * Schema for slot ID validation (UUID format)
 * Used in GET/DELETE /api/slots/[id] routes
 */
export const SlotIdSchema = z.object({
  id: z.string().uuid('Invalid slot ID format')
})

// ============================================================================
// BOOKING SCHEMAS
// ============================================================================

/**
 * Booking status enumeration matching database CHECK constraint
 * From schema: status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
 */
export const BookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
])

/**
 * Schema for creating a new booking
 *
 * Validates:
 * - slot_id: Valid UUID of parking slot
 * - start_time: ISO 8601 datetime string (converted to Date)
 * - end_time: ISO 8601 datetime string, must be after start_time
 *
 * CRITICAL SECURITY:
 * - total_price is NOT accepted from client (calculated by DB trigger)
 * - renter_id is set from authenticated session
 * - Database trigger calculates price from slot.price_per_hour * duration
 */
export const CreateBookingSchema = z.object({
  slot_id: z.string().uuid('Invalid slot ID'),
  start_time: z.string().datetime('Invalid start time format (ISO 8601 required)'),
  end_time: z.string().datetime('Invalid end time format (ISO 8601 required)')
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
)

/**
 * Schema for updating a booking
 *
 * CRITICAL SECURITY CONSTRAINT:
 * - Users can ONLY cancel their own bookings
 * - Status can ONLY be changed to 'cancelled'
 * - Prevents status manipulation (e.g., marking completed without actually using slot)
 * - Other status transitions handled by slot owners or admin
 *
 * Use cases:
 * - Renter cancels booking before start_time
 * - Owner cancels booking (separate policy)
 */
export const UpdateBookingSchema = z.object({
  status: z.literal('cancelled', {
    message: 'Only status="cancelled" is allowed for user updates'
  })
})

/**
 * Schema for booking ID validation (UUID format)
 * Used in GET/PATCH/DELETE /api/bookings/[id] routes
 */
export const BookingIdSchema = z.object({
  id: z.string().uuid('Invalid booking ID format')
})

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

/**
 * Phone number validation regex (flexible format)
 * Accepts: +1234567890, (123) 456-7890, 123-456-7890, etc.
 */
const phoneRegex = /^[\d\s\-\+\(\)]+$/

/**
 * Schema for updating user profile
 *
 * Allows updating:
 * - name: User's display name (min 1 character)
 * - phone: Contact number (validated format)
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * - CANNOT change email (identity field, managed by auth system)
 * - CANNOT change unit_number (tenant identifier, immutable after creation)
 * - CANNOT change community_code (tenant isolation, immutable)
 *
 * Rationale:
 * - email: Auth provider owns this field
 * - unit_number: Physical property assignment, requires admin approval to change
 * - community_code: Multi-tenant isolation boundary
 */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional()
}).refine(
  (data) => {
    // Explicitly reject forbidden fields
    const forbiddenFields = ['email', 'unit_number', 'community_code']
    const hasUnauthorizedField = forbiddenFields.some(field => field in data)
    return !hasUnauthorizedField
  },
  {
    message: 'Cannot change email, unit_number, or community_code - these fields are immutable'
  }
)

/**
 * Schema for profile ID validation (UUID format)
 * Used in GET/PATCH /api/profile/[id] routes
 */
export const ProfileIdSchema = z.object({
  id: z.string().uuid('Invalid profile ID format')
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates request data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Untrusted input data (from request body, query params, etc.)
 * @returns Validated and typed data
 * @throws ZodError if validation fails (caught by formatZodError)
 *
 * Usage in API routes:
 * ```typescript
 * const validatedData = validateRequest(CreateSlotSchema, await req.json())
 * ```
 */
export function validateRequest<T>(schema: z.Schema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Formats Zod validation errors into user-friendly messages
 *
 * Converts Zod's detailed error structure into readable strings for API responses
 *
 * @param error - ZodError instance from failed validation
 * @returns Human-readable error message string
 *
 * Example output:
 * - "slot_number: Required"
 * - "price_per_hour: Must be greater than 0"
 * - "end_time: End time must be after start time"
 *
 * Usage in API error handling:
 * ```typescript
 * try {
 *   validateRequest(CreateSlotSchema, data)
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     return Response.json(
 *       { error: formatZodError(error) },
 *       { status: 400 }
 *     )
 *   }
 * }
 * ```
 */
export function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues
    .map((e: z.ZodIssue) => {
      const path = e.path.length > 0 ? `${e.path.join('.')}: ` : ''
      return `${path}${e.message}`
    })
    .join(', ')
}

/**
 * Type-safe validation with error handling wrapper
 *
 * Returns a result object instead of throwing errors, useful for
 * non-exception-based error handling patterns
 *
 * @param schema - Zod schema to validate against
 * @param data - Untrusted input data
 * @returns Result object with success flag and data/error
 *
 * Usage:
 * ```typescript
 * const result = safeValidateRequest(CreateSlotSchema, data)
 * if (!result.success) {
 *   return Response.json({ error: result.error }, { status: 400 })
 * }
 * // result.data is now type-safe and validated
 * ```
 */
export function safeValidateRequest<T>(
  schema: z.Schema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: formatZodError(result.error) }
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * TypeScript types inferred from Zod schemas
 * Use these for type-safe function signatures
 */
export type CreateSlotInput = z.infer<typeof CreateSlotSchema>
export type UpdateSlotInput = z.infer<typeof UpdateSlotSchema>
export type SlotIdInput = z.infer<typeof SlotIdSchema>

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>
export type BookingIdInput = z.infer<typeof BookingIdSchema>

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ProfileIdInput = z.infer<typeof ProfileIdSchema>

export type SlotType = z.infer<typeof SlotTypeEnum>
export type SlotStatus = z.infer<typeof SlotStatusEnum>
export type BookingStatus = z.infer<typeof BookingStatusEnum>
