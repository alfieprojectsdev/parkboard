# Seed Data Idempotency Test Plan

**Date:** 2025-11-19
**Purpose:** Verify seed scripts can be run 3+ times without errors

---

## Pre-Verification Checklist

All items verified:

- ✅ Transaction wrapping (BEGIN/COMMIT) in both scripts
- ✅ IDEMPOTENT: YES documentation in headers
- ✅ 6 ON CONFLICT clauses in seed-test-data.sql (one per parking slot)
- ✅ 6 ON CONFLICT clauses in seed-test-data-bypass-rls.sql (one per parking slot)
- ✅ Slot 6 (expired slot) present in both scripts
- ✅ Test UUID reference table in headers
- ✅ DELETE cleanup statements before INSERTs

---

## Manual Test Procedure (Local Database)

### Test 1: seed-test-data.sql (Respects RLS)

```bash
# Run 1: Initial seed
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data.sql

# Expected: 4 users, 6 slots created
# Verify:
# - INSERT 0 4 (users)
# - INSERT 0 6 (slots)
# - No errors

# Run 2: Re-seed (idempotency test)
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data.sql

# Expected: DELETE 6 slots, DELETE 4 users, re-INSERT same data
# Verify:
# - DELETE 6 (from parking_slots)
# - DELETE 4 (from users)
# - INSERT 0 4 (users with ON CONFLICT)
# - INSERT 0 6 (slots with ON CONFLICT)
# - No errors

# Run 3: Re-seed again (final verification)
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data.sql

# Expected: Same as Run 2
# Verify: No errors, consistent output
```

### Test 2: seed-test-data-bypass-rls.sql (Disables RLS)

```bash
# Run 1: Initial seed
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data-bypass-rls.sql

# Expected: 4 users, 6 slots created
# Verify:
# - ALTER TABLE (disable RLS)
# - INSERT 0 4 (users)
# - INSERT 0 6 (slots)
# - ALTER TABLE (re-enable RLS)
# - No errors

# Run 2: Re-seed (idempotency test)
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data-bypass-rls.sql

# Expected: DELETE 6 slots, DELETE 4 users, re-INSERT same data
# Verify: Same as Test 1 Run 2

# Run 3: Re-seed again (final verification)
PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db \
  -f scripts/seed-test-data-bypass-rls.sql

# Expected: Same as Run 2
# Verify: No errors, consistent output
```

---

## Neon Database Test Procedure

### Test 3: Neon Migration (Primary target)

```bash
# Prerequisite: Get Neon connection string from dashboard
export NEON_DATABASE_URL="postgresql://user:pass@host/db"

# Run 1: Initial seed on Neon
psql "$NEON_DATABASE_URL" -f scripts/seed-test-data-bypass-rls.sql

# Expected: 4 users, 6 slots created
# Verify:
# - No "duplicate key" errors
# - No constraint violations
# - Verification queries show correct counts

# Run 2: Re-seed on Neon (idempotency test)
psql "$NEON_DATABASE_URL" -f scripts/seed-test-data-bypass-rls.sql

# Expected: DELETE + re-INSERT, no errors
# Verify:
# - Script completes successfully
# - Data counts remain 4 users, 6 slots
# - No duplicate records

# Run 3: Re-seed on Neon again (final verification)
psql "$NEON_DATABASE_URL" -f scripts/seed-test-data-bypass-rls.sql

# Expected: Same as Run 2
# Verify: No errors, data integrity maintained
```

---

## Verification Queries (Run after each test)

```sql
-- 1. Count test users (expect: 4)
SELECT COUNT(*) as user_count
FROM users
WHERE email LIKE '%@test.local';

-- 2. List test users (verify UUIDs preserved)
SELECT id, name, email, unit_number
FROM users
WHERE email LIKE '%@test.local'
ORDER BY id;

-- Expected IDs:
-- 11111111-1111-1111-1111-111111111111 (Maria)
-- 22222222-2222-2222-2222-222222222222 (Juan)
-- 33333333-3333-3333-3333-333333333333 (Elena)
-- 44444444-4444-4444-4444-444444444444 (Ben)

-- 3. Count test slots by status (expect: 6 total)
SELECT status, COUNT(*) as count
FROM parking_slots
WHERE notes LIKE '%TEST DATA%'
GROUP BY status
ORDER BY status;

-- Expected:
-- available: 4
-- expired: 1
-- taken: 1

-- 4. List test slots (verify UUIDs preserved)
SELECT id, owner_id, location_level, status
FROM parking_slots
WHERE notes LIKE '%TEST DATA%'
ORDER BY id;

-- Expected IDs:
-- aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (Maria P1, available)
-- bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (Juan P2, available)
-- cccccccc-cccc-cccc-cccc-cccccccccccc (Elena P3, available)
-- dddddddd-dddd-dddd-dddd-dddddddddddd (Ben P4, available)
-- eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee (Maria P1, taken)
-- ffffffff-ffff-ffff-ffff-ffffffffffff (Juan P2, expired)

-- 5. Check for duplicates (expect: 0)
SELECT email, COUNT(*)
FROM users
WHERE email LIKE '%@test.local'
GROUP BY email
HAVING COUNT(*) > 1;

-- 6. Check for duplicate slots (expect: 0)
SELECT id, COUNT(*)
FROM parking_slots
WHERE notes LIKE '%TEST DATA%'
GROUP BY id
HAVING COUNT(*) > 1;
```

---

## Acceptance Criteria

### Must Pass (Critical)

- [ ] Script runs 3 times without errors
- [ ] No "duplicate key" errors on 2nd/3rd run
- [ ] User count remains 4 after each run
- [ ] Slot count remains 6 after each run
- [ ] All 4 user UUIDs preserved (11111111-*, 22222222-*, 33333333-*, 44444444-*)
- [ ] All 6 slot UUIDs preserved (aaaaaaaa-* through ffffffff-*)
- [ ] No duplicate users (email unique)
- [ ] No duplicate slots (id unique)

### Should Pass (Important)

- [ ] Timestamps (updated_at) refresh on re-run
- [ ] Status values preserved (available, taken, expired)
- [ ] RLS re-enabled after bypass version (ENABLE ROW LEVEL SECURITY)
- [ ] Transaction rollback works if error occurs mid-script
- [ ] Verification queries show expected data structure

### Nice to Have (Optional)

- [ ] Script completes in <5 seconds
- [ ] Clear progress output (DELETE/INSERT counts)
- [ ] Verification queries auto-run at end
- [ ] Human-readable output formatting

---

## Known Issues / Limitations

### Non-Issues (By Design)

1. **Timestamps change on re-run** - Expected behavior, updated_at reflects last script run
2. **DELETE before INSERT** - Intentional, ensures clean slate
3. **available_from/until update** - Expected, times relative to NOW()

### Potential Issues (Monitor)

1. **RLS permission denied** - May occur if non-superuser runs bypass version
   - **Solution:** Use seed-test-data.sql (respects RLS) or grant RLS privileges
2. **Constraint violations** - If schema changed (added NOT NULL column)
   - **Solution:** Update seed scripts to include new columns
3. **Foreign key errors** - If related tables (communities, bookings) have test data
   - **Solution:** Run cleanup script first or cascade deletes

---

## Cleanup Procedure

**To remove test data after testing:**

```sql
BEGIN;

DELETE FROM parking_slots WHERE notes LIKE '%TEST DATA%';
DELETE FROM users WHERE email LIKE '%@test.local';

COMMIT;
```

**Verify cleanup:**

```sql
-- Should return 0 for both
SELECT COUNT(*) FROM users WHERE email LIKE '%@test.local';
SELECT COUNT(*) FROM parking_slots WHERE notes LIKE '%TEST DATA%';
```

---

## Test Results Template

**Test Date:** _________
**Database:** [ ] Local PostgreSQL  [ ] Neon
**Script:** [ ] seed-test-data.sql  [ ] seed-test-data-bypass-rls.sql

**Run 1 (Initial):**
- [ ] No errors
- [ ] 4 users created
- [ ] 6 slots created

**Run 2 (Idempotency):**
- [ ] No errors
- [ ] DELETE + re-INSERT successful
- [ ] Counts remain 4 users, 6 slots

**Run 3 (Final):**
- [ ] No errors
- [ ] Consistent output with Run 2

**Verification Queries:**
- [ ] User count: 4
- [ ] Slot count: 6 (4 available, 1 taken, 1 expired)
- [ ] No duplicates
- [ ] UUIDs preserved

**Overall Status:** [ ] PASS  [ ] FAIL

**Notes:**
_______________________________________________________
_______________________________________________________

---

**Created by:** @parkboard-database-manager
**For:** Neon migration preparation - idempotent seed data
