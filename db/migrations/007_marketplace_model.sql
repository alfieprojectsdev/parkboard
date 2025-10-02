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