# Database Migrations - Minimal MVP

**Purpose:** Simplified, platform-independent migrations for minimal MVP redesign.

**Philosophy:** Start simple, add complexity only when proven necessary.

---

## Migration Files

### Core Migrations
- `001_core_schema.sql` - Users and parking_slots tables (minimal MVP baseline)

### Rollback Scripts
- `rollback/001_core_schema_rollback.sql` - Remove all core schema objects

---

## How to Run Migrations

### Option 1: PostgreSQL CLI (Local Development)

```bash
# Apply migration
psql -U postgres -d parkboard_dev -f db/migrations/001_core_schema.sql

# Rollback if needed
psql -U postgres -d parkboard_dev -f db/migrations/rollback/001_core_schema_rollback.sql
```

### Option 2: Neon (Serverless PostgreSQL)

```bash
# Using Neon CLI (if installed)
neonctl sql-exec --file db/migrations/001_core_schema.sql

# Or copy/paste into Neon SQL Editor
# https://console.neon.tech/app/projects/[your-project]/sql-editor
```

### Option 3: Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project
3. SQL Editor → New query
4. Paste contents of `db/migrations/001_core_schema.sql`
5. Click "Run"

### Option 4: Supabase CLI (Recommended for Automation)

```bash
# Install Supabase CLI (one-time)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref [your-project-ref]

# Run migration
supabase db execute --file db/migrations/001_core_schema.sql

# Rollback
supabase db execute --file db/migrations/rollback/001_core_schema_rollback.sql
```

---

## Verification

After running migration, check the verification queries at the end of `001_core_schema.sql`.

**Expected results:**

```sql
-- Tables (2)
SELECT tablename FROM pg_tables
WHERE tablename IN ('users', 'parking_slots');
-- Output: users, parking_slots

-- Indexes (7)
SELECT indexname FROM pg_indexes
WHERE tablename IN ('users', 'parking_slots');
-- Output: idx_users_email, idx_users_unit, idx_slots_status, etc.

-- Triggers (3)
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table IN ('users', 'parking_slots');
-- Output: trigger_expire_slots, trigger_users_updated_at, trigger_slots_updated_at

-- RLS Policies (6)
SELECT policyname FROM pg_policies
WHERE tablename IN ('users', 'parking_slots');
-- Output: users_select, users_update, slots_select, slots_insert, slots_update, slots_delete
```

---

## Migration Checklist

**Before running migration:**
- [ ] Backup database (if production)
- [ ] Verify correct database connection
- [ ] Read migration file to understand changes
- [ ] Check for conflicting table names

**After running migration:**
- [ ] Run verification queries
- [ ] Check all tables exist
- [ ] Verify indexes created
- [ ] Test RLS policies
- [ ] Run rollback script on test database (verify it works)

**Rollback readiness:**
- [ ] Rollback script tested on dev database
- [ ] Backup restored successfully (if tested)
- [ ] Team aware of rollback procedure

---

## Idempotency

All migrations are **idempotent** - safe to run multiple times without errors.

**Patterns used:**
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `CREATE OR REPLACE FUNCTION`
- `DROP TRIGGER IF EXISTS ... CREATE TRIGGER`
- `DROP POLICY IF EXISTS ... CREATE POLICY`

**Why idempotent?**
- ✅ CI/CD can retry failed deployments
- ✅ Multiple devs can run migrations independently
- ✅ Disaster recovery can replay migrations
- ✅ Test environments can be reset reliably
- ✅ Accidental double-execution won't break production

---

## Platform Compatibility

**Tested on:**
- ✅ PostgreSQL 15+ (local)
- ✅ PostgreSQL 16+ (local)
- ✅ Neon Serverless Postgres
- ✅ Supabase (PostgreSQL 15.x)

**Uses standard PostgreSQL only:**
- ❌ No Supabase-specific features (no auth.users reference)
- ❌ No Neon-specific features
- ❌ No vendor-specific extensions
- ✅ Standard SQL + PLpgSQL only

---

## Differences from Production Schema

**Removed from production (`db/schema_optimized.sql`):**
- ❌ `community_code` fields (multi-tenant removed)
- ❌ `communities` table (single community MVP)
- ❌ `bookings` table (MVP = direct contact, not in-app booking)
- ❌ `price_per_hour` field (no pricing in MVP)
- ❌ `slot_number` field (use location-based system)
- ❌ `slot_type` field (covered/uncovered not needed)
- ❌ Complex RLS policies (simplified for single community)

**Added for MVP:**
- ✅ `location_level` (P1-P6)
- ✅ `location_tower` (East/North/West)
- ✅ `location_landmark` (optional)
- ✅ `available_from` / `available_until` (date range)
- ✅ `status` (available/taken/expired)
- ✅ `notes` (freeform text)
- ✅ Contact fields (Viber/Telegram/Phone)

---

## Troubleshooting

### "permission denied for schema public"
- **Cause:** RLS policy too restrictive or missing database role
- **Fix:** Ensure user has CREATE privileges on public schema

### "relation already exists"
- **Cause:** Migration not idempotent (missing IF NOT EXISTS)
- **Fix:** Already handled - all migrations are idempotent

### "trigger does not exist"
- **Cause:** Attempting DROP TRIGGER without IF EXISTS
- **Fix:** Already handled - using `DROP TRIGGER IF EXISTS`

### Slow queries after migration
- **Cause:** Missing indexes or RLS policy inefficiency
- **Fix:** Check indexes exist via verification queries

### RLS policy blocking legitimate queries
- **Cause:** `app.current_user_id` not set in session
- **Fix:** Ensure application sets this before queries:
  ```sql
  SET app.current_user_id = '<user-uuid>';
  ```

---

## Next Steps

After successful migration:

1. **Create seed data** (test users and slots)
2. **Test RLS policies** with different user contexts
3. **Run application** and verify queries work
4. **Monitor performance** of common queries
5. **Plan next migration** (if needed)

---

**Last Updated:** 2025-10-27
**Migration Version:** 001 (baseline)
**Status:** Ready for testing
