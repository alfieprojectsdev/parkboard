-- ============================================================================
-- VIBER MIGRATION DATABASE UPDATES
-- Run this BEFORE 007_marketplace_model.sql
-- Priority: CRITICAL - Addresses Viber-specific pain points
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VIBER MEMBER TRACKING & TRUST SIGNALS
-- ----------------------------------------------------------------------------
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS viber_member BOOLEAN DEFAULT false;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS viber_nickname VARCHAR(100);

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS viber_join_date DATE;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_note TEXT DEFAULT 'GCash/Maya/Cash - coordinate directly';

-- Index for quick Viber member lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_viber 
  ON user_profiles(viber_member) 
  WHERE viber_member = true;

-- ----------------------------------------------------------------------------
-- 2. ENHANCED SLOT LOCATION & NAMING (Solves P6 confusion)
-- ----------------------------------------------------------------------------
-- Add columns (unique_identifier as regular column)
ALTER TABLE parking_slots 
ADD COLUMN IF NOT EXISTS building_tower VARCHAR(20);

ALTER TABLE parking_slots 
ADD COLUMN IF NOT EXISTS floor_level VARCHAR(10);

ALTER TABLE parking_slots 
ADD COLUMN IF NOT EXISTS location_tags TEXT[];

ALTER TABLE parking_slots 
ADD COLUMN IF NOT EXISTS unique_identifier VARCHAR(50);

-- Create immutable function
CREATE OR REPLACE FUNCTION generate_unique_slot_id(
  p_floor VARCHAR(10),
  p_tower VARCHAR(20),
  p_number TEXT
) RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN COALESCE(p_floor, 'P') || '-' || 
         COALESCE(SUBSTRING(p_tower FROM 1 FOR 2), 'XX') || '-' || 
         p_number;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to maintain unique_identifier
CREATE OR REPLACE FUNCTION update_unique_identifier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unique_identifier := generate_unique_slot_id(
    NEW.floor_level, 
    NEW.building_tower, 
    NEW.slot_number
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_unique_identifier_trigger ON parking_slots;
CREATE TRIGGER update_unique_identifier_trigger
  BEFORE INSERT OR UPDATE OF floor_level, building_tower, slot_number
  ON parking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_unique_identifier();

-- Update existing rows
UPDATE parking_slots 
SET slot_number = slot_number; -- This triggers the trigger to populate unique_identifier

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slot_identifier 
  ON parking_slots(unique_identifier);

-- Full text search for location (using trigger-maintained column)
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Function to update search text
CREATE OR REPLACE FUNCTION update_slot_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := COALESCE(NEW.description, '') || ' ' ||
                     COALESCE(NEW.building_tower, '') || ' ' ||
                     COALESCE(array_to_string(NEW.location_tags, ' '), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to maintain search_text
DROP TRIGGER IF EXISTS update_search_text_trigger ON parking_slots;
CREATE TRIGGER update_search_text_trigger
  BEFORE INSERT OR UPDATE OF description, building_tower, location_tags
  ON parking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_search_text();

-- Update existing rows
UPDATE parking_slots
SET search_text = COALESCE(description, '') || ' ' ||
                  COALESCE(building_tower, '') || ' ' ||
                  COALESCE(array_to_string(location_tags, ' '), '');

-- Create GIN index on the tsvector
CREATE INDEX IF NOT EXISTS idx_slot_location_search
  ON parking_slots USING GIN(to_tsvector('english', COALESCE(search_text, '')));

-- ----------------------------------------------------------------------------
-- 3. COMPLEX AVAILABILITY PATTERNS (Mary Lou's schedule support)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slot_availability_windows (
  window_id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  
  -- Recurring patterns
  day_of_week INTEGER[], -- [1,2,3,4,5] = weekdays, [6,0] = weekends
  start_time TIME,
  end_time TIME,
  
  -- Specific date ranges
  available_from DATE,
  available_until DATE,
  
  -- Quick availability
  is_available_now BOOLEAN DEFAULT false,
  available_until_timestamp TIMESTAMPTZ, -- For "NOW until 10PM" posts
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active availability queries
CREATE INDEX IF NOT EXISTS idx_availability_active 
  ON slot_availability_windows(slot_id, is_available_now)
  WHERE is_available_now = true;

-- Blackout dates (Mary Lou's "Taken or Not available" list)
CREATE TABLE IF NOT EXISTS slot_blackout_dates (
  blackout_id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  blackout_start TIMESTAMPTZ NOT NULL,
  blackout_end TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for conflict checking
CREATE INDEX IF NOT EXISTS idx_blackout_dates 
  ON slot_blackout_dates(slot_id, blackout_start, blackout_end);

-- ----------------------------------------------------------------------------
-- 4. QUICK "AVAILABLE NOW" POSTING SUPPORT
-- ----------------------------------------------------------------------------
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS quick_availability_active BOOLEAN DEFAULT false;
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS quick_availability_until TIMESTAMPTZ;
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS quick_availability_posted_at TIMESTAMPTZ;

-- Auto-expire "Available NOW" listings
CREATE OR REPLACE FUNCTION expire_quick_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-clear expired quick availability
  UPDATE parking_slots 
  SET 
    quick_availability_active = false,
    is_listed_for_rent = false
  WHERE 
    quick_availability_active = true 
    AND quick_availability_until < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_quick_availability_expiry ON bookings;

-- Run expiration check periodically (via cron or on each query)
CREATE TRIGGER check_quick_availability_expiry
AFTER INSERT OR UPDATE ON bookings
EXECUTE FUNCTION expire_quick_availability();

-- ----------------------------------------------------------------------------
-- 5. PM BURDEN TRACKING (Measure improvement)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viber_migration_metrics (
  metric_id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  metric_type VARCHAR(50), -- 'pm_avoided', 'search_time_saved', 'booking_speed'
  value_before DECIMAL, -- e.g., 5 PMs in Viber
  value_after DECIMAL, -- e.g., 0 PMs in ParkBoard
  improvement_percentage DECIMAL GENERATED ALWAYS AS (
    CASE 
      WHEN value_before > 0 THEN ((value_before - value_after) / value_before * 100)
      ELSE 0
    END
  ) STORED,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. SEED KNOWN VIBER MEMBERS (for trust signals)
-- ----------------------------------------------------------------------------
-- Pre-populate known active Viber members for immediate recognition
-- First, add the unique constraint
-- Only seed profiles for users that already exist
-- INSERT INTO user_profiles (
--   id, 
--   name, 
--   viber_nickname, 
--   viber_member, 
--   viber_join_date,
--   email,
--   unit_number,
--   role,
--   preferred_payment_note
-- )
-- SELECT 
--   u.id,
--   v.name,
--   v.viber_nickname,
--   v.viber_member,
--   v.viber_join_date,
--   v.email,
--   v.unit_number,
--   v.role,
--   v.preferred_payment_note
-- FROM (VALUES
--   ('KC', 'KC', true, '2024-01-01'::DATE, 'kc@lumiere.ph', 'TBD', 'resident', 'GCash 0917-XXX-1234'),
--   ('Mary Lou Gugol', 'Mary Lou Gugol', true, '2024-01-01'::DATE, 'marylou@lumiere.ph', 'TBD', 'resident', 'GCash/Maya accepted'),
--   ('Marco Nuñez', 'Marco Nuñez', true, '2024-02-01'::DATE, 'marco@lumiere.ph', 'TBD', 'resident', 'Cash only please'),
--   ('Sarah Que', 'sarah que', true, '2024-03-01'::DATE, 'sarah@lumiere.ph', 'TBD', 'resident', 'Any payment OK'),
--   ('Jerry Martin', 'Jerry Martin-KAM', true, '2024-01-15'::DATE, 'jerry@novonordisk.com', 'TBD', 'resident', 'Corporate billing available')
-- ) AS v(name, viber_nickname, viber_member, viber_join_date, email, unit_number, role, preferred_payment_note)
-- LEFT JOIN auth.users u ON u.email = v.email
-- WHERE u.id IS NOT NULL  -- Only insert if user exists
-- ON CONFLICT (email) DO UPDATE
-- SET 
--   viber_member = EXCLUDED.viber_member,
--   viber_nickname = EXCLUDED.viber_nickname,
--   viber_join_date = EXCLUDED.viber_join_date;

-- Add a comment explaining the seeding will happen post-signup
COMMENT ON TABLE user_profiles IS 'Viber member data will be populated after users sign up through the app';


-- Remove or fix duplicates (keep the most recent one)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM user_profiles
    WHERE email IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Now create the constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT unique_user_email UNIQUE (email);
-- ----------------------------------------------------------------------------
-- 7. UPDATE RLS POLICIES FOR NEW TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE slot_availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE viber_migration_metrics ENABLE ROW LEVEL SECURITY;

-- Owners can manage their slot availability
CREATE POLICY "Owners manage availability" ON slot_availability_windows
  FOR ALL USING (
    slot_id IN (SELECT slot_id FROM parking_slots WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners manage blackouts" ON slot_blackout_dates
  FOR ALL USING (
    slot_id IN (SELECT slot_id FROM parking_slots WHERE owner_id = auth.uid())
  );

-- Anyone can read availability (for browsing)
CREATE POLICY "Public read availability" ON slot_availability_windows
  FOR SELECT USING (true);

CREATE POLICY "Public read blackouts" ON slot_blackout_dates
  FOR SELECT USING (true);

-- Only admins see metrics
CREATE POLICY "Admin view metrics" ON viber_migration_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS FOR COMPLEX AVAILABILITY
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_slot_id INTEGER,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN := false;
  blackout_exists BOOLEAN;
BEGIN
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
    quick_availability_active AND 
    p_start_time >= NOW() AND
    p_end_time <= quick_availability_until
  INTO is_available
  FROM parking_slots
  WHERE slot_id = p_slot_id;

  IF is_available THEN
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
      (p_start_time::DATE >= available_from AND p_end_time::DATE <= available_until)
    )
    AND (
      -- Check time window
      p_start_time::TIME >= start_time AND p_end_time::TIME <= end_time
    )
  ) INTO is_available;

  RETURN is_available;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 9. MIGRATION VALIDATION QUERIES
-- ----------------------------------------------------------------------------
-- Run these after migration to verify success:

/*
-- Check Viber member migration
SELECT COUNT(*) as viber_members FROM user_profiles WHERE viber_member = true;

-- Check location data completeness
SELECT 
  COUNT(*) as total_slots,
  COUNT(building_tower) as has_tower,
  COUNT(floor_level) as has_floor,
  COUNT(unique_identifier) as has_unique_id
FROM parking_slots;

-- Check for P6 confusion resolution
SELECT 
  floor_level,
  building_tower,
  COUNT(*) as count,
  array_agg(unique_identifier) as unique_ids
FROM parking_slots
WHERE floor_level = 'P6'
GROUP BY floor_level, building_tower;

-- Verify quick availability feature
SELECT COUNT(*) as quick_posts 
FROM parking_slots 
WHERE quick_availability_active = true;

-- Check complex availability windows
SELECT 
  slot_id,
  COUNT(*) as num_windows
FROM slot_availability_windows
GROUP BY slot_id
HAVING COUNT(*) > 1; -- Mary Lou scenarios
*/

-- ----------------------------------------------------------------------------
-- SUCCESS MESSAGE
-- ----------------------------------------------------------------------------
SELECT 'Viber Migration Schema Updates Complete!' as status,
       'Ready for MVP testing with Lumiere residents' as message;