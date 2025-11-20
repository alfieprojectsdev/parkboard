-- ============================================================================
-- SEED 12 TEST USERS FOR BETA TESTING (IDEMPOTENT)
-- ============================================================================
-- Purpose: Create realistic test accounts for volunteer resident testers
-- Run after: 005_test_accounts_idempotent.sql
-- Date: 2025-11-19
-- ============================================================================

BEGIN;

-- Clean existing test users (idempotent)
DELETE FROM users WHERE is_test_account = true;

-- ============================================================================
-- INSERT 12 TEST USERS (REALISTIC LMR RESIDENT PROFILES)
-- ============================================================================

INSERT INTO users (
  id,
  email,
  name,
  unit_number,
  contact_viber,
  contact_telegram,
  contact_phone,
  is_test_account,
  test_account_in_use,
  community_code,
  created_at,
  updated_at
) VALUES
  -- Test User 1: Viber-primary user
  (
    '00000001-0000-0000-0000-000000000001'::uuid,
    'test01@parkboard.local',
    'Maria Santos',
    '10A',
    '+63 917 100 0001',
    NULL,
    '+63 917 100 0001',
    true,
    false,
    NULL,  -- Phase 4: Will become 'LMR'
    NOW(),
    NOW()
  ),

  -- Test User 2: Telegram-primary user
  (
    '00000002-0000-0000-0000-000000000002'::uuid,
    'test02@parkboard.local',
    'Juan dela Cruz',
    '15B',
    NULL,
    '@juandelacruz',
    '+63 917 200 0002',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 3: Phone-only user
  (
    '00000003-0000-0000-0000-000000000003'::uuid,
    'test03@parkboard.local',
    'Elena Rodriguez',
    '20C',
    NULL,
    NULL,
    '+63 917 300 0003',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 4: Multi-contact user
  (
    '00000004-0000-0000-0000-000000000004'::uuid,
    'test04@parkboard.local',
    'Benjamin Alvarez',
    '12D',
    '+63 917 400 0004',
    '@benvarez',
    '+63 917 400 0004',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 5: Short name
  (
    '00000005-0000-0000-0000-000000000005'::uuid,
    'test05@parkboard.local',
    'Ana Cruz',
    '05E',
    '+63 917 500 0005',
    NULL,
    '+63 917 500 0005',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 6: Long name
  (
    '00000006-0000-0000-0000-000000000006'::uuid,
    'test06@parkboard.local',
    'Maria Christina Garcia-Reyes',
    '08F',
    NULL,
    '@mariacgr',
    '+63 917 600 0006',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 7: Numeric-heavy unit
  (
    '00000007-0000-0000-0000-000000000007'::uuid,
    'test07@parkboard.local',
    'Roberto Gonzales',
    '101',
    '+63 917 700 0007',
    '@robertog',
    '+63 917 700 0007',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 8: Letter-heavy unit
  (
    '00000008-0000-0000-0000-000000000008'::uuid,
    'test08@parkboard.local',
    'Sofia Reyes',
    'PHA',
    NULL,
    '@sofiareyes',
    '+63 917 800 0008',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 9: Hyphenated last name
  (
    '00000009-0000-0000-0000-000000000009'::uuid,
    'test09@parkboard.local',
    'Miguel Santos-Cruz',
    '22G',
    '+63 917 900 0009',
    NULL,
    '+63 917 900 0009',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 10: Common name variation
  (
    '0000000a-0000-0000-0000-00000000000a'::uuid,
    'test10@parkboard.local',
    'Jose Maria Tan',
    '18H',
    '+63 917 100 0010',
    '@jmtan',
    '+63 917 100 0010',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 11: Single-syllable first name
  (
    '0000000b-0000-0000-0000-00000000000b'::uuid,
    'test11@parkboard.local',
    'Roy Mendoza',
    '25J',
    NULL,
    NULL,
    '+63 917 110 0011',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  ),

  -- Test User 12: Nickname-style name
  (
    '0000000c-0000-0000-0000-00000000000c'::uuid,
    'test12@parkboard.local',
    'Kat Santiago',
    '30K',
    '+63 917 120 0012',
    '@katsantiago',
    '+63 917 120 0012',
    true,
    false,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unit_number = EXCLUDED.unit_number,
  contact_viber = EXCLUDED.contact_viber,
  contact_telegram = EXCLUDED.contact_telegram,
  contact_phone = EXCLUDED.contact_phone,
  is_test_account = EXCLUDED.is_test_account,
  test_account_in_use = EXCLUDED.test_account_in_use,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count test users
SELECT COUNT(*) as total_test_users
FROM users
WHERE is_test_account = true;

-- Show all test users with availability
SELECT
  name,
  unit_number,
  email,
  CASE
    WHEN test_account_in_use THEN 'IN USE'
    ELSE 'AVAILABLE'
  END as status,
  COALESCE(contact_viber, contact_telegram, contact_phone) as primary_contact
FROM users
WHERE is_test_account = true
ORDER BY test_account_in_use ASC, name ASC;

-- ============================================================================
-- CLEANUP SCRIPT (run separately to remove test users)
-- ============================================================================
-- DELETE FROM users WHERE is_test_account = true;
