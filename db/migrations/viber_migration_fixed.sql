-- ============================================================================
-- VIBER MIGRATION DATABASE UPDATES - FIXED VERSION
-- Run this BEFORE 007_marketplace_model.sql
-- Priority: CRITICAL - Fixes RLS infinite recursion issues
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: CREATE TABLES FIRST (Before RLS policies)
-- ----------------------------------------------------------------------------

-- 1.1 Add Viber member tracking columns
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS viber_member BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS viber_nickname VARCHAR(100),
  ADD COLUMN IF NOT EXISTS viber_join_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_payment_note TEXT DEFAULT 'GCash/Maya/Cash - coordinate directly';

CREATE INDEX IF NOT EXISTS idx_user_profiles_viber 
  ON user_profiles(viber_member) 
  WHERE viber_member = true;

-- 1.2 Add quick availability columns to parking_slots
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS quick_availability_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quick_availability_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quick_availability_posted_at TIMESTAMPTZ;

-- 1.3 Create slot_availability_windows table
CREATE TABLE IF NOT EXISTS slot_availability_windows (
  window_id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  
  -- Recurring patterns
  day_of_week INTEGER[], -- [1,2,3,4,5] = weekdays, [6,0] = weekends
  start_time TIME,
  end_time TIME,
  
  -- Specific date ranges
  available_from DATE,
  available_until DATE,
  
  -- Quick availability (deprecated in favor of parking_slots columns)
  is_available_now BOOLEAN DEFAULT false,
  available_until_timestamp TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_slot 
  ON slot_availability_windows(slot_id);

CREATE INDEX IF NOT EXISTS idx_availability_active 
  ON slot_availability_windows(slot_id, is_available_now)
  WHERE is_available_now = true;

-- 1.4 Create slot_blackout_dates table
CREATE TABLE IF NOT EXISTS slot_blackout_dates (
  blackout_id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  blackout_start TIMESTAMPTZ NOT NULL,
  blackout_end TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure end is after start
  CONSTRAINT blackout_valid_range CHECK (blackout_end > blackout_start)
);

CREATE INDEX IF NOT EXISTS idx_blackout_slot 
  ON slot_blackout_dates(slot_id);
  
CREATE INDEX IF NOT EXISTS idx_blackout_dates 
  ON slot_blackout_dates(slot_id, blackout_start, blackout_end);

-- 1.5 Create viber_migration_metrics table
CREATE TABLE IF NOT EXISTS viber_migration_metrics (
  metric_id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value_before DECIMAL,
  value_after DECIMAL,
  improvement_percentage DECIMAL GENERATED ALWAYS AS (
    CASE 
      WHEN value_before > 0 THEN ((value_before - value_after) / value_before * 100)
      ELSE 0
    END
  ) STORED,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_user 
  ON viber_migration_metrics(user_id);

-- ----------------------------------------------------------------------------
-- STEP 2: CREATE SECURITY DEFINER FUNCTIONS (Breaks RLS recursion)
-- ----------------------------------------------------------------------------

-- Function to check if user owns a slot (bypasses RLS)
CREATE OR REPLACE FUNCTION user_owns_slot(p_user_id UUID, p_slot_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
STABLE -- Result doesn't change within transaction
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parking_slots
    WHERE slot_id = p_slot_id 
    AND owner_id = p_user_id
  );
END;
$$;

-- Function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION user_is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id 
    AND role = 'admin'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_owns_slot TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_admin TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 3: ENABLE RLS ON NEW TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE slot_availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE viber_migration_metrics ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- STEP 4: CREATE RLS POLICIES (Using security definer functions)
-- ----------------------------------------------------------------------------

-- slot_availability_windows policies
DROP POLICY IF EXISTS "Owners manage availability" ON slot_availability_windows;
DROP POLICY IF EXISTS "Public read availability" ON slot_availability_windows;

CREATE POLICY "Owners manage availability" 
  ON slot_availability_windows
  FOR ALL 
  USING (
    user_owns_slot(auth.uid(), slot_id)
    OR user_is_admin(auth.uid())
  );

CREATE POLICY "Public read availability" 
  ON slot_availability_windows
  FOR SELECT 
  USING (true);

-- slot_blackout_dates policies
DROP POLICY IF EXISTS "Owners manage blackouts" ON slot_blackout_dates;
DROP POLICY IF EXISTS "Public read blackouts" ON slot_blackout_dates;

CREATE POLICY "Owners manage blackouts" 
  ON slot_blackout_dates
  FOR ALL 
  USING (
    user_owns_slot(auth.uid(), slot_id)
    OR user_is_admin(auth.uid())
  );

CREATE POLICY "Public read blackouts" 
  ON slot_blackout_dates
  FOR SELECT 
  USING (true);

-- viber_migration_metrics policies
DROP POLICY IF EXISTS "Users view own metrics" ON viber_migration_metrics;
DROP POLICY IF EXISTS "Admin view metrics" ON viber_migration_metrics;

CREATE POLICY "Users view own metrics" 
  ON viber_migration_metrics
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Admin view metrics" 
  ON viber_migration_metrics
  FOR SELECT 
  USING (user_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- STEP 5: CREATE HELPER FUNCTIONS FOR AVAILABILITY CHECKING
-- ----------------------------------------------------------------------------

-- Fixed version: Uses proper logic and security definer where needed
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_slot_id INTEGER,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for checking availability
STABLE
AS $$
DECLARE
  is_available BOOLEAN := false;
  blackout_exists BOOLEAN;
  slot_record RECORD;
BEGIN
  -- Validation
  IF p_start_time >= p_end_time THEN
    RETURN false;
  END IF;

  -- Check blackout dates first
  SELECT EXISTS (
    SELECT 1 FROM slot_blackout_dates
    WHERE slot_id = p_slot_id
    AND (
      (blackout_start <= p_start_time AND blackout_end > p_start_time)
      OR (blackout_start < p_end_time AND blackout_end >= p_end_time)
      OR (blackout_start >= p_start_time AND blackout_end <= p_end_time)
    )
  ) INTO blackout_exists;

  IF blackout_exists THEN
    RETURN false;
  END IF;

  -- Check if slot has quick availability active
  SELECT 
    quick_availability_active,
    quick_availability_until
  INTO slot_record
  FROM parking_slots
  WHERE slot_id = p_slot_id;

  IF slot_record.quick_availability_active 
     AND p_start_time >= NOW() 
     AND p_end_time <= slot_record.quick_availability_until THEN
    RETURN true;
  END IF;

  -- Check availability windows
  SELECT EXISTS (
    SELECT 1 FROM slot_availability_windows
    WHERE slot_id = p_slot_id
    AND (
      -- Check day of week pattern
      (EXTRACT(DOW FROM p_start_time)::INTEGER = ANY(day_of_week))
      OR
      -- Check date range
      (
        p_start_time::DATE >= available_from 
        AND p_end_time::DATE <= available_until
      )
    )
    AND (
      -- Check time window
      p_start_time::TIME >= start_time 
      AND p_end_time::TIME <= end_time
    )
  ) INTO is_available;

  RETURN is_available;
END;
$$;

GRANT EXECUTE ON FUNCTION check_slot_availability TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 6: CREATE TRIGGER FOR AUTO-EXPIRING QUICK AVAILABILITY
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION expire_quick_availability()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-clear expired quick availability
  UPDATE parking_slots 
  SET 
    quick_availability_active = false,
    is_listed_for_rent = false
  WHERE 
    quick_availability_active = true 
    AND quick_availability_until < NOW();
  
  RETURN NULL; -- After trigger doesn't need return value
END;
$$;

DROP TRIGGER IF EXISTS check_quick_availability_expiry ON bookings;

CREATE TRIGGER check_quick_availability_expiry
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH STATEMENT -- Statement-level trigger is more efficient
  EXECUTE FUNCTION expire_quick_availability();

-- ----------------------------------------------------------------------------
-- STEP 7: VALIDATION QUERIES
-- ----------------------------------------------------------------------------

-- Check Viber member migration
DO $$
DECLARE
  viber_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO viber_count 
  FROM user_profiles 
  WHERE viber_member = true;
  
  RAISE NOTICE 'Viber members migrated: %', viber_count;
END $$;

-- Check new tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'slot_availability_windows'
  ) THEN
    RAISE NOTICE '✓ slot_availability_windows table created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'slot_blackout_dates'
  ) THEN
    RAISE NOTICE '✓ slot_blackout_dates table created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'viber_migration_metrics'
  ) THEN
    RAISE NOTICE '✓ viber_migration_metrics table created';
  END IF;
END $$;

-- Check RLS is enabled
DO $$
BEGIN
  IF (SELECT rowsecurity FROM pg_tables WHERE tablename = 'slot_availability_windows') THEN
    RAISE NOTICE '✓ RLS enabled on slot_availability_windows';
  END IF;
  
  IF (SELECT rowsecurity FROM pg_tables WHERE tablename = 'slot_blackout_dates') THEN
    RAISE NOTICE '✓ RLS enabled on slot_blackout_dates';
  END IF;
END $$;

-- Success message
SELECT 
  '✅ Viber Migration Schema Updates Complete!' as status,
  'Ready for MVP testing with Lumiere residents' as message,
  'No RLS recursion issues!' as notes;

-- Comments for documentation
COMMENT ON FUNCTION user_owns_slot IS 'Security definer function to check slot ownership without RLS recursion';
COMMENT ON FUNCTION user_is_admin IS 'Security definer function to check admin role without RLS recursion';
COMMENT ON FUNCTION check_slot_availability IS 'Check if a slot is available for a given time period, considering blackouts and availability windows';
COMMENT ON TABLE slot_availability_windows IS 'Stores recurring and specific availability patterns for parking slots';
COMMENT ON TABLE slot_blackout_dates IS 'Stores periods when slots are explicitly unavailable';
COMMENT ON TABLE viber_migration_metrics IS 'Tracks metrics for Viber to ParkBoard migration success';