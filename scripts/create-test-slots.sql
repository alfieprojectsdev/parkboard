-- ============================================================================
-- CREATE TEST PARKING SLOTS
-- ============================================================================
-- Run this in Supabase SQL Editor to create test parking slots
-- Prerequisites: Test users must exist (run npm run stress:data first)
--
-- This will create 10 test parking slots owned by user1@parkboard.test
-- All slots are assigned to LMR (Lumiere) community
-- ============================================================================

DO $$
DECLARE
  owner_user_id UUID;
BEGIN
  -- Get user1's ID
  SELECT id INTO owner_user_id
  FROM auth.users
  WHERE email = 'user1@parkboard.test'
  LIMIT 1;

  -- Check if user exists
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'User user1@parkboard.test not found. Run test data generation first.';
  END IF;

  -- Delete existing test slots for user1 (idempotent)
  DELETE FROM parking_slots
  WHERE owner_id = owner_user_id
    AND slot_number IN ('A-101', 'A-102', 'A-103', 'B-201', 'B-202', 'B-203', 'C-301', 'C-302', 'D-401', 'D-402');

  -- Insert 10 parking slots (multi-tenant: all in LMR community)
  INSERT INTO parking_slots (
    owner_id,
    slot_number,
    slot_type,
    description,
    price_per_hour,
    status,
    community_code
  ) VALUES
    (owner_user_id, 'A-101', 'covered', 'Near main entrance, well-lit', 50, 'active', 'LMR'),
    (owner_user_id, 'A-102', 'covered', 'Covered parking, close to elevator', 55, 'active', 'LMR'),
    (owner_user_id, 'A-103', 'covered', 'Premium spot with EV charging', 75, 'active', 'LMR'),
    (owner_user_id, 'B-201', 'uncovered', 'Open parking, spacious', 40, 'active', 'LMR'),
    (owner_user_id, 'B-202', 'uncovered', 'Ground floor, easy access', 35, 'active', 'LMR'),
    (owner_user_id, 'B-203', 'uncovered', 'Near exit, convenient', 38, 'active', 'LMR'),
    (owner_user_id, 'C-301', 'covered', 'VIP parking with security', 80, 'active', 'LMR'),
    (owner_user_id, 'C-302', 'covered', 'Basement level, climate controlled', 60, 'active', 'LMR'),
    (owner_user_id, 'D-401', 'uncovered', 'Rooftop parking, panoramic view', 45, 'active', 'LMR'),
    (owner_user_id, 'D-402', 'tandem', 'Tandem parking for compact cars', 30, 'active', 'LMR');

  RAISE NOTICE 'Successfully created 10 parking slots for user1@parkboard.test in LMR community';
END $$;

-- Verify slots were created
SELECT slot_id, slot_number, slot_type, price_per_hour, community_code, status
FROM parking_slots
WHERE community_code = 'LMR'
ORDER BY slot_number;
