-- ============================================================================
-- SEED TEST DATA FOR MINIMAL MVP BETA TESTING
-- ============================================================================
-- Purpose: Create test users and parking slots for local database testing
-- Database: parkboard_db (local PostgreSQL)
-- Run with: PGPASSWORD=mannersmakethman psql -U ltpt420 -h localhost -d parkboard_db -f scripts/seed-test-data.sql
--
-- IDEMPOTENT: YES - Safe to run multiple times
-- This script can be executed 3+ times without errors or duplicate data
-- Approach: DELETE old test data before INSERT, use ON CONFLICT for safety
--
-- Test UUIDs (preserved for consistency):
-- Users: 11111111-*, 22222222-*, 33333333-*, 44444444-*
-- Slots: aaaaaaaa-*, bbbbbbbb-*, cccccccc-*, dddddddd-*, eeeeeeee-*, ffffffff-*
-- ============================================================================

BEGIN;

-- Clean existing test data (makes script idempotent)
DELETE FROM parking_slots WHERE notes LIKE '%TEST DATA%';
DELETE FROM users WHERE email LIKE '%@test.local';

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================
-- Note: These users won't have Supabase auth sessions, but can be used for
-- database testing and to populate owner_id fields

INSERT INTO users (id, name, email, unit_number, contact_phone, created_at, updated_at)
VALUES
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Maria Santos',
    'maria.santos@test.local',
    '10A',
    '+63 917 123 4567',
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Juan dela Cruz',
    'juan.delacruz@test.local',
    '15B',
    '+63 917 234 5678',
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Elena Rodriguez',
    'elena.rodriguez@test.local',
    '20C',
    '+63 917 345 6789',
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444'::uuid,
    'Ben Alvarez',
    'ben.alvarez@test.local',
    '12D',
    '+63 917 456 7890',
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  unit_number = EXCLUDED.unit_number,
  contact_phone = EXCLUDED.contact_phone,
  updated_at = NOW();

-- ============================================================================
-- CREATE TEST PARKING SLOTS
-- ============================================================================

-- Slot 1: Maria's slot (P1 East Tower, available today)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'P1',
  'East Tower',
  'Near elevator, left side',
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '10 hours',
  'available',
  'Going out for the day. Call me 30 min before arriving. TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  updated_at = NOW();

-- Slot 2: Juan's slot (P2 North Tower, available tomorrow)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'P2',
  'North Tower',
  'Corner spot, easy access',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 8 hours',
  'available',
  'Weekend trip. FREE for neighbors! Just message me first. TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  updated_at = NOW();

-- Slot 3: Elena's slot (P3 West Tower, available this evening)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'P3',
  'West Tower',
  'Near security office',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '12 hours',
  'available',
  'Night shift at hospital. Slot free 6pm-6am. Viber me first! TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  updated_at = NOW();

-- Slot 4: Ben's slot (P4 East Tower, available next week)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  'P4',
  'East Tower',
  NULL,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '14 days',
  'available',
  'Vacation in Boracay! Slot available for 1 week. TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  updated_at = NOW();

-- Slot 5: Maria's second slot (P1 East Tower, TAKEN - for testing status filter)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'P1',
  'East Tower',
  'Right side, near stairs',
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '6 hours',
  'taken',
  'Already taken by neighbor in 11B. TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Slot 6: Juan's expired slot (for testing expired status)
INSERT INTO parking_slots (
  id,
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'P2',
  'North Tower',
  'Near gym',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  'expired',
  'This was available yesterday. TEST DATA',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  status = EXCLUDED.status,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count test users
SELECT COUNT(*) as test_users FROM users WHERE email LIKE '%@test.local';

-- Count test slots by status
SELECT status, COUNT(*) as count
FROM parking_slots
WHERE notes LIKE '%TEST DATA%'
GROUP BY status
ORDER BY status;

-- Show available slots (what users will see)
SELECT
  ps.location_level,
  ps.location_tower,
  ps.location_landmark,
  ps.available_from,
  ps.available_until,
  ps.notes,
  u.name as owner_name,
  u.contact_phone as owner_phone
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.status = 'available'
  AND ps.notes LIKE '%TEST DATA%'
ORDER BY ps.available_from;

-- ============================================================================
-- CLEANUP SCRIPT (run separately to remove test data)
-- ============================================================================
-- DELETE FROM parking_slots WHERE notes LIKE '%TEST DATA%';
-- DELETE FROM users WHERE email LIKE '%@test.local';
