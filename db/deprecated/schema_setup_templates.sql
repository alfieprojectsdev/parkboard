-- =============================================================================
-- ParkBoard MVP Schema Setup for Supabase
-- Day 1: Database Setup Templates
-- =============================================================================

-- =============================================================================
-- FILE 1: schema_v2.sql (Main Schema Creation)
-- Run this in Supabase SQL Editor first
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
-- PARKING SLOTS TABLE
-- =============================================================================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
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

-- =============================================================================
-- FILE 2: rls_policies.sql (Row Level Security - MVP Safe)
-- Run this after schema_v2.sql
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- Note: parking_slots and payments can stay public for MVP

-- =============================================================================
-- User Profiles Policies
-- =============================================================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (id = auth.uid());

-- Only service role can insert new profiles (admin managed onboarding)
CREATE POLICY "Service role can insert profiles" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
    ON user_profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =============================================================================
-- Bookings Policies
-- =============================================================================
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" 
    ON bookings FOR SELECT 
    USING (user_id = auth.uid());

-- Users can insert their own bookings
CREATE POLICY "Users can create own bookings" 
    ON bookings FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Users can update their own bookings (for cancellation)
CREATE POLICY "Users can update own bookings" 
    ON bookings FOR UPDATE 
    USING (user_id = auth.uid());

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" 
    ON bookings FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Admins can update any booking
CREATE POLICY "Admins can update any booking" 
    ON bookings FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =============================================================================
-- FILE 3: seed_data.sql (Test Data for Development)
-- Run this after RLS policies
-- =============================================================================

-- =============================================================================
-- Parking Slots Seed Data
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, description) VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- =============================================================================
-- Sample User Profiles (Insert via Supabase Auth first, then update here)
-- NOTE: You'll need to create auth.users entries first via Supabase Auth UI
-- Then run these INSERTs with the actual UUIDs
-- =============================================================================
-- Example structure (replace with actual UUIDs after auth signup):
/*
INSERT INTO user_profiles (id, name, unit_number, email, role) VALUES
('UUID-FROM-AUTH-SIGNUP-1', 'Alice Santos', 'A-101', 'alice@example.com', 'resident'),
('UUID-FROM-AUTH-SIGNUP-2', 'Bob Reyes', 'B-202', 'bob@example.com', 'resident'),  
('UUID-FROM-AUTH-SIGNUP-3', 'Admin User', 'MGMT', 'admin@example.com', 'admin');
*/

-- =============================================================================
-- FILE 4: wipe_and_reset.sql (Development Reset Script)
-- Use this when you need to completely reset your dev database
-- =============================================================================

-- WARNING: This deletes all data. Use only in development!

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Drop tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- Now re-run schema_v2.sql and rls_policies.sql

-- =============================================================================
-- FILE 5: useful_queries.sql (Development Helper Queries)
-- =============================================================================

-- Check available slots for a time period
SELECT ps.slot_number, ps.slot_type, ps.status
FROM parking_slots ps
WHERE ps.status = 'available'
AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.slot_id = ps.slot_id 
    AND b.status = 'confirmed'
    AND b.start_time < '2025-01-15 18:00:00'  -- replace with end time
    AND b.end_time > '2025-01-15 08:00:00'    -- replace with start time
);

-- Get user's current bookings
SELECT b.booking_id, ps.slot_number, b.start_time, b.end_time, b.status
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.user_id = 'USER-UUID-HERE'
AND b.status IN ('confirmed')
ORDER BY b.start_time;

-- Admin view: All bookings for today
SELECT 
    up.name, 
    up.unit_number,
    ps.slot_number, 
    b.start_time, 
    b.end_time, 
    b.status
FROM bookings b
JOIN user_profiles up ON b.user_id = up.id
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE DATE(b.start_time) = CURRENT_DATE
ORDER BY b.start_time;

-- Check for booking conflicts (useful for validation)
SELECT 
    b1.booking_id as booking1,
    b2.booking_id as booking2,
    b1.slot_id,
    b1.start_time, b1.end_time,
    b2.start_time, b2.end_time
FROM bookings b1
JOIN bookings b2 ON b1.slot_id = b2.slot_id 
WHERE b1.booking_id != b2.booking_id
AND b1.status = 'confirmed' 
AND b2.status = 'confirmed'
AND b1.start_time < b2.end_time 
AND b1.end_time > b2.start_time;