-- ============================================================================
-- MIGRATION 005: TEST USER ACCOUNT TRACKING (IDEMPOTENT)
-- ============================================================================
-- Purpose: Add test account tracking for beta testing volunteer residents
-- Safe to run multiple times
-- Date: 2025-11-19
-- Phase: 1.5 - Beta Testing Infrastructure
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: ADD TEST ACCOUNT COLUMNS TO USERS TABLE
-- ============================================================================

-- Add is_test_account flag (default FALSE for production users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Add usage tracking for test accounts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS test_account_in_use BOOLEAN DEFAULT FALSE;

-- Add metadata for test account usage
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS test_account_taken_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS test_account_released_at TIMESTAMPTZ;

-- Add placeholder for Phase 4 (optional, can be NULL until Phase 4)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS community_code VARCHAR(20);

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR TEST ACCOUNT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_test_account
  ON users(is_test_account) WHERE is_test_account = true;

CREATE INDEX IF NOT EXISTS idx_users_test_available
  ON users(is_test_account, test_account_in_use)
  WHERE is_test_account = true;

-- Phase 4 preparation (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_users_community_code
  ON users(community_code) WHERE community_code IS NOT NULL;

-- ============================================================================
-- STEP 3: ADD COMMENTS FOR CLARITY
-- ============================================================================

COMMENT ON COLUMN users.is_test_account IS
  'TRUE for test accounts used by beta testers, FALSE for real user accounts';

COMMENT ON COLUMN users.test_account_in_use IS
  'TRUE when test account is currently assigned to a volunteer tester';

COMMENT ON COLUMN users.test_account_taken_at IS
  'Timestamp when test account was last marked as in-use';

COMMENT ON COLUMN users.test_account_released_at IS
  'Timestamp when test account was last released (made available again)';

COMMENT ON COLUMN users.community_code IS
  'Phase 4: Community code for multi-tenant isolation (e.g., "LMR", "SRP")';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'is_test_account',
    'test_account_in_use',
    'test_account_taken_at',
    'test_account_released_at',
    'community_code'
  )
ORDER BY column_name;

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%test%'
ORDER BY indexname;

-- ============================================================================
-- MIGRATION 005 COMPLETE
-- ============================================================================
