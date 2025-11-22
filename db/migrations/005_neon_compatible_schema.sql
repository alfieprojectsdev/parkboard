-- ============================================================================
-- MIGRATION 005: NEON-COMPATIBLE SCHEMA (IDEMPOTENT)
-- ============================================================================
-- Purpose: Create a complete schema compatible with Neon PostgreSQL
-- This schema removes Supabase-specific features (auth.users, auth.uid())
-- and creates standalone tables with application-level auth
--
-- Run with: psql -d neondb -f db/migrations/005_neon_compatible_schema.sql
-- Connection: Use NEON_CONNECTION_STRING from environment
--
-- IDEMPOTENT: YES - Safe to run multiple times
-- Uses: DROP IF EXISTS, CREATE IF NOT EXISTS, ON CONFLICT
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- TABLE 1: USER_PROFILES
-- ============================================================================
-- Note: In Neon, we manage auth externally (Supabase Auth, NextAuth, etc.)
-- The id field will be populated from the external auth system's user ID

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  unit_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE user_profiles IS 'User business data - auth managed externally';

-- ============================================================================
-- TABLE 2: PARKING_SLOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS parking_slots (
  slot_id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  slot_number TEXT NOT NULL UNIQUE,
  slot_type TEXT DEFAULT 'covered' CHECK (slot_type IN ('covered', 'uncovered', 'tandem')),
  description TEXT,
  price_per_hour DECIMAL(10,2) NOT NULL CHECK (price_per_hour > 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_owner ON parking_slots(owner_id);

-- Covering index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_slots_listing ON parking_slots(status, slot_id)
  INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  WHERE status = 'active';

COMMENT ON TABLE parking_slots IS 'Parking slots available for rent';

-- ============================================================================
-- TABLE 3: BOOKINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  booking_id SERIAL PRIMARY KEY,
  slot_id INT NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  slot_owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Prevent overlapping bookings for same slot (excluding cancelled)
  CONSTRAINT no_overlap EXCLUDE USING gist (
    slot_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings USING gist (tstzrange(start_time, end_time));
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status_time ON bookings(renter_id, status, start_time DESC)
  WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings(slot_owner_id, status)
  WHERE slot_owner_id IS NOT NULL;

COMMENT ON TABLE bookings IS 'Booking transactions - users rent slots for time periods';

-- ============================================================================
-- TRIGGERS: AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS parking_slots_updated_at ON parking_slots;
CREATE TRIGGER parking_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGERS: AUTO-POPULATE SLOT_OWNER_ID
-- ============================================================================

CREATE OR REPLACE FUNCTION set_slot_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT owner_id INTO NEW.slot_owner_id
  FROM parking_slots WHERE slot_id = NEW.slot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_set_owner ON bookings;
CREATE TRIGGER booking_set_owner
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_slot_owner_id();

-- ============================================================================
-- TRIGGERS: AUTO-CALCULATE BOOKING PRICE (SECURITY)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_price_per_hour DECIMAL(10,2);
  v_duration_hours DECIMAL(10,2);
BEGIN
  SELECT price_per_hour INTO v_price_per_hour
  FROM parking_slots WHERE slot_id = NEW.slot_id;

  v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  NEW.total_price := v_price_per_hour * v_duration_hours;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_price_calculation ON bookings;
CREATE TRIGGER booking_price_calculation
  BEFORE INSERT OR UPDATE OF start_time, end_time, slot_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_price();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_slot_bookable(
  p_slot_id INT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_slot_status TEXT;
  v_conflict_count INT;
BEGIN
  SELECT status INTO v_slot_status
  FROM parking_slots WHERE slot_id = p_slot_id;

  IF v_slot_status IS NULL OR v_slot_status != 'active' THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE slot_id = p_slot_id
    AND status IN ('pending', 'confirmed')
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_profiles', 'parking_slots', 'bookings');

  IF table_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All 3 tables created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: Only % of 3 tables created', table_count;
  END IF;
END $$;

-- Check triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
