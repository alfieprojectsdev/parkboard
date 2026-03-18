# ParkBoard Data Model - Visual Schema

Complete visual representation of the database schema with field details.

---

## Table Structure Diagrams

### USER_PROFILES (Extended by auth.users)

```
┌─────────────────────────────────────────────────────┐
│              user_profiles                           │
├─────────────────────────────────────────────────────┤
│ id (UUID)              [PK] ← auth.users(id)        │
│ name (TEXT)            [NOT NULL]                    │
│ email (TEXT)           [NOT NULL]                    │
│ phone (TEXT)           [NOT NULL]                    │
│ unit_number (TEXT)     [NOT NULL, UNIQUE]            │
│ password_hash (TEXT)   [NULL] ← Added by migration   │
│ email_verified (TS)    [NULL] ← Added by migration   │
│ image (TEXT)           [NULL] ← Added by migration   │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]           │
│ updated_at (TIMESTAMPTZ) [DEFAULT NOW(), AUTO]     │
├─────────────────────────────────────────────────────┤
│ Indexes:                                             │
│  • idx_user_profiles_email (email lookup)           │
│ Triggers:                                            │
│  • user_profiles_updated_at → update_updated_at()  │
│ RLS Policies:                                        │
│  • public_read_profiles (SELECT)                    │
│  • users_insert_own_profile (INSERT)                │
│  • users_update_own_profile (UPDATE)                │
└─────────────────────────────────────────────────────┘
```

---

### PARKING_SLOTS (Available for rent)

```
┌──────────────────────────────────────────────────────┐
│            parking_slots                              │
├──────────────────────────────────────────────────────┤
│ slot_id (SERIAL)        [PK]                        │
│ owner_id (UUID)         [FK → user_profiles(id)]   │
│                         [ON DELETE SET NULL]        │
│                         [NULLABLE] ← Condo-owned   │
│ slot_number (TEXT)      [NOT NULL, UNIQUE]         │
│ slot_type (TEXT)        [DEFAULT 'covered']        │
│                         [CHECK: covered|uncovered  │
│                                   |tandem]         │
│ description (TEXT)      [NULLABLE]                 │
│ price_per_hour (DEC)    [NOT NULL, CHECK > 0]      │
│ status (TEXT)           [DEFAULT 'active']         │
│                         [CHECK: active|maintenance │
│                                   |disabled]       │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]          │
│ updated_at (TIMESTAMPTZ) [DEFAULT NOW(), AUTO]    │
├──────────────────────────────────────────────────────┤
│ Indexes:                                             │
│  • idx_slots_status (status filter)                │
│  • idx_slots_owner (owner lookup)                  │
│  • idx_slots_listing ⭐ (covering) - FAST          │
│    └─ Columns: (status, slot_id)                  │
│    └─ INCLUDE: (slot_number, price, type, desc)   │
│    └─ WHERE status = 'active'                      │
│ Triggers:                                            │
│  • parking_slots_updated_at → update_updated_at()  │
│ RLS Policies:                                        │
│  • public_read_slots (SELECT)                      │
│  • owners_manage_own_slots (ALL)                   │
│  • users_create_slots (INSERT)                     │
└──────────────────────────────────────────────────────┘
```

---

### BOOKINGS (Rental transactions - main business table)

```
┌──────────────────────────────────────────────────────────┐
│              bookings                                     │
├──────────────────────────────────────────────────────────┤
│ booking_id (SERIAL)     [PK]                           │
│ slot_id (INT)           [FK → parking_slots(slot_id)]  │
│                         [ON DELETE CASCADE]            │
│ renter_id (UUID)        [FK → user_profiles(id)]      │
│                         [NOT NULL]                     │
│ slot_owner_id (UUID)    [FK → user_profiles(id)]      │
│                         [ON DELETE SET NULL]          │
│                         [DENORMALIZED] ← Performance  │
│ start_time (TIMESTAMPTZ) [NOT NULL]                   │
│ end_time (TIMESTAMPTZ)   [NOT NULL]                   │
│ total_price (DECIMAL)    [NOT NULL, CHECK > 0]       │
│                         [AUTO-CALCULATED] ← Security │
│ status (TEXT)            [DEFAULT 'pending']          │
│                         [CHECK: pending|confirmed    │
│                                   |cancelled|completed│
│                                   |no_show]           │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]            │
│ updated_at (TIMESTAMPTZ) [DEFAULT NOW(), AUTO]      │
├──────────────────────────────────────────────────────────┤
│ Constraints:                                             │
│  ✓ valid_time_range: end_time > start_time           │
│  ✓ no_overlap EXCLUDE: prevents double-booking      │
│    └─ USING gist(slot_id WITH =,                     │
│                  tstzrange(start, end) WITH &&)      │
│    └─ WHERE status != 'cancelled'                    │
├──────────────────────────────────────────────────────────┤
│ Indexes:                                                 │
│  • idx_bookings_slot (slot lookup)                   │
│  • idx_bookings_status (status filter)               │
│  • idx_bookings_time_range (GIST overlap check)      │
│  • idx_bookings_renter_status_time ⭐ (composite)   │
│    └─ Columns: (renter_id, status, start_time DESC)  │
│    └─ WHERE status != 'cancelled'                     │
│    └─ Impact: 50-80% faster "my bookings" queries   │
│  • idx_bookings_owner (composite)                     │
│    └─ Columns: (slot_owner_id, status)               │
│    └─ WHERE slot_owner_id IS NOT NULL                │
├──────────────────────────────────────────────────────────┤
│ Triggers:                                                 │
│  1. booking_set_owner (BEFORE INSERT)                 │
│     └─ Auto-populate slot_owner_id from parking_slots│
│     └─ Impact: 40-60% faster RLS (no subquery)       │
│  2. booking_price_calculation ⭐ (BEFORE INSERT/UPDATE)│
│     └─ Auto-calculate total_price = rate × duration  │
│     └─ Impact: Prevents client-side manipulation     │
│     └─ Triggers on: INSERT, UPDATE of times/slot    │
│  3. bookings_updated_at (BEFORE UPDATE)              │
│     └─ Auto-update updated_at timestamp              │
├──────────────────────────────────────────────────────────┤
│ RLS Policies:                                             │
│  • users_see_relevant_bookings (SELECT)              │
│    └─ WHERE: auth.uid() = renter_id                  │
│           OR auth.uid() = slot_owner_id             │
│    └─ Optimized: Uses denormalized column, no subq   │
│  • users_create_bookings (INSERT)                    │
│    └─ WITH CHECK: auth.uid() = renter_id             │
│  • renters_update_own_bookings (UPDATE)              │
│    └─ WHERE: auth.uid() = renter_id                  │
│  • owners_update_slot_bookings (UPDATE)              │
│    └─ WHERE: auth.uid() = slot_owner_id              │
│    └─ Optimized: Uses denormalized column, no subq   │
└──────────────────────────────────────────────────────────┘
```

---

### ACCOUNTS (OAuth providers)

```
┌───────────────────────────────────────────────────────┐
│             accounts (NextAuth)                        │
├───────────────────────────────────────────────────────┤
│ id (UUID)               [PK] DEFAULT gen_random_uuid()│
│ user_id (UUID)          [FK → user_profiles(id)]     │
│                         [NOT NULL, ON DELETE CASCADE] │
│ type (TEXT)             [NOT NULL] ← 'oauth'|...    │
│ provider (TEXT)         [NOT NULL] ← 'google'|...   │
│ provider_account_id (TEXT) [NOT NULL]                │
│ refresh_token (TEXT)    [NULLABLE]                   │
│ access_token (TEXT)     [NULLABLE]                   │
│ expires_at (BIGINT)     [NULLABLE] ← Unix seconds   │
│ token_type (TEXT)       [NULLABLE]                   │
│ scope (TEXT)            [NULLABLE]                   │
│ id_token (TEXT)         [NULLABLE]                   │
│ session_state (TEXT)    [NULLABLE]                   │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]           │
│ updated_at (TIMESTAMPTZ) [DEFAULT NOW(), AUTO]     │
├───────────────────────────────────────────────────────┤
│ Constraints:                                          │
│  • accounts_provider_unique (provider, provider_id) │
├───────────────────────────────────────────────────────┤
│ Indexes:                                              │
│  • idx_accounts_user_id (user lookup)               │
│  • idx_accounts_provider (provider filter)          │
│ Triggers:                                             │
│  • accounts_updated_at → update_updated_at()        │
└───────────────────────────────────────────────────────┘
```

---

### SESSIONS (Database sessions - optional)

```
┌─────────────────────────────────────────────────────┐
│           sessions (NextAuth)                        │
├─────────────────────────────────────────────────────┤
│ id (UUID)              [PK] DEFAULT gen_random_uuid()│
│ session_token (TEXT)   [NOT NULL, UNIQUE]           │
│ user_id (UUID)         [FK → user_profiles(id)]    │
│                        [NOT NULL, ON DELETE CASCADE]│
│ expires (TIMESTAMPTZ)  [NOT NULL]                  │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]          │
│ updated_at (TIMESTAMPTZ) [DEFAULT NOW(), AUTO]    │
├─────────────────────────────────────────────────────┤
│ Indexes:                                             │
│  • idx_sessions_user_id (user lookup)              │
│  • idx_sessions_token (token lookup)               │
│  • idx_sessions_expires (expiry cleanup)           │
│ Triggers:                                            │
│  • sessions_updated_at → update_updated_at()       │
└─────────────────────────────────────────────────────┘
```

---

### VERIFICATION_TOKENS (Email/password tokens)

```
┌──────────────────────────────────────────────────────┐
│      verification_tokens (NextAuth)                   │
├──────────────────────────────────────────────────────┤
│ identifier (TEXT)      [PK] ← email or identifier   │
│ token (TEXT)           [PK] ← hashed token          │
│ expires (TIMESTAMPTZ)  [NOT NULL]                   │
│ created_at (TIMESTAMPTZ) [DEFAULT NOW()]           │
├──────────────────────────────────────────────────────┤
│ Indexes:                                              │
│  • idx_verification_tokens_token (token lookup)     │
│  • idx_verification_tokens_expires (expiry cleanup)  │
└──────────────────────────────────────────────────────┘
```

---

## Relationship Diagram (ER-style)

```
┌──────────────────┐
│  auth.users      │  ← Supabase Auth (external)
│  (unmanaged)     │
└────────┬─────────┘
         │ 1:1 (on delete cascade)
         │
    ┌────▼──────────────────────┐
    │   user_profiles ⭐         │  ← Business data
    │ (extends auth.users)       │
    ├─────────────────────────────┤
    │ id (PK, UUID)               │
    │ unit_number (UNIQUE)        │
    │ password_hash (for creds)   │
    └────┬──────────┬──────────────┘
         │ 1:M      │ 1:M
         │          │
         │          ├─────────────────┐
         │          │                 │
    ┌────▼─────────┐│         ┌───────▼──────────────────┐
    │parking_slots ││         │  bookings ⭐             │
    ├──────────────┤│         ├───────────────────────────┤
    │slot_id (PK)  ││         │ booking_id (PK)           │
    │owner_id (FK) ◄┤         │ slot_id (FK) ──┐         │
    │slot_number   ││         │ renter_id (FK)  │         │
    │price_per_hour││         │ slot_owner_id (denorm) ──┤──┐
    │status        ││         │ start_time      │         │  │
    │*updated_at   ││         │ end_time        │         │  │
    └───────────────┘│         │ total_price (auto) ⭐    │  │
                     │         │ status          │         │  │
                     │         │ *updated_at     │         │  │
                     │         └─────────────────┼─────────┘  │
                     │                           │            │
                     └──────────────────────────┐ │            │
                                 M:1 (on del cascade) │    │    │
                                                │ │    │    │
                                                │ └────┴────┘
                                                │ M:1 (denormalized)
                                                │ (on del set null)
                     ┌─────────────────────────┘
                     │
    ┌────────────────▼────────────────────────┐
    │      accounts (NextAuth) ⭐             │
    ├─────────────────────────────────────────┤
    │ id (PK, UUID)                           │
    │ user_id (FK) ── links to user_profiles  │
    │ provider (google, facebook, etc)        │
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │      sessions (NextAuth)                │
    ├─────────────────────────────────────────┤
    │ id (PK, UUID)                           │
    │ user_id (FK) ── links to user_profiles  │
    │ session_token (UNIQUE)                  │
    │ expires                                 │
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │   verification_tokens (NextAuth)        │
    ├─────────────────────────────────────────┤
    │ (identifier, token) (Composite PK)      │
    │ expires                                 │
    │ [No FK relationships]                   │
    └─────────────────────────────────────────┘

Legend:
  ⭐ = Performance-optimized table
  * = Auto-maintained trigger field
```

---

## Index Performance Matrix

```
┌────────────────────────────────────────────────────────────┐
│ INDEX PERFORMANCE REFERENCE                                │
├────────────────────────────────────────────────────────────┤
│
│ 🚀 FAST INDEXES (Recommended for common queries)
│
│  idx_slots_listing (covering)
│    ├─ Query: List active slots for marketplace
│    ├─ Speed: 2-3x faster than full table scan
│    ├─ Type: COVERING INDEX (no table access)
│    ├─ Columns: (status, slot_id) + INCLUDE (...)
│    └─ WHERE: status = 'active'
│
│  idx_bookings_renter_status_time (composite)
│    ├─ Query: User's bookings with status filter, sorted
│    ├─ Speed: 50-80% faster than sequential scan
│    ├─ Type: COMPOSITE INDEX
│    ├─ Columns: (renter_id, status, start_time DESC)
│    └─ WHERE: status != 'cancelled'
│
├────────────────────────────────────────────────────────────┤
│
│ ⚡ MODERATE INDEXES (Good for specific filters)
│
│  idx_bookings_owner
│    ├─ Query: Owner's slot bookings dashboard
│    ├─ Speed: B-tree lookup + filter
│    ├─ Type: COMPOSITE INDEX
│    └─ Columns: (slot_owner_id, status)
│
│  idx_bookings_time_range (GIST)
│    ├─ Query: Overlap detection, availability check
│    ├─ Speed: Prevents sequential scan
│    ├─ Type: GIST (geometric index for ranges)
│    └─ For: Temporal range queries
│
│  idx_user_profiles_email
│    ├─ Query: User authentication lookup
│    ├─ Speed: O(log N) instead of O(N)
│    ├─ Type: B-tree
│    └─ Columns: (email)
│
└────────────────────────────────────────────────────────────┘
```

---

## Constraint Hierarchy

```
ALL TABLES HAVE:
├─ Primary Key (prevents duplicates)
├─ Foreign Keys (referential integrity)
├─ NOT NULL constraints (required fields)
└─ Check constraints (valid values)

user_profiles:
├─ unit_number UNIQUE (one per unit)
├─ email NOT NULL (required for auth)
└─ phone NOT NULL (required for contact)

parking_slots:
├─ slot_number UNIQUE (human-readable ID)
├─ price_per_hour CHECK > 0 (positive price)
├─ slot_type CHECK IN (...)
├─ status CHECK IN (...)
└─ owner_id FK (can be NULL)

bookings:
├─ end_time > start_time (valid range)
├─ no_overlap EXCLUDE GIST (prevent double-booking)
├─ total_price CHECK > 0 (positive total)
├─ status CHECK IN (...)
└─ slot_owner_id FK (denormalized, can be NULL)

accounts:
└─ (provider, provider_account_id) UNIQUE

sessions:
└─ session_token UNIQUE

verification_tokens:
└─ (identifier, token) Composite Primary Key
```

---

## Trigger Flow Diagram

### On Booking INSERT

```
User submits:
  INSERT bookings (slot_id, renter_id, start_time, end_time)
         ├─ slot_id: 42
         ├─ renter_id: 'user-uuid'
         ├─ start_time: '2026-04-01T10:00:00Z'
         ├─ end_time: '2026-04-01T12:00:00Z'
         ├─ total_price: <omitted or ignored>
         └─ slot_owner_id: <omitted or ignored>

Database applies triggers (in order):

1. booking_set_owner (BEFORE INSERT)
   ├─ Executes: SELECT owner_id FROM parking_slots WHERE slot_id=42
   ├─ Sets: NEW.slot_owner_id = <owner from slot>
   └─ Effect: Denormalization for RLS performance

2. booking_price_calculation (BEFORE INSERT)
   ├─ Fetches: SELECT price_per_hour FROM parking_slots WHERE slot_id=42
   ├─ Calculates: duration = 2 hours
   ├─ Sets: NEW.total_price = $25/hr × 2 = $50
   └─ Effect: Security - prevents client manipulation

3. Database validates constraints:
   ├─ no_overlap: Check no other confirmed bookings overlap
   ├─ valid_time_range: end_time > start_time ✓
   └─ total_price > 0 ✓

4. bookings_updated_at (BEFORE UPDATE) - not applied at INSERT
   └─ Only triggers on UPDATE, so NEW.updated_at = DEFAULT (NOW())

Result:
  INSERTED bookings row:
  ├─ booking_id: 1001 (auto)
  ├─ slot_id: 42
  ├─ renter_id: 'user-uuid'
  ├─ slot_owner_id: 'owner-uuid' ← Auto-filled by trigger
  ├─ start_time: '2026-04-01T10:00:00Z'
  ├─ end_time: '2026-04-01T12:00:00Z'
  ├─ total_price: 50.00 ← Auto-calculated by trigger
  ├─ status: 'pending' (default)
  ├─ created_at: '2026-03-18T14:30:00Z' (auto)
  └─ updated_at: '2026-03-18T14:30:00Z' (auto)
```

### On ANY Row UPDATE

```
User submits:
  UPDATE parking_slots SET price_per_hour = 30 WHERE slot_id = 42

Database applies trigger:

parking_slots_updated_at (BEFORE UPDATE)
  ├─ Triggered by: Any UPDATE to parking_slots
  ├─ Sets: NEW.updated_at = NOW()
  └─ Effect: Audit trail, ETag support for caching

Result:
  Updated row has:
  ├─ price_per_hour: 30.00 (your change)
  └─ updated_at: '2026-03-18T14:35:00Z' ← Auto-updated to current time
```

---

## Data Type Reference

```
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL Type → JavaScript/TypeScript                  │
├──────────────────────────────────────────────────────────┤
│
│ UUID                 → string (40 hex chars + dashes)
│                        "550e8400-e29b-41d4-a716-..."
│
│ SERIAL               → number (auto-increment 1, 2, 3...)
│                        42
│
│ TEXT                 → string (variable length)
│                        "A-10"
│
│ DECIMAL(10,2)        → number (but use Math.round)
│                        25.50
│                        (⚠️ Precision: round(x*100)/100)
│
│ TIMESTAMPTZ          → string (ISO 8601 UTC)
│                        "2026-03-18T14:30:00.000Z"
│
│ BOOLEAN              → boolean
│                        true / false
│
│ BIGINT               → number (big integers)
│                        1704067200 (Unix timestamp)
│
│ INTEGER              → number
│                        42
│
│ NULL in database     → null in JavaScript
│                        null
│
└──────────────────────────────────────────────────────────┘
```

---

## Row Level Security (RLS) Quick Matrix

```
┌──────────────────────┬────────┬────────┬────────┬────────┐
│ TABLE                │ SELECT │ INSERT │ UPDATE │ DELETE │
├──────────────────────┼────────┼────────┼────────┼────────┤
│ user_profiles        │ public │ own    │ own    │ ❌     │
│ parking_slots        │ public │ any    │ own    │ ❌     │
│ bookings             │ own/   │ own as │ own/   │ ❌     │
│                      │ related│ renter │ owner  │        │
│                      │        │        │        │        │
│ accounts (NextAuth)  │ ❌     │ ❌     │ ❌     │ ❌     │
│ sessions (NextAuth)  │ ❌     │ ❌     │ ❌     │ ❌     │
│ verification_tokens  │ ❌     │ ❌     │ ❌     │ ❌     │
└──────────────────────┴────────┴────────┴────────┴────────┘

Legend:
  public    = Anyone can read
  own       = Only your own record
  own/      = You OR slot owner
  related
  any       = Any authenticated user can create
  ❌        = RLS not applicable/policy not defined
```

---

**End of Visual Schema Reference**
