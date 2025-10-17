# Manual Slot Modification Guide for Developers

**Document:** Manual Slot Modification Guide
**Audience:** Developers with database access
**Status:** MVP - Slot editing UI not yet implemented
**Created:** 2025-10-17
**Environment:** Production & Development

---

## Overview

Since the slot editing UI is not yet available (planned for Phase 2), this guide provides SQL commands for manually modifying parking slot data directly in the database.

**⚠️ IMPORTANT:** These operations directly modify production data. Always:
- Verify the slot ID before making changes
- Test commands in development first if possible
- Take note of original values before updating
- Notify affected users if they have active bookings

---

## Prerequisites

### Access Methods

**Option 1: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard
2. Select project: `cgbkknefvggnhkvmuwsa`
3. Navigate to: **SQL Editor** (left sidebar)
4. Paste SQL commands and click "Run"

**Option 2: Supabase CLI**

**Installation Options:**

*Method 1: Use npx (No installation - Recommended)*
```bash
# No installation needed! Just use npx:
npx supabase login
npx supabase link --project-ref cgbkknefvggnhkvmuwsa
npx supabase db execute --file your-query.sql
```

*Method 2: Install via script (Linux/macOS)*
```bash
# Install CLI globally
curl -fsSL https://supabase.com/install.sh | sh

# Then use normally
supabase login
supabase link --project-ref cgbkknefvggnhkvmuwsa
supabase db execute --file your-query.sql
```

**Usage Examples:**
```bash
# Run SQL file
npx supabase db execute --file your-query.sql

# Run inline SQL
npx supabase db execute "SELECT * FROM parking_slots LIMIT 5;"
```

**Note:** `npm install -g supabase` is no longer supported. Use npx or the install script.

---

## Common Slot Modification Operations

### 1. View Slot Details

**Get full information about a specific slot:**

```sql
-- By slot number
SELECT
  slot_id,
  slot_number,
  owner_id,
  slot_type,
  description,
  price_per_hour,
  status,
  community_code,
  created_at,
  updated_at
FROM parking_slots
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**Get slot with owner information:**

```sql
SELECT
  ps.slot_id,
  ps.slot_number,
  ps.slot_type,
  ps.description,
  ps.price_per_hour,
  ps.status,
  ps.community_code,
  up.name AS owner_name,
  up.email AS owner_email,
  up.unit_number AS owner_unit
FROM parking_slots ps
JOIN user_profiles up ON ps.owner_id = up.id
WHERE ps.slot_number = 'A-101' AND ps.community_code = 'LMR';
```

---

### 2. Update Slot Description

**Use case:** Fix typos, add more details, update amenities

```sql
UPDATE parking_slots
SET
  description = 'Near main entrance, well-lit, with EV charging station',
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**Verify change:**
```sql
SELECT slot_number, description, updated_at
FROM parking_slots
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

---

### 3. Update Slot Price

**Use case:** Adjust pricing based on market rates or owner request

```sql
UPDATE parking_slots
SET
  price_per_hour = 60,  -- Changed from 50 to 60
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**⚠️ Warning:** Changing price affects **future bookings only**. Existing bookings retain their original agreed price.

**Verify change:**
```sql
SELECT slot_number, price_per_hour, updated_at
FROM parking_slots
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

---

### 4. Update Slot Type

**Use case:** Incorrect slot type selected during creation

**Valid slot types:**
- `covered` - Covered parking (basement, garage)
- `open` - Uncovered/outdoor parking
- `tandem` - Tandem parking (requires moving another car)

```sql
UPDATE parking_slots
SET
  slot_type = 'covered',  -- Changed from 'open' to 'covered'
  updated_at = NOW()
WHERE slot_number = 'B-201' AND community_code = 'LMR';
```

**Verify change:**
```sql
SELECT slot_number, slot_type, updated_at
FROM parking_slots
WHERE slot_number = 'B-201' AND community_code = 'LMR';
```

---

### 5. Change Slot Status

**Valid statuses:**
- `active` - Available for booking
- `maintenance` - Temporarily unavailable
- `disabled` - Permanently disabled (owner deactivated)

**Mark slot as inactive:**
```sql
UPDATE parking_slots
SET
  status = 'disabled',
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**Reactivate a disabled slot:**
```sql
UPDATE parking_slots
SET
  status = 'active',
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**Mark slot for maintenance:**
```sql
UPDATE parking_slots
SET
  status = 'maintenance',
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

---

### 6. Update Multiple Fields at Once

**Use case:** User reports multiple errors in their listing

```sql
UPDATE parking_slots
SET
  description = 'Covered parking near elevator, EV charging available',
  price_per_hour = 65,
  slot_type = 'covered',
  updated_at = NOW()
WHERE slot_number = 'A-103' AND community_code = 'LMR';
```

**Verify all changes:**
```sql
SELECT
  slot_number,
  description,
  price_per_hour,
  slot_type,
  updated_at
FROM parking_slots
WHERE slot_number = 'A-103' AND community_code = 'LMR';
```

---

### 7. Transfer Slot Ownership

**⚠️ USE WITH EXTREME CAUTION** - This changes who owns the slot.

**Use case:** User sold their unit, new resident takes over the slot

**Step 1: Get new owner's ID**
```sql
SELECT id, email, name, unit_number
FROM user_profiles
WHERE email = 'newowner@parkboard.test';
-- Copy the 'id' (UUID) value
```

**Step 2: Verify slot has no active bookings**
```sql
SELECT
  booking_id,
  status,
  start_time,
  end_time
FROM bookings
WHERE slot_id = (
  SELECT slot_id FROM parking_slots
  WHERE slot_number = 'A-101' AND community_code = 'LMR'
)
AND status IN ('pending', 'confirmed')
AND end_time > NOW();
```

If there are active bookings, coordinate with both old and new owners before proceeding.

**Step 3: Transfer ownership**
```sql
UPDATE parking_slots
SET
  owner_id = '12345678-1234-1234-1234-123456789abc',  -- New owner's UUID
  updated_at = NOW()
WHERE slot_number = 'A-101' AND community_code = 'LMR';
```

**Step 4: Verify transfer**
```sql
SELECT
  ps.slot_number,
  up.name AS new_owner,
  up.email AS new_owner_email,
  up.unit_number,
  ps.updated_at
FROM parking_slots ps
JOIN user_profiles up ON ps.owner_id = up.id
WHERE ps.slot_number = 'A-101' AND ps.community_code = 'LMR';
```

---

### 8. Delete a Slot (Permanent)

**⚠️ DANGEROUS OPERATION** - Cannot be undone!

**Use case:** Duplicate slot created by mistake, slot no longer exists physically

**Pre-flight checks:**

```sql
-- Check if slot has ANY bookings (past or future)
SELECT COUNT(*) as booking_count
FROM bookings
WHERE slot_id = (
  SELECT slot_id FROM parking_slots
  WHERE slot_number = 'TEST-999' AND community_code = 'LMR'
);
```

If `booking_count > 0`, **DO NOT DELETE**. Mark as `disabled` instead.

**Safe deletion (only if no bookings exist):**

```sql
DELETE FROM parking_slots
WHERE slot_number = 'TEST-999'
  AND community_code = 'LMR'
  AND slot_id NOT IN (SELECT DISTINCT slot_id FROM bookings);
```

**Safer alternative - Disable instead:**
```sql
UPDATE parking_slots
SET
  status = 'disabled',
  description = '[DELETED] ' || description,
  updated_at = NOW()
WHERE slot_number = 'TEST-999' AND community_code = 'LMR';
```

---

## Batch Operations

### Update All Slots for a Community

**Use case:** Community-wide price adjustment or status change

**Preview affected slots:**
```sql
SELECT slot_number, price_per_hour
FROM parking_slots
WHERE community_code = 'LMR' AND status = 'active';
```

**Apply 10% price increase to all LMR slots:**
```sql
UPDATE parking_slots
SET
  price_per_hour = ROUND(price_per_hour * 1.10),
  updated_at = NOW()
WHERE community_code = 'LMR' AND status = 'active';
```

---

### Update All Slots for a Specific Owner

**Use case:** Owner requests bulk update to all their slots

**Step 1: Find owner's slots**
```sql
SELECT
  ps.slot_id,
  ps.slot_number,
  ps.price_per_hour,
  up.email
FROM parking_slots ps
JOIN user_profiles up ON ps.owner_id = up.id
WHERE up.email = 'user1@parkboard.test'
  AND ps.community_code = 'LMR';
```

**Step 2: Update all owner's slots**
```sql
UPDATE parking_slots
SET
  price_per_hour = 55,
  updated_at = NOW()
WHERE owner_id = (
  SELECT id FROM user_profiles WHERE email = 'user1@parkboard.test'
)
AND community_code = 'LMR';
```

---

## Validation Queries

### Check for Invalid Data

**Find slots with NULL or negative prices:**
```sql
SELECT slot_id, slot_number, price_per_hour, community_code
FROM parking_slots
WHERE price_per_hour IS NULL OR price_per_hour <= 0;
```

**Find slots with invalid status:**
```sql
SELECT slot_id, slot_number, status
FROM parking_slots
WHERE status NOT IN ('active', 'maintenance', 'disabled');
```

**Find slots without community code:**
```sql
SELECT slot_id, slot_number, community_code
FROM parking_slots
WHERE community_code IS NULL OR community_code = '';
```

**Find duplicate slot numbers in same community:**
```sql
SELECT community_code, slot_number, COUNT(*) as duplicate_count
FROM parking_slots
GROUP BY community_code, slot_number
HAVING COUNT(*) > 1;
```

---

## Safety Best Practices

### 1. Always Preview Before Update

```sql
-- GOOD: Preview first
SELECT * FROM parking_slots WHERE slot_number = 'A-101';
-- Then run update
UPDATE parking_slots SET price_per_hour = 60 WHERE slot_number = 'A-101';

-- BAD: Update without preview
UPDATE parking_slots SET price_per_hour = 60 WHERE slot_number = 'A-101';
```

### 2. Use Transactions for Multiple Operations

```sql
BEGIN;

-- Update 1
UPDATE parking_slots SET price_per_hour = 60 WHERE slot_number = 'A-101';

-- Update 2
UPDATE parking_slots SET description = 'New description' WHERE slot_number = 'A-102';

-- Check results
SELECT slot_number, price_per_hour, description FROM parking_slots
WHERE slot_number IN ('A-101', 'A-102');

-- If everything looks good:
COMMIT;

-- If something is wrong:
-- ROLLBACK;
```

### 3. Always Specify Community Code

```sql
-- GOOD: Specific to community
UPDATE parking_slots
SET price_per_hour = 60
WHERE slot_number = 'A-101' AND community_code = 'LMR';

-- BAD: Could affect slots in multiple communities
UPDATE parking_slots
SET price_per_hour = 60
WHERE slot_number = 'A-101';
```

### 4. Document Changes

Keep a log of manual modifications:

```markdown
## Slot Modification Log

### 2025-10-17
- **Slot:** LMR A-101
- **Change:** Price updated from ₱50 to ₱60/hour
- **Reason:** Owner request via email
- **Requestor:** user1@parkboard.test
- **Modified by:** dev@parkboard.app
```

---

## Troubleshooting

### Issue: Update Affects 0 Rows

**Cause:** Slot doesn't exist or WHERE clause is too restrictive

**Solution:**
```sql
-- Check if slot exists
SELECT * FROM parking_slots
WHERE slot_number = 'A-101' AND community_code = 'LMR';

-- If no results, slot doesn't exist
-- Check without community filter
SELECT * FROM parking_slots WHERE slot_number = 'A-101';
```

### Issue: Cannot Update - Permission Denied

**Cause:** Using read-only database credentials

**Solution:** Use service role key in Supabase dashboard or contact admin.

### Issue: Update Reverted After a Few Seconds

**Cause:** Row Level Security (RLS) policy blocking the update

**Solution:** Updates via SQL Editor in Supabase dashboard bypass RLS. If using API, ensure proper authentication.

---

## Quick Reference Commands

```sql
-- View all slots in LMR
SELECT slot_number, slot_type, price_per_hour, status
FROM parking_slots
WHERE community_code = 'LMR'
ORDER BY slot_number;

-- View all bookings for a slot
SELECT b.*, up.name as renter_name
FROM bookings b
JOIN user_profiles up ON b.renter_id = up.id
WHERE b.slot_id = (
  SELECT slot_id FROM parking_slots
  WHERE slot_number = 'A-101' AND community_code = 'LMR'
)
ORDER BY b.start_time DESC;

-- Find slots owned by specific user
SELECT ps.*, up.email
FROM parking_slots ps
JOIN user_profiles up ON ps.owner_id = up.id
WHERE up.email = 'user1@parkboard.test';

-- Count slots by status
SELECT status, COUNT(*) as count
FROM parking_slots
WHERE community_code = 'LMR'
GROUP BY status;
```

---

## When Slot Editing UI is Available

Once the slot editing feature is implemented (Phase 2), this manual process will be replaced by:

1. **User Self-Service:** Slot owners can edit their own slots via UI
2. **Audit Trail:** All changes logged automatically
3. **Validation:** Form validation prevents invalid data
4. **Permissions:** RLS ensures only owners can edit their slots
5. **Booking Check:** UI prevents edits during active bookings

**Feature branch:** `feature/slot-edit`
**GitHub:** https://github.com/alfieprojectsdev/parkboard/tree/feature/slot-edit

---

## Support

**Questions or Issues?**
- Email: alfieprojects.dev@gmail.com
- Document issues: Update this guide in `docs/MANUAL_SLOT_MODIFICATION_GUIDE.md`

---

**Last Updated:** 2025-10-17
**Document Version:** 1.0
**Status:** Active (MVP - UI not yet available)
