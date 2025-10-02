# ParkBoard - Core Context for Claude/Opus

## Project Overview
**ParkBoard** is a parking slot marketplace for residential condominiums. It enables P2P parking slot rental with a focus on migrating users from Viber to a proper web platform.

### Key Features:
- 🚗 Slot ownership & marketplace listing
- 📅 Complex availability scheduling (recurring patterns, blackout dates)
- ⚡ "Available NOW" quick posting (Viber-style)
- 🔍 Fast search with location tags (solves "P6 confusion")
- 💰 Zero-PM booking flow (all info visible upfront)
- ✅ Viber member trust signals

### Tech Stack:
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (server-side)
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth

---

## Core Database Schema

```sql
-- db/schema.sql (Core Schema)

-- =============================================================================
-- FILE: schema_v3_unified.sql (Unified Schema with Slot Ownership)
-- Run this in Supabase SQL Editor to replace both schema.sql + add_slot_ownership.sql
-- =============================================================================

-- Drop tables in reverse dependency order (for clean re-runs)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- =============================================================================
-- USER PROFILES TABLE
-- Note: Links to auth.users (Supabase managed auth)
-- =============================================================================
CREATE TABLE user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT NOT NULL, -- mirror from auth.users for easy queries
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PARKING SLOTS TABLE (WITH OWNERSHIP SUPPORT)
-- =============================================================================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    owner_id uuid REFERENCES auth.users (id), -- NULL = shared/visitor slot
    description TEXT, -- e.g., "Near elevator", "Compact car only"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BOOKINGS TABLE
-- =============================================================================
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES parking_slots (slot_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
    notes TEXT, -- user or admin notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rule constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT booking_not_in_past CHECK (start_time >= NOW() - INTERVAL '1 hour') -- allow 1hr grace period
);

-- =============================================================================
-- PAYMENTS TABLE (Optional for MVP)
-- =============================================================================
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings (booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'free')),
    reference_number TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES for Performance
-- =============================================================================
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id); -- For ownership queries

-- =============================================================================
-- UPDATED RLS POLICIES (Ownership-aware)
-- =============================================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- user_profiles policies
-- ========================================================
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ========================================================
-- bookings policies (ownership-aware)
-- ========================================================
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- Updated: Users can only book slots they own OR shared slots
CREATE POLICY "Users can book owned or shared slots"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parking_slots ps
      WHERE ps.slot_id = bookings.slot_id
        AND (ps.owner_id = auth.uid() OR ps.owner_id IS NULL)
    )
  );

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'admin'
      )
  );

CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  USING (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'admin'
      )
  );

-- ========================================================
-- parking_slots policies (ownership-aware)
-- ========================================================
-- Everyone can view all slots (with ownership info)
CREATE POLICY "Users can view all slots with ownership info"
  ON parking_slots FOR SELECT
  USING (true);

-- Only admins can insert slots
CREATE POLICY "Admins can insert slots"
  ON parking_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Only admins can update slots
CREATE POLICY "Admins can update slots"
  ON parking_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Only admins can delete slots
CREATE POLICY "Admins can delete slots"
  ON parking_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );```

## Database Migrations

```sql
-- db/migrations/007_marketplace_model.sql

-- ============================================================================
-- Migration 007: Convert to P2P Marketplace Model
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add marketplace fields to parking_slots
ALTER TABLE parking_slots
ADD COLUMN IF NOT EXISTS is_listed_for_rent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rental_rate_hourly NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS rental_rate_daily NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS owner_notes TEXT,
ADD COLUMN IF NOT EXISTS availability_schedule JSONB,
ADD COLUMN IF NOT EXISTS managed_by TEXT DEFAULT 'owner' CHECK (managed_by IN ('owner', 'admin', 'hoa'));

-- Create index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_parking_slots_listed ON parking_slots(is_listed_for_rent)
WHERE is_listed_for_rent = true;

-- Create rental settings table
CREATE TABLE IF NOT EXISTS slot_rental_settings (
  setting_id SERIAL PRIMARY KEY,
  slot_id INT UNIQUE REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Booking rules
  allow_instant_booking BOOLEAN DEFAULT true,
  require_owner_approval BOOLEAN DEFAULT false,
  min_rental_hours INT DEFAULT 1,
  max_rental_hours INT DEFAULT 24,
  advance_booking_days INT DEFAULT 30,

  -- Renter restrictions
  allowed_vehicle_types TEXT[],
  max_vehicle_height_cm INT,
  renter_rating_minimum NUMERIC(3,2),

  -- Instructions
  parking_instructions TEXT,
  access_instructions TEXT,
  special_requirements TEXT,

  -- Notifications
  notify_on_booking BOOLEAN DEFAULT true,
  notify_on_cancellation BOOLEAN DEFAULT true,
  notification_email TEXT,
  notification_phone TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create earnings tracking table
CREATE TABLE IF NOT EXISTS slot_earnings (
  earning_id SERIAL PRIMARY KEY,
  slot_id INT REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  booking_id INT REFERENCES bookings(booking_id) ON DELETE CASCADE,

  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  platform_fee NUMERIC(10,2) DEFAULT 0 CHECK (platform_fee >= 0),
  owner_payout NUMERIC(10,2) NOT NULL CHECK (owner_payout >= 0),

  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')) DEFAULT 'pending',
  payout_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update bookings table to include pricing
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded'));

-- Update RLS policies for marketplace model
-- Drop existing policies from schema.sql
DROP POLICY IF EXISTS "Users can view all slots with ownership info" ON parking_slots;
DROP POLICY IF EXISTS "Admins can insert slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can update slots" ON parking_slots;
DROP POLICY IF EXISTS "Admins can delete slots" ON parking_slots;
DROP POLICY IF EXISTS "Owners can manage own slots" ON parking_slots;

-- Owners can fully manage their own slots
CREATE POLICY "Owners can manage own slots"
  ON parking_slots FOR ALL
  USING (owner_id = auth.uid());

-- Admins can manage all slots
CREATE POLICY "Admins can manage all slots"
  ON parking_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Everyone can view listed slots
CREATE POLICY "Anyone can view listed slots"
  ON parking_slots FOR SELECT
  USING (is_listed_for_rent = true OR owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Enable RLS on new tables
ALTER TABLE slot_rental_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_earnings ENABLE ROW LEVEL SECURITY;

-- RLS for rental settings
CREATE POLICY "Owners manage own rental settings"
  ON slot_rental_settings FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Admins view all rental settings"
  ON slot_rental_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- RLS for earnings
CREATE POLICY "Owners view own earnings"
  ON slot_earnings FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Admins view all earnings"
  ON slot_earnings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Update existing slots to have rental rates (optional - for testing)
-- UPDATE parking_slots
-- SET rental_rate_hourly = 50.00,
--     rental_rate_daily = 400.00
-- WHERE owner_id IS NOT NULL;

-- Create function to calculate booking cost
CREATE OR REPLACE FUNCTION calculate_booking_cost(
  p_slot_id INT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS NUMERIC AS $$
DECLARE
  v_hourly_rate NUMERIC;
  v_daily_rate NUMERIC;
  v_duration_hours NUMERIC;
  v_duration_days NUMERIC;
  v_cost NUMERIC;
BEGIN
  -- Get rates
  SELECT rental_rate_hourly, rental_rate_daily
  INTO v_hourly_rate, v_daily_rate
  FROM parking_slots
  WHERE slot_id = p_slot_id;

  -- Calculate duration
  v_duration_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  v_duration_days := v_duration_hours / 24;

  -- Choose best rate
  IF v_duration_hours < 24 THEN
    v_cost := v_hourly_rate * v_duration_hours;
  ELSE
    -- Use daily rate if cheaper
    IF (v_daily_rate * v_duration_days) < (v_hourly_rate * v_duration_hours) THEN
      v_cost := v_daily_rate * v_duration_days;
    ELSE
      v_cost := v_hourly_rate * v_duration_hours;
    END IF;
  END IF;

  RETURN ROUND(v_cost, 2);
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE slot_rental_settings IS 'Owner preferences for renting out their parking slots';
COMMENT ON TABLE slot_earnings IS 'Track earnings from slot rentals for owners';
COMMENT ON COLUMN parking_slots.is_listed_for_rent IS 'Whether slot is available on marketplace';
COMMENT ON COLUMN parking_slots.managed_by IS 'Who controls this slot: owner, admin, or hoa';
```

```sql
-- db/migrations/viber-migration-updates.sql

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
  ADD COLUMN IF NOT EXISTS viber_nickname VARCHAR(100); -- "KC", "Mary Lou Gugol", etc.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS viber_join_date DATE; -- For "Member since Oct 2024" trust signal
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_payment_note TEXT DEFAULT 'GCash/Maya/Cash - coordinate directly';

-- Index for quick Viber member lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_viber 
  ON user_profiles(viber_member) 
  WHERE viber_member = true;

-- ----------------------------------------------------------------------------
-- 2. ENHANCED SLOT LOCATION & NAMING (Solves P6 confusion)
-- ----------------------------------------------------------------------------
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS building_tower VARCHAR(20); -- 'North Tower', 'South Tower', 'East', 'West'
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS floor_level VARCHAR(10); -- 'P1', 'P2', 'P3', 'P6', 'B1', etc.
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS location_tags TEXT[]; -- ['near elevator', 'easy access', 'corner spot']
ALTER TABLE parking_slots
  ADD COLUMN IF NOT EXISTS unique_identifier VARCHAR(50); -- Will be populated by trigger

-- Create immutable function for unique identifier
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
  NEW.unique_identifier := generate_unique_slot_id(NEW.floor_level, NEW.building_tower, NEW.slot_number);
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
SET unique_identifier = generate_unique_slot_id(floor_level, building_tower, slot_number);

-- Unique constraint to prevent duplicate confusing names
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
INSERT INTO user_profiles (
  id,
  name,
  viber_nickname,
  viber_member,
  viber_join_date,
  email,
  unit_number,
  role,
  preferred_payment_note
) VALUES
  (gen_random_uuid(), 'KC', 'KC', true, '2024-01-01', 'kc@lumiere.ph', 'TBD', 'resident', 'GCash 0917-XXX-1234'),
  (gen_random_uuid(), 'Mary Lou Gugol', 'Mary Lou Gugol', true, '2024-01-01', 'marylou@lumiere.ph', 'TBD', 'resident', 'GCash/Maya accepted'),
  (gen_random_uuid(), 'Marco Nuñez', 'Marco Nuñez', true, '2024-02-01', 'marco@lumiere.ph', 'TBD', 'resident', 'Cash only please'),
  (gen_random_uuid(), 'Sarah Que', 'sarah que', true, '2024-03-01', 'sarah@lumiere.ph', 'TBD', 'resident', 'Any payment OK'),
  (gen_random_uuid(), 'Jerry Martin', 'Jerry Martin-KAM', true, '2024-01-15', 'jerry@novonordisk.com', 'TBD', 'resident', 'Corporate billing available')
ON CONFLICT (email) DO UPDATE
SET 
  viber_member = EXCLUDED.viber_member,
  viber_nickname = EXCLUDED.viber_nickname,
  viber_join_date = EXCLUDED.viber_join_date;

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
```

## Application Code

```typescript
// app/api/bookings/route.ts

// =====================================================
// File: app/api/bookings/route.ts
// Updated booking API with ownership validation
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest) {
  try {
    // Get user_id from query params or headers
    const userId = req.nextUrl.searchParams.get('user_id') || req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, parking_slots(slot_number, slot_type, owner_id)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.user_id || !body.slot_id || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, slot_id, start_time, end_time" },
      { status: 400 }
    );
  }

  // Validate booking duration limits
  const start = new Date(body.start_time);
  const end = new Date(body.end_time);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  const MIN_DURATION_HOURS = 1;
  const MAX_DURATION_HOURS = 24;
  const MAX_ADVANCE_DAYS = 30;
  
  if (durationHours < MIN_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Minimum booking duration is ${MIN_DURATION_HOURS} hour(s)` },
      { status: 400 }
    );
  }
  
  if (durationHours > MAX_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Maximum booking duration is ${MAX_DURATION_HOURS} hours` },
      { status: 400 }
    );
  }
  
  const now = new Date();
  const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInAdvance > MAX_ADVANCE_DAYS) {
    return NextResponse.json(
      { error: `Cannot book more than ${MAX_ADVANCE_DAYS} days in advance` },
      { status: 400 }
    );
  }

  // Status validation
  if (body.status && !BOOKING_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (new Date(body.end_time) <= new Date(body.start_time)) {
    return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
  }

  // Check slot ownership
  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("owner_id, status")
    .eq("slot_id", body.slot_id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== 'available') {
    return NextResponse.json(
      { error: `Slot is currently ${slot.status}` },
      { status: 400 }
    );
  }

  // Check if slot is owned by someone else
  if (slot.owner_id && slot.owner_id !== body.user_id) {
    return NextResponse.json(
      { error: "This slot is reserved for another resident" },
      { status: 403 }
    );
  }

  // Overlap check
  const { data: existing, error: checkErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("slot_id", body.slot_id)
    .eq("status", "confirmed")
    .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`);

  if (checkErr)
    return NextResponse.json({ error: "Error checking existing bookings: " + checkErr.message }, { status: 500 });

  if (existing?.length)
    return NextResponse.json({ error: "Slot is already booked for this time period" }, { status: 409 });

  // Insert
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...body, status: body.status || "confirmed" }])
    .select("*, parking_slots(slot_number, slot_type, owner_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

```typescript
// app/api/slots/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET() {
  const { data, error } = await supabase.from("parking_slots").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// app/marketplace/page.tsx

// app/marketplace/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <AuthWrapper>
      <MarketplaceContent />
    </AuthWrapper>
  );
}

function MarketplaceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAvailability, setShowQuickAvailability] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, [searchTerm, showQuickAvailability]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('parking_slots')
        .select(`
          *,
          owner:owner_id (
            full_name,
            viber_nickname,
            viber_member,
            preferred_payment_note
          )
        `)
        .eq('is_listed_for_rent', true)
        .eq('status', 'available');

      // Prioritize "Available NOW" posts
      if (showQuickAvailability) {
        query = query
          .eq('quick_availability_active', true)
          .gt('quick_availability_until', new Date().toISOString())
          .order('quick_availability_posted_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Search filter
      if (searchTerm) {
        query = query.or(`search_text.ilike.%${searchTerm}%,slot_number.ilike.%${searchTerm}%,building_tower.ilike.%${searchTerm}%,floor_level.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSlots(data || []);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Parking Marketplace</h1>
          <p className="text-gray-600">Find and book available parking slots from your neighbors</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by location, floor, tower, or features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
          />
        </div>

        {/* Quick Filters (Viber-style) */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Quick Search (Viber-style):</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSearchTerm('P6 North Tower')}
              className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
            >
              P6 North Tower
            </button>
            <button
              onClick={() => setSearchTerm('near elevator')}
              className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
            >
              Near Elevator
            </button>
            <button
              onClick={() => {
                setShowQuickAvailability(!showQuickAvailability);
                setSearchTerm('');
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                showQuickAvailability
                  ? 'bg-green-500 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              � Available NOW
            </button>
            <button
              onClick={() => setSearchTerm('easy access')}
              className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-gray-50"
            >
              Easy Access
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setShowQuickAvailability(false);
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Slots Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No slots found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.map((slot) => (
              <div key={slot.slot_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Quick Availability Badge */}
                {slot.quick_availability_active && (
                  <div className="bg-green-500 text-white px-4 py-2 text-sm font-semibold">
                    � Available NOW until {new Date(slot.quick_availability_until).toLocaleString('en-PH')}
                  </div>
                )}

                <div className="p-6">
                  {/* Slot Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {slot.unique_identifier || slot.slot_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {slot.building_tower} " {slot.floor_level}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      slot.slot_type === 'covered'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {slot.slot_type === 'covered' ? '<� Covered' : '  Uncovered'}
                    </span>
                  </div>

                  {/* Location Tags */}
                  {slot.location_tags && slot.location_tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {slot.location_tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                          {tag}
                        </span>
                      ))}
                      {slot.location_tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                          +{slot.location_tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Viber Member Badge */}
                  {slot.owner?.viber_member && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                         LMR Parking Member
                        {slot.owner.viber_nickname && ` (${slot.owner.viber_nickname})`}
                      </span>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">�{slot.rental_rate_hourly}</div>
                        <div className="text-xs text-gray-600">per hour</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-purple-600">�{slot.rental_rate_daily}</div>
                        <div className="text-xs text-gray-600">per day</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Note */}
                  {slot.owner?.preferred_payment_note && (
                    <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-700">
                      =� {slot.owner.preferred_payment_note}
                    </div>
                  )}

                  {/* View Details Button */}
                  <Link
                    href={`/marketplace/${slot.slot_id}`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    View Details & Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

```

```typescript
// app/marketplace/[slotId]/page.tsx

// app/marketplace/[slotId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function SlotDetailPage() {
  return (
    <AuthWrapper>
      <SlotDetailContent />
    </AuthWrapper>
  );
}

function SlotDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slotId = params.slotId as string;

  const [slot, setSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking form state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  useEffect(() => {
    fetchSlotDetails();
  }, [slotId]);

  useEffect(() => {
    if (startDate && startTime && endDate && endTime) {
      calculateCost();
    }
  }, [startDate, startTime, endDate, endTime]);

  const fetchSlotDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          owner:owner_id (
            full_name,
            name,
            unit_number,
            phone,
            email,
            viber_member,
            viber_nickname,
            viber_join_date,
            preferred_payment_note
          ),
          slot_rental_settings (*)
        `)
        .eq('slot_id', slotId)
        .single();

      if (error) throw error;
      setSlot(data);
    } catch (err) {
      console.error('Error fetching slot:', err);
      alert('Slot not found');
      router.push('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = async () => {
    if (!startDate || !endDate || !startTime || !endTime) return;

    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (end <= start) {
        setCalculatedCost(null);
        return;
      }

      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      let cost = 0;

      if (durationHours < 24) {
        // Use hourly rate
        cost = slot.rental_rate_hourly * durationHours;
      } else {
        // Compare daily vs hourly
        const dailyCost = slot.rental_rate_daily * durationDays;
        const hourlyCost = slot.rental_rate_hourly * durationHours;
        cost = Math.min(dailyCost, hourlyCost);
      }

      setCalculatedCost(Math.round(cost * 100) / 100);
    } catch (err) {
      console.error('Error calculating cost:', err);
      setCalculatedCost(null);
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      alert('Please select start and end date/time');
      return;
    }

    if (calculatedCost === null || calculatedCost <= 0) {
      alert('Invalid booking duration');
      return;
    }

    setBookingLoading(true);

    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      // Check for overlapping bookings
      const { data: overlaps, error: overlapError } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('slot_id', slotId)
        .eq('status', 'confirmed')
        .or(`start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()}`);

      if (overlapError) throw overlapError;

      if (overlaps && overlaps.length > 0) {
        alert('This slot is already booked for the selected time period');
        setBookingLoading(false);
        return;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          user_id: user!.id,
          slot_id: parseInt(slotId),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'confirmed',
          total_amount: calculatedCost,
          hourly_rate: slot.rental_rate_hourly,
          payment_status: 'pending',
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create earnings record
      const platformFee = calculatedCost * 0.10; // 10% platform fee
      const ownerPayout = calculatedCost - platformFee;

      const { error: earningsError } = await supabase
        .from('slot_earnings')
        .insert([{
          slot_id: parseInt(slotId),
          owner_id: slot.owner_id,
          booking_id: booking.booking_id,
          amount: calculatedCost,
          platform_fee: platformFee,
          owner_payout: ownerPayout,
          payment_status: 'pending',
        }]);

      if (earningsError) console.error('Error creating earnings record:', earningsError);

      alert('🎉 Booking confirmed! Check your bookings page.');
      router.push('/bookings');
    } catch (err: any) {
      console.error('Booking error:', err);
      alert('Error creating booking: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Slot Not Found</h2>
          <Link href="/marketplace" className="text-blue-600 hover:underline">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-6xl mx-auto py-8 px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/marketplace" className="text-blue-600 hover:underline text-sm">
            ← Back to Marketplace
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Slot Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Viber Trust Signal */}
            {slot.owner?.viber_member && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-green-800">
                      ✓ Verified LMR Parking Member
                    </span>
                    <p className="text-sm text-green-600 mt-1">
                      {slot.owner.viber_nickname || slot.owner.full_name || slot.owner.name}
                      {slot.owner.viber_join_date &&
                        ` • Member since ${new Date(slot.owner.viber_join_date).toLocaleDateString('en-PH')}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {slot.unique_identifier || `Slot ${slot.slot_number}`}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                      {slot.slot_type === 'covered' ? '🏠 Covered' : '☀️ Uncovered'}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Clear Location Info */}
              {(slot.building_tower || slot.floor_level) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-2">📍 Exact Location</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {slot.building_tower && <div>Tower: <strong>{slot.building_tower}</strong></div>}
                    {slot.floor_level && <div>Floor: <strong>{slot.floor_level}</strong></div>}
                    {slot.unique_identifier && <div>Slot ID: <strong>{slot.unique_identifier}</strong></div>}
                    <div>Type: <strong className="capitalize">{slot.slot_type}</strong></div>
                  </div>
                  {slot.location_tags && slot.location_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slot.location_tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-white rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {slot.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{slot.description}</p>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Hourly Rate</div>
                    <div className="text-3xl font-bold text-blue-600">
                      ₱{slot.rental_rate_hourly}
                    </div>
                    <div className="text-xs text-gray-500">per hour</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Daily Rate</div>
                    <div className="text-3xl font-bold text-purple-600">
                      ₱{slot.rental_rate_daily}
                    </div>
                    <div className="text-xs text-gray-500">per day (24 hours)</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    💡 <strong>Auto-Best Rate:</strong> You'll automatically get the best rate
                    (hourly vs daily) for your booking duration
                  </p>
                </div>
              </div>

              {/* Owner Instructions */}
              {slot.owner_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <span>⚠️</span>
                    Important Instructions from Owner
                  </h3>
                  <p className="text-yellow-800 whitespace-pre-wrap">{slot.owner_notes}</p>
                </div>
              )}

              {/* Payment Instructions - No PM Needed */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">💰 Payment Method</h3>
                <p className="text-sm">
                  {slot.owner?.preferred_payment_note ||
                   'GCash/Maya/Cash - coordinate after booking confirmation'}
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Note: Payment is handled directly with owner, just like in Viber
                </p>
              </div>

              {/* Owner Info */}
              {slot.owner && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Slot Owner</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{slot.owner.full_name || slot.owner.name}</div>
                      <div className="text-sm text-gray-600">Unit {slot.owner.unit_number}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
              {/* Zero PM Booking Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-1">🎯 Book Without PM!</h3>
                <p className="text-xs text-blue-700">
                  All details are here. No need to message "Is this available?" - just book directly!
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Book This Slot</h2>

              <form onSubmit={(e) => { e.preventDefault(); handleBooking(); }} className="space-y-4">
                {/* Start Date/Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* End Date/Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Cost Display */}
                {calculatedCost !== null && calculatedCost > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₱{calculatedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Duration: {(() => {
                        const start = new Date(`${startDate}T${startTime}`);
                        const end = new Date(`${endDate}T${endTime}`);
                        const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
                        return hours < 24 ? `${hours} hours` : `${Math.round(hours / 24 * 10) / 10} days`;
                      })()}
                    </div>
                  </div>
                )}

                {/* Book Button */}
                <button
                  type="submit"
                  disabled={bookingLoading || calculatedCost === null || calculatedCost <= 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {bookingLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By booking, you agree to the slot owner's terms and ParkBoard's policies
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

```typescript
// app/owner/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function OwnerDashboardPage() {
  return (
    <AuthWrapper>
      <OwnerDashboardContent />
    </AuthWrapper>
  );
}

function OwnerDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Schedule management state
  const [scheduleType, setScheduleType] = useState<'quick' | 'recurring' | 'blackout'>('quick');
  const [quickUntil, setQuickUntil] = useState('');
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('17:00');
  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');

  useEffect(() => {
    fetchMySlots();
  }, []);

  const fetchMySlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          slot_availability_windows (count),
          slot_blackout_dates (count)
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlots(data || []);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleListing = async (slotId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({ is_listed_for_rent: !currentStatus })
        .eq('slot_id', slotId);

      if (error) throw error;
      fetchMySlots();
    } catch (err) {
      console.error('Error toggling listing:', err);
      alert('Failed to update listing status');
    }
  };

  const handleQuickAvailability = async () => {
    if (!selectedSlot || !quickUntil) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({
          quick_availability_active: true,
          quick_availability_until: quickUntil,
          quick_availability_posted_at: new Date().toISOString(),
          is_listed_for_rent: true,
        })
        .eq('slot_id', selectedSlot.slot_id);

      if (error) throw error;

      alert('✅ Posted as Available NOW!');
      setShowScheduleModal(false);
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRecurringSchedule = async () => {
    if (!selectedSlot || recurringDays.length === 0) return;

    try {
      const { error } = await supabase
        .from('slot_availability_windows')
        .insert({
          slot_id: selectedSlot.slot_id,
          day_of_week: recurringDays,
          start_time: recurringStartTime,
          end_time: recurringEndTime,
        });

      if (error) throw error;

      alert('✅ Recurring schedule added!');
      setShowScheduleModal(false);
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleBlackoutDate = async () => {
    if (!selectedSlot || !blackoutStart || !blackoutEnd) return;

    try {
      const { error } = await supabase
        .from('slot_blackout_dates')
        .insert({
          slot_id: selectedSlot.slot_id,
          blackout_start: new Date(blackoutStart).toISOString(),
          blackout_end: new Date(blackoutEnd).toISOString(),
          reason: blackoutReason,
        });

      if (error) throw error;

      alert('✅ Blackout period added!');
      setShowScheduleModal(false);
      setBlackoutStart('');
      setBlackoutEnd('');
      setBlackoutReason('');
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Parking Slots</h1>
            <p className="text-gray-600">Manage your listings and availability</p>
          </div>
          <Link
            href="/owner/setup"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add New Slot
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-600 mb-4">You haven't listed any slots yet</p>
            <Link href="/owner/setup" className="text-blue-600 hover:underline">
              List your first slot →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.map((slot) => (
              <div key={slot.slot_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {slot.unique_identifier || slot.slot_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {slot.building_tower && `${slot.building_tower} • `}
                        {slot.floor_level || 'No floor set'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      slot.is_listed_for_rent
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.is_listed_for_rent ? 'Listed' : 'Unlisted'}
                    </span>
                  </div>

                  {/* Quick Availability Badge */}
                  {slot.quick_availability_active && (
                    <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                      ⚡ Available NOW until {new Date(slot.quick_availability_until).toLocaleString('en-PH')}
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mb-4 flex justify-between text-sm">
                    <div>
                      <div className="text-gray-600">Hourly</div>
                      <div className="font-bold text-blue-600">₱{slot.rental_rate_hourly}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Daily</div>
                      <div className="font-bold text-purple-600">₱{slot.rental_rate_daily}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedSlot(slot);
                        setShowScheduleModal(true);
                      }}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                    >
                      📅 Manage Schedule
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleListing(slot.slot_id, slot.is_listed_for_rent)}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          slot.is_listed_for_rent
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {slot.is_listed_for_rent ? 'Unlist' : 'List'}
                      </button>
                      <Link
                        href={`/owner/slots/${slot.slot_id}/edit`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-center"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Schedule Management Modal */}
      {showScheduleModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Availability - {selectedSlot.slot_number}</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Schedule Type Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setScheduleType('quick')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'quick'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🚀 Available NOW
              </button>
              <button
                onClick={() => setScheduleType('recurring')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'recurring'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🔄 Recurring Schedule
              </button>
              <button
                onClick={() => setScheduleType('blackout')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'blackout'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🚫 Blackout Dates
              </button>
            </div>

            {/* Quick Availability */}
            {scheduleType === 'quick' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Post immediate availability (Viber-style "Available NOW")</p>
                <div>
                  <label className="block text-sm font-medium mb-2">Available until:</label>
                  <input
                    type="datetime-local"
                    value={quickUntil}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setQuickUntil(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleQuickAvailability}
                  className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  Post as Available NOW
                </button>
              </div>
            )}

            {/* Recurring Schedule (Mary Lou's scenario) */}
            {scheduleType === 'recurring' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Set recurring weekly availability</p>

                <div>
                  <label className="block text-sm font-medium mb-2">Days of the week:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Mon', value: 1 },
                      { label: 'Tue', value: 2 },
                      { label: 'Wed', value: 3 },
                      { label: 'Thu', value: 4 },
                      { label: 'Fri', value: 5 },
                      { label: 'Sat', value: 6 },
                      { label: 'Sun', value: 0 },
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => {
                          if (recurringDays.includes(value)) {
                            setRecurringDays(recurringDays.filter(d => d !== value));
                          } else {
                            setRecurringDays([...recurringDays, value]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg font-medium ${
                          recurringDays.includes(value)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start time:</label>
                    <input
                      type="time"
                      value={recurringStartTime}
                      onChange={(e) => setRecurringStartTime(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End time:</label>
                    <input
                      type="time"
                      value={recurringEndTime}
                      onChange={(e) => setRecurringEndTime(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRecurringSchedule}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Add Recurring Schedule
                </button>
              </div>
            )}

            {/* Blackout Dates (Mary Lou's "Taken" list) */}
            {scheduleType === 'blackout' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Block off dates when slot is NOT available</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start date/time:</label>
                    <input
                      type="datetime-local"
                      value={blackoutStart}
                      onChange={(e) => setBlackoutStart(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End date/time:</label>
                    <input
                      type="datetime-local"
                      value={blackoutEnd}
                      onChange={(e) => setBlackoutEnd(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason (optional):</label>
                  <input
                    type="text"
                    value={blackoutReason}
                    onChange={(e) => setBlackoutReason(e.target.value)}
                    placeholder="e.g., Personal use, maintenance"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleBlackoutDate}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  Add Blackout Period
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```

```typescript
// app/owner/setup/page.tsx

// app/owner/setup/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function OwnerSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [slotData, setSlotData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    rental_rate_hourly: '',
    rental_rate_daily: '',
    owner_notes: '',
  });

  // New fields for P6 fix
  const [floorLevel, setFloorLevel] = useState('');
  const [buildingTower, setBuildingTower] = useState('');
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickAvailableUntil, setQuickAvailableUntil] = useState('');

  const generateUniqueSlotId = (floor: string, tower: string, number: string) => {
    if (!floor || !tower || !number) return 'Preview will show here';
    const towerId = tower.substring(0, 2).toUpperCase();
    return `${floor}-${towerId}-${number.padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the parking slot with new fields
      const { data: slot, error: slotError } = await supabase
        .from('parking_slots')
        .insert([{
          slot_number: slotData.slot_number,
          slot_type: slotData.slot_type,
          description: slotData.description,
          status: 'available',
          owner_id: user!.id,
          is_listed_for_rent: true,
          rental_rate_hourly: parseFloat(slotData.rental_rate_hourly),
          rental_rate_daily: parseFloat(slotData.rental_rate_daily),
          owner_notes: slotData.owner_notes,
          managed_by: 'owner',
          // New Viber migration fields
          building_tower: buildingTower,
          floor_level: floorLevel,
          location_tags: locationTags,
        }])
        .select()
        .single();

      if (slotError) throw slotError;

      // Create default rental settings
      const { error: settingsError } = await supabase
        .from('slot_rental_settings')
        .insert([{
          slot_id: slot.slot_id,
          owner_id: user!.id,
          allow_instant_booking: true,
          min_rental_hours: 1,
          max_rental_hours: 24,
        }]);

      if (settingsError) throw settingsError;

      // Handle quick availability if set
      if (showQuickPost && quickAvailableUntil) {
        const { error: quickError } = await supabase
          .from('parking_slots')
          .update({
            quick_availability_active: true,
            quick_availability_until: quickAvailableUntil,
            quick_availability_posted_at: new Date().toISOString(),
          })
          .eq('slot_id', slot.slot_id);

        if (quickError) console.error('Quick availability error:', quickError);
      }

      alert('🎉 Your slot is now listed!');
      router.push('/owner');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">List Your Parking Slot</h1>
      <p className="text-gray-600 mb-8">
        Fill in the details below to start earning from your parking slot.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* P6 Fix: Floor, Tower, Slot Number Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor Level *
            </label>
            <select
              value={floorLevel}
              onChange={(e) => setFloorLevel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select floor</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
              <option value="P6">P6</option>
              <option value="B1">B1 (Basement)</option>
              <option value="B2">B2 (Basement)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building/Tower *
            </label>
            <select
              value={buildingTower}
              onChange={(e) => setBuildingTower(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select tower</option>
              <option value="North Tower">North Tower</option>
              <option value="South Tower">South Tower</option>
              <option value="East Tower">East Tower</option>
              <option value="West Tower">West Tower</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slot Number *
            </label>
            <input
              type="text"
              value={slotData.slot_number}
              onChange={(e) => setSlotData({...slotData, slot_number: e.target.value})}
              placeholder="001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={3}
              required
            />
          </div>
        </div>
        <p className="text-xs text-blue-600 -mt-4">
          📍 Will create unique ID: <strong>{generateUniqueSlotId(floorLevel, buildingTower, slotData.slot_number)}</strong>
        </p>

        {/* Location Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Features (helps renters find you faster)
          </label>
          <div className="flex flex-wrap gap-2">
            {['near elevator', 'near exit', 'easy access', 'corner spot',
              'near entrance', 'well-lit', 'CCTV covered', 'wide space'].map(tag => (
              <label key={tag} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  value={tag}
                  checked={locationTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLocationTags([...locationTags, tag]);
                    } else {
                      setLocationTags(locationTags.filter(t => t !== tag));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                  {tag}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Slot Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slot Type *
          </label>
          <select
            value={slotData.slot_type}
            onChange={(e) => setSlotData({...slotData, slot_type: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="covered">Covered</option>
            <option value="uncovered">Uncovered</option>
          </select>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate (₱) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={slotData.rental_rate_hourly}
              onChange={(e) => setSlotData({...slotData, rental_rate_hourly: e.target.value})}
              placeholder="50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Rate (₱) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={slotData.rental_rate_daily}
              onChange={(e) => setSlotData({...slotData, rental_rate_daily: e.target.value})}
              placeholder="400"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={slotData.description}
            onChange={(e) => setSlotData({...slotData, description: e.target.value})}
            placeholder="e.g., Near elevator, good for compact cars"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Owner Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={slotData.owner_notes}
            onChange={(e) => setSlotData({...slotData, owner_notes: e.target.value})}
            placeholder="e.g., Watch the low ceiling, Access code is 1234"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick Availability (Viber-style "Available NOW") */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Quick Availability (Viber-style)</h3>
          <button
            type="button"
            onClick={() => setShowQuickPost(!showQuickPost)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            🚀 Available NOW
          </button>

          {showQuickPost && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <label className="block text-sm font-medium mb-2">
                Available until:
              </label>
              <input
                type="datetime-local"
                value={quickAvailableUntil}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setQuickAvailableUntil(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-gray-600 mt-2">
                ✨ This will mark your slot as "Available NOW" on the marketplace
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'List My Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}

```

```typescript
// app/onboarding/page.tsx

// app/onboarding/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthWrapper';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hasSlot, setHasSlot] = useState<boolean | null>(null);
  const [wantsToRent, setWantsToRent] = useState<boolean | null>(null);
  const [viberProfile, setViberProfile] = useState<any>(null);

  useEffect(() => {
    const checkViberMember = async () => {
      if (profile?.email) {
        const { data } = await supabase
          .from('user_profiles')
          .select('viber_member, viber_nickname, viber_join_date')
          .eq('email', profile.email)
          .single();

        if (data?.viber_member) {
          setViberProfile(data);
        }
      }
    };
    checkViberMember();
  }, [profile]);

  // Step 1: Do you own a parking slot?
  if (step === 1) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to ParkBoard!</h1>

        {/* Viber Member Recognition */}
        {viberProfile?.viber_member && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-green-800">
              Welcome back from LMR Parking! 👋
            </h3>
            <p className="text-sm text-green-600 mt-1">
              We recognize you as {viberProfile.viber_nickname} -
              member since {new Date(viberProfile.viber_join_date).toLocaleDateString('en-PH')}
            </p>
          </div>
        )}

        <p className="text-gray-600 mb-6">
          Let's set up your account. First question:
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            Do you own a parking slot in this building?
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => {
                setHasSlot(true);
                setStep(2);
              }}
              className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left"
            >
              <div className="font-medium">✅ Yes, I own a slot</div>
              <div className="text-sm text-gray-600">I have a deeded parking space</div>
            </button>

            <button
              onClick={() => {
                setHasSlot(false);
                router.push('/dashboard');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="font-medium">👤 No, I'm a renter only</div>
              <div className="text-sm text-gray-600">I want to book others' slots</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Want to list your slot?
  if (step === 2 && hasSlot) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8">
        <h1 className="text-2xl font-bold mb-4">Great! You own a slot.</h1>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            Would you like to rent out your parking slot?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You can earn passive income when you're not using it.
            You control pricing and availability.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setWantsToRent(true);
                router.push('/owner/setup');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 text-left"
            >
              <div className="font-medium">💰 Yes, list my slot</div>
              <div className="text-sm text-gray-600">Set it up now (2 minutes)</div>
            </button>

            <button
              onClick={() => {
                setWantsToRent(false);
                router.push('/dashboard');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="font-medium">❌ Not right now</div>
              <div className="text-sm text-gray-600">Maybe later (you can always do this)</div>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          💡 You can change this anytime in your dashboard
        </p>
      </div>
    );
  }

  return null;
}

```

```typescript
// components/auth/AuthWrapper.tsx

// components/auth/AuthWrapper.tsx
"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Profile {
  id: string;
  name: string;
  email: string;
  unit_number: string;
  phone?: string;
  vehicle_plate?: string;
  role: 'resident' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  sessionError: string | null;
  refreshSession: () => Promise<any>;
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthWrapper');
  }
  return context;
}

// ============================================================================
// AUTH WRAPPER COMPONENT
// ============================================================================

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();

  // ============================================================================
  // INITIALIZE AUTH & SESSION MONITORING
  // ============================================================================
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    const init = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setSessionError(error.message);
        }

        setUser(session?.user || null);
        setLoading(false);

        // Set up periodic session checks every 5 minutes
        if (session) {
          sessionCheckInterval = setInterval(async () => {
            const { data: { session: currentSession }, error: refreshError } = 
              await supabase.auth.getSession();
            
            if (!currentSession || refreshError) {
              console.log("Session expired or error, redirecting to login");
              await supabase.auth.signOut();
              router.replace("/login");
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setSessionError("Authentication initialization failed");
        setLoading(false);
      }
    };
    
    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          setUser(null);
          setProfile(null);
          router.replace("/login");
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [router]);

  // ============================================================================
  // FETCH USER PROFILE
  // ============================================================================
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Profile fetch error:", error);
            if (error.code === 'PGRST116') {
              console.log("Profile not found - might need profile setup");
            }
            setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (err) {
          console.error("Profile fetch exception:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    
    fetchProfile();
  }, [user, router, loading]);

  // ============================================================================
  // MANUAL SESSION REFRESH
  // ============================================================================
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      await supabase.auth.signOut();
      router.replace("/login");
      return null;
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value: AuthContextType = { 
    user, 
    profile, 
    loading: loading || profileLoading,
    sessionError,
    refreshSession
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // Show error state if there's a session error
  if (sessionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Session Error</h2>
          <p className="text-red-600 mb-4">{sessionError}</p>
          <button
            onClick={() => {
              setSessionError(null);
              window.location.href = '/login';
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show profile loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Render children with context
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

```typescript
// lib/supabase.ts

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

```

```typescript
// lib/constants.ts

// =====================================================
// File: lib/constants.ts
// Centralized booking rules and constants
// =====================================================
export const BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
} as const;

export const SLOT_TYPES = {
  COVERED: 'covered',
  UNCOVERED: 'uncovered', 
  VISITOR: 'visitor',
} as const;

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export const USER_ROLES = {
  RESIDENT: 'resident',
  ADMIN: 'admin',
} as const;
```

```typescript
// ./app/about/page.tsx

// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About ParkBoard</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Our Mission</h2>
            <p className="text-gray-600">
              ParkBoard simplifies parking management for residential communities, making it easy for residents to book parking slots and for administrators to manage facility usage efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Features</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Real-time parking slot availability</li>
              <li>Easy booking and cancellation</li>
              <li>Mobile-friendly interface</li>
              <li>Admin tools for slot management</li>
              <li>Booking history and tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact</h2>
            <p className="text-gray-600">
              For support or inquiries, please contact your building administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/admin/AdminDashboardContent.tsx

// app/admin/AdminDashboardContent.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

interface AuthContext {
  user: any;
  profile: any;
  loading: boolean;
}

export default function AdminDashboardContent() {
  const { profile } = useAuth() as AuthContext; 
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSlots: 0,
    activeBookings: 0,
    todayBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch stats
      const [usersRes, slotsRes, bookingsRes] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('parking_slots').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*').eq('status', 'confirmed')
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayBookings = bookingsRes.data?.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
      }).length || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalSlots: slotsRes.count || 0,
        activeBookings: bookingsRes.data?.length || 0,
        todayBookings
      });

      // Fetch recent bookings - simplified to avoid errors
      const { data: recentData, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_id, user_id, slot_id, start_time, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        setRecentBookings([]);
      } else if (recentData && recentData.length > 0) {
        // Fetch related user and slot data separately
        const userIds = [...new Set(recentData.map(b => b.user_id))];
        const slotIds = [...new Set(recentData.map(b => b.slot_id))];

        const [usersRes, slotsRes] = await Promise.all([
          supabase.from('user_profiles').select('id, name, unit_number').in('id', userIds),
          supabase.from('parking_slots').select('slot_id, slot_number, slot_type').in('slot_id', slotIds)
        ]);

        // Merge the data
        const enrichedBookings = recentData.map(booking => ({
          ...booking,
          user_profiles: usersRes.data?.find(u => u.id === booking.user_id),
          parking_slots: slotsRes.data?.find(s => s.slot_id === booking.slot_id)
        }));

        setRecentBookings(enrichedBookings);
      } else {
        setRecentBookings([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Slots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Today's Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.todayBookings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid: Recent Bookings + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <Link 
                href="/admin/bookings-manage"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.booking_id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {booking.user_profiles?.name || 'Unknown'} - Unit {booking.user_profiles?.unit_number || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Slot {booking.parking_slots?.slot_number || 'N/A'} • {new Date(booking.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No recent bookings</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
            <div className="space-y-3">
              <Link 
                href="/admin/bookings-manage"
                className="flex items-center justify-between w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 group"
              >
                <span className="font-medium">📋 Manage All Bookings</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link 
                href="/admin/slots"
                className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 group"
              >
                <span className="font-medium">🅿️ Manage Parking Slots</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link 
                href="/admin/users"
                className="flex items-center justify-between w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 group"
              >
                <span className="font-medium">👥 Manage Users</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/admin/bookings-manage/page.tsx

// app/admin/bookings-manage/page.tsx
"use client";

import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminBookingsManagePage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto py-6 px-4">
          <AdminDashboard />
        </main>
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/admin/page.tsx

// app/admin/page.tsx - Fixed with AuthWrapper
"use client";

import AuthWrapper from '@/components/auth/AuthWrapper';
import AdminDashboardContent from '@/app/admin/AdminDashboardContent'; // ✅ Fixed path

export default function AdminPage() {
  return (
    <AuthWrapper>
      <AdminDashboardContent />
    </AuthWrapper>
  );
}
```

```typescript
// ./app/admin/slots/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthWrapper';
import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import { supabase } from '@/lib/supabase';

function AdminSlotsContent() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    
    try {
      // Fetch slots first
      const { data: slotsData, error: slotsError } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number', { ascending: true });

      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        setSlots([]);
        setLoading(false);
        return;
      }

      // Fetch owner data separately
      const ownerIds = slotsData
        .map(slot => slot.owner_id)
        .filter(id => id !== null);

      if (ownerIds.length > 0) {
        const { data: ownersData } = await supabase
          .from('user_profiles')
          .select('id, name, unit_number')
          .in('id', ownerIds);

        // Merge owner data with slots
        const enrichedSlots = slotsData.map(slot => ({
          ...slot,
          owner: slot.owner_id 
            ? ownersData?.find(owner => owner.id === slot.owner_id)
            : null
        }));

        setSlots(enrichedSlots);
      } else {
        setSlots(slotsData);
      }
    } catch (error) {
      console.error('Error in fetchSlots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, name, unit_number, role')
      .eq('role', 'resident')
      .order('name');
    
    setUsers(data || []);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchSlots();
      fetchUsers();
    }
  }, [profile?.id]);

  const handleStatusChange = async (slotId: number, newStatus: string) => {
    await supabase
      .from('parking_slots')
      .update({ status: newStatus })
      .eq('slot_id', slotId);
    
    fetchSlots();
  };

  const handleOwnerChange = async (slotId: number, newOwnerId: string | null) => {
    await supabase
      .from('parking_slots')
      .update({ owner_id: newOwnerId || null })
      .eq('slot_id', slotId);
    
    fetchSlots();
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
  };

  const handleDelete = async (slotId: number) => {
    if (confirm('Are you sure you want to delete this slot?')) {
      await supabase
        .from('parking_slots')
        .delete()
        .eq('slot_id', slotId);
      
      fetchSlots();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await supabase
      .from('parking_slots')
      .update({
        slot_number: editingSlot.slot_number,
        slot_type: editingSlot.slot_type,
        status: editingSlot.status,
        description: editingSlot.description,
        owner_id: editingSlot.owner_id || null
      })
      .eq('slot_id', editingSlot.slot_id);
    
    setEditingSlot(null);
    fetchSlots();
  };

  const handleAddSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await supabase
      .from('parking_slots')
      .insert({
        slot_number: formData.get('slot_number'),
        slot_type: formData.get('slot_type'),
        status: formData.get('status'),
        description: formData.get('description'),
        owner_id: formData.get('owner_id') || null
      });
    
    setShowAddForm(false);
    fetchSlots();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Parking Slots</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Slot'}
          </button>
        </div>

        {/* Add Slot Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Slot</h2>
            <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="slot_number"
                placeholder="Slot Number (e.g., A-001)"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <select
                name="slot_type"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="covered">Covered</option>
                <option value="uncovered">Uncovered</option>
                <option value="visitor">Visitor</option>
              </select>
              <select
                name="status"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
              <select
                name="owner_id"
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">No Owner (Shared)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.unit_number}
                  </option>
                ))}
              </select>
              <input
                name="description"
                placeholder="Description (optional)"
                className="px-3 py-2 border border-gray-300 rounded-md md:col-span-2"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors md:col-span-2"
              >
                Add Slot
              </button>
            </form>
          </div>
        )}

        {/* Edit Slot Modal */}
        {editingSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4">Edit Slot</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <input
                  value={editingSlot.slot_number}
                  onChange={(e) => setEditingSlot({...editingSlot, slot_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Slot Number"
                  required
                />
                <select
                  value={editingSlot.slot_type}
                  onChange={(e) => setEditingSlot({...editingSlot, slot_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="covered">Covered</option>
                  <option value="uncovered">Uncovered</option>
                  <option value="visitor">Visitor</option>
                </select>
                <select
                  value={editingSlot.status}
                  onChange={(e) => setEditingSlot({...editingSlot, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
                <select
                  value={editingSlot.owner_id || ''}
                  onChange={(e) => setEditingSlot({...editingSlot, owner_id: e.target.value || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">No Owner (Shared)</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.unit_number}
                    </option>
                  ))}
                </select>
                <input
                  value={editingSlot.description || ''}
                  onChange={(e) => setEditingSlot({...editingSlot, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slots Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.map((slot) => (
                <tr key={slot.slot_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {slot.slot_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {slot.slot_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      slot.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : slot.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {slot.owner ? `${slot.owner.name} (Unit ${slot.owner.unit_number})` : 'Shared'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {slot.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(slot)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(slot.slot_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Slots</div>
            <div className="text-2xl font-bold text-gray-900">{slots.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Owned Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Shared Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => !s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Available</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.status === 'available').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSlotsPage() {
  return (
    <AuthWrapper>
      <AdminSlotsContent />
    </AuthWrapper>
  );
}
```

```typescript
// ./app/admin/users/page.tsx

// =====================================================
// File: app/admin/users/page.tsx
// Fixed - must be a Client Component with AuthWrapper
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

function AdminUsersContent() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // if (profile?.role !== 'admin') {
    //   window.location.href = '/dashboard';
    // } else {
      fetchUsers();
    // }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('name');
    
    if (!error) {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
      alert('User role updated successfully');
    } else {
      alert('Error updating user role: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.unit_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.vehicle_plate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={user.id === profile.id} // Can't change own role
                    >
                      <option value="resident">Resident</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your search
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Residents</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'resident').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Admins</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthWrapper>
      <AdminUsersContent />
    </AuthWrapper>
  );
}
```

```typescript
// ./app/api/admin/bookings/route.ts

// app/api/admin/bookings/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: Request) {
  try {
    console.log('🔍 Admin API: Fetching all bookings...');
    
    // Now that foreign keys exist, this should work
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        user_profiles!bookings_user_id_fkey(name, unit_number, email),
        parking_slots!bookings_slot_id_fkey(slot_number, slot_type)
      `)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    console.log(`✅ Admin API: Successfully fetched ${bookings?.length || 0} bookings`);
    return NextResponse.json({ bookings });
    
  } catch (err: any) {
    console.error('💥 API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

```typescript
// ./app/api/bookings/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").select("*").eq("booking_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.status && !BOOKING_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` }, { status: 400 });

    if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time))
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });

    const { data, error } = await supabase.from("bookings").update(body).eq("booking_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").delete().eq("booking_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/payments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").select("*").eq("payment_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.payment_method && !PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (body.status && !PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount && body.amount < 0)
      return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    const { data, error } = await supabase.from("payments").update(body).eq("payment_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").delete().eq("payment_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET() {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (!PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount < 0) return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: booking } = await supabase.from("bookings").select("booking_id").eq("booking_id", body.booking_id).single();
      if (!booking) return NextResponse.json({ error: "booking_id does not exist" }, { status: 400 });
    }

    const { data, error } = await supabase.from("payments").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/profiles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CRITICAL: Use SERVICE_ROLE_KEY to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ Fixed: was using ANON_KEY
);

const ROLES = ["resident", "admin"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error('GET profile by ID error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('GET profile by ID exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    console.log('PATCH profile:', params.id);

    // Validate role if provided
    if (body.role && !ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of ${ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.unit_number !== undefined) updates.unit_number = body.unit_number.trim();
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.vehicle_plate !== undefined) updates.vehicle_plate = body.vehicle_plate?.trim() || null;
    if (body.role !== undefined) updates.role = body.role;

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log('Profile updated successfully:', data.id);
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('PATCH profile exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE profile:', params.id);

    const { error } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error('Delete profile error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Profile deleted successfully');
    return NextResponse.json({ message: "Profile deleted successfully" });

  } catch (err: any) {
    console.error('DELETE profile exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

```typescript
// ./app/api/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROLES = ["resident", "admin"];

export async function GET() {
  const { data, error } = await supabase.from("user_profiles").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enum validation
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of ${ROLES.join(", ")}` }, { status: 400 });
    }

    // Prod FK check
    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: user, error: fkError } = await supabase
        .from("auth.users")
        .select("id")
        .eq("id", body.id)
        .single();

      if (!user) return NextResponse.json({ error: "id does not exist in auth.users" }, { status: 400 });
      if (fkError) return NextResponse.json({ error: fkError.message }, { status: 500 });
    }

    const { data, error } = await supabase.from("user_profiles").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/slots/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").select("*").eq("slot_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").update(body).eq("slot_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").delete().eq("slot_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/test/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", route: "test" });
}

```

```typescript
// ./app/bookings/new/page.sonnet.tsx

// ===============================================================================
// app/bookings/new/page.tsx - Fixed standalone booking page
// ===============================================================================
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import BookingForm from '../../../components/BookingForm';
import BookingConfirmation from '../../../components/BookingConfirmation';
import AuthWrapper from '../../../components/AuthWrapper';

export default function NewBookingPage() {
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const router = useRouter();

  const handleBookingSuccess = (booking) => {
    setBookingConfirmed(booking);
  };

  const handleConfirmationDone = () => {
    setBookingConfirmed(null);
    // Navigate to bookings list
    router.push('/bookings');
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {!bookingConfirmed ? (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
                <p className="text-gray-600 mt-2">Select a time and available parking slot</p>
              </div>
              <BookingForm onSuccess={handleBookingSuccess} />
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed</h1>
              </div>
              <BookingConfirmation 
                booking={bookingConfirmed}
                onDone={handleConfirmationDone}
              />
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/bookings/new/page.tsx

// =====================================================
// File: app/bookings/new/page.tsx
// Fixed - must be a Client Component
// =====================================================
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import AuthWrapper from '@/components/auth/AuthWrapper';

export default function NewBookingPage() {
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const router = useRouter();

  const handleBookingSuccess = (booking: any) => {
    setBookingConfirmed(booking);
  };

  const handleConfirmationDone = () => {
    setBookingConfirmed(null);
    router.push('/dashboard');
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {!bookingConfirmed ? (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
                <p className="text-gray-600 mt-2">Select a time and available parking slot</p>
              </div>
              <BookingForm onSuccess={handleBookingSuccess} />
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed</h1>
              </div>
              <BookingConfirmation 
                booking={bookingConfirmed}
                onDone={handleConfirmationDone}
              />
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/bookings/page.tsx

"use client";

import { useAuth } from '@/components/auth/AuthWrapper';
import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import UserBookingsList from '@/components/booking/UserBookingsList';
import Link from 'next/link';

function BookingsContent() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your parking reservations</p>
        </div>
        <Link 
          href="/bookings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </Link>
      </div>
      
      {profile ? (
        <UserBookingsList userId={profile.id} />
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Unable to load profile. Please try refreshing the page.</p>
        </div>
      )}
    </main>
  );
}

export default function BookingsPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <BookingsContent />
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/dashboard/page.tsx

// app/dashboard/page.tsx - Smart routing based on user type
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
}

function DashboardContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'owner' | 'renter' | 'both' | null>(null);
  const [stats, setStats] = useState({
    ownedSlots: 0,
    activeBookings: 0,
    listedSlots: 0,
  });

  useEffect(() => {
    if (user && profile) {
      determineUserType();
    }
  }, [user, profile]);

  const determineUserType = async () => {
    setLoading(true);
    try {
      // Check if user owns any slots
      const { data: ownedSlots, error: slotsError } = await supabase
        .from('parking_slots')
        .select('slot_id, is_listed_for_rent')
        .eq('owner_id', user!.id);

      if (slotsError) throw slotsError;

      const hasOwnedSlots = ownedSlots && ownedSlots.length > 0;
      const listedCount = ownedSlots?.filter(s => s.is_listed_for_rent).length || 0;

      // Check if user has made any bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('user_id', user!.id);

      if (bookingsError) throw bookingsError;

      const hasBookings = bookings && bookings.length > 0;

      setStats({
        ownedSlots: ownedSlots?.length || 0,
        activeBookings: bookings?.length || 0,
        listedSlots: listedCount,
      });

      // Determine user type
      if (hasOwnedSlots && hasBookings) {
        setUserType('both');
      } else if (hasOwnedSlots) {
        setUserType('owner');
      } else {
        setUserType('renter');
      }
    } catch (err) {
      console.error('Error determining user type:', err);
      setUserType('renter'); // Default to renter
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.name}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Unit {profile?.unit_number}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {userType === 'owner' || userType === 'both' ? (
            <>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">My Slots</div>
                <div className="text-4xl font-bold mb-2">{stats.ownedSlots}</div>
                <div className="text-sm opacity-90">{stats.listedSlots} listed for rent</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">As Renter</div>
                <div className="text-4xl font-bold mb-2">{stats.activeBookings}</div>
                <div className="text-sm opacity-90">Active bookings</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Quick Action</div>
                <Link href="/marketplace" className="inline-block mt-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Browse Slots
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">My Bookings</div>
                <div className="text-4xl font-bold mb-2">{stats.activeBookings}</div>
                <div className="text-sm opacity-90">Total bookings made</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Available Slots</div>
                <Link href="/marketplace" className="inline-block mt-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Browse Now
                </Link>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Own a Slot?</div>
                <Link href="/owner/setup" className="inline-block mt-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  List It Here
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Browse Marketplace */}
            <Link
              href="/marketplace"
              className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Browse Slots</h3>
              <p className="text-sm text-gray-600 text-center">Find available parking</p>
            </Link>

            {/* My Bookings */}
            <Link
              href="/bookings"
              className="flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">My Bookings</h3>
              <p className="text-sm text-gray-600 text-center">View reservations</p>
            </Link>

            {/* Owner Dashboard (if applicable) */}
            {(userType === 'owner' || userType === 'both') && (
              <Link
                href="/owner"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-all group"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">My Slots</h3>
                <p className="text-sm text-gray-600 text-center">Manage listings</p>
              </Link>
            )}

            {/* List Your Slot */}
            {userType !== 'owner' && userType !== 'both' && (
              <Link
                href="/owner/setup"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all group"
              >
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">➕</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">List Your Slot</h3>
                <p className="text-sm text-gray-600 text-center">Start earning</p>
              </Link>
            )}

            {/* Admin (if applicable) */}
            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 hover:border-red-400 transition-all group"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Admin Panel</h3>
                <p className="text-sm text-gray-600 text-center">Manage platform</p>
              </Link>
            )}
          </div>
        </div>

        {/* Info Banner - Different for Owner vs Renter */}
        {userType === 'renter' ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-2">
                  Own a parking slot? Start earning passive income!
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  List your slot on ParkBoard and earn money when you're not using it. 
                  You control the pricing and availability.
                </p>
                <Link
                  href="/owner/setup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <span>List My Slot</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  You're an active slot owner!
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Your slots are {stats.listedSlots > 0 ? 'listed and earning' : 'ready to list'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Manage pricing and availability anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Track your earnings in real-time</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

```typescript
// ./app/fix-profile/page.tsx

// app/fix-profile/page.tsx - Fixed profile creation with duplicate handling
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FixProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit_number: "",
    phone: "",
    vehicle_plate: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session?.user) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Check if profile already exists
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('Profile already exists:', profile);
          setExistingProfile(profile);
          setFormData({
            name: profile.name || "",
            unit_number: profile.unit_number || "",
            phone: profile.phone || "",
            vehicle_plate: profile.vehicle_plate || "",
          });
        } else if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for missing profile
          console.error('Error checking profile:', profileError);
          setError('Error checking existing profile: ' + profileError.message);
        }

      } catch (err) {
        console.error('Session error:', err);
        setError('Authentication error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const profileData = {
        id: user.id,
        email: user.email,
        name: formData.name.trim(),
        unit_number: formData.unit_number.trim(),
        phone: formData.phone.trim() || null,
        vehicle_plate: formData.vehicle_plate.trim() || null,
        role: 'resident',
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', user.id);

        if (updateError) throw updateError;
        setSuccess("Profile updated successfully!");
      } else {
        // Create new profile using upsert to handle duplicates
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(profileData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) throw upsertError;
        setSuccess("Profile created successfully!");
      }

      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('Profile operation error:', err);
      if (err.message.includes('duplicate key')) {
        setError('Profile already exists. Redirecting to dashboard...');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError('Failed to save profile: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {existingProfile ? "Update Profile" : "Complete Your Profile"}
          </CardTitle>
          {user && (
            <p className="text-center text-sm text-gray-600">
              {user.email}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number *
              </label>
              <Input
                type="text"
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                placeholder="e.g., 101A, B-205"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g., 09171234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Plate
              </label>
              <Input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                placeholder="e.g., ABC-123"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || !formData.name.trim() || !formData.unit_number.trim()}
            >
              {submitting 
                ? (existingProfile ? "Updating..." : "Creating...") 
                : (existingProfile ? "Update Profile" : "Create Profile")
              }
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Skip and go to Dashboard
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./app/layout.tsx

// =====================================================
// File: app/layout.tsx
// Updated with ErrorBoundary and ToastProvider
// =====================================================
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/common/ToastNotification'

export const metadata = {
  title: 'ParkBoard - Parking Management',
  description: 'Condo parking booking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

```

```typescript
// ./app/login/page.tsx

// app/login/page.tsx - Fixed version with proper error handling
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");
    setVehiclePlate("");
    clearMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.replace("/dashboard");
    } catch (error: any) {
      setErrorMsg(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!name.trim() || !unitNumber.trim()) {
      setErrorMsg("Name and unit number are required");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("No user data returned from signup");

      // Create profile using API route
      const profileResponse = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: name.trim(),
          unit_number: unitNumber.trim(),
          phone: phone.trim() || null,
          vehicle_plate: vehiclePlate.trim() || null,
          role: 'resident'
        })
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.error || "Failed to create profile");
      }

      setSuccessMsg("Account created successfully! You can now sign in.");
      setMode('login');
      resetForm();

    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMsg(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessMsg("Password reset link sent to your email. Check your inbox!");
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Reset Password';
      default: return 'Login';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'signup': return 'Creating account...';
        case 'reset': return 'Sending reset link...';
        default: return 'Signing in...';
      }
    }
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Send Reset Link';
      default: return 'Sign In';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handlePasswordReset} 
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {mode !== 'reset' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            
            {mode === 'signup' && (
              <>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Unit Number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Vehicle Plate (optional)"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
              </>
            )}
            
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{successMsg}</p>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {getSubmitText()}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:text-blue-800 underline block w-full"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-gray-600 hover:text-gray-800 underline block w-full"
                >
                  Forgot your password?
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Already have an account? Sign in
              </button>
            )}
            
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Back to login
              </button>
            )}
          </div>

          {/* Emergency profile fix link */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <a
              href="/fix-profile"
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Having profile issues? Fix Profile
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./app/owner/earnings/page.tsx

// app/owner/earnings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function EarningsPage() {
  return (
    <AuthWrapper>
      <EarningsContent />
    </AuthWrapper>
  );
}

function EarningsContent() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user, filter]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('slot_earnings')
        .select(`
          *,
          parking_slots (slot_number),
          bookings (start_time, end_time, user_profiles (name, unit_number))
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('payment_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEarnings(data || []);

      // Calculate stats
      const total = data?.reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;
      const pending = data?.filter(e => e.payment_status === 'pending')
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;
      const paid = data?.filter(e => e.payment_status === 'paid')
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;

      // This month earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = data?.filter(e => new Date(e.created_at) >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;

      setStats({
        totalEarnings: total,
        pendingPayouts: pending,
        completedPayouts: paid,
        thisMonth,
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track your rental income and payouts
            </p>
          </div>
          <Link
            href="/owner"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Owner Dashboard
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-1">Total Earnings</div>
            <div className="text-3xl font-bold">
              ₱{stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1">All-time</div>
          </div>
          
          <div className="bg-white border-2 border-green-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">This Month</div>
            <div className="text-3xl font-bold text-green-600">
              ₱{stats.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Current period</div>
          </div>
          
          <div className="bg-white border-2 border-yellow-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">
              ₱{stats.pendingPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Awaiting payout</div>
          </div>
          
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-600">
              ₱{stats.completedPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Already paid</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'paid'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Earnings Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Your earnings will appear here once your slots are booked
              </p>
              <Link
                href="/owner"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Manage My Slots
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earnings.map((earning) => (
                    <tr key={earning.earning_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(earning.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {earning.parking_slots?.slot_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {earning.bookings?.user_profiles?.name || 'N/A'}
                        <br />
                        <span className="text-xs text-gray-500">
                          Unit {earning.bookings?.user_profiles?.unit_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{Number(earning.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₱{Number(earning.platform_fee).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₱{Number(earning.owner_payout).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          earning.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : earning.payment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {earning.payment_status.charAt(0).toUpperCase() + earning.payment_status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            About Payouts
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Earnings are calculated automatically when a booking is completed</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Platform fee is 10% of the booking amount</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Payouts are processed weekly (every Monday)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Pending earnings will be paid out in the next cycle</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
```

```typescript
// ./app/owner/settings/page.tsx

// app/owner/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <AuthWrapper>
      <SettingsContent />
    </AuthWrapper>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [settings, setSettings] = useState({
    allow_instant_booking: true,
    require_owner_approval: false,
    min_rental_hours: 1,
    max_rental_hours: 24,
    advance_booking_days: 30,
    parking_instructions: '',
    access_instructions: '',
    special_requirements: '',
    notify_on_booking: true,
    notify_on_cancellation: true,
    notification_email: '',
    notification_phone: '',
  });

  useEffect(() => {
    if (user) {
      fetchSlots();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSlot) {
      fetchSettings(selectedSlot);
    }
  }, [selectedSlot]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('slot_id, slot_number')
        .eq('owner_id', user!.id)
        .order('slot_number');

      if (error) throw error;
      setSlots(data || []);
      
      if (data && data.length > 0) {
        setSelectedSlot(data[0].slot_id);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async (slotId: number) => {
    try {
      const { data, error } = await supabase
        .from('slot_rental_settings')
        .select('*')
        .eq('slot_id', slotId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          allow_instant_booking: data.allow_instant_booking,
          require_owner_approval: data.require_owner_approval,
          min_rental_hours: data.min_rental_hours,
          max_rental_hours: data.max_rental_hours,
          advance_booking_days: data.advance_booking_days,
          parking_instructions: data.parking_instructions || '',
          access_instructions: data.access_instructions || '',
          special_requirements: data.special_requirements || '',
          notify_on_booking: data.notify_on_booking,
          notify_on_cancellation: data.notify_on_cancellation,
          notification_email: data.notification_email || '',
          notification_phone: data.notification_phone || '',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('slot_rental_settings')
        .upsert({
          slot_id: selectedSlot,
          owner_id: user!.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'slot_id'
        });

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Slots to Configure</h2>
            <p className="text-gray-600 mb-6">
              You need to list a parking slot before you can configure rental settings.
            </p>
            <Link
              href="/owner/setup"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              List Your First Slot
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rental Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure how renters can book your slots
            </p>
          </div>
          <Link
            href="/owner"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </Link>
        </div>

        {/* Slot Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Slot to Configure
          </label>
          <select
            value={selectedSlot || ''}
            onChange={(e) => setSelectedSlot(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {slots.map((slot) => (
              <option key={slot.slot_id} value={slot.slot_id}>
                Slot {slot.slot_number}
              </option>
            ))}
          </select>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Booking Rules */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Rules</h2>
            
            <div className="space-y-4">
              {/* Instant Booking */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_instant_booking}
                  onChange={(e) => setSettings({
                    ...settings, 
                    allow_instant_booking: e.target.checked,
                    require_owner_approval: !e.target.checked
                  })}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Allow Instant Booking</div>
                  <div className="text-sm text-gray-600">
                    Renters can book immediately without your approval
                  </div>
                </div>
              </label>

              {/* Owner Approval */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_owner_approval}
                  onChange={(e) => setSettings({
                    ...settings, 
                    require_owner_approval: e.target.checked,
                    allow_instant_booking: !e.target.checked
                  })}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Require Owner Approval</div>
                  <div className="text-sm text-gray-600">
                    Review and approve each booking request manually
                  </div>
                </div>
              </label>

              {/* Rental Duration */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rental (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.min_rental_hours}
                    onChange={(e) => setSettings({...settings, min_rental_hours: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Rental (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.max_rental_hours}
                    onChange={(e) => setSettings({...settings, max_rental_hours: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Advance Booking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Booking Window (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.advance_booking_days}
                  onChange={(e) => setSettings({...settings, advance_booking_days: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance renters can book (e.g., 30 days)
                </p>
              </div>
            </div>
          </div>

          {/* Instructions for Renters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Instructions for Renters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Instructions
                </label>
                <textarea
                  value={settings.parking_instructions}
                  onChange={(e) => setSettings({...settings, parking_instructions: e.target.value})}
                  placeholder="e.g., Enter from the north gate, my slot is on the 3rd floor"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Instructions
                </label>
                <textarea
                  value={settings.access_instructions}
                  onChange={(e) => setSettings({...settings, access_instructions: e.target.value})}
                  placeholder="e.g., Gate code is 1234, Use the building key card"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requirements
                </label>
                <textarea
                  value={settings.special_requirements}
                  onChange={(e) => setSettings({...settings, special_requirements: e.target.value})}
                  placeholder="e.g., No vehicles over 2m height, Compact cars only"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications</h2>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_on_booking}
                  onChange={(e) => setSettings({...settings, notify_on_booking: e.target.checked})}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Notify on New Booking</div>
                  <div className="text-sm text-gray-600">
                    Get notified when someone books your slot
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_on_cancellation}
                  onChange={(e) => setSettings({...settings, notify_on_cancellation: e.target.checked})}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Notify on Cancellation</div>
                  <div className="text-sm text-gray-600">
                    Get notified when a booking is cancelled
                  </div>
                </div>
              </label>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Email (Optional)
                </label>
                <input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => setSettings({...settings, notification_email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use your account email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={settings.notification_phone}
                  onChange={(e) => setSettings({...settings, notification_phone: e.target.value})}
                  placeholder="09171234567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For SMS notifications (feature coming soon)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/owner')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

```typescript
// ./app/owner/slots/[slotId]/edit/page.tsx

// app/owner/slots/[slotId]/edit/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function EditSlotPage() {
  return (
    <AuthWrapper>
      <EditSlotContent />
    </AuthWrapper>
  );
}

function EditSlotContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slotId = params.slotId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [slotData, setSlotData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    rental_rate_hourly: '',
    rental_rate_daily: '',
    owner_notes: '',
    is_listed_for_rent: true,
  });

  useEffect(() => {
    fetchSlotData();
  }, [slotId]);

  const fetchSlotData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id) // Ensure user owns this slot
        .single();

      if (error) throw error;

      setSlotData({
        slot_number: data.slot_number,
        slot_type: data.slot_type,
        description: data.description || '',
        rental_rate_hourly: data.rental_rate_hourly?.toString() || '',
        rental_rate_daily: data.rental_rate_daily?.toString() || '',
        owner_notes: data.owner_notes || '',
        is_listed_for_rent: data.is_listed_for_rent,
      });
    } catch (err: any) {
      console.error('Error fetching slot:', err);
      setError('Slot not found or you do not have permission to edit it');
      setTimeout(() => router.push('/owner'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const hourlyRate = parseFloat(slotData.rental_rate_hourly);
      const dailyRate = parseFloat(slotData.rental_rate_daily);
      
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        throw new Error('Please enter a valid hourly rate');
      }
      if (isNaN(dailyRate) || dailyRate <= 0) {
        throw new Error('Please enter a valid daily rate');
      }

      const { error: updateError } = await supabase
        .from('parking_slots')
        .update({
          slot_number: slotData.slot_number.trim(),
          slot_type: slotData.slot_type,
          description: slotData.description.trim(),
          rental_rate_hourly: hourlyRate,
          rental_rate_daily: dailyRate,
          owner_notes: slotData.owner_notes.trim(),
          is_listed_for_rent: slotData.is_listed_for_rent,
          updated_at: new Date().toISOString(),
        })
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id);

      if (updateError) throw updateError;

      alert('✅ Slot updated successfully!');
      router.push('/owner');
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ Are you sure you want to delete this slot? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will also delete all bookings associated with this slot. Continue?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('parking_slots')
        .delete()
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id);

      if (deleteError) throw deleteError;

      alert('🗑️ Slot deleted successfully');
      router.push('/owner');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error deleting slot: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-3xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Edit Parking Slot
          </h1>
          <p className="text-lg text-gray-600">
            Update your slot details and pricing
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Slot Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slot Number *
            </label>
            <input
              type="text"
              required
              value={slotData.slot_number}
              onChange={(e) => setSlotData({...slotData, slot_number: e.target.value})}
              placeholder="e.g., A-101, B-205"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Slot Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slot Type *
            </label>
            <select
              value={slotData.slot_type}
              onChange={(e) => setSlotData({...slotData, slot_type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="covered">🏠 Covered</option>
              <option value="uncovered">☀️ Uncovered</option>
            </select>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Pricing *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Hourly Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={slotData.rental_rate_hourly}
                  onChange={(e) => setSlotData({...slotData, rental_rate_hourly: e.target.value})}
                  placeholder="50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Daily Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={slotData.rental_rate_daily}
                  onChange={(e) => setSlotData({...slotData, rental_rate_daily: e.target.value})}
                  placeholder="400"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={slotData.description}
              onChange={(e) => setSlotData({...slotData, description: e.target.value})}
              placeholder="e.g., Near elevator, wide slot good for SUVs"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Owner Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={slotData.owner_notes}
              onChange={(e) => setSlotData({...slotData, owner_notes: e.target.value})}
              placeholder="e.g., Watch the low ceiling, Gate code is 1234"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Listing Status */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={slotData.is_listed_for_rent}
                onChange={(e) => setSlotData({...slotData, is_listed_for_rent: e.target.checked})}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-semibold text-gray-900">List on Marketplace</div>
                <div className="text-sm text-gray-600">Make this slot available for rent</div>
              </div>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/owner')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Delete Section */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              Deleting this slot will remove it permanently and cancel all associated bookings.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete This Slot
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

```typescript
// ./app/page.tsx

// app/page.tsx - Updated home page with proper navigation
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <svg 
              className="w-16 h-16 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ParkBoard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Smart parking management for modern communities. Book your spot, manage your schedule, and never worry about parking again.
          </p>
        </header>

        {/* Main CTA */}
        <div className="flex justify-center gap-4 mb-12">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/about"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Availability</h3>
            <p className="text-gray-600">
              Check parking slot availability in real-time and book instantly.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book, modify, or cancel your parking reservations with just a few clicks.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Admin Tools</h3>
            <p className="text-gray-600">
              Powerful admin dashboard for managing slots, users, and bookings.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Go to Dashboard
            </Link>
            <Link href="/bookings/new" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Book a Slot
            </Link>
            <Link href="/bookings" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View My Bookings
            </Link>
            <Link href="/about" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              About ParkBoard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/reset-password/page.tsx

// app/reset-password/page.tsx - Complete password reset flow
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Handle the auth callback with the token
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    handleAuthCallback();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md shadow-lg rounded-2xl">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-600 mb-4">Your password has been successfully updated.</p>
            <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating password..." : "Update Password"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Back to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./components/admin/AdminDashboard.tsx

// components/admin/AdminDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching from /api/admin/bookings...');
      const bookingsResponse = await fetch('/api/admin/bookings');
      const bookingsJson = await bookingsResponse.json();
      
      console.log('📊 Response status:', bookingsResponse.status);
      console.log('📋 Number of bookings:', bookingsJson.bookings?.length || 0);

      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number');

      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name');
        
      setBookings(bookingsJson.bookings || []);
      setSlots(slotsData || []);
      setUsers(usersData || []);
      
    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlotStatus = async (slotId, newStatus) => {
    await supabase
      .from('parking_slots')
      .update({ status: newStatus })
      .eq('slot_id', slotId);
    fetchDashboardData();
  };

  const changeUserRole = async (userId, newRole) => {
    await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
        <p className="text-gray-600 mt-1">Manage all parking bookings, slots, and users</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['bookings', 'slots', 'users'].map(tab => (
            <button
              key={tab}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-medium">
              📊 Showing {bookings.length} total booking{bookings.length !== 1 ? 's' : ''} from all users
            </p>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.booking_id} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-bold text-2xl text-purple-600">
                        {booking.parking_slots?.slot_number}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">User:</span>
                        <span className="text-gray-900">{booking.user_profiles?.name} ({booking.user_profiles?.unit_number})</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">Email:</span>
                        <span className="text-gray-600">{booking.user_profiles?.email}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">Start:</span>
                        <span className="text-gray-600">{new Date(booking.start_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">End:</span>
                        <span className="text-gray-600">{new Date(booking.end_time).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {booking.status === 'confirmed' && (
                    <button
                      className="ml-6 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-sm"
                      onClick={async () => {
                        if (confirm(`Cancel booking for ${booking.user_profiles?.name}?`)) {
                          await supabase
                            .from('bookings')
                            .update({ status: 'cancelled' })
                            .eq('booking_id', booking.booking_id);
                          fetchDashboardData();
                        }
                      }}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Slots Tab */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.slot_id} className="border rounded-lg p-6 bg-white shadow-sm flex justify-between items-center">
              <div>
                <div className="font-bold text-xl text-gray-900">{slot.slot_number}</div>
                <div className="text-sm text-gray-600 mt-1">Type: <span className="font-medium">{slot.slot_type}</span></div>
                <div className="text-sm text-gray-500 mt-1">{slot.description || 'No description'}</div>
                <div className="text-sm mt-2">
                  Status: <span className={`font-semibold ${
                    slot.status === 'available' ? 'text-green-600' : 
                    slot.status === 'maintenance' ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>{slot.status}</span>
                </div>
              </div>
              <select
                value={slot.status}
                onChange={e => updateSlotStatus(slot.slot_id, e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border rounded-lg p-6 bg-white shadow-sm flex justify-between items-center">
              <div>
                <div className="font-bold text-xl text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Unit:</span> {user.unit_number}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {user.email}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">Vehicle:</span> {user.vehicle_plate || 'Not provided'}
                </div>
                <div className="text-sm mt-2">
                  <span className="font-medium">Role:</span> <span className={`font-bold ${
                    user.role === 'admin' ? 'text-purple-600' : 'text-blue-600'
                  }`}>{user.role}</span>
                </div>
              </div>
              <select
                value={user.role}
                onChange={e => changeUserRole(user.id, e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="resident">Resident</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/auth/DevAuthWrapper.tsx

// =============================================================================
// DevAuthWrapper.js - bypass auth for local dev/testing
// =============================================================================
"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext({
  user: { id: "11111111-1111-1111-1111-111111111111" },
  profile: {
    id: "11111111-1111-1111-1111-111111111111",
    role: "resident",
    name: "Alice Resident"
  },
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function DevAuthWrapper({ children }) {
  return <AuthContext.Provider value={useAuth()}>{children}</AuthContext.Provider>;
}

```

```typescript
// ./components/booking/BookingCard.tsx

// =============================================================================
// BookingCard.js - Individual booking display component
// =============================================================================

function BookingCard({ booking, onCancel }) {
  const now = new Date();
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const isActive = booking.status === 'confirmed' && endTime > now;
  const isPast = endTime <= now;

  const getStatusColor = () => {
    switch (booking.status) {
      case 'confirmed': return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">
            Slot {booking.parking_slots?.slot_number}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {booking.parking_slots?.slot_type}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
          {booking.status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <div className="font-medium">
          {startTime.toLocaleDateString()}
        </div>
        <div>
          {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
        </div>
      </div>

      {booking.parking_slots?.description && (
        <p className="text-sm text-gray-500">
          {booking.parking_slots.description}
        </p>
      )}

      {booking.notes && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Notes: </span>
          <span className="text-gray-600">{booking.notes}</span>
        </div>
      )}

      {isActive && booking.status === 'confirmed' && (
        <button
          onClick={() => onCancel(booking.booking_id)}
          className="w-full mt-3 px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
        >
          Cancel Booking
        </button>
      )}
    </div>
  );
}


```

```typescript
// ./components/booking/BookingConfirmation.tsx

// =============================================================================
// components/BookingConfirmation.tsx - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone, refreshBookings }) {
  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const slotNumber = booking.parking_slots?.slot_number ?? booking.slot_number ?? booking.slot_id;
  const slotType = booking.parking_slots?.slot_type ?? booking.slot_type ?? 'slot';

  return (
    <div role="status" aria-live="polite" className="max-w-md mx-auto">
      <div className="flex flex-col items-center bg-white border rounded-xl p-6 shadow-sm">
        <div className="bg-green-50 p-4 rounded-full mb-3">
          {/* Big checkmark */}
          <svg className="h-12 w-12 text-green-700" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
            <path d="M7 12.5l2.5 2.5L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-green-800">Booking Confirmed</h2>
        <p className="text-sm text-gray-600 mt-2">Your parking slot has been reserved.</p>

        <div className="w-full mt-4 text-left">
          <div className="text-sm text-gray-500">Slot</div>
          <div className="font-medium text-gray-800">{slotNumber} <span className="text-sm text-gray-500">({slotType})</span></div>

          <div className="mt-3 text-sm text-gray-500">When</div>
          <div className="text-gray-800">
            {startTime.toLocaleString()} – {endTime.toLocaleString()}
          </div>
        </div>

        <div className="w-full mt-6">
          <button
            onClick={() => {
              refreshBookings?.();
              onDone();
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}


```

```typescript
// ./components/booking/BookingForm.improved.tsx

// =====================================================
// File: components/booking/BookingForm.improved.tsx
// EXAMPLE: Refactored with non-blocking toast notifications
// Replace the original BookingForm.tsx with this after testing
// =====================================================
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import { useToast } from '@/components/common/ToastNotification';
import { BOOKING_RULES } from '@/lib/constants';

export default function BookingForm({ onSuccess }: { onSuccess: (booking: any) => void }) {
  const { profile, user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const validateBooking = () => {
    if (!selectedSlot) {
      showWarning('Please select a parking slot.');
      return false;
    }

    if (!selectedTimeRange.start || !selectedTimeRange.end) {
      showWarning('Please select both start and end times.');
      return false;
    }

    const start = new Date(selectedTimeRange.start);
    const end = new Date(selectedTimeRange.end);
    const now = new Date();

    // Check duration limits
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (durationHours < BOOKING_RULES.MIN_DURATION_HOURS) {
      showError(`Minimum booking duration is ${BOOKING_RULES.MIN_DURATION_HOURS} hour(s)`);
      return false;
    }

    if (durationHours > BOOKING_RULES.MAX_DURATION_HOURS) {
      showError(`Maximum booking duration is ${BOOKING_RULES.MAX_DURATION_HOURS} hours`);
      return false;
    }

    // Check advance booking limit
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysInAdvance > BOOKING_RULES.MAX_ADVANCE_DAYS) {
      showError(`Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_DAYS} days in advance`);
      return false;
    }

    return true;
  };

  const handleBooking = async () => {
    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }

        // Instead of throw new Error, use toast
        if (errorMessage.includes('already booked')) {
          showError('This slot is already booked for the selected time. Please choose a different slot or time.');
        } else if (errorMessage.includes('reserved for another')) {
          showError('This slot is reserved for another resident. Please select a different slot.');
        } else {
          showError(errorMessage);
        }
        return; // Exit early instead of throwing
      }

      const result = await res.json();

      const bookingResult =
        result && result.parking_slots
          ? result
          : {
              ...result,
              parking_slots: {
                slot_number: selectedSlot.slot_number,
                slot_type: selectedSlot.slot_type,
              },
            };

      showSuccess('Booking confirmed successfully!');

      // Reset form
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });

      // Callback after short delay for better UX
      setTimeout(() => {
        onSuccess(bookingResult);
      }, 1000);

    } catch (err: any) {
      console.error('Booking error:', err);

      // Categorize errors and show appropriate toast
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        showError('Network connection error. Please check your internet and try again.');
      } else if (err.message.includes('500')) {
        showError('Server error occurred. Please try again in a moment.');
      } else if (err.message.includes('past')) {
        showError('Cannot book slots in the past. Please select a future time.');
      } else {
        showError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>

        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>

          <button
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/booking/BookingForm.tsx

// =====================================================
// File: components/booking/BookingForm.tsx
// Updated with consistent error handling
// Updated with booking rules validation
// =====================================================
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import { BOOKING_RULES } from '@/lib/constants';
import ErrorDisplay, { SuccessMessage } from '@/components/common/ErrorDisplay';

export default function BookingForm({ onSuccess }: { onSuccess: (booking: any) => void }) {
  const { profile, user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateBooking = () => {
    if (!selectedSlot) {
      setError('Please select a parking slot.');
      return false;
    }
    
    if (!selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select both start and end times.');
      return false;
    }

    const start = new Date(selectedTimeRange.start);
    const end = new Date(selectedTimeRange.end);
    const now = new Date();
    
    // Check duration limits
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (durationHours < BOOKING_RULES.MIN_DURATION_HOURS) {
      setError(`Minimum booking duration is ${BOOKING_RULES.MIN_DURATION_HOURS} hour(s)`);
      return false;
    }
    
    if (durationHours > BOOKING_RULES.MAX_DURATION_HOURS) {
      setError(`Maximum booking duration is ${BOOKING_RULES.MAX_DURATION_HOURS} hours`);
      return false;
    }
    
    // Check advance booking limit
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysInAdvance > BOOKING_RULES.MAX_ADVANCE_DAYS) {
      setError(`Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_DAYS} days in advance`);
      return false;
    }
    
    return true;
  };

  const handleBooking = async () => {
    setError('');
    setSuccess('');

    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();

      const bookingResult =
        result && result.parking_slots
          ? result
          : {
              ...result,
              parking_slots: {
                slot_number: selectedSlot.slot_number,
                slot_type: selectedSlot.slot_type,
              },
            };

      setSuccess('Booking successful! Redirecting...');
      
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
      
      setTimeout(() => {
        onSuccess(bookingResult);
      }, 1500);

    } catch (err: any) {
      console.error('Booking error:', err);
      
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else if (err.message.includes('already booked')) {
        setError('This slot is already booked for the selected time. Please choose a different slot or time.');
      } else if (err.message.includes('reserved for another')) {
        setError('This slot is reserved for another resident. Please select a different slot.');
      } else if (err.message.includes('500')) {
        setError('Server error occurred. Please try again in a moment.');
      } else if (err.message.includes('past')) {
        setError('Cannot book slots in the past. Please select a future time.');
      } else {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        
        <ErrorDisplay error={error} onRetry={clearError} className="mb-4" />
        <SuccessMessage message={success} onDismiss={clearSuccess} className="mb-4" />
        
        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>
          
          <button
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/booking/SlotGrid.tsx

// =====================================================
// File: components/booking/SlotGrid.tsx
// Display available slots with booking capability 
// Updated with ownership display
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import React from "react";

type Slot = {
  slot_id: string | number;
  slot_number?: string;
  slot_type?: string;
  isAvailable?: boolean;
  status?: string;
  owner_id?: string | null;
  description?: string;
};

export default function SlotGrid(props: {
  onSlotSelect: (s: { slot_id: string | number; slot_number?: string; slot_type?: string }) => void;
  selectedSlotId?: string | number | null;
  selected?: { slot_id?: string | number } | null;
  selectedDate?: string;
  selectedTimeRange?: { start: string; end: string };
}) {
  const {
    onSlotSelect,
    selectedSlotId,
    selected,
    selectedDate,
    selectedTimeRange,
  } = props;

  const { profile } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selId = selectedSlotId ?? selected?.slot_id ?? null;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedTimeRange?.start || !selectedTimeRange?.end) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch all slots including ownership info
        const { data: allSlots, error: slotsError } = await supabase
          .from('parking_slots')
          .select('slot_id, slot_number, slot_type, status, description, owner_id')
          .eq('status', 'available');

        if (slotsError) throw slotsError;

        // Check availability for each slot with proper error handling
        const slotsWithAvailability = await Promise.all(
          (allSlots || []).map(async (slot) => {
            try {
              const { data: conflicts, error: conflictsError } = await supabase
                .from('bookings')
                .select('booking_id')
                .eq('slot_id', slot.slot_id)
                .eq('status', 'confirmed')
                .or(`and(start_time.lt.${selectedTimeRange.end},end_time.gt.${selectedTimeRange.start})`);

              if (conflictsError) {
                console.error('Error checking slot availability:', conflictsError);
                return { ...slot, isAvailable: true };
              }

              const hasConflicts = conflicts && conflicts.length > 0;
              const isOwned = slot.owner_id === profile?.id;
              const isShared = !slot.owner_id;
              const isOwnedByOther = slot.owner_id && slot.owner_id !== profile?.id;

              return {
                ...slot,
                isAvailable: !hasConflicts,
                isOwned,
                isShared,
                canBook: !hasConflicts && (isOwned || isShared),
                isOwnedByOther
              };
            } catch (networkError) {
              console.error('Network error checking slot availability:', networkError);
              return { ...slot, isAvailable: true };
            }
          })
        );

        setSlots(slotsWithAvailability);
      } catch (err: any) {
        console.error('Error fetching slots:', err);
        setError(err.message || 'Failed to load slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedTimeRange?.start, selectedTimeRange?.end, profile?.id]);

  const getSlotStatusColor = (slot: any) => {
    if (!slot.isAvailable) {
      return "bg-gray-200 border-gray-300";
    }
    if (slot.isOwnedByOther) {
      return "bg-red-50 border-red-200";
    }
    if (selId !== null && selId === slot.slot_id) {
      return "bg-blue-100 border-blue-500 ring-2 ring-blue-300";
    }
    if (slot.isOwned) {
      return "bg-green-50 border-green-300 hover:border-green-500 hover:bg-green-100";
    }
    return "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50";
  };

  const getSlotBadge = (slot: any) => {
    if (slot.isOwned) {
      return { text: "Your Slot", className: "bg-blue-100 text-blue-800" };
    }
    if (slot.isOwnedByOther) {
      return { text: "Reserved", className: "bg-red-100 text-red-800" };
    }
    if (!slot.isAvailable) {
      return { text: "Booked", className: "bg-gray-300 text-gray-800" };
    }
    if (slot.slot_type === 'visitor') {
      return { text: "Visitor", className: "bg-purple-100 text-purple-800" };
    }
    return { text: "Available", className: "bg-green-100 text-green-800" };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <div className="text-gray-600">Loading parking slots...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (slots.length === 0) {
    return <div className="text-gray-600 text-center py-8">No available slots for the selected time</div>;
  }

  // Sort slots: owned first, then shared, then unavailable
  const sortedSlots = [...slots].sort((a: any, b: any) => {
    if (a.isOwned && !b.isOwned) return -1;
    if (!a.isOwned && b.isOwned) return 1;
    if (a.isShared && !b.isShared) return -1;
    if (!a.isShared && b.isShared) return 1;
    return 0;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Available Slots</h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span>Your Slots</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span>Shared</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedSlots.map((slot: any) => {
          const canBook = slot.canBook;
          const badge = getSlotBadge(slot);

          return (
            <button
              key={slot.slot_id}
              onClick={() =>
                canBook &&
                onSlotSelect({
                  slot_id: slot.slot_id,
                  slot_number: slot.slot_number,
                  slot_type: slot.slot_type,
                })
              }
              disabled={!canBook}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-100 transform ${getSlotStatusColor(
                slot
              )} ${canBook ? "hover:scale-[1.02] cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              aria-pressed={selId !== null && selId === slot.slot_id}
              aria-label={`${slot.slot_number ?? slot.slot_id} - ${slot.slot_type ?? ""} - ${badge.text}`}
            >
              <div className="text-sm font-semibold">{slot.slot_number ?? slot.slot_id}</div>
              <div className="text-xs text-gray-700 capitalize">{slot.slot_type ?? "—"}</div>

              <span className={`mt-2 inline-block px-2 py-0.5 text-xs rounded-full ${badge.className}`}>
                {badge.text}
              </span>
              
              {slot.description && (
                <div className="mt-1 text-xs text-gray-500 text-center">{slot.description}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


```

```typescript
// ./components/booking/TimeRangePicker.tsx

// components/TimeRangePicker.tsx - Select start/end times for booking
"use client";

import { useEffect, useState } from 'react';

export default function TimeRangePicker({ value, onChange }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('4'); // hours
  const [error, setError] = useState('');

  // Helper: calculate ISO start/end times and call onChange
  const updateTimeRange = (date, time, dur) => {
    if (!date || !time) return;

    try {
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + parseFloat(dur) * 60 * 60 * 1000);

      const now = new Date();
      if (start <= now) throw new Error('Start time must be in the future');
      if (end <= start) throw new Error('End time must be after start time');

      setError('');
      onChange({
        start: start.toISOString(),
        end: end.toISOString(),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Update parent whenever any input changes
  useEffect(() => {
    updateTimeRange(startDate, startTime, duration);
  }, [startDate, startTime, duration]);

  // Default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="1">1 hour</option>
          <option value="2">2 hours</option>
          <option value="4">4 hours</option>
          <option value="8">8 hours</option>
          <option value="12">12 hours</option>
          <option value="24">24 hours</option>
        </select>
      </div>
    </div>
  );
}

```

```typescript
// ./components/booking/UserBookingsList.improved.tsx

// components/UserBookingsList.improved.tsx
// EXAMPLE: Refactored with non-blocking toast notifications
// Replace the original UserBookingsList.tsx with this after testing
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSlotIcon } from "@/lib/getSlotIcon";
import { useToast } from "@/components/common/ToastNotification";

export default function UserBookingsList({ userId }: { userId: string }) {
  const { showError, showSuccess, showWarning } = useToast();
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all bookings
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, slot_type)")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) {
        showError(`Failed to load bookings: ${error.message}`);
        setError(error.message);
        return;
      }

      const now = new Date();
      const active = [];
      const past = [];

      for (const booking of data || []) {
        if (booking.status === 'cancelled' ||
            booking.status === 'completed' ||
            new Date(booking.end_time) < now) {
          past.push(booking);
        } else if (booking.status === 'confirmed') {
          active.push(booking);
        }
      }

      setActiveBookings(active);
      setPastBookings(past);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      const errorMsg = err.message || "Failed to load bookings";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);

    try {
      const booking = activeBookings.find((b) => b.booking_id === bookingId);
      if (!booking) {
        showError("Booking not found");
        return;
      }

      const now = new Date();
      const bookingStart = new Date(booking.start_time);
      const graceHours = 1;
      const cutoffTime = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

      if (bookingStart < cutoffTime) {
        showWarning(
          `Cannot cancel bookings that started more than ${graceHours} hour(s) ago.`
        );
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .select();

      if (error) {
        showError(error.message || "Failed to cancel booking");
        return;
      }

      if (!data || data.length === 0) {
        showError("Booking not found or already cancelled");
        return;
      }

      showSuccess("Booking cancelled successfully");
      await fetchBookings(); // Refresh both lists

    } catch (err: any) {
      console.error("Cancel booking error:", err);
      showError(err.message || "An unexpected error occurred");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">
            Failed to load bookings
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const bookingsToShow = viewMode === 'active' ? activeBookings : pastBookings;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            History ({pastBookings.length})
          </button>
        </div>
        <button
          onClick={() => fetchBookings()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {bookingsToShow.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'active' ? 'No Active Bookings' : 'No Booking History'}
          </h3>
          <p className="text-gray-500">
            {viewMode === 'active'
              ? 'Your confirmed bookings will appear here'
              : 'Your past bookings will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsToShow.map((booking) => {
            const slotType = booking.parking_slots?.slot_type || "standard";
            const slotBgClass =
              slotType.toLowerCase() === "visitor"
                ? "bg-purple-100"
                : slotType.toLowerCase() === "covered"
                ? "bg-blue-100"
                : "bg-green-100";

            const statusColor =
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              booking.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800';

            return (
              <div
                key={booking.booking_id}
                className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                  viewMode === 'history' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div
                        className={`${slotBgClass} p-2 rounded-lg mr-3 flex-shrink-0`}
                      >
                        {getSlotIcon(slotType)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Slot{" "}
                          {booking.parking_slots?.slot_number || booking.slot_id}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {slotType} parking space
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h6m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0v11a2 2 0 002 2h2a2 2 0 002-2V7"
                            />
                          </svg>
                          <span className="font-medium text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Notes:{" "}
                        </span>
                        <span className="text-sm text-gray-600">
                          {booking.notes}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${statusColor}`}>
                        {booking.status}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Booking #{booking.booking_id}</span>
                    </div>
                  </div>

                  {viewMode === 'active' && booking.status === 'confirmed' && (
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => cancelBooking(booking.booking_id)}
                        disabled={cancelling === booking.booking_id}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === booking.booking_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div>
                            <span className="hidden sm:inline">Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="hidden sm:inline">Cancel</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/booking/UserBookingsList.tsx

// components/UserBookingsList.tsx - Enhanced with booking history
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSlotIcon } from "@/lib/getSlotIcon";

export default function UserBookingsList({ userId }: { userId: string }) {
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all bookings
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, slot_type)")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const active = [];
      const past = [];
      
      for (const booking of data || []) {
        if (booking.status === 'cancelled' || 
            booking.status === 'completed' || 
            new Date(booking.end_time) < now) {
          past.push(booking);
        } else if (booking.status === 'confirmed') {
          active.push(booking);
        }
      }
      
      setActiveBookings(active);
      setPastBookings(past);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const booking = activeBookings.find((b) => b.booking_id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const now = new Date();
      const bookingStart = new Date(booking.start_time);
      const graceHours = 1;
      const cutoffTime = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

      if (bookingStart < cutoffTime) {
        throw new Error(
          `Cannot cancel bookings that started more than ${graceHours} hour(s) ago.`
        );
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .select();

      if (error) throw new Error(error.message || "Database update failed");
      if (!data || data.length === 0)
        throw new Error("No booking found with that ID or update failed");

      await fetchBookings(); // Refresh both lists
    } catch (err: any) {
      alert("Failed to cancel booking: " + (err.message || String(err)));
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">
            Failed to load bookings
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const bookingsToShow = viewMode === 'active' ? activeBookings : pastBookings;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'history' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            History ({pastBookings.length})
          </button>
        </div>
        <button
          onClick={() => fetchBookings()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {bookingsToShow.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'active' ? 'No Active Bookings' : 'No Booking History'}
          </h3>
          <p className="text-gray-500">
            {viewMode === 'active' 
              ? 'Your confirmed bookings will appear here' 
              : 'Your past bookings will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsToShow.map((booking) => {
            const slotType = booking.parking_slots?.slot_type || "standard";
            const slotBgClass =
              slotType.toLowerCase() === "visitor"
                ? "bg-purple-100"
                : slotType.toLowerCase() === "covered"
                ? "bg-blue-100"
                : "bg-green-100";

            const statusColor = 
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              booking.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800';

            return (
              <div
                key={booking.booking_id}
                className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                  viewMode === 'history' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div
                        className={`${slotBgClass} p-2 rounded-lg mr-3 flex-shrink-0`}
                      >
                        {getSlotIcon(slotType)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Slot{" "}
                          {booking.parking_slots?.slot_number || booking.slot_id}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {slotType} parking space
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h6m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0v11a2 2 0 002 2h2a2 2 0 002-2V7"
                            />
                          </svg>
                          <span className="font-medium text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Notes:{" "}
                        </span>
                        <span className="text-sm text-gray-600">
                          {booking.notes}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${statusColor}`}>
                        {booking.status}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Booking #{booking.booking_id}</span>
                    </div>
                  </div>

                  {viewMode === 'active' && booking.status === 'confirmed' && (
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => cancelBooking(booking.booking_id)}
                        disabled={cancelling === booking.booking_id}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === booking.booking_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div>
                            <span className="hidden sm:inline">Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="hidden sm:inline">Cancel</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/common/ErrorDisplay.tsx

// components/ErrorDisplay.tsx
// Reusable error display component
"use client";

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({ error, onRetry, className = "" }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <div className="flex-1">
          <strong className="text-red-800">Error:</strong>
          <p className="text-red-700 mt-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Success message component as a bonus
interface SuccessMessageProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({ message, onDismiss, className = "" }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <div className="flex-1">
          <p className="text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./components/common/Navigation.tsx

// components/common/Navigation.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthWrapper';
import { useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-bold text-xl text-gray-900">ParkBoard</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link 
              href="/dashboard" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link 
              href="/bookings/new" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Book Slot
            </Link>
            <Link 
              href="/bookings" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              My Bookings
            </Link>
            {/* <Link 
              href="/donations" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Donations
            </Link> */}
            {profile?.role === 'admin' && (
              <>
                <Link 
                  href="/admin" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                >
                  Admin
                </Link>
                <Link 
                  href="/admin/slots" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Manage Slots
                </Link>
                <Link 
                  href="/admin/users" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Manage Users
                </Link>
              </>
            )}
            
            {/* User info and sign out */}
            {profile && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{profile.name}</div>
                  <div className="text-gray-500">Unit {profile.unit_number}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {!menuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {profile && (
              <div className="px-3 py-2 mb-2 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                <div className="text-xs text-gray-500">Unit {profile.unit_number}</div>
              </div>
            )}
            
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/bookings/new"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Book a Slot
            </Link>
            <Link
              href="/bookings"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              My Bookings
            </Link>
            {/* <Link
              href="/donations"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Donations
            </Link> */}
            {profile?.role === 'admin' && (
              <>
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin Dashboard
                </Link>
                <Link
                  href="/admin/slots"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Manage Slots
                </Link>
                <Link
                  href="/admin/users"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Manage Users
                </Link>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

```typescript
// ./components/common/ToastNotification.tsx

// components/common/ToastNotification.tsx
// Non-blocking toast notification system
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// TOAST PROVIDER COMPONENT
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000, // Default 5 seconds
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Keep only the latest N toasts
      return updated.slice(-maxToasts);
    });

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, [maxToasts, dismissToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title: title || 'Error', duration: 7000 });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title: title || 'Success', duration: 4000 });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title: title || 'Warning', duration: 5000 });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title: title || 'Info', duration: 4000 });
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    dismissToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER COMPONENT
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { type, title, message, action, id } = toast;

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-800',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      iconPath: 'M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} border ${style.border} rounded-lg p-4 shadow-lg pointer-events-auto animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={style.iconPath}
          />
        </svg>

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold ${style.text} mb-1`}>{title}</h4>
          )}
          <p className={`text-sm ${style.text}`}>{message}</p>

          {action && (
            <button
              onClick={() => {
                action.onClick();
                onDismiss(id);
              }}
              className={`mt-2 text-sm font-medium ${style.text} underline hover:no-underline`}
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(id)}
          className={`${style.icon} hover:opacity-70 flex-shrink-0`}
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Add animation to globals.css:
// @keyframes slide-in-right {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
// .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
```

```typescript
// ./components/dashboard/MySlots.tsx

// =====================================================
// File: components/dashboard/MySlots.tsx
// Component to show user's owned slots
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function MySlots() {
  const { profile } = useAuth();
  const [ownedSlots, setOwnedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySlots = async () => {
      if (!profile?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('owner_id', profile.id)
        .order('slot_number');
      
      if (!error) {
        setOwnedSlots(data || []);
      }
      setLoading(false);
    };
    
    fetchMySlots();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="animate-pulse bg-blue-50 rounded-lg p-4">
        <div className="h-4 bg-blue-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-blue-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (ownedSlots.length === 0) {
    return null; // Don't show anything if user has no owned slots
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Your Assigned Parking Slots
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ownedSlots.map(slot => (
          <div key={slot.slot_id} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">
                  Slot {slot.slot_number}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {slot.slot_type} parking
                </div>
                {slot.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {slot.description}
                  </div>
                )}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                slot.status === 'available' 
                  ? 'bg-green-100 text-green-800'
                  : slot.status === 'maintenance'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {slot.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        💡 You can book your assigned slots anytime they're available
      </div>
    </div>
  );
}


```

```typescript
// ./components/ErrorBoundary.tsx

// =====================================================
// File: components/ErrorBoundary.tsx
// React Error Boundary for crash protection
// =====================================================
"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // You could send error to logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


```

```typescript
// ./components/owner/MySlotCard.tsx

// components/owner/MySlotCard.tsx
"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MySlotCardProps {
  slot: any;
  onUpdate: () => void;
}

export default function MySlotCard({ slot, onUpdate }: MySlotCardProps) {
  const [isListed, setIsListed] = useState(slot.is_listed_for_rent);

  const toggleListing = async () => {
    const newStatus = !isListed;

    const { error } = await supabase
      .from('parking_slots')
      .update({ is_listed_for_rent: newStatus })
      .eq('slot_id', slot.slot_id);

    if (!error) {
      setIsListed(newStatus);
      onUpdate();
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{slot.slot_number}</h3>
          <p className="text-sm text-gray-600">{slot.slot_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isListed
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isListed ? '🟢 Listed' : '⚫ Not Listed'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Hourly Rate:</span>
          <span className="font-medium">₱{slot.rental_rate_hourly}/hr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Daily Rate:</span>
          <span className="font-medium">₱{slot.rental_rate_daily}/day</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleListing}
          className={`flex-1 px-4 py-2 rounded-lg font-medium ${
            isListed
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isListed ? 'Unlist' : 'List for Rent'}
        </button>
        <button
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Details
        </button>
      </div>
    </div>
  );
}

```

```typescript
// ./components/ui/alert.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

```

```typescript
// ./components/ui/badge.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

```typescript
// ./components/ui/button.tsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

```typescript
// ./components/ui/card.tsx

import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

```typescript
// ./components/ui/input.tsx

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

```typescript
// ./components/ui/tabs.tsx

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

```typescript
// ./components/UserDashboard.tsx

// =====================================================
// File: components/UserDashboard.tsx
// Main resident view with bookings and new booking flow
// Updated with MySlots component
// =====================================================
"use client";

import { useState, useRef } from 'react';
import UserBookingsList from '@/components/booking/UserBookingsList';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import MySlots from '@/components/dashboard/MySlots';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-2">No profile found</p>
          <p className="text-sm text-gray-600">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setBookingConfirmed(null);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back, {profile.name}!
        </h1>
        <p className="text-gray-600">Unit {profile.unit_number}</p>
      </div>

      {/* Show owned slots if user has any */}
      <MySlots />

      {/* Tab navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'bookings' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'new' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('new')}
        >
          New Booking
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'bookings' && (
          <UserBookingsList userId={profile.id || ''} key={refreshKey} />
        )}

        {activeTab === 'new' && !bookingConfirmed && (
          <BookingForm
            onSuccess={setBookingConfirmed}
          />
        )}

        {bookingConfirmed && (
          <BookingConfirmation
            booking={bookingConfirmed}
            onDone={() => {
              setBookingConfirmed(null);
              setActiveTab('bookings');
            }}
            refreshBookings={triggerRefresh}
          />
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./lib/getSlotIcon.tsx

// lib/getSlotIcon.tsx
export const getSlotIcon = (slotType: string) => {
  switch (slotType?.toLowerCase()) {
    case 'covered':
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'visitor':
      return (
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
  }
};

```

```typescript
// ./lib/supabaseServer.ts

// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      get: (name: string) => nextCookies().get(name)?.value ?? null,
      set: (name: string, value: string) => nextCookies().set(name, value),
      remove: (name: string) => nextCookies().delete(name),
    },
  });
}

```

```typescript
// ./lib/utils.ts

// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Configuration

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "strictNullChecks": true,
    
    // <-- Add these
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "_deprecated",
    "_archived",
    "**/*.backup.*"
  ]
}

```

```json
// components.json

{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

```markdown
// CLAUDE.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ParkBoard** is a parking slot booking system for residential condominiums, built as an MVP using Next.js 15, Supabase (PostgreSQL), and TypeScript. It follows a hotel-booking pattern with users, parking slots, and bookings, featuring a mixed ownership model (owned + shared slots).

**Current Status**: MVP 1.1 - Production Ready

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server at http://localhost:3000
npm run build           # Production build
npm start               # Start production server
```

### Testing
```bash
npm test                # Run Jest unit tests
npm run test:e2e        # Run Playwright e2e tests
npm run type-check      # TypeScript type checking without emit
```

### Linting
```bash
npm run lint            # Run Next.js linter
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Backend**: Next.js API routes (server-side)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (extends `auth.users`)

### Critical Directory Structure
```
app/
├── api/                    # Server-side API routes
│   ├── bookings/          # Booking CRUD with overlap checking
│   ├── slots/             # Slot management (admin only)
│   ├── profiles/          # User profile management
│   └── payments/          # Payment handling (future)
├── admin/                 # Admin dashboard and management pages
├── bookings/              # User booking pages
├── dashboard/             # User dashboard
├── login/                 # Auth pages
└── reset-password/        # Password reset flow

components/
├── auth/                  # AuthWrapper (context provider), auth forms
├── booking/               # BookingForm, SlotGrid, TimeRangePicker
├── common/                # Navigation, ErrorDisplay, shared components
├── admin/                 # Admin-specific components
├── dashboard/             # Dashboard components
└── ui/                    # shadcn/ui primitives (Button, Card, etc.)

lib/
├── supabase.ts           # Client-side Supabase client (anon key)
├── supabaseServer.ts     # Server-side Supabase client (service role)
├── constants.ts          # Business rules (BOOKING_RULES, etc.)
└── utils.ts              # Utility functions

db/
├── schema.sql            # Canonical schema (v3 unified with ownership)
├── rls_policies.sql      # Row Level Security policies
├── migrations/           # Schema migration scripts
└── useful_queries.sql    # Common queries for debugging
```

### Database Schema (Core Tables)

**`user_profiles`** (extends `auth.users`)
- Primary Key: `id` (uuid, FK to `auth.users`)
- Fields: `name`, `unit_number`, `email`, `phone`, `vehicle_plate`, `role` ('resident' | 'admin')
- **Important**: NEVER modify `auth.users` directly - always use `user_profiles`

**`parking_slots`**
- Primary Key: `slot_id` (serial)
- Unique: `slot_number`
- Fields: `slot_type` ('covered' | 'uncovered' | 'visitor'), `status` ('available' | 'maintenance' | 'reserved')
- **Ownership**: `owner_id` (uuid, nullable) - NULL means shared/visitor slot
- Owned slots can only be booked by the owner; shared slots (owner_id IS NULL) can be booked by anyone

**`bookings`**
- Primary Key: `booking_id` (serial)
- Foreign Keys: `user_id` (auth.users), `slot_id` (parking_slots)
- Fields: `start_time`, `end_time` (TIMESTAMPTZ in UTC), `status` ('confirmed' | 'cancelled' | 'completed' | 'no_show'), `notes`
- **Constraints**: Overlap checking enforced at API level, not database level

**`payments`** (optional, for future use)
- Links to bookings for payment tracking

### Authentication & Authorization Flow

1. **Client-side Auth**: `AuthWrapper.tsx` provides React Context with `user`, `profile`, `loading`, `sessionError`
2. **Session Management**: Periodic session checks (5 min interval), automatic refresh
3. **API Authentication**: API routes use either:
   - Anon key (client operations with RLS)
   - Service role key (server operations bypassing RLS for validation)
4. **RLS Policies**: Enforce data access at database level
   - Users see only their own data
   - Admins have broader SELECT/UPDATE access
   - Ownership rules enforced in booking INSERT policy

### Business Rules (Frozen for 30 Days - See `parkboard_mvp_plan.md`)

**Booking Constraints** (defined in `lib/constants.ts`):
```typescript
BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
}
```

**Validation Layer**:
- **Client-side**: `BookingForm.tsx` validates before API call
- **Server-side**: `/api/bookings` route validates and enforces overlap checking
- Always mirror server-side validation logic when updating UI

**Slot Ownership Rules**:
- Users can only book slots they own (`owner_id = user_id`) OR shared slots (`owner_id IS NULL`)
- Enforced at RLS level and validated in `/api/bookings` route
- UI displays "Your Slot" badge for owned slots in `SlotGrid.tsx`

### Common Workflows

#### Creating/Updating a Booking
1. User selects time range in `TimeRangePicker.tsx`
2. `SlotGrid.tsx` queries available slots (filters by availability + ownership)
3. User selects slot, `BookingForm.tsx` validates rules
4. POST to `/api/bookings` with overlap checking
5. Server validates ownership, checks conflicts, inserts booking

#### Admin Operations
- Admin routes in `app/admin/` require `role = 'admin'` check
- Use `AdminDashboardContent.tsx` as reference for admin data fetching
- Admin operations bypass some RLS policies but should respect business rules

### Important Files to Read First

When working on a feature, start with these:

**Database/Schema**:
- `db/schema.sql` - Canonical schema
- `db/rls_policies.sql` - Security policies
- `db/useful_queries.sql` - Debugging queries

**API Layer**:
- `app/api/bookings/route.ts` - Booking logic with validation
- `app/api/slots/route.ts` - Slot management
- `app/api/profiles/route.ts` - Profile CRUD

**Core Components**:
- `components/auth/AuthWrapper.tsx` - Auth context provider
- `components/booking/BookingForm.tsx` - Booking creation flow
- `components/booking/SlotGrid.tsx` - Slot selection with ownership display
- `app/admin/AdminDashboardContent.tsx` - Admin data fetching patterns

### Critical Patterns & Conventions

#### Supabase Client Usage
```typescript
// Client-side (with RLS)
import { supabase } from '@/lib/supabase'; // Uses NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side (bypasses RLS - use cautiously)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Rule**: Use service role key ONLY in API routes for validation logic. Never expose it to client.

#### Timezone Handling
- Database stores all timestamps as `TIMESTAMPTZ` (UTC)
- Convert to local timezone ONLY when rendering in UI
- API routes work with ISO 8601 strings

#### Component Reuse
- **Extend existing components** rather than duplicating
- Key reusable components: `AuthWrapper`, `Navigation`, `ErrorDisplay`, `BookingForm`, `SlotGrid`
- shadcn/ui components in `components/ui/` are customizable

#### Path Aliases
```typescript
import { supabase } from '@/lib/supabase';  // '@/' resolves to project root
import { useAuth } from '@/components/auth/AuthWrapper';
```

### Pitfalls & Guardrails

1. **DO NOT modify `auth.users` directly** - Use `user_profiles` table
2. **RLS is the security boundary** - Do not bypass in client code
3. **Service role key = trusted code only** - Already used in some API routes; follow existing patterns
4. **Business rules are frozen for 30 days** - Do not change schema or booking constraints without explicit approval
5. **Overlap checking is server-side** - Trust the API, not the UI state
6. **Type safety**: TypeScript `strict: false` in config, but use types where possible
7. **Keep changes small and reversible** - Prefer adding helpers over large refactors during MVP phase

### Testing Approach

- **Unit Tests**: Use Jest for component logic (`tests/unit/`)
- **E2E Tests**: Use Playwright for critical flows (`tests/e2e.spec.ts`)
- **Manual Testing**: Follow `docs/merged_qa_checklist.md` for comprehensive QA
- **Test Data**: Use `db/fixed_development_seed.sql` for consistent test data

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

### Common Debugging Queries

See `db/useful_queries.sql` for examples:
- View all bookings with slot details
- Check slot ownership
- Identify booking conflicts
- Audit user roles

### Additional Context

- **Mobile Responsive**: All UI components are mobile-first (Tailwind breakpoints)
- **Error Handling**: Use `ErrorDisplay` component for consistent error messages
- **Loading States**: Always show loading indicators during async operations
- **Success Feedback**: Use `SuccessMessage` component after mutations

### When Making Changes

1. **Read the existing code first** - Understand patterns before implementing
2. **Check business rules** - Refer to `lib/constants.ts` and `parkboard_mvp_plan.md`
3. **Test both client and server** - Validation must match on both sides
4. **Verify RLS policies** - Ensure changes don't bypass security
5. **Update types** - Keep TypeScript definitions in sync
6. **Keep it minimal** - MVP phase prioritizes working code over perfect code

### Support & Documentation

- **Planning Docs**: `docs/parkboard_mvp_plan.md`, `docs/businessflows.md`
- **QA Checklist**: `docs/merged_qa_checklist.md`
- **ERD**: `docs/ERD.md`
- **Progress Tracking**: `docs/progress.md`
```

## Environment Variables

```bash
// Environment variables (values redacted)

NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
SUPABASE_ANON_KEY=***REDACTED***

```

## Dependencies

```json
// package.json

{
  "name": "parkboard",
  "version": "1.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.39.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.303.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.3.0"
  }
}

```


---

## Context Summary

**Generated:** Thursday, 02 October, 2025 09:03:36 AM PST
**Size:** 364K

### Included:
- ✅ Complete database schema + critical migrations
- ✅ All core application code (app, components, lib)
- ✅ Essential configuration files
- ✅ Business logic and API routes
- ✅ Viber migration features

### Optimizations for Claude:
- 🚫 No test files
- 🚫 No build artifacts
- 🚫 No verbose documentation
- 🚫 No backup/deprecated files
- ✅ Only production source code

**This snapshot contains everything needed to understand and modify the ParkBoard codebase.**

