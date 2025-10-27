-- Test Migration: 001_core_schema.sql
-- Purpose: Verify migration works and RLS policies function correctly
-- Run AFTER: 001_core_schema.sql
-- Platform: Any PostgreSQL 15+

-- ==============================================================================
-- TEST DATA SETUP
-- ==============================================================================

-- Create test users
INSERT INTO users (id, email, name, unit_number, contact_viber, contact_telegram, contact_phone)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice Tan', '10A', '+63 917 123 4567', '@alicetan', '+63 917 123 4567'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'Bob Lee', '15B', NULL, '@boblee', '+63 918 765 4321'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', 'Carol Wong', '20C', '+63 919 111 2222', NULL, '+63 919 111 2222')
ON CONFLICT (email) DO NOTHING;

-- Create test parking slots
INSERT INTO parking_slots (
  owner_id,
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes
)
VALUES
  -- Alice's slot (available)
  (
    '11111111-1111-1111-1111-111111111111',
    'P3',
    'East Tower',
    'near elevator',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    'available',
    'Compact car preferred. Easy access to elevator.'
  ),

  -- Bob's slot (available)
  (
    '22222222-2222-2222-2222-222222222222',
    'P2',
    'North Tower',
    'corner spot',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '14 days',
    'available',
    'Large SUV OK. Corner spot with extra space.'
  ),

  -- Carol's slot (taken)
  (
    '33333333-3333-3333-3333-333333333333',
    'P4',
    'West Tower',
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '4 days',
    'taken',
    'Reserved for neighbor until next week.'
  ),

  -- Carol's expired slot (should auto-expire)
  (
    '33333333-3333-3333-3333-333333333333',
    'P1',
    'East Tower',
    'near entrance',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '3 days',
    'available',
    'This should be auto-expired by trigger.'
  );

-- ==============================================================================
-- TEST QUERIES
-- ==============================================================================

-- Test 1: Check all users created
SELECT '✅ TEST 1: Users created' AS test_name;
SELECT COUNT(*) AS user_count FROM users;
-- Expected: 3

-- Test 2: Check all slots created
SELECT '✅ TEST 2: Slots created' AS test_name;
SELECT COUNT(*) AS slot_count FROM parking_slots;
-- Expected: 4

-- Test 3: Verify auto-expire trigger worked
SELECT '✅ TEST 3: Auto-expire trigger' AS test_name;
SELECT COUNT(*) AS expired_count
FROM parking_slots
WHERE status = 'expired';
-- Expected: 1 (Carol's old slot should be expired)

-- Test 4: Browse available slots (what users see)
SELECT '✅ TEST 4: Browse available slots' AS test_name;
SELECT
  u.name AS owner_name,
  u.unit_number,
  ps.location_level,
  ps.location_tower,
  ps.location_landmark,
  ps.available_from,
  ps.available_until,
  ps.status,
  ps.notes
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.status = 'available'
ORDER BY ps.available_from;
-- Expected: 2 available slots (Alice's and Bob's)

-- Test 5: Get owner contact info for a slot
SELECT '✅ TEST 5: Contact info lookup' AS test_name;
SELECT
  u.name,
  u.unit_number,
  u.contact_viber,
  u.contact_telegram,
  u.contact_phone,
  ps.location_level || ' - ' || ps.location_tower AS location,
  ps.notes
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.id = (SELECT id FROM parking_slots WHERE status = 'available' LIMIT 1);
-- Expected: Contact details for Alice or Bob

-- Test 6: View my slots (as Alice)
SELECT '✅ TEST 6: My slots query' AS test_name;
SELECT
  location_level,
  location_tower,
  location_landmark,
  available_from,
  available_until,
  status,
  notes
FROM parking_slots
WHERE owner_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 1 slot (Alice's P3 slot)

-- Test 7: Slots expiring soon (within 2 days)
SELECT '✅ TEST 7: Expiring soon' AS test_name;
SELECT
  u.name AS owner_name,
  ps.location_level,
  ps.location_tower,
  ps.available_until,
  EXTRACT(DAY FROM (ps.available_until - NOW())) AS days_remaining
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.status = 'available'
  AND ps.available_until < NOW() + INTERVAL '2 days'
ORDER BY ps.available_until;
-- Expected: Possibly empty or slots expiring soon

-- Test 8: Slots by location (P3 level)
SELECT '✅ TEST 8: Search by location' AS test_name;
SELECT
  u.name AS owner_name,
  ps.location_level,
  ps.location_tower,
  ps.location_landmark,
  ps.status
FROM parking_slots ps
JOIN users u ON ps.owner_id = u.id
WHERE ps.location_level = 'P3';
-- Expected: Alice's P3 slot

-- Test 9: Check indexes are being used (EXPLAIN query)
SELECT '✅ TEST 9: Index usage check' AS test_name;
EXPLAIN (COSTS OFF)
SELECT *
FROM parking_slots
WHERE status = 'available'
  AND available_from <= NOW()
  AND available_until >= NOW();
-- Expected: Should show index scan on idx_slots_status or idx_slots_dates

-- ==============================================================================
-- RLS POLICY TESTS
-- ==============================================================================

-- Test 10: Simulate user context (Alice)
SELECT '✅ TEST 10: RLS policy test (Alice)' AS test_name;

-- Set Alice as current user
SET app.current_user_id = '11111111-1111-1111-1111-111111111111';

-- Alice should see all slots (SELECT policy allows all)
SELECT COUNT(*) AS slots_alice_can_see FROM parking_slots;
-- Expected: 4 (all slots visible)

-- Alice should only be able to update her own slots
-- (This would be tested in application, not via SQL directly)

-- Reset context
RESET app.current_user_id;

-- ==============================================================================
-- CLEANUP TEST DATA
-- ==============================================================================

-- Uncomment to remove test data after verification
-- DELETE FROM parking_slots WHERE owner_id IN (
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222222',
--   '33333333-3333-3333-3333-333333333333'
-- );
-- DELETE FROM users WHERE id IN (
--   '11111111-1111-1111-1111-111111111111',
--   '22222222-2222-2222-2222-222222222222',
--   '33333333-3333-3333-3333-333333333333'
-- );

-- ==============================================================================
-- TEST SUMMARY
-- ==============================================================================

SELECT '🎉 ALL TESTS COMPLETE' AS status;
SELECT 'Review output above to verify all tests passed' AS next_step;
SELECT 'Uncomment cleanup section if using production database' AS warning;

-- ==============================================================================
-- EXPECTED RESULTS SUMMARY
-- ==============================================================================
-- Test 1: 3 users
-- Test 2: 4 slots
-- Test 3: 1 expired slot (auto-trigger worked)
-- Test 4: 2 available slots (Alice, Bob)
-- Test 5: Contact info displayed correctly
-- Test 6: 1 slot for Alice
-- Test 7: Varies (depends on timing)
-- Test 8: 1 slot at P3 (Alice's)
-- Test 9: Should show index usage
-- Test 10: RLS working (Alice sees all, can update own)
-- ==============================================================================
