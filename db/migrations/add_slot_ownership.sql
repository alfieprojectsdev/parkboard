-- // =====================================================
-- // DATABASE MIGRATION - Run this first in Supabase SQL Editor
-- // File: db/migrations/add_slot_ownership.sql
-- // =====================================================

-- Add owner_id column to parking_slots
ALTER TABLE parking_slots
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id);

-- Update RLS policies for ownership-aware booking
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;

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

-- Update viewing policy to show ownership info
DROP POLICY IF EXISTS "Anyone logged in can view slots" ON parking_slots;

CREATE POLICY "Users can view all slots with ownership info"
  ON parking_slots FOR SELECT
  USING (true);  -- Everyone can see all slots, but owner_id shows ownership