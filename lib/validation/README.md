# API Validation Schemas

This directory contains Zod validation schemas for all API request/response validation in ParkBoard.

## Overview

The `api-schemas.ts` file provides comprehensive validation for:
- **Parking Slots**: Creation, updates, and ID validation
- **Bookings**: Creation, updates (cancellation only), and ID validation
- **User Profiles**: Updates (with immutable field protection)

## Key Security Features

### 1. Tenant Isolation Protection
- `UpdateSlotSchema` prevents `community_code` changes
- `UpdateProfileSchema` prevents `community_code` changes
- Ensures multi-tenant data isolation at the validation layer

### 2. Immutable Field Protection
- `UpdateProfileSchema` prevents changes to:
  - `email` (auth identity)
  - `unit_number` (physical property assignment)
  - `community_code` (tenant boundary)

### 3. Status Manipulation Prevention
- `UpdateBookingSchema` only allows `status='cancelled'`
- Prevents users from marking bookings as 'completed' or 'confirmed' without authorization
- Other status transitions handled by slot owners or admin

### 4. Price Manipulation Prevention
- `CreateBookingSchema` does NOT accept `total_price` from client
- Database trigger calculates price server-side: `price_per_hour * duration`
- Eliminates client-side price manipulation attacks

## Usage Examples

### In API Routes (Next.js App Router)

```typescript
// app/api/slots/route.ts
import { CreateSlotSchema, validateRequest, formatZodError } from '@/lib/validation/api-schemas'
import { z } from 'zod'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = validateRequest(CreateSlotSchema, body)

    // validatedData is now type-safe and validated
    // { slot_number: string, slot_type: 'covered' | 'uncovered' | 'tandem', ... }

    // Insert into database...

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: formatZodError(error) },
        { status: 400 }
      )
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Safe Validation (Non-Exception Pattern)

```typescript
import { safeValidateRequest, CreateBookingSchema } from '@/lib/validation/api-schemas'

export async function POST(req: Request) {
  const body = await req.json()
  const result = safeValidateRequest(CreateBookingSchema, body)

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  // result.data is type-safe
  const { slot_id, start_time, end_time } = result.data
  // ...
}
```

### Type-Safe Function Signatures

```typescript
import type { CreateSlotInput, UpdateProfileInput } from '@/lib/validation/api-schemas'

async function createSlot(data: CreateSlotInput, userId: string) {
  // data is guaranteed to have:
  // - slot_number: string
  // - slot_type: 'covered' | 'uncovered' | 'tandem'
  // - price_per_hour: number (positive)
  // - description?: string
}

async function updateProfile(data: UpdateProfileInput, userId: string) {
  // data can only have:
  // - name?: string
  // - phone?: string
  // email, unit_number, community_code are blocked by schema
}
```

## Schema Reference

### Parking Slots

| Schema | Purpose | Key Validations |
|--------|---------|-----------------|
| `CreateSlotSchema` | Create new slot | slot_number (required), slot_type enum, price > 0 |
| `UpdateSlotSchema` | Update existing slot | All fields optional, prevents community_code changes |
| `SlotIdSchema` | Validate slot ID | UUID format |

### Bookings

| Schema | Purpose | Key Validations |
|--------|---------|-----------------|
| `CreateBookingSchema` | Create new booking | UUID slot_id, ISO datetime strings, end_time > start_time |
| `UpdateBookingSchema` | Update booking | ONLY allows status='cancelled' |
| `BookingIdSchema` | Validate booking ID | UUID format |

### User Profiles

| Schema | Purpose | Key Validations |
|--------|---------|-----------------|
| `UpdateProfileSchema` | Update profile | name, phone only; blocks email, unit_number, community_code |
| `ProfileIdSchema` | Validate profile ID | UUID format |

## Enum Types

```typescript
// Slot Types
type SlotType = 'covered' | 'uncovered' | 'tandem'

// Slot Status
type SlotStatus = 'active' | 'maintenance' | 'disabled'

// Booking Status
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
```

## Helper Functions

### `validateRequest<T>(schema, data): T`
Validates and returns typed data. Throws `ZodError` on validation failure.

### `formatZodError(error): string`
Converts Zod errors into user-friendly messages:
- "slot_number: Slot number is required"
- "price_per_hour: Price must be greater than 0"
- "end_time: End time must be after start time"

### `safeValidateRequest<T>(schema, data)`
Returns result object: `{ success: true, data: T }` or `{ success: false, error: string }`

## Testing

To test validation in your API routes:

```typescript
// Test valid input
const validSlot = {
  slot_number: 'A-10',
  slot_type: 'covered',
  price_per_hour: 15.50,
  description: 'Covered parking near elevator'
}
const result = validateRequest(CreateSlotSchema, validSlot)
// ✓ Passes

// Test invalid input
const invalidSlot = {
  slot_number: '',  // Empty string
  slot_type: 'invalid',  // Not in enum
  price_per_hour: -5  // Negative
}
// ✗ Throws ZodError with detailed messages
```

## Integration with Database Schema

These schemas align with `db/schema_optimized.sql`:

- `slot_type` enum matches DB CHECK constraint: `('covered', 'uncovered', 'tandem')`
- `price_per_hour` positive validation matches DB CHECK: `price_per_hour > 0`
- `booking` date validation enforces DB CHECK: `end_time > start_time`
- UUID validations match PostgreSQL UUID column types

## Security Notes

1. **Never accept `total_price` from client** - The database trigger calculates this
2. **Always validate before database operations** - Prevents invalid data insertion
3. **Use schema types for function parameters** - Ensures compile-time type safety
4. **Format errors for API responses** - Don't expose raw Zod errors (use `formatZodError`)

## Future Enhancements

- [ ] Add response validation schemas (not just requests)
- [ ] Add query parameter validation schemas
- [ ] Add pagination parameter schemas
- [ ] Add admin-specific schemas (full booking status updates)
- [ ] Add batch operation schemas
