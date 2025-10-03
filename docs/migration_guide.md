# 🚀 ParkBoard Database Migration - Execution Guide

## ⚠️ **CRITICAL: Read This First**

Your current database has **RLS infinite recursion issues** caused by:
1. Circular policy dependencies in `viber-migration-updates.sql`
2. Duplicate policy names across multiple SQL files
3. Policies checking `parking_slots` that reference back to themselves

**This guide fixes these issues permanently.**

---

## 📋 **Pre-Migration Checklist**

- [ ] **Backup your database** (Supabase → Database → Backups)
- [ ] Have the following files ready:
  - `viber-migration-updates-FIXED.sql` (provided above)
  - `rls_policies_consolidated.sql` (provided above)
- [ ] Confirm you're running these in **Supabase SQL Editor**
- [ ] Test on a **staging/dev environment first** if available

---

## 🔢 **Execution Order (CRITICAL)**

### **Step 1: Drop Conflicting Policies** ⏱️ ~30 seconds

Run this first to clean up existing policies that cause recursion:

```sql
-- Drop all existing RLS policies that might conflict
DO $ 
DECLARE
  pol RECORD;
BEGIN
  -- Drop policies on slot_availability_windows
  FOR pol IN
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'slot_availability_windows'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON slot_availability_windows', pol.policyname);
  END LOOP;
  
  -- Drop policies on slot_blackout_dates
  FOR pol IN
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'slot_blackout_dates'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON slot_blackout_dates', pol.policyname);
  END LOOP;
  
  -- Drop policies on viber_migration_metrics
  FOR pol IN
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'viber_migration_metrics'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON viber_migration_metrics', pol.policyname);
  END LOOP;
  
  RAISE NOTICE 'Old policies dropped successfully';
END $;
```

**Expected Output:** `Old policies dropped successfully`

---

### **Step 2: Run Fixed Viber Migration** ⏱️ ~2 minutes

Copy and paste the **entire** `viber-migration-updates-FIXED.sql` file into Supabase SQL Editor and execute.

**This file:**
- ✅ Creates tables in correct order
- ✅ Adds security definer functions to break RLS recursion
- ✅ Applies RLS policies safely
- ✅ Includes validation checks

**Expected Output:**
```
NOTICE: Viber members migrated: X
NOTICE: ✓ slot_availability_windows table created
NOTICE: ✓ slot_blackout_dates table created
NOTICE: ✓ viber_migration_metrics table created
NOTICE: ✓ RLS enabled on slot_availability_windows
NOTICE: ✓ RLS enabled on slot_blackout_dates

status                                      | message                              | notes
------------------------------------------- | ------------------------------------ | -------------------------
✅ Viber Migration Schema Updates Complete! | Ready for MVP testing with Lumiere... | No RLS recursion issues!
```

---

### **Step 3: Consolidate All RLS Policies** ⏱️ ~1 minute

Copy and paste the **entire** `rls_policies_consolidated.sql` file into Supabase SQL Editor and execute.

**This file:**
- ✅ Drops ALL existing policies to prevent conflicts
- ✅ Recreates policies using security definer functions
- ✅ Provides single source of truth for all RLS rules

**Expected Output:**
```
NOTICE: parking_slots has 4 policies
NOTICE: bookings has 4 policies
NOTICE: user_profiles has 5 policies
NOTICE: --- Active Policies ---
NOTICE: Table: bookings
NOTICE: Table: parking_slots
NOTICE: Table: user_profiles
...

status                                  | note                                   | safety_check
--------------------------------------- | -------------------------------------- | -----------------------
✅ RLS Policies Consolidated Successfully! | All policies use security definer... | No infinite recursion...
```

---

### **Step 4: Verify No Recursion** ⏱️ ~30 seconds

Test that the policies don't cause infinite recursion:

```sql
-- Test 1: Check slot ownership (should NOT cause recursion)
SELECT user_owns_slot(auth.uid(), 1);

-- Test 2: Query availability windows (should NOT hang)
SELECT * FROM slot_availability_windows LIMIT 5;

-- Test 3: Check admin status (should NOT cause recursion)
SELECT user_is_admin(auth.uid());

-- Test 4: Full marketplace query (real-world test)
SELECT 
  ps.*,
  COUNT(saw.window_id) as availability_windows,
  COUNT(sbd.blackout_id) as blackout_dates
FROM parking_slots ps
LEFT JOIN slot_availability_windows saw ON ps.slot_id = saw.slot_id
LEFT JOIN slot_blackout_dates sbd ON ps.slot_id = sbd.slot_id
GROUP BY ps.slot_id
LIMIT 10;
```

**Expected:** All queries return immediately (< 1 second)  
**Problem:** If any query hangs for > 3 seconds, you have recursion (proceed to troubleshooting section)

---

## 🧪 **Post-Migration Testing**

### **Test 1: Owner Can Manage Availability**
```sql
-- As a slot owner user
INSERT INTO slot_availability_windows (
  slot_id, 
  day_of_week, 
  start_time, 
  end_time
) VALUES (
  1,  -- Your slot ID
  ARRAY[1,2,3,4,5],  -- Weekdays
  '09:00'::TIME,
  '17:00'::TIME
);
```

**Expected:** Success (no permission denied)

---

### **Test 2: Public Can Read Availability**
```sql
-- As any authenticated user
SELECT * FROM slot_availability_windows WHERE slot_id = 1;
```

**Expected:** Returns data (no permission denied)

---

### **Test 3: Non-Owner Cannot Modify**
```sql
-- As a different user (not slot owner)
UPDATE slot_availability_windows 
SET start_time = '10:00'::TIME 
WHERE slot_id = 1;  -- Slot you don't own
```

**Expected:** Error: `new row violates row-level security policy`

---

### **Test 4: Check Slot Availability Function**
```sql
-- Test the availability checking function
SELECT check_slot_availability(
  1,  -- slot_id
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '2 hours'
);
```

**Expected:** Returns `true` or `false` (not an error)

---

## 🐛 **Troubleshooting**

### **Problem: Query Hangs / Infinite Loop**

**Symptoms:**
- Queries take > 5 seconds to return
- Supabase SQL Editor freezes
- Browser tab becomes unresponsive

**Solution:**
1. **Cancel the query** (click Stop in SQL Editor)
2. Check which policy is causing recursion:
```sql
-- Find policies that reference parking_slots in their USING clause
SELECT 
  schemaname,
  tablename, 
  policyname,
  qual  -- The USING clause
FROM pg_policies
WHERE qual LIKE '%parking_slots%'
  AND tablename IN ('slot_availability_windows', 'slot_blackout_dates');
```

3. **Drop the problematic policy:**
```sql
DROP POLICY "[policy_name]" ON [table_name];
```

4. **Recreate using security definer function:**
```sql
-- Example fix
CREATE POLICY "owners_manage_availability" 
  ON slot_availability_windows
  FOR ALL 
  USING (user_owns_slot(auth.uid(), slot_id));
```

---

### **Problem: "Function does not exist"**

**Symptoms:**
```
ERROR: function user_owns_slot(uuid, integer) does not exist
```

**Solution:**
The security definer functions weren't created. Re-run this section from `viber-migration-updates-FIXED.sql`:

```sql
-- Create security definer functions
CREATE OR REPLACE FUNCTION user_owns_slot(p_user_id UUID, p_slot_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parking_slots
    WHERE slot_id = p_slot_id 
    AND owner_id = p_user_id
  );
END;
$;

GRANT EXECUTE ON FUNCTION user_owns_slot TO authenticated;

CREATE OR REPLACE FUNCTION user_is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id 
    AND role = 'admin'
  );
END;
$;

GRANT EXECUTE ON FUNCTION user_is_admin TO authenticated;
```

---

### **Problem: "Permission denied for table"**

**Symptoms:**
```
ERROR: permission denied for table slot_availability_windows
```

**Solution:**
RLS is enabled but no policies exist. Check:

```sql
-- List all policies for the table
SELECT * FROM pg_policies WHERE tablename = 'slot_availability_windows';
```

If empty, re-run the policy creation section from `rls_policies_consolidated.sql`.

---

### **Problem: Duplicate Policy Name**

**Symptoms:**
```
ERROR: policy "Owners manage availability" already exists
```

**Solution:**
```sql
-- Drop the existing policy first
DROP POLICY IF EXISTS "Owners manage availability" ON slot_availability_windows;

-- Then recreate it
CREATE POLICY "owners_manage_availability" ...
```

---

## 📊 **Verification Checklist**

After migration, verify everything works:

- [ ] **No hanging queries** - All SELECT queries return in < 1 second
- [ ] **Owners can manage their slots** - INSERT/UPDATE/DELETE on availability windows works
- [ ] **Public can read availability** - Non-owners can SELECT availability data
- [ ] **Security enforced** - Non-owners CANNOT modify other slots
- [ ] **Functions work** - `user_owns_slot()` and `user_is_admin()` return correct values
- [ ] **Web UI loads** - Marketplace page doesn't hang
- [ ] **Owner dashboard works** - Can add availability schedules
- [ ] **Bookings work** - Can create bookings without errors

---

## 🎯 **What Was Fixed**

### **Before (Broken)**
```sql
-- ❌ CAUSED INFINITE RECURSION
CREATE POLICY "Owners manage availability" 
  ON slot_availability_windows
  FOR ALL USING (
    slot_id IN (
      SELECT slot_id FROM parking_slots  -- ← Triggers RLS on parking_slots
      WHERE owner_id = auth.uid()        -- ← Which checks user_profiles
    )                                     -- ← Which checks parking_slots...
  );                                      -- ← INFINITE LOOP
```

### **After (Fixed)**
```sql
-- ✅ NO RECURSION
CREATE POLICY "owners_manage_availability" 
  ON slot_availability_windows
  FOR ALL USING (
    user_owns_slot(auth.uid(), slot_id)  -- ← SECURITY DEFINER function
  );                                      -- ← Bypasses RLS, breaks cycle
```

---

## 📝 **Next Steps After Migration**

1. **Update your source code repository:**
   - Replace `db/migrations/viber-migration-updates.sql` with `viber-migration-updates-FIXED.sql`
   - Replace `db/rls_policies.sql` with `rls_policies_consolidated.sql`
   - Delete old/duplicate policy files

2. **Test the web UI thoroughly:**
   - Load marketplace page
   - Create availability schedules
   - Add blackout dates
   - Make bookings

3. **Monitor for issues:**
   - Check Supabase logs for slow queries
   - Watch for "permission denied" errors
   - Verify policies work as expected

4. **Document for your team:**
   - Update README with new migration files
   - Note that ALL RLS policies now use security definer functions
   - Warn against adding policies with direct table references

---

## 🆘 **Still Having Issues?**

If you encounter problems not covered here:

1. **Check Supabase logs:** Dashboard → Database → Logs
2. **Export current schema:**
```sql
-- Get current table structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get current policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

3. **Share the output** so we can diagnose further

---

## ✅ **Success Criteria**

You'll know the migration succeeded when:

1. ✅ No queries hang or timeout
2. ✅ Marketplace loads in < 2 seconds
3. ✅ Owners can manage availability schedules
4. ✅ Bookings work without errors
5. ✅ RLS enforces ownership rules correctly
6. ✅ No "infinite recursion" errors in logs

**Congratulations! Your database is now properly configured for the Viber migration features! 🎉**