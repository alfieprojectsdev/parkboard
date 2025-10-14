-- ============================================================================
-- CREATE SINGLE TEST USER FOR SLOT CREATION
-- ============================================================================
-- Run this in Supabase SQL Editor to create user1@parkboard.test
-- This is a simplified version that doesn't require the API
-- ============================================================================

-- Note: This creates the auth user AND profile in one script
-- We'll use a dummy password hash since we won't actually login with this user

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Generate a consistent UUID for user1 (or use random)
  v_user_id := gen_random_uuid();

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'user1@parkboard.test') THEN
    RAISE NOTICE 'User user1@parkboard.test already exists. Skipping creation.';
    RETURN;
  END IF;

  -- Insert into auth.users (using service role permissions)
  -- Note: You cannot directly insert into auth.users from SQL in Supabase
  -- This will fail with permission denied
  --
  -- Instead, we need to use the Supabase Admin API or create via signup endpoint

  RAISE EXCEPTION 'Cannot create auth users directly via SQL. Please use one of these methods:

METHOD 1: Use the signup API (recommended)
  Run this command in your terminal:

  curl -s -X POST http://localhost:3000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d ''{"email":"user1@parkboard.test","password":"test123456","name":"Test User 1","phone":"+639171234567","unit_number":"10A"}''

METHOD 2: Use npm script (creates 20 users)
  npm run stress:data

METHOD 3: Create manually in Supabase Dashboard
  1. Go to Authentication > Users
  2. Click "Add user"
  3. Email: user1@parkboard.test
  4. Password: test123456
  5. Confirm email: Yes
  6. Then manually insert into user_profiles table
';

END $$;
