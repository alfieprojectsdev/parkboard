# Database Quick Reference - Minimal MVP

**Schema Version:** 001 (Baseline)
**Last Updated:** 2025-10-27

---

## 🚀 Quick Start

```bash
# 1. Apply migration (PostgreSQL)
psql -U postgres -d parkboard_dev -f db/migrations/001_core_schema.sql

# 2. Verify with tests
psql -U postgres -d parkboard_dev -f db/migrations/test_migration.sql

# 3. Check results (should show 2 tables, 7 indexes, 3 triggers)
```

**Supabase alternative:**
```bash
supabase db execute --file db/migrations/001_core_schema.sql
```

---

## 📋 Schema Overview

### Tables (2)

**users** - Resident profiles
```sql
id, email, name, unit_number
contact_viber, contact_telegram, contact_phone
created_at, updated_at
```

**parking_slots** - Available parking slots
```sql
id, owner_id
location_level (P1-P6), location_tower, location_landmark
available_from, available_until
status (available/taken/expired)
notes
created_at, updated_at
```

### Key Features

- ✅ **Auto-expire:** Old slots marked expired automatically
- ✅ **RLS:** Users can only edit their own slots
- ✅ **Idempotent:** Safe to run migration multiple times
- ✅ **Platform-independent:** Works on PostgreSQL/Neon/Supabase

---

## 🔍 Common Queries

### Browse Available Slots
```sql
SELECT
  u.name AS owner_name,
  u.unit_number,
  ps.location_level,
  ps.location_tower,
  ps.location_landmark,
  ps.available_from,
  ps.available_until,
  ps.notes
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.status = 'available'
  AND ps.available_from <= NOW()
  AND ps.available_until >= NOW()
ORDER BY ps.available_from;
```

### Get Owner Contact Info
```sql
SELECT
  u.name,
  u.unit_number,
  u.contact_viber,
  u.contact_telegram,
  u.contact_phone
FROM users u
JOIN parking_slots ps ON u.id = ps.owner_id
WHERE ps.id = '<slot-id>';
```

### View My Slots
```sql
SELECT
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes
FROM parking_slots
WHERE owner_id = '<user-id>'
ORDER BY available_from;
```

### Search by Location
```sql
SELECT * FROM parking_slots
WHERE location_level = 'P3'
  AND location_tower = 'East Tower'
  AND status = 'available';
```

---

## 🔒 RLS Policy Usage

**Set user context before queries:**
```sql
SET app.current_user_id = '<user-uuid>';
```

**Example (Alice's context):**
```sql
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

-- Now queries respect RLS (Alice can only update her own slots)
UPDATE parking_slots SET notes = 'Updated' WHERE id = '<slot-id>';
```

**Reset context:**
```sql
RESET app.current_user_id;
```

---

## 📊 Verification Queries

### Check Tables
```sql
SELECT tablename FROM pg_tables
WHERE tablename IN ('users', 'parking_slots');
-- Expected: 2 rows
```

### Check Indexes
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('users', 'parking_slots')
ORDER BY tablename, indexname;
-- Expected: 7 indexes
```

### Check Triggers
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'parking_slots');
-- Expected: 3 triggers
```

### Check RLS Policies
```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('users', 'parking_slots');
-- Expected: 6 policies
```

---

## 🔄 Rollback

**Emergency rollback:**
```bash
psql -U postgres -d parkboard_dev \
  -f db/migrations/rollback/001_core_schema_rollback.sql
```

**⚠️ WARNING:** This deletes ALL data in users and parking_slots tables!

---

## 📝 Test Data

**Create test users and slots:**
```bash
psql -U postgres -d parkboard_dev -f db/migrations/test_migration.sql
```

**Test users created:**
- Alice Tan (10A) - alice@example.com
- Bob Lee (15B) - bob@example.com
- Carol Wong (20C) - carol@example.com

**Test slots created:**
- Alice: P3 East Tower (available)
- Bob: P2 North Tower (available)
- Carol: P4 West Tower (taken)
- Carol: P1 East Tower (expired)

---

## 🎯 Key Differences from Production

**Removed (simplified):**
- ❌ `community_code` (multi-tenant)
- ❌ `bookings` table (in-app reservations)
- ❌ `price_per_hour` (pricing)
- ❌ `slot_number` (rigid numbering)

**Added (enhanced):**
- ✅ Location fields (level, tower, landmark)
- ✅ Date range (available_from/until)
- ✅ Contact flexibility (Viber/Telegram/Phone)
- ✅ Auto-expiration (status field + trigger)

---

## 📚 Documentation

**Full details:**
- `db/MIGRATION_001_SUMMARY.md` - Complete migration overview
- `db/migrations/README.md` - Migration execution guide
- `db/migrations/001_core_schema.sql` - Migration source (350+ lines)
- `db/migrations/test_migration.sql` - Test queries (10 tests)
- `db/migrations/rollback/001_core_schema_rollback.sql` - Rollback script

---

## ⚡ Performance Tips

**Use indexes for queries:**
```sql
-- Good (uses idx_slots_status)
WHERE status = 'available'

-- Good (uses idx_slots_location)
WHERE location_level = 'P3' AND location_tower = 'East Tower'

-- Good (uses idx_slots_dates)
WHERE available_from <= NOW() AND available_until >= NOW()
```

**Avoid full table scans:**
```sql
-- Bad (no index on notes)
WHERE notes LIKE '%elevator%'

-- Better (indexed fields first, then filter)
WHERE status = 'available' AND notes LIKE '%elevator%'
```

---

## 🐛 Troubleshooting

### "relation already exists"
**Cause:** Migration already applied
**Fix:** Normal if re-running (idempotent)

### "permission denied for schema public"
**Cause:** Insufficient database privileges
**Fix:** Ensure user has CREATE privileges

### RLS blocking queries
**Cause:** `app.current_user_id` not set
**Fix:** Run `SET app.current_user_id = '<uuid>';` before queries

### Slots not expiring
**Cause:** Trigger not running
**Fix:** Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_expire_slots';`

---

## ✅ Success Criteria

**Migration successful:**
- [x] 2 tables created
- [x] 7 indexes created
- [x] 3 triggers created
- [x] 6 RLS policies created
- [x] Test data inserts without errors
- [x] Auto-expire trigger works
- [x] Idempotent (can run twice)

---

**Need help?** See `db/migrations/README.md` for detailed instructions.
