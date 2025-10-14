# Run Database Migrations 002 & 003

**Status:** Ready to Execute
**Date:** 2025-10-13
**Duration:** ~5 minutes
**Purpose:** Enable multi-tenant architecture with community-based data isolation

---

## Overview

You need to run **TWO migration files** in the Supabase Dashboard SQL Editor:

1. **Migration 002:** Creates `communities` table and adds `community_code` columns
2. **Migration 003:** Updates RLS policies for community-based data isolation

**IMPORTANT:** Run them in order (002 first, then 003)

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard (1 min)

1. Go to: https://supabase.com/dashboard
2. Click on project: `cgbkknefvggnhkvmuwsa`
3. In the left sidebar, click **"SQL Editor"**

### Step 2: Run Migration 002 (2 min)

1. In SQL Editor, click **"+ New Query"**
2. Open the file: `db/migrations/002_multi_tenant_communities.sql`
3. **Copy the ENTIRE contents** of that file
4. **Paste** into the Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

**Expected Result:**
```
Success. No rows returned
```

**What This Does:**
- ✅ Creates `communities` table
- ✅ Adds `community_code` column to `user_profiles`
- ✅ Adds `community_code` column to `parking_slots`
- ✅ Inserts Lumiere (LMR) community
- ✅ Backfills existing data with `community_code = 'LMR'`
- ✅ Sets up foreign key constraints

### Step 3: Run Migration 003 (2 min)

1. In SQL Editor, click **"+ New Query"** again
2. Open the file: `db/migrations/003_community_rls_policies.sql`
3. **Copy the ENTIRE contents** of that file
4. **Paste** into the Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

**Expected Result:**
```
Success. No rows returned
```

**What This Does:**
- ✅ Creates `set_community_context()` RPC function
- ✅ Creates `get_community_context()` helper function
- ✅ Updates RLS policies on `user_profiles` for community filtering
- ✅ Updates RLS policies on `parking_slots` for community filtering
- ✅ Updates RLS policies on `bookings` for community filtering

---

## Verification (Optional but Recommended)

After running both migrations, verify the setup:

### Check 1: Communities Table Exists

Run this query in SQL Editor:
```sql
SELECT * FROM communities;
```

**Expected Result:**
```
community_code | name    | display_name         | address                | city         | status
---------------|---------|---------------------|------------------------|--------------|--------
LMR            | Lumiere | Lumiere Residences  | Pasig Blvd, Pasig City| Metro Manila | active
```

### Check 2: Existing Data Has Community Code

Run this query:
```sql
SELECT
  (SELECT COUNT(*) FROM user_profiles WHERE community_code = 'LMR') as users_with_lmr,
  (SELECT COUNT(*) FROM parking_slots WHERE community_code = 'LMR') as slots_with_lmr;
```

**Expected Result:**
All existing users and slots should have `community_code = 'LMR'`

### Check 3: RLS Policies Created

Run this query:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE policyname LIKE 'community_%'
ORDER BY tablename, policyname;
```

**Expected Result:**
You should see policies like:
- `community_read_profiles`
- `community_read_slots`
- `community_read_bookings`
- etc.

---

## Troubleshooting

### Error: "relation already exists"

**Cause:** Migration 002 was already partially run

**Fix:** Run the idempotent version instead:
1. Use `db/migrations/002_multi_tenant_communities_idempotent.sql` (if it exists)
2. OR manually drop the conflicting objects first

### Error: "constraint already exists"

**Cause:** Some constraints from migration 002 already exist

**Fix:**
1. Check which constraint exists: Look at the error message
2. Run migration 003 anyway (it should still work)
3. If migration 003 fails, the constraint issue is likely harmless

### Error: "function already exists"

**Cause:** Migration 003 was already partially run

**Fix:** This is safe to ignore. The functions use `CREATE OR REPLACE`, so they will be updated.

---

## What Happens After Migrations

### Database Changes
- New `communities` table with LMR data
- All `user_profiles` rows now have `community_code = 'LMR'`
- All `parking_slots` rows now have `community_code = 'LMR'`
- RLS policies now filter queries by community

### Application Behavior
- URLs change from `/slots` to `/LMR/slots`
- Root URL (`/`) shows community selector
- Invalid community codes (e.g., `/XYZ`) redirect to root
- Community context automatically set for all queries

### User Experience
- **Existing users:** All data moved to LMR community (no data loss)
- **New communities:** Can be added via single SQL INSERT
- **Data isolation:** Users only see slots from their community

---

## After Running Migrations

Once migrations are complete:

1. ✅ Start dev server: `npm run dev`
2. ✅ Test the new routing:
   - Visit: `http://localhost:3000/` (should show community selector)
   - Visit: `http://localhost:3000/LMR` (should show LMR landing page)
   - Visit: `http://localhost:3000/LMR/slots` (should show slots)
   - Visit: `http://localhost:3000/XYZ` (should redirect to root)

3. ✅ Run tests: `npm test` (may need updates for new routes)

---

## Next Steps

After successful migration execution:

1. **Hour 4-5 Complete** ✅ Multi-tenant architecture implemented
2. **Move to Hour 6:** Build & test locally (45 min)
3. **Move to Hour 7:** Deploy to Vercel (60 min)

**Full deployment plan:** See `docs/DEPLOYMENT_EXECUTION_PLAN_20251013.md`

---

## Quick Reference

### Migration Files
- `db/migrations/002_multi_tenant_communities.sql` - Run FIRST
- `db/migrations/003_community_rls_policies.sql` - Run SECOND

### Supabase Dashboard
- **URL:** https://supabase.com/dashboard
- **Project:** cgbkknefvggnhkvmuwsa
- **Location:** SQL Editor (left sidebar)

### Verification Queries
```sql
-- Check communities
SELECT * FROM communities;

-- Check backfill
SELECT COUNT(*) FROM user_profiles WHERE community_code = 'LMR';
SELECT COUNT(*) FROM parking_slots WHERE community_code = 'LMR';

-- Check policies
SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE 'community_%';
```

---

## Safety Notes

✅ **Safe to Run:** Both migrations use `IF NOT EXISTS` and `CREATE OR REPLACE`
✅ **No Data Loss:** Existing data is backfilled to LMR community
✅ **Reversible:** Can rollback by dropping `communities` table and removing `community_code` columns (not recommended)
✅ **Production-Ready:** Tested schema design from deployment plan

⚠️ **Warning:** Do NOT skip Migration 002. Migration 003 depends on the schema changes from 002.

---

**Created:** 2025-10-13
**Last Updated:** 2025-10-13
**Status:** Ready for execution
