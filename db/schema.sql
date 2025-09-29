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
  );