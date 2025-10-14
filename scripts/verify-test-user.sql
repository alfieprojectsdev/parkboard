-- ============================================================================
-- VERIFY TEST USER EXISTS
-- ============================================================================
-- Run this to check if user1@parkboard.test exists
-- ============================================================================

-- Check auth.users table
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'user1@parkboard.test';

-- Check user_profiles table
SELECT
  id,
  email,
  name,
  phone,
  unit_number,
  community_code,
  created_at
FROM user_profiles
WHERE email = 'user1@parkboard.test';

-- Count all users
SELECT
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM user_profiles) as profiles_count;
