-- Migration: 001_core_schema.sql
-- Purpose: Create core tables for minimal MVP (users, parking_slots)
-- Idempotent: YES (safe to run multiple times)
-- Platform: Standard PostgreSQL (works on local, Neon, Supabase)
-- Rollback: See db/migrations/rollback/001_core_schema_rollback.sql
-- Date: 2025-10-27
-- Phase: 1.3 - Minimal MVP Redesign

-- ==============================================================================
-- DESIGN PHILOSOPHY
-- ==============================================================================
-- This schema is intentionally SIMPLIFIED compared to production schema:
--   - No multi-tenant (community_code) fields
--   - No booking system (MVP = direct contact only)
--   - No pricing (neighbors negotiate directly)
--   - No slot_number (use location-based system instead)
--   - No complex slot types (covered/uncovered not needed for MVP)
--
-- Focus: Single community (Lumiere), neighbors helping neighbors find parking.

BEGIN;

-- ==============================================================================
-- USERS TABLE
-- ==============================================================================
-- Stores resident profiles (one per unit)
-- Contact info allows flexible communication (Viber/Telegram/Phone)

CREATE TABLE IF NOT EXISTS users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,

  -- Profile
  name TEXT NOT NULL,
  unit_number TEXT NOT NULL,

  -- Contact methods (at least one required, enforced at app level)
  contact_viber TEXT,      -- Viber number or username
  contact_telegram TEXT,   -- Telegram handle (@username)
  contact_phone TEXT,      -- Phone number

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_unit ON users(unit_number);

-- Comments for clarity
COMMENT ON TABLE users IS 'Resident profiles - one account per unit';
COMMENT ON COLUMN users.unit_number IS 'Condo unit number (e.g., "10A", "15B")';
COMMENT ON COLUMN users.contact_viber IS 'Viber contact (number or username)';
COMMENT ON COLUMN users.contact_telegram IS 'Telegram handle (e.g., @username)';
COMMENT ON COLUMN users.contact_phone IS 'Phone number for SMS/calls';

-- ==============================================================================
-- PARKING SLOTS TABLE
-- ==============================================================================
-- Stores available parking slots with location-based identification
-- No slot_number - instead use level + tower + optional landmark

CREATE TABLE IF NOT EXISTS parking_slots (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Location (replaces slot_number)
  location_level TEXT NOT NULL CHECK (location_level IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6')),
  location_tower TEXT NOT NULL CHECK (location_tower IN ('East Tower', 'North Tower', 'West Tower')),
  location_landmark TEXT,  -- Optional: "near elevator", "corner spot", etc.

  -- Availability window
  available_from TIMESTAMPTZ NOT NULL,
  available_until TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'taken', 'expired')),

  -- Additional info
  notes TEXT,  -- Freeform text (e.g., "compact car only", "easy access")

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (available_until > available_from)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_slots_status
  ON parking_slots(status);

CREATE INDEX IF NOT EXISTS idx_slots_dates
  ON parking_slots(available_from, available_until);

CREATE INDEX IF NOT EXISTS idx_slots_location
  ON parking_slots(location_level, location_tower);

CREATE INDEX IF NOT EXISTS idx_slots_owner
  ON parking_slots(owner_id);

-- Comments for clarity
COMMENT ON TABLE parking_slots IS 'Available parking slots with location-based identification';
COMMENT ON COLUMN parking_slots.location_level IS 'Parking level: P1-P6';
COMMENT ON COLUMN parking_slots.location_tower IS 'Tower: East Tower, North Tower, or West Tower';
COMMENT ON COLUMN parking_slots.location_landmark IS 'Optional landmark (e.g., "near elevator")';
COMMENT ON COLUMN parking_slots.available_from IS 'Start of availability window';
COMMENT ON COLUMN parking_slots.available_until IS 'End of availability window';
COMMENT ON COLUMN parking_slots.status IS 'available = open for booking, taken = someone using it, expired = past available_until';
COMMENT ON COLUMN parking_slots.notes IS 'Additional info from owner (size restrictions, access notes, etc.)';

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Auto-expire slots after available_until date
CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS trigger AS $$
BEGIN
  -- Mark slots as expired when they pass their available_until time
  UPDATE parking_slots
  SET status = 'expired', updated_at = NOW()
  WHERE available_until < NOW()
    AND status = 'available';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expire_slots ON parking_slots;
CREATE TRIGGER trigger_expire_slots
  AFTER INSERT OR UPDATE ON parking_slots
  FOR EACH STATEMENT
  EXECUTE FUNCTION expire_old_slots();

COMMENT ON FUNCTION expire_old_slots() IS 'Auto-expires slots past their available_until date';

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_slots_updated_at ON parking_slots;
CREATE TRIGGER trigger_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON FUNCTION update_updated_at() IS 'Auto-updates updated_at timestamp on row modification';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Simple policies - no multi-tenant complexity
-- Auth context expected: current_setting('app.current_user_id', true)

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (for contact info when booking)
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT
  USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::UUID);

-- Users can view all available slots
DROP POLICY IF EXISTS "slots_select" ON parking_slots;
CREATE POLICY "slots_select" ON parking_slots
  FOR SELECT
  USING (true);

-- Users can create slots (will be their own)
DROP POLICY IF EXISTS "slots_insert" ON parking_slots;
CREATE POLICY "slots_insert" ON parking_slots
  FOR INSERT
  WITH CHECK (owner_id = current_setting('app.current_user_id', true)::UUID);

-- Users can update only their own slots
DROP POLICY IF EXISTS "slots_update" ON parking_slots;
CREATE POLICY "slots_update" ON parking_slots
  FOR UPDATE
  USING (owner_id = current_setting('app.current_user_id', true)::UUID);

-- Users can delete only their own slots
DROP POLICY IF EXISTS "slots_delete" ON parking_slots;
CREATE POLICY "slots_delete" ON parking_slots
  FOR DELETE
  USING (owner_id = current_setting('app.current_user_id', true)::UUID);

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Run these to verify migration success

-- Check tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('users', 'parking_slots')
ORDER BY tablename;

-- Check indexes
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('users', 'parking_slots')
ORDER BY tablename, indexname;

-- Check triggers
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'parking_slots')
ORDER BY event_object_table, trigger_name;

-- Check RLS policies
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'parking_slots')
ORDER BY tablename, policyname;

-- Check constraints
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN ('users'::regclass, 'parking_slots'::regclass)
ORDER BY table_name, constraint_name;

-- ==============================================================================
-- EXPECTED OUTPUT
-- ==============================================================================
--
-- Tables (2):
--   - users
--   - parking_slots
--
-- Indexes (7):
--   - users: idx_users_email, idx_users_unit, users_pkey
--   - parking_slots: idx_slots_status, idx_slots_dates, idx_slots_location,
--                    idx_slots_owner, parking_slots_pkey
--
-- Triggers (3):
--   - trigger_expire_slots (parking_slots)
--   - trigger_users_updated_at (users)
--   - trigger_slots_updated_at (parking_slots)
--
-- RLS Policies (6):
--   - users: users_select, users_update
--   - parking_slots: slots_select, slots_insert, slots_update, slots_delete
--
-- Constraints:
--   - users: PRIMARY KEY (id), UNIQUE (email)
--   - parking_slots: PRIMARY KEY (id), FOREIGN KEY (owner_id),
--                    CHECK (location_level), CHECK (location_tower),
--                    CHECK (status), CHECK (valid_date_range)
-- ==============================================================================
