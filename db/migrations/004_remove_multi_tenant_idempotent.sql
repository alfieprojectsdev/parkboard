-- ============================================================================
-- MIGRATION 004: REMOVE MULTI-TENANT ARCHITECTURE (IDEMPOTENT)
-- ============================================================================
-- Reverts migrations 002 & 003 to simplify to single-community (LMR) MVP
-- Safe to run multiple times
--
-- Rollback: Re-run migrations 002 & 003 if multi-tenant needed again
-- Date: 2025-10-27
-- Author: Root Instance (claude-config) + Parkboard Instance
-- Context: Minimal MVP Redesign (docs/MINIMAL_MVP_REDESIGN_20251026.md)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP COMMUNITY-SPECIFIC RLS POLICIES (FROM MIGRATION 003)
-- ============================================================================

-- User Profiles policies
DROP POLICY IF EXISTS "community_read_profiles" ON user_profiles;
DROP POLICY IF EXISTS "community_update_own_profile" ON user_profiles;

-- Parking Slots policies
DROP POLICY IF EXISTS "community_read_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_insert_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_update_own_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_delete_own_slots" ON parking_slots;

-- Bookings policies
DROP POLICY IF EXISTS "community_read_own_bookings" ON bookings;
DROP POLICY IF EXISTS "community_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "community_update_own_bookings" ON bookings;

-- ============================================================================
-- STEP 2: RECREATE SIMPLE RLS POLICIES (SINGLE-TENANT, NO COMMUNITY FILTERING)
-- ============================================================================

-- User Profiles: Anyone can read, users update own
CREATE POLICY IF NOT EXISTS "public_read_profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users_insert_own_profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Parking Slots: Public read, owners manage
CREATE POLICY IF NOT EXISTS "public_read_slots" ON parking_slots
  FOR SELECT USING (status = 'active');

CREATE POLICY IF NOT EXISTS "owners_manage_own_slots" ON parking_slots
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "users_create_slots" ON parking_slots
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Bookings: Users see relevant bookings, create as renter, update own
CREATE POLICY IF NOT EXISTS "users_see_relevant_bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = renter_id OR auth.uid() = slot_owner_id
  );

CREATE POLICY IF NOT EXISTS "users_create_bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY IF NOT EXISTS "renters_update_own_bookings" ON bookings
  FOR UPDATE USING (auth.uid() = renter_id);

CREATE POLICY IF NOT EXISTS "owners_update_slot_bookings" ON bookings
  FOR UPDATE USING (auth.uid() = slot_owner_id);

-- ============================================================================
-- STEP 3: DROP COMMUNITY HELPER FUNCTIONS (FROM MIGRATION 003)
-- ============================================================================

DROP FUNCTION IF EXISTS set_community_context(TEXT);
DROP FUNCTION IF EXISTS get_community_context();

-- ============================================================================
-- STEP 4: REMOVE FOREIGN KEYS (MUST DROP BEFORE REMOVING COLUMNS)
-- ============================================================================

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS fk_user_community;
ALTER TABLE parking_slots DROP CONSTRAINT IF EXISTS fk_slot_community;

-- ============================================================================
-- STEP 5: DROP INDEXES RELATED TO COMMUNITY_CODE
-- ============================================================================

DROP INDEX IF EXISTS idx_user_community;
DROP INDEX IF EXISTS idx_slot_community;
DROP INDEX IF EXISTS idx_community_status;

-- ============================================================================
-- STEP 6: REMOVE COMMUNITY_CODE COLUMNS FROM TABLES
-- ============================================================================

ALTER TABLE user_profiles DROP COLUMN IF EXISTS community_code;
ALTER TABLE parking_slots DROP COLUMN IF EXISTS community_code;

-- ============================================================================
-- STEP 7: DROP COMMUNITIES TABLE
-- ============================================================================

DROP TABLE IF EXISTS communities CASCADE;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (RUN AFTER MIGRATION)
-- ============================================================================

-- Verify community_code columns removed
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'community_code';

  IF column_count > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: community_code columns still exist (found %)', column_count;
  ELSE
    RAISE NOTICE 'SUCCESS: community_code columns removed (0 found)';
  END IF;
END $$;

-- Verify communities table dropped
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'communities';

  IF table_count > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: communities table still exists';
  ELSE
    RAISE NOTICE 'SUCCESS: communities table dropped';
  END IF;
END $$;

-- Verify RLS policies updated (should see simple policies, not community_*)
DO $$
DECLARE
  community_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO community_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'community_%';

  IF community_policy_count > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: community_* policies still exist (found %)', community_policy_count;
  ELSE
    RAISE NOTICE 'SUCCESS: No community_* policies found';
  END IF;
END $$;

-- List all current RLS policies (for manual review)
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION 004 COMPLETE
-- ============================================================================
-- Summary of changes:
-- - Removed 9 community-specific RLS policies
-- - Created 9 simplified RLS policies (no community filtering)
-- - Dropped 2 community helper functions
-- - Removed 2 foreign key constraints
-- - Dropped 3 indexes related to community_code
-- - Removed community_code columns from user_profiles and parking_slots
-- - Dropped communities table
--
-- Result: Single-tenant LMR architecture (simplified from multi-tenant)
-- ============================================================================
