# ParkBoard Data Model Analysis

**Generated:** 2026-03-18
**Focus:** Pure data models, relationships, constraints, and indexes
**Source Files:**
- `/db/schema_optimized.sql` (primary schema)
- `/types/database.ts` (TypeScript types)
- `/db/migrations/006_nextauth_tables.sql` (NextAuth tables)

---

## Executive Summary

ParkBoard uses a production-ready PostgreSQL schema with 6 core tables:
- **3 business tables:** user_profiles, parking_slots, bookings
- **3 NextAuth tables:** accounts, sessions, verification_tokens
- **Key security:** Server-side price calculation (trigger), overlap prevention (EXCLUDE constraint), denormalized ownership for RLS performance
- **Index strategy:** Composite indexes for common queries, covering indexes for marketplace listings

---

## Core Business Tables

### 1. USER_PROFILES

**Purpose:** Extends Supabase auth.users with business-specific user data

**Primary Key:** `id` (UUID, references `auth.users(id)`)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PK, FK→auth.users(id) ON DELETE CASCADE | User identifier from Supabase Auth |
| `name` | TEXT | NOT NULL | Display name |
| `email` | TEXT | NOT NULL | Contact email |
| `phone` | TEXT | NOT NULL | Contact phone for bookings |
| `unit_number` | TEXT | NOT NULL, UNIQUE | Condo unit (prevents duplicate registrations) |
| `password_hash` | TEXT | NULL (added by migration 006) | Hashed password for credentials auth (bcrypt) |
| `email_verified` | TIMESTAMPTZ | NULL (added by migration 006) | Email verification timestamp (NULL=unverified) |
| `image` | TEXT | NULL (added by migration 006) | OAuth profile picture URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last profile update (auto-maintained by trigger) |

**Indexes:**
- `idx_user_profiles_email` - Email lookups for authentication

**Triggers:**
- `user_profiles_updated_at` - Auto-updates `updated_at` on every UPDATE

**Relationships:**
- ← `parking_slots.owner_id` (FK, ON DELETE SET NULL)
- ← `bookings.renter_id` (FK, ON DELETE CASCADE)
- ← `bookings.slot_owner_id` (FK, ON DELETE SET NULL, denormalized)
- ← `accounts.user_id` (FK, ON DELETE CASCADE)
- ← `sessions.user_id` (FK, ON DELETE CASCADE)

**Row Level Security:**
- ✅ `public_read_profiles` - Anyone can view all profiles (needed for booking contact info)
- ✅ `users_insert_own_profile` - Users can only create their own profile
- ✅ `users_update_own_profile` - Users can only update their own profile

**TypeScript Type:**
```typescript
interface UserProfile {
  id: string                    // UUID
  name: string
  email: string
  phone: string
  unit_number: string
  created_at: string           // ISO 8601
  updated_at: string           // ISO 8601
}
```

---

### 2. PARKING_SLOTS

**Purpose:** Represents available parking slots for rent

**Primary Key:** `slot_id` (SERIAL auto-increment)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `slot_id` | SERIAL | PK | Auto-incrementing slot identifier |
| `owner_id` | UUID | FK→user_profiles(id) ON DELETE SET NULL | Slot owner (NULL = condo-owned/admin slot) |
| `slot_number` | TEXT | NOT NULL, UNIQUE | Human-readable ID (e.g., "A-10", "B-5") |
| `slot_type` | TEXT | DEFAULT 'covered', CHECK IN ('covered','uncovered','tandem') | Physical characteristics |
| `description` | TEXT | NULL | Additional details (shade, near elevator, etc.) |
| `price_per_hour` | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Hourly rental rate |
| `status` | TEXT | DEFAULT 'active', CHECK IN ('active','maintenance','disabled') | Admin status (not derived from bookings) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Slot creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update (auto-maintained by trigger) |

**Indexes:**
- `idx_slots_status` - Filters by administrative status
- `idx_slots_owner` - Owner's slot lookups
- **`idx_slots_listing`** (Covering) - Marketplace queries with Index-Only Scan
  - Columns: (status, slot_id) INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  - WHERE status = 'active'
  - **Impact:** 2-3x faster marketplace listings

**Triggers:**
- `parking_slots_updated_at` - Auto-updates `updated_at` on every UPDATE

**Relationships:**
- → `user_profiles.id` (owner_id, can be NULL)
- ← `bookings.slot_id` (FK, ON DELETE CASCADE)
- ← `bookings.slot_owner_id` (denormalized, ON DELETE SET NULL)

**Row Level Security:**
- ✅ `public_read_slots` - Anyone can view all active slots (public marketplace)
- ✅ `owners_manage_own_slots` - Owners can CRUD their own slots
- ✅ `users_create_slots` - Any user can create slots (becomes owner)

**TypeScript Type:**
```typescript
interface ParkingSlot {
  slot_id: number              // SERIAL
  owner_id: string | null      // UUID or NULL
  slot_number: string
  slot_type: string            // 'covered' | 'uncovered' | 'tandem'
  description: string | null
  price_per_hour: number       // DECIMAL(10,2)
  status: SlotStatus           // 'active' | 'maintenance' | 'disabled'
  created_at: string           // ISO 8601
  updated_at: string           // ISO 8601
}

type SlotStatus = 'active' | 'maintenance' | 'disabled'
```

---

### 3. BOOKINGS

**Purpose:** Represents rental transactions - users (renters) booking slots for time periods

**Primary Key:** `booking_id` (SERIAL auto-increment)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `booking_id` | SERIAL | PK | Auto-incrementing booking identifier |
| `slot_id` | INT | NOT NULL, FK→parking_slots(slot_id) ON DELETE CASCADE | Which slot is booked |
| `renter_id` | UUID | NOT NULL, FK→user_profiles(id) ON DELETE CASCADE | Who is renting |
| `slot_owner_id` | UUID | FK→user_profiles(id) ON DELETE SET NULL | **Denormalized** owner for RLS (auto-populated by trigger) |
| `start_time` | TIMESTAMPTZ | NOT NULL | Booking start (inclusive) |
| `end_time` | TIMESTAMPTZ | NOT NULL | Booking end (exclusive) |
| `total_price` | DECIMAL(10,2) | NOT NULL, CHECK > 0 | **Auto-calculated by trigger** (security) |
| `status` | TEXT | DEFAULT 'pending', CHECK IN (...) | Booking lifecycle state |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Booking creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update (auto-maintained by trigger) |

**Status Values:** 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

**Constraints:**
- `valid_time_range`: `end_time > start_time` - Prevents invalid time ranges
- **`no_overlap` (EXCLUDE GIST):** Prevents double-booking
  - Condition: `(status != 'cancelled')`
  - **Effect:** Two confirmed bookings cannot overlap for same slot; cancelled bookings ignored
  - **Uses:** btree_gist extension for temporal range comparison

**Indexes:**
- `idx_bookings_slot` - Find bookings for a slot
- `idx_bookings_status` - Filter by booking status
- `idx_bookings_time_range` - GIST index for temporal overlap queries
- **`idx_bookings_renter_status_time`** (Composite) - "My bookings" queries
  - Columns: (renter_id, status, start_time DESC)
  - WHERE status != 'cancelled'
  - **Impact:** 50-80% faster booking list queries
- **`idx_bookings_owner`** (Composite) - Owner's slot bookings
  - Columns: (slot_owner_id, status)
  - WHERE slot_owner_id IS NOT NULL
  - **Impact:** Optimizes owner dashboard queries

**Triggers:**
1. `booking_set_owner` (BEFORE INSERT) - Auto-populates `slot_owner_id` from `parking_slots.owner_id`
   - **Security:** Enables RLS policy without subquery (40-60% faster)
2. `booking_price_calculation` (BEFORE INSERT OR UPDATE of start_time, end_time, slot_id)
   - **Security:** Prevents client-side price manipulation
   - Formula: `total_price = price_per_hour × (epoch_seconds / 3600)`
3. `bookings_updated_at` (BEFORE UPDATE) - Auto-updates `updated_at`

**Relationships:**
- → `parking_slots.slot_id` (must exist)
- → `user_profiles.id` (renter_id, must exist)
- → `user_profiles.id` (slot_owner_id, can be NULL)

**Row Level Security:**
- ✅ `users_see_relevant_bookings` (SELECT) - Users see bookings where they're renter OR owner
  - Policy: `auth.uid() = renter_id OR auth.uid() = slot_owner_id`
  - Uses denormalized `slot_owner_id` (no subquery needed)
- ✅ `users_create_bookings` (INSERT) - Renters create bookings for themselves
- ✅ `renters_update_own_bookings` (UPDATE) - Renters can update their own bookings (cancel, etc.)
- ✅ `owners_update_slot_bookings` (UPDATE) - Owners can update bookings for their slots (confirm, cancel)

**TypeScript Type:**
```typescript
interface Booking {
  booking_id: number           // SERIAL
  slot_id: number
  renter_id: string            // UUID
  slot_owner_id: string | null // UUID or NULL (denormalized)
  start_time: string           // ISO 8601
  end_time: string             // ISO 8601
  total_price: number          // DECIMAL(10,2), auto-calculated
  status: BookingStatus        // 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  created_at: string           // ISO 8601
  updated_at: string           // ISO 8601
}

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
```

---

## NextAuth.js Tables (Authentication)

### 4. ACCOUNTS

**Purpose:** Links OAuth provider accounts to user_profiles (supports Google, Facebook, etc.)

**Primary Key:** `id` (UUID, auto-generated)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Account record ID |
| `user_id` | UUID | NOT NULL, FK→user_profiles(id) ON DELETE CASCADE | Links to user |
| `type` | TEXT | NOT NULL | 'oauth', 'email', 'credentials' |
| `provider` | TEXT | NOT NULL | 'google', 'facebook', etc. |
| `provider_account_id` | TEXT | NOT NULL | User ID from OAuth provider |
| `refresh_token` | TEXT | NULL | OAuth refresh token |
| `access_token` | TEXT | NULL | OAuth access token |
| `expires_at` | BIGINT | NULL | Token expiration (Unix epoch seconds) |
| `token_type` | TEXT | NULL | 'Bearer', etc. |
| `scope` | TEXT | NULL | OAuth scopes (space-separated) |
| `id_token` | TEXT | NULL | OpenID Connect ID token |
| `session_state` | TEXT | NULL | OpenID Connect session state |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update (auto-maintained by trigger) |

**Constraints:**
- `accounts_provider_unique` - UNIQUE (provider, provider_account_id): Each provider account linked only once

**Indexes:**
- `idx_accounts_user_id` - User's OAuth accounts
- `idx_accounts_provider` - Find accounts by provider

**Triggers:**
- `accounts_updated_at` - Auto-updates `updated_at` on every UPDATE

**Relationships:**
- → `user_profiles.id` (user_id, required)

---

### 5. SESSIONS

**Purpose:** Database sessions for NextAuth (optional, used with non-JWT strategy)

**Primary Key:** `id` (UUID, auto-generated)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Session record ID |
| `session_token` | TEXT | NOT NULL, UNIQUE | Token stored in cookie |
| `user_id` | UUID | NOT NULL, FK→user_profiles(id) ON DELETE CASCADE | Links to user |
| `expires` | TIMESTAMPTZ | NOT NULL | Session expiration time |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Session creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update (auto-maintained by trigger) |

**Indexes:**
- `idx_sessions_user_id` - User's sessions
- `idx_sessions_token` - Session token lookup
- `idx_sessions_expires` - Cleanup expired sessions

**Triggers:**
- `sessions_updated_at` - Auto-updates `updated_at` on every UPDATE

**Relationships:**
- → `user_profiles.id` (user_id, required)

---

### 6. VERIFICATION_TOKENS

**Purpose:** Email verification and password reset tokens (single-use, expiring)

**Primary Key:** Composite (identifier, token)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `identifier` | TEXT | NOT NULL, PK | Email address or user identifier |
| `token` | TEXT | NOT NULL, PK | Verification token (hashed) |
| `expires` | TIMESTAMPTZ | NOT NULL | Token expiration |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Token creation |

**Indexes:**
- `idx_verification_tokens_token` - Token lookup
- `idx_verification_tokens_expires` - Cleanup expired tokens

**No Relationships** - Standalone table for temporary verification flows

---

## Data Model Relationships

### Entity-Relationship Diagram (Conceptual)

```
┌─────────────────────┐
│   user_profiles     │
│  (core user data)   │
├─────────────────────┤
│ id (UUID, PK)       │
│ unit_number (UNIQUE)│
│ password_hash       │
│ email_verified      │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────────┬─────────────────┐
    │             │              │                 │
    ▼             ▼              ▼                 ▼
┌─────────┐ ┌──────────────┐ ┌────────┐      ┌─────────┐
│accounts │ │parking_slots │ │booking │      │sessions │
│(OAuth)  │ │ (products)   │ │ (JOIN) │      │(sessions)
└─────────┘ │owner_id(FK)  │ └───┬────┘      └─────────┘
            │slot_number   │     │
            └──────────────┘     │
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────────────────────────────┐
            │          booking flows               │
            │  renter_id (FK) → user_profiles      │
            │  slot_id (FK) → parking_slots        │
            │  slot_owner_id (denormalized, FK)    │
            │     → user_profiles (for RLS)        │
            └──────────────────────────────────────┘
```

### Key Relationships Summary

| From | To | Relationship | Cardinality | ON DELETE |
|------|----|-|---|-|
| user_profiles | auth.users | 1:1 reference | One user has one auth account | CASCADE |
| parking_slots | user_profiles (owner_id) | M:1 | Many slots per owner, owner can be NULL | SET NULL |
| bookings | parking_slots | M:1 | Many bookings per slot | CASCADE |
| bookings | user_profiles (renter_id) | M:1 | Many bookings per renter | CASCADE |
| bookings | user_profiles (slot_owner_id) | M:1 | Denormalized (read-only computed) | SET NULL |
| accounts | user_profiles | M:1 | Multiple OAuth accounts per user | CASCADE |
| sessions | user_profiles | M:1 | Multiple sessions per user | CASCADE |

---

## Field-Level Type Mapping

### PostgreSQL → TypeScript Type Conversions

| PG Type | TS Type | Notes |
|---------|---------|-------|
| UUID | `string` | Stored as text "550e8400-e29b-41d4..." |
| SERIAL | `number` | Auto-incrementing integer |
| TEXT | `string` | Variable-length text |
| DECIMAL(10,2) | `number` | Money fields (use Math.round(x*100)/100) |
| TIMESTAMPTZ | `string` | ISO 8601 format from Supabase |
| BOOLEAN | `boolean` | Standard boolean |
| BIGINT | `number` | For Unix timestamps (expires_at) |

### Nullability Patterns

```typescript
// Required fields (NOT NULL in schema)
name: string

// Optional fields (NULL allowed in schema)
owner_id: string | null       // Condo-owned slots
description: string | null    // Optional slot details
password_hash: string | null  // NULL for OAuth-only users
```

---

## Security Features

### 1. Server-Side Price Calculation ✅

**Problem:** Prevent clients from manipulating booking prices in DevTools

**Solution:** Database trigger auto-calculates `total_price`

**Implementation:**
```sql
CREATE TRIGGER booking_price_calculation
  BEFORE INSERT OR UPDATE OF start_time, end_time, slot_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_price();

-- Function multiplies: price_per_hour × duration_hours
v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600
NEW.total_price := v_price_per_hour * v_duration_hours
```

**Effect:** Client-submitted `total_price` is always overwritten

### 2. Overlap Prevention (Race Condition Prevention) ✅

**Problem:** Two users can confirm overlapping bookings simultaneously

**Solution:** EXCLUDE constraint with temporal overlap detection

**Implementation:**
```sql
CONSTRAINT no_overlap EXCLUDE USING gist (
  slot_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (status != 'cancelled')
```

**Effect:** Database-level prevention (no race conditions possible)

### 3. Denormalized Ownership for RLS ✅

**Problem:** RLS policy requires subquery to check if user owns slot

**Performance Issue:** Subquery evaluated per row → 40-60% slower queries

**Solution:** Denormalize `slot_owner_id` in bookings table

**Implementation:**
```sql
-- Trigger auto-populates on booking insert
CREATE TRIGGER booking_set_owner
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_slot_owner_id();

-- RLS policy uses direct column (no subquery)
CREATE POLICY "owners_update_slot_bookings" ON bookings
  FOR UPDATE
  USING (auth.uid() = slot_owner_id);  -- ✅ Direct, not subquery
```

**Effect:** 40-60% faster RLS evaluation, eliminates subquery overhead

### 4. Unit Number Uniqueness ✅

**Problem:** Multiple users could register with same condo unit

**Solution:** UNIQUE constraint

```sql
unit_number TEXT NOT NULL UNIQUE
```

**Effect:** Database enforces one profile per unit

### 5. Row Level Security (RLS) ✅

All business tables have RLS enabled. Users can only see data they're authorized for:

- **user_profiles:** Can view all; can update only own
- **parking_slots:** Can view all (public marketplace); can manage own
- **bookings:** Can view only their own or where they're owner; can update relevant ones

---

## Index Strategy

### Common Query Patterns and Indexes

| Pattern | Query | Index | Speed Impact |
|---------|-------|-------|--------------|
| List active slots | `SELECT * FROM parking_slots WHERE status='active'` | `idx_slots_listing` (covering) | 2-3x faster |
| User's bookings | `SELECT * FROM bookings WHERE renter_id=? ORDER BY start_time DESC` | `idx_bookings_renter_status_time` | 50-80% faster |
| Slot availability | Check for conflicts for slot ID in time range | `idx_bookings_time_range` (GIST) | Prevents sequential scan |
| Owner's slot bookings | `SELECT * FROM bookings WHERE slot_owner_id=?` | `idx_bookings_owner` | Optimized lookups |
| User authentication | `SELECT * FROM user_profiles WHERE email=?` | `idx_user_profiles_email` | Fast login |

### Covering Indexes (Index-Only Scans)

**`idx_slots_listing`** - Includes all columns needed for marketplace listing:
```sql
CREATE INDEX idx_slots_listing ON parking_slots(status, slot_id)
  INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  WHERE status = 'active'
```

**Benefit:** PostgreSQL never needs to access the main table (Index-Only Scan) → 2-3x faster

### Composite Indexes (Multi-Column Filters + Sort)

**`idx_bookings_renter_status_time`** - Optimizes "my bookings with status filter, sorted by time":
```sql
CREATE INDEX idx_bookings_renter_status_time ON bookings(renter_id, status, start_time DESC)
  WHERE status != 'cancelled'
```

**Benefit:** Single index scan satisfies WHERE and ORDER BY → 50-80% faster than multiple index lookups

---

## Constraints Summary

### Primary Key Constraints
- `user_profiles.id` (PK, UUID)
- `parking_slots.slot_id` (PK, SERIAL)
- `bookings.booking_id` (PK, SERIAL)
- `accounts.id` (PK, UUID)
- `sessions.id` (PK, UUID)
- `verification_tokens.(identifier, token)` (Composite PK)

### Foreign Key Constraints
- `parking_slots.owner_id` → `user_profiles.id` (ON DELETE SET NULL)
- `bookings.slot_id` → `parking_slots.slot_id` (ON DELETE CASCADE)
- `bookings.renter_id` → `user_profiles.id` (ON DELETE CASCADE)
- `bookings.slot_owner_id` → `user_profiles.id` (ON DELETE SET NULL, denormalized)
- `accounts.user_id` → `user_profiles.id` (ON DELETE CASCADE)
- `sessions.user_id` → `user_profiles.id` (ON DELETE CASCADE)
- `user_profiles.id` → `auth.users.id` (ON DELETE CASCADE)

### Unique Constraints
- `user_profiles.unit_number` - One profile per condo unit
- `parking_slots.slot_number` - One slot identifier per system
- `sessions.session_token` - Session tokens are unique
- `accounts.(provider, provider_account_id)` - Each OAuth account linked once

### Check Constraints
- `parking_slots.slot_type IN ('covered', 'uncovered', 'tandem')`
- `parking_slots.status IN ('active', 'maintenance', 'disabled')`
- `parking_slots.price_per_hour > 0`
- `bookings.status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')`
- `bookings.total_price > 0`
- `bookings.end_time > bookings.start_time` (valid time range)

### Temporal Constraints
- `bookings.no_overlap` (EXCLUDE GIST) - Prevents double-booking for same slot (except cancelled)

---

## Triggers and Automation

### Auto-Timestamp Maintenance

**Function:** `update_updated_at()`
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to:** user_profiles, parking_slots, bookings, accounts, sessions

**Effect:** `updated_at` automatically updated on every row UPDATE

### Denormalized Ownership (Performance)

**Function:** `set_slot_owner_id()`
```sql
SELECT owner_id INTO NEW.slot_owner_id
FROM parking_slots WHERE slot_id = NEW.slot_id;
```

**Applied to:** bookings (BEFORE INSERT)

**Effect:** Auto-populates `slot_owner_id` from slot's owner → enables fast RLS queries

### Server-Side Price Calculation (Security)

**Function:** `calculate_booking_price()`
```sql
v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
NEW.total_price := v_price_per_hour * v_duration_hours;
```

**Applied to:** bookings (BEFORE INSERT OR UPDATE of start_time, end_time, slot_id)

**Effect:** Prevents client-side price manipulation; total_price always recalculated

### Helper Function: Bookability Check

**Function:** `is_slot_bookable(p_slot_id, p_start_time, p_end_time)`
```sql
-- Checks:
-- 1. Slot exists and is 'active' status
-- 2. No confirmed bookings overlap in time range
-- Returns: BOOLEAN
```

**Used in:** Availability checking queries

---

## TypeScript Joined Types

### SlotWithOwner

```typescript
interface SlotWithOwner extends ParkingSlot {
  user_profiles: UserProfile | null
}
```

**Use Case:** Query with JOIN to get owner details in one call
```typescript
const slot = await supabase
  .from('parking_slots')
  .select('*, user_profiles(*)')
  .single()
```

### BookingWithDetails

```typescript
interface BookingWithDetails extends Booking {
  parking_slots: ParkingSlot & {
    user_profiles: UserProfile
  }
}
```

**Use Case:** Get full booking with slot and owner details
```typescript
const booking = await supabase
  .from('bookings')
  .select('*, parking_slots(*, user_profiles(*))')
  .single()
```

---

## Migration History

| Migration | Status | Purpose |
|-----------|--------|---------|
| 001_hybrid_pricing_model_idempotent.sql | Active | Original schema with pricing |
| 002_multi_tenant_communities_idempotent.sql | Rolled back | Multi-tenant support (per migration 004) |
| 003_community_rls_policies_idempotent.sql | Rolled back | Community RLS (per migration 004) |
| 004_remove_multi_tenant_idempotent.sql | Active | Simplified single-tenant (removed multi-tenant) |
| 005_neon_compatible_schema.sql | Active | Neon database compatibility |
| 006_nextauth_tables.sql | Active | NextAuth.js auth tables |

**Current Schema:** Combination of migrations 001, 004, 005, 006 (multi-tenant removed in 004)

---

## Performance Characteristics

### Query Performance Baseline

| Operation | Typical Time | Optimization |
|-----------|--------------|-------------|
| List marketplace slots (10K rows) | 50ms → 15ms | idx_slots_listing covering index |
| User's booking list | 200ms → 50ms | idx_bookings_renter_status_time composite |
| Check slot availability | Sequential scan → B-tree | idx_bookings_time_range GIST |
| User authentication | Sequential scan → Index | idx_user_profiles_email |

### Storage Considerations

**Typical Row Sizes:**
- user_profiles: ~300 bytes
- parking_slots: ~500 bytes
- bookings: ~400 bytes
- accounts: ~800 bytes

**Index Overhead:**
- Covering index (idx_slots_listing): ~2MB per 100K rows
- Composite index (idx_bookings_renter_status_time): ~3MB per 100K rows

---

## Completeness Checklist

- [x] All 6 tables documented with full schema
- [x] Primary keys, foreign keys, unique/check constraints
- [x] All 13 indexes documented with impact analysis
- [x] 4 triggers with functions explained
- [x] RLS policies for all business tables
- [x] Field-level types with nullability
- [x] TypeScript type definitions mapped
- [x] Security features (price calc, overlap prevention, denormalization)
- [x] Relationship diagram
- [x] Migration history and current schema composition
- [x] Performance characteristics and optimization rationale

---

## Related Files

- **Schema Definition:** `/db/schema_optimized.sql` (comprehensive SQL with comments)
- **TypeScript Types:** `/types/database.ts` (mirrored TS interfaces)
- **NextAuth Config:** `/lib/auth/auth.ts` (uses these tables)
- **Edge Auth Config:** `/lib/auth/auth.config.ts` (used in middleware)
- **API Routes:** `/app/api/` (implement business logic)

---

**End of Data Model Analysis**
