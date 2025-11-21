-- ============================================================================
-- SEED TEST DATA FOR NEON DATABASE
-- ============================================================================
-- Purpose: Create test users and parking slots for Neon database testing
-- Database: Neon PostgreSQL
-- Run with: psql "$NEON_CONNECTION_STRING" -f scripts/seed-test-data-neon.sql
--
-- IDEMPOTENT: YES - Safe to run multiple times
-- Uses ON CONFLICT for upserts
--
-- Test UUIDs (preserved for consistency):
-- Users: 11111111-*, 22222222-*, 33333333-*, 44444444-*
-- ============================================================================

BEGIN;

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================
-- Uses user_profiles table (Neon-compatible schema)

INSERT INTO user_profiles (id, name, email, phone, unit_number, created_at, updated_at)
VALUES
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Maria Santos',
    'maria.santos@test.local',
    '+63 917 123 4567',
    '10A',
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Juan dela Cruz',
    'juan.delacruz@test.local',
    '+63 917 234 5678',
    '15B',
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Elena Rodriguez',
    'elena.rodriguez@test.local',
    '+63 917 345 6789',
    '20C',
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444'::uuid,
    'Ben Alvarez',
    'ben.alvarez@test.local',
    '+63 917 456 7890',
    '12D',
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  unit_number = EXCLUDED.unit_number,
  updated_at = NOW();

-- ============================================================================
-- CREATE TEST PARKING SLOTS
-- ============================================================================
-- Uses parking_slots table (Neon-compatible schema)

-- Slot 1: Maria's covered slot (A-101)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  1,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'A-101',
  'covered',
  'Going out for the day. Call me 30 min before arriving. TEST DATA',
  50.00,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  price_per_hour = EXCLUDED.price_per_hour,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 2: Juan's uncovered slot (B-205)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  2,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'B-205',
  'uncovered',
  'Weekend trip. Available for neighbors! Just message me first. TEST DATA',
  35.00,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  price_per_hour = EXCLUDED.price_per_hour,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 3: Elena's tandem slot (C-301)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  3,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'C-301',
  'tandem',
  'Night shift at hospital. Slot free 6pm-6am. Viber me first! TEST DATA',
  40.00,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  price_per_hour = EXCLUDED.price_per_hour,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 4: Ben's covered slot (D-102)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  4,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'D-102',
  'covered',
  'Vacation in Boracay! Slot available for 1 week. TEST DATA',
  55.00,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  price_per_hour = EXCLUDED.price_per_hour,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 5: Maria's second slot - MAINTENANCE status (A-102)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  5,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'A-102',
  'covered',
  'Under maintenance - painting lines. TEST DATA',
  50.00,
  'maintenance',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 6: Juan's disabled slot (B-206)
INSERT INTO parking_slots (
  slot_id,
  owner_id,
  slot_number,
  slot_type,
  description,
  price_per_hour,
  status,
  created_at,
  updated_at
) VALUES (
  6,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'B-206',
  'uncovered',
  'Temporarily unavailable. TEST DATA',
  35.00,
  'disabled',
  NOW(),
  NOW()
)
ON CONFLICT (slot_number) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Reset the sequence for slot_id
SELECT setval('parking_slots_slot_id_seq', (SELECT MAX(slot_id) FROM parking_slots));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count test users
SELECT COUNT(*) as test_users FROM user_profiles WHERE email LIKE '%@test.local';

-- Count test slots by status
SELECT status, COUNT(*) as count
FROM parking_slots
WHERE description LIKE '%TEST DATA%'
GROUP BY status
ORDER BY status;

-- Show active slots (what users will see)
SELECT
  ps.slot_number,
  ps.slot_type,
  ps.price_per_hour,
  ps.description,
  up.name as owner_name,
  up.phone as owner_phone
FROM parking_slots ps
JOIN user_profiles up ON ps.owner_id = up.id
WHERE ps.status = 'active'
  AND ps.description LIKE '%TEST DATA%'
ORDER BY ps.slot_number;

-- ============================================================================
-- CLEANUP SCRIPT (run separately to remove test data)
-- ============================================================================
-- DELETE FROM bookings WHERE slot_id IN (SELECT slot_id FROM parking_slots WHERE description LIKE '%TEST DATA%');
-- DELETE FROM parking_slots WHERE description LIKE '%TEST DATA%';
-- DELETE FROM user_profiles WHERE email LIKE '%@test.local';
