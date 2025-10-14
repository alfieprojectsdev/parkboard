# Database Migrations

**Policy:** All migrations are idempotent (safe to run multiple times)

---

## Quick Start

Run these in order in **Supabase SQL Editor**:

```bash
# 1. Base schema (if starting fresh)
db/schema_optimized.sql

# 2. Hybrid pricing support
db/migrations/001_hybrid_pricing_model_idempotent.sql

# 3. Multi-tenant communities
db/migrations/002_multi_tenant_communities_idempotent.sql

# 4. Community RLS policies
db/migrations/003_community_rls_policies_idempotent.sql

# 5. Test data (optional)
scripts/create-test-slots.sql
```

---

## Migration Files

### Core Schema

**File:** `db/schema_optimized.sql`
**Status:** ✅ Production-ready
**Purpose:** Complete database schema with:
- User profiles, parking slots, bookings tables
- Optimized indexes and triggers
- Row Level Security (RLS) policies
- Price calculation and denormalization triggers

**When to use:** Initial database setup or complete rebuild

---

### Migration 001: Hybrid Pricing Model

**File:** `db/migrations/001_hybrid_pricing_model_idempotent.sql`
**Purpose:** Enable "Request Quote" pricing alongside explicit pricing

**Changes:**
- ✅ Allow NULL values for `price_per_hour` (Request Quote slots)
- ✅ Update price constraint: NULL OR positive values
- ✅ Update booking trigger to reject bookings for NULL-price slots
- ✅ Add helper function `slot_allows_instant_booking()`

**Backward Compatible:** ✅ Yes (existing slots unchanged)

**Idempotent Features:**
- Uses `DROP CONSTRAINT IF EXISTS`
- Uses `CREATE OR REPLACE FUNCTION`
- Safe to re-run

---

### Migration 002: Multi-Tenant Communities

**File:** `db/migrations/002_multi_tenant_communities_idempotent.sql`
**Purpose:** Add community-based data isolation (path-based routing: /LMR, /SRP, etc.)

**Changes:**
- ✅ Create `communities` table
- ✅ Add `community_code` to `user_profiles` and `parking_slots`
- ✅ Insert LMR community (Lumiere Residences)
- ✅ Backfill existing data to LMR
- ✅ Add foreign keys and indexes
- ✅ Create RLS policy for communities

**Backward Compatible:** ✅ Yes (all existing data assigned to LMR)

**Idempotent Features:**
- Uses `CREATE TABLE IF NOT EXISTS`
- Checks column existence before `ALTER TABLE`
- Uses `ON CONFLICT DO NOTHING` for INSERT
- Checks constraint existence before adding FKs
- Uses `CREATE INDEX IF NOT EXISTS`

---

### Migration 003: Community RLS Policies

**File:** `db/migrations/003_community_rls_policies_idempotent.sql`
**Purpose:** Update RLS policies to filter by community_code

**Changes:**
- ✅ Create `set_community_context()` RPC function
- ✅ Create `get_community_context()` helper function
- ✅ Update RLS policies on all tables for community filtering
- ✅ Includes verification queries

**Dependencies:** Requires Migration 002

**Idempotent Features:**
- Uses `CREATE OR REPLACE FUNCTION`
- Uses `DROP POLICY IF EXISTS` before each policy
- Safe to re-run multiple times

---

## Test Data

### Create Test Slots

**File:** `scripts/create-test-slots.sql`
**Purpose:** Create 10 sample parking slots for testing

**Prerequisites:**
- Test users must exist (run `npm run stress:data` first)
- Creates slots owned by `user1@parkboard.test`

**Idempotent Features:**
- Deletes existing test slots before inserting
- Safe to re-run (replaces old data)

**Slot Types:**
- 3× Covered (A-101, A-102, A-103, C-301, C-302)
- 4× Uncovered (B-201, B-202, B-203, D-401)
- 1× Tandem (D-402)

---

## Migration Order

**IMPORTANT:** Migrations must be run in order due to dependencies:

```
schema_optimized.sql (base)
    ↓
001_hybrid_pricing_model_idempotent.sql
    ↓
002_multi_tenant_communities_idempotent.sql
    ↓
003_community_rls_policies_idempotent.sql
```

**Skipping migrations will cause errors!**

---

## Verification

After running migrations, verify with:

```sql
-- Check communities table exists
SELECT * FROM communities;

-- Check community_code columns exist
SELECT COUNT(*) FROM user_profiles WHERE community_code = 'LMR';
SELECT COUNT(*) FROM parking_slots WHERE community_code = 'LMR';

-- Check RLS functions exist
SELECT proname FROM pg_proc WHERE proname IN ('set_community_context', 'get_community_context');

-- Check RLS policies exist
SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE 'community_%';
```

---

## Rollback

Each migration file includes rollback instructions in comments.

**General Rollback Pattern:**

```sql
-- Drop foreign keys
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;

-- Drop columns
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- Drop tables
DROP TABLE IF EXISTS table_name CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS function_name CASCADE;

-- Drop policies
DROP POLICY IF EXISTS policy_name ON table_name;
```

**⚠️ WARNING:** Rollbacks may cause data loss. Test in staging first!

---

## Troubleshooting

### Error: "relation already exists"

**Solution:** Use the `_idempotent.sql` version of the migration

### Error: "column already exists"

**Solution:** Idempotent migrations check for this - use `_idempotent.sql` version

### Error: "constraint already exists"

**Solution:** Use `DROP CONSTRAINT IF EXISTS` (included in idempotent versions)

### Error: "policy already exists"

**Solution:** Use `DROP POLICY IF EXISTS` (included in idempotent versions)

---

## Best Practices

✅ **DO:**
- Run migrations in order
- Use `_idempotent.sql` versions for safety
- Test in local/staging before production
- Backup database before major migrations
- Verify results with verification queries

❌ **DON'T:**
- Skip migrations in the dependency chain
- Run migrations out of order
- Modify migration files after they've been applied
- Run non-idempotent versions in production

---

## Adding New Migrations

When creating new migrations:

1. **Name format:** `00X_descriptive_name_idempotent.sql`
2. **Include:**
   - Clear description of changes
   - Dependency information
   - Idempotent checks (IF EXISTS, IF NOT EXISTS)
   - Verification queries
   - Rollback instructions

3. **Test idempotency:**
   ```sql
   -- Run the migration twice in a row
   -- Should complete successfully both times
   -- No errors, no duplicate data
   ```

4. **Document in this README**

---

## Status

| Migration | Status | Idempotent | Applied |
|-----------|--------|------------|---------|
| schema_optimized.sql | ✅ Ready | Partial | Yes |
| 001_hybrid_pricing_model | ✅ Ready | ✅ Yes | Yes |
| 002_multi_tenant_communities | ✅ Ready | ✅ Yes | Yes |
| 003_community_rls_policies | ✅ Ready | ✅ Yes | Yes |

---

**Last Updated:** 2025-10-13
**Database Version:** 003 (Multi-tenant with RLS)
