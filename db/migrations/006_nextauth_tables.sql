-- ============================================================================
-- MIGRATION 006: NEXTAUTH.JS TABLES (IDEMPOTENT)
-- ============================================================================
-- Purpose: Add NextAuth.js tables for authentication
-- Dependencies: 005_neon_compatible_schema.sql must be run first
--
-- Tables created:
--   - accounts: OAuth provider accounts (links to user_profiles)
--   - sessions: Database sessions (for non-JWT strategy)
--   - verification_tokens: Email verification, password reset
--
-- Columns added to user_profiles:
--   - password_hash: For credentials provider
--   - email_verified: For NextAuth verification
--   - image: For OAuth profile pictures
--
-- IDEMPOTENT: YES - Safe to run multiple times
-- Uses: IF NOT EXISTS, DO $$ ... END $$ blocks
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTEND USER_PROFILES TABLE
-- ============================================================================
-- Add NextAuth-specific columns to existing user_profiles table

DO $$
BEGIN
  -- Add password_hash column for credentials provider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_hash TEXT;
    COMMENT ON COLUMN user_profiles.password_hash IS 'Hashed password for credentials provider (bcrypt)';
  END IF;

  -- Add email_verified column for NextAuth verification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_verified TIMESTAMPTZ;
    COMMENT ON COLUMN user_profiles.email_verified IS 'Timestamp when email was verified (NULL = unverified)';
  END IF;

  -- Add image column for OAuth profile pictures
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'image'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN image TEXT;
    COMMENT ON COLUMN user_profiles.image IS 'Profile picture URL from OAuth provider';
  END IF;
END $$;

-- ============================================================================
-- TABLE: ACCOUNTS (OAuth Provider Accounts)
-- ============================================================================
-- Links OAuth provider accounts to user_profiles
-- One user can have multiple accounts (Google, Facebook, etc.)

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each provider account can only be linked once
  CONSTRAINT accounts_provider_unique UNIQUE (provider, provider_account_id)
);

COMMENT ON TABLE accounts IS 'OAuth provider accounts linked to user_profiles (NextAuth.js)';
COMMENT ON COLUMN accounts.type IS 'Account type: oauth, email, credentials';
COMMENT ON COLUMN accounts.provider IS 'OAuth provider name: google, facebook, etc.';
COMMENT ON COLUMN accounts.provider_account_id IS 'User ID from the OAuth provider';
COMMENT ON COLUMN accounts.expires_at IS 'Token expiration timestamp (Unix epoch seconds)';

-- Indexes for accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider);

-- ============================================================================
-- TABLE: SESSIONS (Database Sessions)
-- ============================================================================
-- Used when NextAuth is configured with database session strategy (not JWT)
-- Optional but included for flexibility

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Database sessions for NextAuth.js (non-JWT strategy)';
COMMENT ON COLUMN sessions.session_token IS 'Unique session identifier stored in cookie';
COMMENT ON COLUMN sessions.expires IS 'Session expiration timestamp';

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

-- ============================================================================
-- TABLE: VERIFICATION_TOKENS
-- ============================================================================
-- Used for email verification, password reset, magic links
-- Tokens are single-use and expire

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite primary key: each identifier can have one active token
  PRIMARY KEY (identifier, token)
);

COMMENT ON TABLE verification_tokens IS 'Email verification and password reset tokens (NextAuth.js)';
COMMENT ON COLUMN verification_tokens.identifier IS 'Email address or user identifier';
COMMENT ON COLUMN verification_tokens.token IS 'Unique verification token (hashed)';
COMMENT ON COLUMN verification_tokens.expires IS 'Token expiration timestamp';

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires);

-- ============================================================================
-- TRIGGERS: AUTO-UPDATE TIMESTAMPS
-- ============================================================================
-- Reuse existing update_updated_at() function from migration 005

DROP TRIGGER IF EXISTS accounts_updated_at ON accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INT;
  column_count INT;
BEGIN
  -- Verify tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('accounts', 'sessions', 'verification_tokens');

  IF table_count != 3 THEN
    RAISE EXCEPTION 'FAILED: Only % of 3 NextAuth tables created', table_count;
  END IF;

  -- Verify new columns on user_profiles
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'user_profiles'
    AND column_name IN ('password_hash', 'email_verified', 'image');

  IF column_count != 3 THEN
    RAISE EXCEPTION 'FAILED: Only % of 3 new columns added to user_profiles', column_count;
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 006 complete - 3 tables created, 3 columns added';
END $$;

-- Display created tables and their columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('accounts', 'sessions', 'verification_tokens')
ORDER BY table_name, ordinal_position;

-- Display indexes created
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('accounts', 'sessions', 'verification_tokens')
ORDER BY tablename, indexname;

-- ============================================================================
-- MIGRATION 006 COMPLETE
-- ============================================================================
