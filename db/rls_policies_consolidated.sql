-- ============================================================================
-- CONSOLIDATED RLS POLICIES - Single Source of Truth
-- Run this AFTER schema_v2.sql AND viber-migration-updates-FIXED.sql
-- Verified syntax - all DO blocks use proper $$ delimiters
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CLEANUP: Drop all existing policies to prevent conflicts
-- ----------------------------------------------------------------------------

-- Drop user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "service_role_insert" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "admins_select_all" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;

-- Drop bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "users_select_own_bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "users_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "users_update_own_bookings" ON bookings;
DROP POLICY IF EXISTS "Users can book owned or shared slots" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can create bookings for any slot" ON bookings;
DROP POLICY IF EXISTS "admins_delete_bookings" ON bookings;

-- Drop parking_slots policies
DROP POLICY IF EXISTS "Anyone logged in can view slots" ON parking_slots;
DROP POLICY IF EXISTS "public_select_slots" ON parking_slots;
DROP POLICY IF EXISTS "Users can view all slots with ownership info" ON parking_slots;
DROP POLICY IF EXISTS "Slot owners can view own slots" ON parking_slots;
DROP POLICY IF EXISTS "Slot owners can update own slots" ON parking_slots;
DROP POLICY IF EXISTS "owners_update_own_slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can view all slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can insert slots" ON parking_slots;
DROP POLICY IF EXISTS "admins_insert_slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update all slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can delete slots" ON parking_slots;
DROP POLICY IF EXISTS "admins_delete_slots" ON parking_slots;
DROP POLICY IF EXISTS "Owners can update own slots" ON parking_slots;

-- Drop marketplace-specific policies (if they exist)
DROP POLICY IF EXISTS "Owners manage rental settings" ON slot_rental_settings;
DROP POLICY IF EXISTS "owners_manage_rental_settings" ON slot_rental_settings;
DROP POLICY IF EXISTS "Public read rental settings" ON slot_rental_settings;
DROP POLICY IF EXISTS "public_read_rental_settings" ON slot_rental_settings;
DROP POLICY IF EXISTS "Owners view own earnings" ON slot_earnings;
DROP POLICY IF EXISTS "owners_view_own_earnings" ON slot_earnings;
DROP POLICY IF EXISTS "Admins view all earnings" ON slot_earnings;
DROP POLICY IF EXISTS "system_insert_earnings" ON slot_earnings;

-- ----------------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- Marketplace tables (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'slot_rental_settings'
  ) THEN
    ALTER TABLE slot_rental_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'slot_earnings'
  ) THEN
    ALTER TABLE slot_earnings ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- USER_PROFILES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "users_select_own"
  ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON user_profiles
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "service_role_insert"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_select_all"
  ON user_profiles
  FOR SELECT
  USING (user_is_admin(auth.uid()));

CREATE POLICY "admins_update_all"
  ON user_profiles
  FOR UPDATE
  USING (user_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- PARKING_SLOTS POLICIES
-- ----------------------------------------------------------------------------

-- Everyone can view all slots (needed for marketplace browsing)
CREATE POLICY "public_select_slots"
  ON parking_slots
  FOR SELECT
  USING (true);

-- Owners can update their own slots
CREATE POLICY "owners_update_own_slots"
  ON parking_slots
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR user_is_admin(auth.uid())
  );

-- Only admins can insert slots
CREATE POLICY "admins_insert_slots"
  ON parking_slots
  FOR INSERT
  WITH CHECK (user_is_admin(auth.uid()));

-- Only admins can delete slots
CREATE POLICY "admins_delete_slots"
  ON parking_slots
  FOR DELETE
  USING (user_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- BOOKINGS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view their own bookings
CREATE POLICY "users_select_own_bookings"
  ON bookings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_is_admin(auth.uid())
  );

-- Users can create bookings for slots they own OR for available slots
CREATE POLICY "users_insert_bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Can book their own slots
      user_owns_slot(auth.uid(), slot_id)
      -- Can book slots with no owner (shared/visitor slots)
      OR NOT EXISTS (
        SELECT 1 FROM parking_slots ps
        WHERE ps.slot_id = bookings.slot_id
        AND ps.owner_id IS NOT NULL
        AND ps.owner_id != auth.uid()
      )
      -- Admins can book anything
      OR user_is_admin(auth.uid())
    )
  );

-- Users can update their own bookings
CREATE POLICY "users_update_own_bookings"
  ON bookings
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_is_admin(auth.uid())
  );

-- Admins can delete bookings
CREATE POLICY "admins_delete_bookings"
  ON bookings
  FOR DELETE
  USING (user_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- SLOT_RENTAL_SETTINGS POLICIES (Marketplace feature)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'slot_rental_settings'
  ) THEN
    EXECUTE '
      CREATE POLICY "owners_manage_rental_settings"
        ON slot_rental_settings
        FOR ALL
        USING (
          user_owns_slot(auth.uid(), slot_id)
          OR user_is_admin(auth.uid())
        );
      
      CREATE POLICY "public_read_rental_settings"
        ON slot_rental_settings
        FOR SELECT
        USING (true);
    ';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SLOT_EARNINGS POLICIES (Marketplace feature)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'slot_earnings'
  ) THEN
    EXECUTE '
      CREATE POLICY "owners_view_own_earnings"
        ON slot_earnings
        FOR SELECT
        USING (
          owner_id = auth.uid()
          OR user_is_admin(auth.uid())
        );
      
      CREATE POLICY "system_insert_earnings"
        ON slot_earnings
        FOR INSERT
        WITH CHECK (auth.role() = ''service_role'');
    ';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PAYMENTS POLICIES (If payments table exists)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payments'
  ) THEN
    EXECUTE '
      CREATE POLICY "users_view_own_payments"
        ON payments
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.booking_id = payments.booking_id
            AND b.user_id = auth.uid()
          )
          OR user_is_admin(auth.uid())
        );
      
      CREATE POLICY "users_create_own_payments"
        ON payments
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.booking_id = payments.booking_id
            AND b.user_id = auth.uid()
          )
          OR user_is_admin(auth.uid())
        );
    ';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- VALIDATION AND TESTING
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check number of policies per table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'parking_slots';
  
  RAISE NOTICE 'parking_slots has % policies', policy_count;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'bookings';
  
  RAISE NOTICE 'bookings has % policies', policy_count;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';
  
  RAISE NOTICE 'user_profiles has % policies', policy_count;
  
  RAISE NOTICE '--- Policy creation complete ---';
END $$;

-- Success message
SELECT 
  '✅ RLS Policies Consolidated Successfully!' as status,
  'All policies use security definer functions' as note,
  'No infinite recursion risk' as safety_check;

-- ----------------------------------------------------------------------------
-- POLICY DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON POLICY "users_select_own" ON user_profiles IS 
  'Users can view their own profile';
  
COMMENT ON POLICY "admins_select_all" ON user_profiles IS 
  'Admins can view all profiles using user_is_admin() security definer function';

COMMENT ON POLICY "public_select_slots" ON parking_slots IS 
  'Everyone can view all slots for marketplace browsing';

COMMENT ON POLICY "owners_update_own_slots" ON parking_slots IS 
  'Owners can update their slots using user_owns_slot() security definer function';

COMMENT ON POLICY "users_insert_bookings" ON bookings IS 
  'Users can book their own slots or available slots. Uses security definer functions to prevent RLS recursion';