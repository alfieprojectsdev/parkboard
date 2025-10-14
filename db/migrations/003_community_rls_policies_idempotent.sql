-- ============================================================================
-- MIGRATION 003: COMMUNITY RLS POLICIES (IDEMPOTENT VERSION)
-- ============================================================================
-- Updates RLS policies to filter by community_code
-- Safe to run multiple times (drops existing policies first)
--
-- Prerequisites: Migration 002 must be completed
-- ============================================================================

-- ============================================================================
-- STEP 1: Create RLS Helper Functions
-- ============================================================================

-- Function to set community context for the session
CREATE OR REPLACE FUNCTION set_community_context(p_community_code TEXT)
RETURNS void AS $$
BEGIN
  -- Store community code in session variable
  -- This will be used by RLS policies to filter data
  PERFORM set_config('app.current_community', p_community_code, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_community_context IS
  'Sets the community context for the current session. Used by RLS policies to filter data by community.';

-- Function to get current community context
CREATE OR REPLACE FUNCTION get_community_context()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_community', true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_community_context IS
  'Retrieves the community context for the current session.';

-- ============================================================================
-- STEP 2: Update RLS Policies for Communities Table
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "public_read_active_communities" ON communities;

-- Allow anyone to read active communities
CREATE POLICY "public_read_active_communities" ON communities
  FOR SELECT
  USING (status = 'active');

-- ============================================================================
-- STEP 3: Update RLS Policies for User Profiles
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "community_read_profiles" ON user_profiles;
DROP POLICY IF EXISTS "community_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their community" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Read: Users can see profiles from their community
CREATE POLICY "community_read_profiles" ON user_profiles
  FOR SELECT
  USING (
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );

-- Update: Users can update their own profile
CREATE POLICY "community_update_own_profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );

-- ============================================================================
-- STEP 4: Update RLS Policies for Parking Slots
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "community_read_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_insert_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_update_own_slots" ON parking_slots;
DROP POLICY IF EXISTS "community_delete_own_slots" ON parking_slots;
DROP POLICY IF EXISTS "Anyone can view active parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Users can create their own parking slots" ON parking_slots;
DROP POLICY IF EXISTS "Owners can update their own slots" ON parking_slots;
DROP POLICY IF EXISTS "Owners can delete their own slots" ON parking_slots;

-- Read: Anyone can view active slots in their community
CREATE POLICY "community_read_slots" ON parking_slots
  FOR SELECT
  USING (
    status = 'active' AND
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );

-- Insert: Users can create slots in their community
CREATE POLICY "community_insert_slots" ON parking_slots
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );

-- Update: Owners can update their own slots
CREATE POLICY "community_update_own_slots" ON parking_slots
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id AND
    community_code = COALESCE(
      current_setting('app.current_community', true),
      community_code
    )
  );

-- Delete: Owners can delete their own slots
CREATE POLICY "community_delete_own_slots" ON parking_slots
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- STEP 5: Update RLS Policies for Bookings
-- ============================================================================

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "community_read_own_bookings" ON bookings;
DROP POLICY IF EXISTS "community_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "community_update_own_bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

-- Read: Users can view bookings they're involved in
CREATE POLICY "community_read_own_bookings" ON bookings
  FOR SELECT
  USING (
    auth.uid() = renter_id OR
    auth.uid() = slot_owner_id
  );

-- Insert: Users can create bookings
CREATE POLICY "community_insert_bookings" ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

-- Update: Users can update their own bookings
CREATE POLICY "community_update_own_bookings" ON bookings
  FOR UPDATE
  USING (
    auth.uid() = renter_id OR
    auth.uid() = slot_owner_id
  )
  WITH CHECK (
    auth.uid() = renter_id OR
    auth.uid() = slot_owner_id
  );

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run after migration)
-- ============================================================================

-- Check that functions were created
DO $$
BEGIN
  -- Test set_community_context function
  PERFORM set_community_context('LMR');
  RAISE NOTICE 'Community context functions created successfully';

  -- Verify the context was set
  IF get_community_context() = 'LMR' THEN
    RAISE NOTICE 'Community context verification: OK';
  ELSE
    RAISE WARNING 'Community context verification: FAILED';
  END IF;
END $$;

-- List all community-related policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE policyname LIKE 'community_%'
   OR policyname LIKE '%community%'
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
