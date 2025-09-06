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
