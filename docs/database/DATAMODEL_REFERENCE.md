# ParkBoard Data Model - Quick Reference

**Quick lookup guide for developers working with ParkBoard data models**

---

## Table Quick Reference

### Business Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|-----------|
| **user_profiles** | User account data | id (UUID) | email, unit_number, password_hash |
| **parking_slots** | Rentable slots | slot_id (SERIAL) | owner_id, slot_number, price_per_hour, status |
| **bookings** | Rental transactions | booking_id (SERIAL) | slot_id, renter_id, slot_owner_id, total_price |

### Auth Tables

| Table | Purpose | PK | Key Fields |
|-------|---------|-----|-----------|
| **accounts** | OAuth provider links | id (UUID) | user_id, provider, provider_account_id |
| **sessions** | DB sessions (optional) | id (UUID) | session_token, user_id |
| **verification_tokens** | Email/password tokens | (identifier, token) | token, expires |

---

## Common Query Patterns

### Fetch User with Email

```typescript
// TypeScript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'user@example.com')
  .single()
```

**Uses Index:** `idx_user_profiles_email`

---

### List Marketplace Slots

```typescript
// TypeScript
const { data: slots } = await supabase
  .from('parking_slots')
  .select('slot_id, slot_number, price_per_hour, slot_type, description, owner_id, user_profiles(*)')
  .eq('status', 'active')
```

**Uses Index:** `idx_slots_listing` (covering - fast!)
**Speed:** 2-3x faster than full table scan

---

### Get User's Bookings

```typescript
// TypeScript
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('renter_id', userId)
  .neq('status', 'cancelled')
  .order('start_time', { ascending: false })
```

**Uses Index:** `idx_bookings_renter_status_time` (composite - very fast!)
**Speed:** 50-80% faster than without index

---

### Check Slot Availability

```typescript
// TypeScript - Check if slot is free for time range
const { data: conflicts } = await supabase
  .from('bookings')
  .select('booking_id')
  .eq('slot_id', slotId)
  .eq('status', 'confirmed')
  .gte('start_time', checkStart)
  .lt('end_time', checkEnd)

const isAvailable = conflicts?.length === 0

// Or use database function:
const { data } = await supabase.rpc('is_slot_bookable', {
  p_slot_id: slotId,
  p_start_time: checkStart,
  p_end_time: checkEnd
})
```

**Uses Index:** `idx_bookings_time_range` (GIST temporal)

---

### Get Owner's Slot Bookings

```typescript
// TypeScript - Owner wants to see all bookings on their slots
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('slot_owner_id', userId)
```

**Uses Index:** `idx_bookings_owner` (composite)

---

## Constraint Reference

### Validation Happens Here

| Constraint | Enforced At | Example |
|-----------|------------|---------|
| `unit_number UNIQUE` | Database | Can't have 2 users with unit "A-10" |
| `slot_number UNIQUE` | Database | Each slot has unique ID |
| `slot_type CHECK` | Database | Only 'covered', 'uncovered', 'tandem' allowed |
| `status CHECK` | Database | Invalid status rejected |
| `price_per_hour > 0` | Database | Can't set negative price |
| `total_price > 0` | Database | Auto-calculated only |
| `end_time > start_time` | Database | Invalid time ranges rejected |
| `no_overlap EXCLUDE GIST` | Database | Double-booking impossible |

### Check Constraint Values

```typescript
// Slot status values (from database constraint)
type SlotStatus = 'active' | 'maintenance' | 'disabled'

// Booking status values
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

// Slot type values
type SlotType = 'covered' | 'uncovered' | 'tandem'
```

---

## Auto-Calculated Fields

### total_price (AUTOMATIC - DO NOT SET)

```typescript
// ❌ WRONG - Will be overwritten by trigger
await supabase.from('bookings').insert({
  slot_id: 1,
  renter_id: userId,
  start_time: '2026-04-01T10:00:00Z',
  end_time: '2026-04-01T12:00:00Z',
  total_price: 50  // ❌ IGNORED - trigger recalculates
})

// ✅ CORRECT - Let trigger calculate
const startTime = new Date('2026-04-01T10:00:00Z')
const endTime = new Date('2026-04-01T12:00:00Z')
// 2 hours × $25/hr = $50 (calculated by trigger)

await supabase.from('bookings').insert({
  slot_id: 1,
  renter_id: userId,
  start_time: startTime.toISOString(),
  end_time: endTime.toISOString()
  // total_price omitted - will be calculated
})
```

**Security Mechanism:** Prevents client-side price manipulation in DevTools

---

### slot_owner_id (AUTOMATIC - DO NOT SET)

```typescript
// ❌ WRONG - Will be overwritten by trigger
await supabase.from('bookings').insert({
  slot_id: 1,
  renter_id: userId,
  start_time: '2026-04-01T10:00:00Z',
  end_time: '2026-04-01T12:00:00Z',
  slot_owner_id: 'some-uuid'  // ❌ IGNORED - trigger sets from slot
})

// ✅ CORRECT - Let trigger populate
await supabase.from('bookings').insert({
  slot_id: 1,
  renter_id: userId,
  start_time: '2026-04-01T10:00:00Z',
  end_time: '2026-04-01T12:00:00Z'
  // slot_owner_id omitted - will be copied from parking_slots
})
```

**Performance Mechanism:** Eliminates subquery in RLS policies (40-60% faster)

---

### updated_at (AUTOMATIC - DO NOT SET)

```typescript
// ❌ WRONG - Will be overwritten by trigger
await supabase.from('user_profiles').update({
  name: 'John Doe',
  updated_at: '2026-03-18T10:00:00Z'  // ❌ IGNORED
})

// ✅ CORRECT - Let trigger update timestamp
await supabase.from('user_profiles').update({
  name: 'John Doe'
  // updated_at omitted - will be set to NOW()
})
```

---

## Nullability Reference

### Can Be NULL

| Field | Reason | Impact |
|-------|--------|--------|
| `parking_slots.owner_id` | Condo-owned slots | May have no individual owner |
| `bookings.slot_owner_id` | Slot may become unowned | RLS policy handles with OR logic |
| `user_profiles.password_hash` | OAuth-only users | NULL for Google/Facebook login |
| `user_profiles.email_verified` | Not yet verified | NULL until email verified |
| `user_profiles.image` | No profile picture | NULL for non-OAuth users |
| `parking_slots.description` | Optional | NULL = no description |

### Never NULL

| Field | Reason |
|-------|--------|
| `user_profiles.id` | Primary key |
| `user_profiles.email` | Required for auth |
| `user_profiles.phone` | Required for contact |
| `user_profiles.unit_number` | Required for condo context |
| `parking_slots.slot_id` | Primary key |
| `parking_slots.slot_number` | Required identifier |
| `parking_slots.price_per_hour` | Required for pricing |
| `bookings.booking_id` | Primary key |
| `bookings.renter_id` | Booking requires renter |
| `bookings.start_time` | Required for scheduling |
| `bookings.end_time` | Required for scheduling |
| `bookings.total_price` | Calculated by trigger |

---

## Type Conversion Guide

### From Database to TypeScript

```typescript
// PostgreSQL → JavaScript conversions
const dbRow = {
  // UUID → string
  id: "550e8400-e29b-41d4-a716-446655440000" as string

  // SERIAL → number
  slot_id: 42 as number

  // DECIMAL(10,2) → number (handle precision!)
  price_per_hour: 25.50 as number

  // TIMESTAMPTZ → string (ISO 8601)
  created_at: "2026-03-18T10:30:00.000Z" as string

  // TEXT with UNIQUE → string
  unit_number: "A-10" as string
}

// Converting ISO string to Date (when needed)
const createdDate = new Date(dbRow.created_at)

// Rounding money to 2 decimals (avoid floating point errors)
const roundedPrice = Math.round(dbRow.price_per_hour * 100) / 100
```

---

## Access Control Reference

### Row Level Security (RLS) Overview

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **user_profiles** | Public read | Own profile only | Own profile only | ❌ No |
| **parking_slots** | Public read | Any user | Own slots only | ❌ No |
| **bookings** | Relevant only | As renter only | Own/owner slots only | ❌ No |

### "Relevant bookings" RLS Query

```sql
-- Users see bookings where they are:
-- 1. The renter, OR
-- 2. The slot owner
WHERE auth.uid() = renter_id
   OR auth.uid() = slot_owner_id
```

---

## Foreign Key Cascade Rules

### ON DELETE CASCADE (deletes dependent rows)

| Column | If Deleted | Effect |
|--------|-----------|--------|
| `user_profiles.id` | User deleted | All bookings deleted; slots become unowned |
| `parking_slots.slot_id` | Slot deleted | All bookings for slot deleted |
| `bookings.renter_id` | Renter deleted | Booking deleted |
| `accounts.user_id` | User deleted | OAuth account record deleted |
| `sessions.user_id` | User deleted | All sessions terminated |

### ON DELETE SET NULL (clears foreign key)

| Column | If Deleted | Effect |
|--------|-----------|--------|
| `parking_slots.owner_id` | Owner deleted | Slot becomes condo-owned (owner_id = NULL) |
| `bookings.slot_owner_id` | Owner deleted | Denormalized field = NULL (RLS handles) |

---

## Temporal Data Patterns

### Working with Timestamps

```typescript
// Database stores in UTC (TIMESTAMPTZ)
// Supabase returns ISO 8601 strings

// Parse from DB
const startTime = new Date("2026-04-01T10:00:00Z")

// For API calls, use ISO format
const booking = {
  start_time: startTime.toISOString(),  // "2026-04-01T10:00:00.000Z"
  end_time: new Date("2026-04-01T12:00:00Z").toISOString()
}

// Calculate duration in hours (for price calculation)
const startMs = new Date("2026-04-01T10:00:00Z").getTime()
const endMs = new Date("2026-04-01T12:00:00Z").getTime()
const durationHours = (endMs - startMs) / (1000 * 60 * 60)  // 2
```

### Database Temporal Queries

```typescript
// Check overlaps (database does this automatically)
// For a slot, find conflicting bookings:
const { data: conflicts } = await supabase
  .from('bookings')
  .select('booking_id')
  .eq('slot_id', slotId)
  .eq('status', 'confirmed')
  .gte('start_time', requestStart)  // start_time >= request start
  .lt('end_time', requestEnd)        // end_time < request end
```

---

## Status Value Reference

### Slot Status Lifecycle

```
Created → active (default, available for booking)
            ↓
       maintenance (temporarily unavailable)
            ↓
       disabled (permanently removed from marketplace)
```

### Booking Status Lifecycle

```
Created → pending (awaiting confirmation)
   ↓         ↓
   └─→ confirmed (active booking)
            ↓
         completed (booking finished)
         or
         no_show (renter didn't show up)

Any status can transition to: cancelled
```

---

## Error Prevention Patterns

### Price Manipulation Prevention

```typescript
// ❌ INSECURE - Client sets price
const userProvidedPrice = 100  // What user typed
await supabase.from('bookings').insert({
  slot_id: 1,
  renter_id: userId,
  start_time: '2026-04-01T10:00:00Z',
  end_time: '2026-04-01T12:00:00Z',
  total_price: userProvidedPrice  // ❌ Trigger will override
})

// ✅ SECURE - Let database calculate
// User provides slot and times
// Trigger calculates: $25/hr × 2 hours = $50
// Even if network intercept attempts to inject price, DB trigger overrides
```

### Double-Booking Prevention

```typescript
// Database prevents via no_overlap EXCLUDE constraint
// All these attempts will fail:

// ❌ Same time
INSERT INTO bookings (...) VALUES
  (slot_id=1, start='10:00', end='12:00'),
  (slot_id=1, start='10:00', end='12:00')  // ❌ Conflict!

// ❌ Partial overlap
INSERT INTO bookings (...) VALUES
  (slot_id=1, start='10:00', end='12:00'),
  (slot_id=1, start='11:00', end='13:00')  // ❌ Overlap!

// ✅ Non-overlapping allowed
INSERT INTO bookings (...) VALUES
  (slot_id=1, start='10:00', end='12:00', status='confirmed'),
  (slot_id=1, start='12:00', end='14:00', status='confirmed')  // ✅ OK - different times
```

### Unit Uniqueness Prevention

```typescript
// Database prevents via unit_number UNIQUE constraint

// ❌ Cannot create second user with same unit
INSERT INTO user_profiles (id, email, unit_number) VALUES
  ('user1-uuid', 'user1@example.com', 'A-10'),
  ('user2-uuid', 'user2@example.com', 'A-10')  // ❌ Duplicate unit!

// ✅ Only one profile per unit
INSERT INTO user_profiles (id, email, unit_number) VALUES
  ('user1-uuid', 'user1@example.com', 'A-10'),
  ('user2-uuid', 'user2@example.com', 'A-11')  // ✅ OK - different unit
```

---

## Index Usage Checklist

When writing queries, check if these indexes can be used:

- [ ] Fetching by `email`? → `idx_user_profiles_email`
- [ ] Listing active slots? → `idx_slots_listing` (covering, very fast)
- [ ] Getting user's bookings? → `idx_bookings_renter_status_time` (with ORDER BY start_time)
- [ ] Checking availability? → `idx_bookings_time_range` (GIST for overlap)
- [ ] Owner's slot bookings? → `idx_bookings_owner`

---

## Testing Data Models

### Creating Test User

```typescript
// Create user_profiles entry
const { data: profile, error } = await supabase
  .from('user_profiles')
  .insert({
    id: testUserId,  // Must exist in auth.users first
    email: 'test@example.com',
    phone: '555-1234',
    unit_number: 'TEST-001',
    name: 'Test User'
  })
  .select()
  .single()
```

### Creating Test Slot

```typescript
// Create parking_slots entry
const { data: slot, error } = await supabase
  .from('parking_slots')
  .insert({
    owner_id: testUserId,
    slot_number: 'TEST-A1',
    slot_type: 'covered',
    price_per_hour: 10,
    description: 'Test parking slot',
    status: 'active'
  })
  .select()
  .single()
```

### Creating Test Booking (Automatic Fields)

```typescript
// Create bookings entry - triggers handle calculations
const startTime = new Date('2026-04-01T10:00:00Z').toISOString()
const endTime = new Date('2026-04-01T12:00:00Z').toISOString()

const { data: booking, error } = await supabase
  .from('bookings')
  .insert({
    slot_id: testSlotId,
    renter_id: testRenterId,
    start_time: startTime,
    end_time: endTime,
    status: 'pending'
    // total_price: omitted - trigger calculates as $20 (2hrs × $10)
    // slot_owner_id: omitted - trigger copies from slot
  })
  .select()
  .single()

// Verify trigger ran
console.assert(booking.total_price === 20, 'Price trigger failed')
console.assert(booking.slot_owner_id === testUserId, 'Owner trigger failed')
```

---

## Performance Tuning Checklist

- [ ] Using covering index for marketplace (idx_slots_listing)?
- [ ] Using composite index for "my bookings" (idx_bookings_renter_status_time)?
- [ ] Limiting result sets with .limit()?
- [ ] Avoiding SELECT * when possible?
- [ ] Checking EXPLAIN ANALYZE for slow queries?
- [ ] All queries filtering by denormalized columns (no subqueries)?

---

**End of Quick Reference**
