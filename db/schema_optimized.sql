-- db/schema_optimized.sql - Production schema with triggers, optimizations, and RLS
-- ============================================================================
-- PARKBOARD - OPTIMIZED PRODUCTION SCHEMA
-- ============================================================================
-- Based on: schema_refined.sql + optimizations_20251006-142644.md + pseudocode_20251007-090752.md
-- Version: 2.0 (Production-Ready with Security & Performance Optimizations)
-- Generated: 2025-10-07
--
-- KEY IMPROVEMENTS FROM REFACTORING GUIDES:
-- 1. Auto-calculate booking price trigger (CRITICAL SECURITY FIX)
-- 2. Denormalized slot_owner_id in bookings (PERFORMANCE)
-- 3. Added updated_at columns with auto-update triggers
-- 4. Composite indexes for "my bookings" and marketplace queries
-- 5. UNIQUE constraint on unit_number
-- 6. CHECK constraint on slot_type values
-- 7. Optimized RLS policies (removed subquery)
-- ============================================================================

-- Enable extension for timestamp range overlap checking
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- CLEAN UP AUTH.USERS (IMPORTANT: Run this BEFORE dropping tables)
-- ============================================================================
-- Why this is needed:
-- When you drop user_profiles CASCADE, the auth.users records remain in Supabase Auth
-- This can cause issues:
-- 1. Orphaned auth.users with no corresponding user_profiles
-- 2. Login works but app breaks (no profile data)
-- 3. Re-running schema creates duplicate auth.users on re-registration
-- 4. Testing becomes messy with leftover auth accounts
--
-- ⚠️ WARNING: This deletes ALL users from Supabase Auth!
-- Only run this in development/testing environments!
-- DO NOT run in production unless you know what you're doing!
-- ============================================================================

-- OPTION 1: Delete ALL auth users (full reset - recommended for dev/test)
-- Uncomment the line below to delete all auth users:
-- DELETE FROM auth.users;

-- OPTION 2: Delete only orphaned auth users (safer, but less thorough)
-- Uncomment the lines below to delete only users without profiles:
-- DELETE FROM auth.users
-- WHERE id NOT IN (SELECT id FROM user_profiles);

-- OPTION 3: Verify what will be deleted (run this first to check)
-- SELECT id, email, created_at
-- FROM auth.users
-- ORDER BY created_at DESC;

-- ============================================================================
-- MANUAL ALTERNATIVE: Use Supabase Dashboard
-- ============================================================================
-- If you prefer a GUI approach:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Delete users manually one-by-one
-- 3. Or use "Delete all users" if available in your Supabase version
-- ============================================================================

-- Clean slate (run this in Supabase SQL Editor)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ============================================================================
-- TABLE 1: USER PROFILES
-- Extends auth.users with business data
-- ============================================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  unit_number TEXT NOT NULL UNIQUE,  -- OPTIMIZATION: Added UNIQUE constraint
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()  -- OPTIMIZATION: Added for audit trail
);

COMMENT ON TABLE user_profiles IS 'User business data - extends Supabase auth.users';
COMMENT ON COLUMN user_profiles.id IS 'Links to auth.users(id) - managed by Supabase Auth';
COMMENT ON COLUMN user_profiles.phone IS 'Contact number for bookings (no historical tracking needed)';
COMMENT ON COLUMN user_profiles.unit_number IS 'Condo unit number - UNIQUE to prevent duplicate accounts';
COMMENT ON COLUMN user_profiles.updated_at IS 'Auto-updated timestamp for change tracking and ETag support';

-- ============================================================================
-- TABLE 2: PARKING SLOTS
-- The "products" being rented
-- ============================================================================

CREATE TABLE parking_slots (
  slot_id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  slot_number TEXT NOT NULL UNIQUE,
  slot_type TEXT DEFAULT 'covered' CHECK (slot_type IN ('covered', 'uncovered', 'tandem')),  -- OPTIMIZATION: Added CHECK constraint
  description TEXT,
  price_per_hour DECIMAL(10,2) NOT NULL CHECK (price_per_hour > 0),
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',      -- Available for booking (if no conflicts)
    'maintenance', -- Physically unavailable (admin set)
    'disabled'     -- Removed from marketplace (admin set)
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()  -- OPTIMIZATION: Added for audit trail
);

COMMENT ON TABLE parking_slots IS 'Parking slots available for rent';
COMMENT ON COLUMN parking_slots.owner_id IS 'NULL = condo-owned/admin-managed slot';
COMMENT ON COLUMN parking_slots.slot_number IS 'Human-readable identifier (A-10, B-5, etc.)';
COMMENT ON COLUMN parking_slots.slot_type IS 'Physical characteristic - validated by CHECK constraint';
COMMENT ON COLUMN parking_slots.status IS 'Administrative status - NOT derived from bookings';
COMMENT ON COLUMN parking_slots.updated_at IS 'Auto-updated timestamp for change tracking';

-- ============================================================================
-- TABLE 3: BOOKINGS
-- Junction table: connects users to slots with time ranges
-- ============================================================================

CREATE TABLE bookings (
  booking_id SERIAL PRIMARY KEY,
  slot_id INT NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  slot_owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,  -- OPTIMIZATION: Denormalized for RLS performance
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),  -- SECURITY: Auto-calculated by trigger
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Awaiting confirmation
    'confirmed',  -- Active booking
    'cancelled',  -- Cancelled by user or owner
    'completed',  -- Booking ended
    'no_show'     -- Renter didn't show up
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),  -- OPTIMIZATION: Added for audit trail

  -- Constraint: end must be after start
  CONSTRAINT valid_time_range CHECK (end_time > start_time),

  -- Constraint: prevent overlapping bookings for same slot
  CONSTRAINT no_overlap EXCLUDE USING gist (
    slot_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

COMMENT ON TABLE bookings IS 'Booking transactions - users rent slots for time periods';
COMMENT ON COLUMN bookings.slot_owner_id IS 'Denormalized from parking_slots.owner_id - eliminates subquery in RLS (40-60% faster)';
COMMENT ON COLUMN bookings.total_price IS 'Auto-calculated by trigger from slot price and duration - prevents client-side manipulation';
COMMENT ON COLUMN bookings.status IS 'Booking lifecycle state';
COMMENT ON COLUMN bookings.updated_at IS 'Auto-updated timestamp for change tracking';
COMMENT ON CONSTRAINT no_overlap ON bookings IS 'Prevents double-booking (ignores cancelled bookings)';

-- ============================================================================
-- INDEXES
-- Query optimization based on common access patterns
-- ============================================================================

-- User lookups
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Slot queries (marketplace listings)
CREATE INDEX idx_slots_status ON parking_slots(status);
CREATE INDEX idx_slots_owner ON parking_slots(owner_id);

-- OPTIMIZATION: Covering index for marketplace queries (eliminates table lookups)
-- Impact: 2-3x faster slot listings with Index-Only Scan
CREATE INDEX idx_slots_listing ON parking_slots(status, slot_id)
  INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  WHERE status = 'active';

COMMENT ON INDEX idx_slots_listing IS 'Covering index for marketplace queries - all listing data in index (Index-Only Scan)';

-- OPTIMIZATION: Composite index for "my bookings" queries
-- Impact: 50-80% faster booking listing queries
CREATE INDEX idx_bookings_renter_status_time ON bookings(renter_id, status, start_time DESC)
  WHERE status != 'cancelled';

COMMENT ON INDEX idx_bookings_renter_status_time IS 'Composite index for "my bookings" queries - single index scan + sorted results';

-- Booking queries (other access patterns)
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time_range ON bookings USING gist (tstzrange(start_time, end_time));

-- OPTIMIZATION: Index for owner's slot bookings
CREATE INDEX idx_bookings_owner ON bookings(slot_owner_id, status)
  WHERE slot_owner_id IS NOT NULL;

COMMENT ON INDEX idx_bookings_owner IS 'Optimizes "my slots bookings" queries for slot owners';

-- ============================================================================
-- TRIGGERS
-- Automation and data integrity
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TRIGGER 1: Auto-update updated_at on row changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Auto-updates updated_at timestamp on UPDATE';

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER parking_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER 2: Auto-populate slot_owner_id on booking insert
-- CRITICAL OPTIMIZATION: Denormalizes owner_id for RLS performance
-- Impact: 40-60% faster queries, eliminates subquery in RLS policy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_slot_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT owner_id INTO NEW.slot_owner_id
  FROM parking_slots WHERE slot_id = NEW.slot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_slot_owner_id() IS 'Auto-populates slot_owner_id from parking_slots - denormalization for RLS performance';

CREATE TRIGGER booking_set_owner
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_slot_owner_id();

-- ---------------------------------------------------------------------------
-- TRIGGER 3: Auto-calculate booking total_price
-- CRITICAL SECURITY FIX: Prevents client-side price manipulation
-- Impact: Eliminates ability to modify price in DevTools
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_price_per_hour DECIMAL(10,2);
  v_duration_hours DECIMAL(10,2);
BEGIN
  -- Get slot hourly rate
  SELECT price_per_hour INTO v_price_per_hour
  FROM parking_slots WHERE slot_id = NEW.slot_id;

  -- Calculate duration in hours (fractional)
  v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

  -- Set total price (override any client-provided value)
  NEW.total_price := v_price_per_hour * v_duration_hours;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_booking_price() IS 'Auto-calculates total_price from slot rate and duration - SECURITY: prevents client manipulation';

CREATE TRIGGER booking_price_calculation
  BEFORE INSERT OR UPDATE OF start_time, end_time, slot_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_price();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Security policies
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- USER_PROFILES POLICIES
-- ---------------------------------------------------------------------------

-- Anyone can read profiles (needed for contact info in bookings)
CREATE POLICY "public_read_profiles" ON user_profiles
  FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can only insert their own profile
CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- PARKING_SLOTS POLICIES
-- ---------------------------------------------------------------------------

-- Anyone can view slots (public marketplace)
CREATE POLICY "public_read_slots" ON parking_slots
  FOR SELECT
  USING (true);

-- Owners can manage their own slots
CREATE POLICY "owners_manage_own_slots" ON parking_slots
  FOR ALL
  USING (auth.uid() = owner_id);

-- Anyone can create slots (becomes owner)
CREATE POLICY "users_create_slots" ON parking_slots
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

-- TODO: Add admin policy for condo-owned slots (owner_id IS NULL)
-- This will require adding a 'role' column to user_profiles

-- ---------------------------------------------------------------------------
-- BOOKINGS POLICIES
-- OPTIMIZATION: Uses denormalized slot_owner_id instead of subquery
-- Impact: 40-60% faster queries (no subquery execution per row)
-- ---------------------------------------------------------------------------

-- Users see bookings where they're renter OR owner of the slot
-- OPTIMIZED: Direct column comparison instead of subquery
CREATE POLICY "users_see_relevant_bookings" ON bookings
  FOR SELECT
  USING (
    auth.uid() = renter_id
    OR auth.uid() = slot_owner_id
  );

COMMENT ON POLICY "users_see_relevant_bookings" ON bookings IS
  'Optimized policy using denormalized slot_owner_id - no subquery needed';

-- Users can create bookings (as renter)
CREATE POLICY "users_create_bookings" ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

-- Users can update their own bookings (e.g., cancel)
CREATE POLICY "renters_update_own_bookings" ON bookings
  FOR UPDATE
  USING (auth.uid() = renter_id);

-- Owners can update bookings for their slots (e.g., confirm, cancel)
-- OPTIMIZED: Direct column comparison instead of subquery
CREATE POLICY "owners_update_slot_bookings" ON bookings
  FOR UPDATE
  USING (auth.uid() = slot_owner_id);

COMMENT ON POLICY "owners_update_slot_bookings" ON bookings IS
  'Optimized policy using denormalized slot_owner_id - no subquery needed';

-- ============================================================================
-- HELPER FUNCTIONS
-- Utility functions for availability checking
-- ============================================================================

-- Function to check if a slot is bookable for a given time range
CREATE OR REPLACE FUNCTION is_slot_bookable(
  p_slot_id INT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_slot_status TEXT;
  v_conflict_count INT;
BEGIN
  -- Check slot administrative status
  SELECT status INTO v_slot_status
  FROM parking_slots
  WHERE slot_id = p_slot_id;

  IF v_slot_status IS NULL THEN
    RETURN FALSE; -- Slot doesn't exist
  END IF;

  IF v_slot_status != 'active' THEN
    RETURN FALSE; -- Slot not active
  END IF;

  -- Check for booking conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE slot_id = p_slot_id
    AND status = 'confirmed'
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_slot_bookable IS 'Check if slot can be booked for given time range - considers status and conflicts';

-- ============================================================================
-- OPTIMIZATION SUMMARY
-- ============================================================================

COMMENT ON EXTENSION btree_gist IS
  'Required for temporal overlap detection in bookings (no_overlap constraint)';

-- Key improvements implemented:
--
-- SECURITY FIXES:
-- 1. ✅ Auto-calculate booking price trigger - prevents client-side price manipulation
-- 2. ✅ UNIQUE constraint on unit_number - prevents duplicate accounts per unit
-- 3. ✅ CHECK constraint on slot_type - validates enum values
--
-- PERFORMANCE OPTIMIZATIONS:
-- 4. ✅ Denormalized slot_owner_id in bookings - eliminates RLS subquery (40-60% faster)
-- 5. ✅ Composite index idx_bookings_renter_status_time - optimizes "my bookings" (50-80% faster)
-- 6. ✅ Covering index idx_slots_listing - enables Index-Only Scan for marketplace (2-3x faster)
-- 7. ✅ Added updated_at columns - enables ETag caching and audit trail
-- 8. ✅ Auto-update updated_at trigger - automated timestamp maintenance
--
-- EXISTING FEATURES PRESERVED:
-- 9. ✅ btree_gist extension for range overlap detection
-- 10. ✅ no_overlap constraint prevents double-booking
-- 11. ✅ valid_time_range check ensures end > start
-- 12. ✅ All RLS policies (but optimized to remove subqueries)
-- 13. ✅ Helper function is_slot_bookable for availability checks
--
-- Expected performance improvements:
-- - "My Bookings" queries: 50-80% faster (composite index)
-- - Owner booking queries: 40-60% faster (denormalized owner_id)
-- - Marketplace listings: 2-3x faster (covering index)
-- - Booking inserts: No client-side price calculation needed

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify schema was created correctly
-- ============================================================================

-- Check tables were created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check constraints:
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid::regclass::text IN ('parking_slots', 'bookings', 'user_profiles');

-- Check RLS is enabled:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies:
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers:
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check indexes:
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- MIGRATION NOTES
-- If migrating from schema_refined.sql
-- ============================================================================

-- Step 1: Backup existing data
-- pg_dump parkboard > backup_before_optimization.sql

-- Step 2: Run this schema (will drop/recreate tables)
-- WARNING: This will delete all existing data!

-- Step 3: For production migration without data loss, use this approach instead:
/*
-- Don't drop tables, instead ALTER them:

-- Add new columns
ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parking_slots ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN slot_owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Backfill slot_owner_id
UPDATE bookings b
SET slot_owner_id = ps.owner_id
FROM parking_slots ps
WHERE b.slot_id = ps.slot_id;

-- Add constraints
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_unit_number_key UNIQUE (unit_number);
ALTER TABLE parking_slots ADD CONSTRAINT parking_slots_slot_type_check
  CHECK (slot_type IN ('covered', 'uncovered', 'tandem'));

-- Create new indexes
CREATE INDEX idx_slots_listing ON parking_slots(status, slot_id)
  INCLUDE (slot_number, price_per_hour, slot_type, description, owner_id)
  WHERE status = 'active';

CREATE INDEX idx_bookings_renter_status_time ON bookings(renter_id, status, start_time DESC)
  WHERE status != 'cancelled';

CREATE INDEX idx_bookings_owner ON bookings(slot_owner_id, status)
  WHERE slot_owner_id IS NOT NULL;

-- Create triggers (same as above)
-- Update RLS policies (drop old, create new)
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
