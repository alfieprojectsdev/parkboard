-- ============================================================================
-- MIGRATION: Multi-Tenant Communities Support (IDEMPOTENT VERSION)
-- ============================================================================
-- Version: 002
-- Date: 2025-10-13
-- Purpose: Enable /LMR, /SRP, /BGC path-based community routing
-- Dependencies: 001_hybrid_pricing_model.sql must be run first
-- Safe to run multiple times
-- ============================================================================

-- Step 1: Create communities table
CREATE TABLE IF NOT EXISTS communities (
  community_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'Asia/Manila',
  settings JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE communities IS 'Multi-tenant communities (condos) using ParkBoard';
COMMENT ON COLUMN communities.community_code IS 'URL path identifier (LMR, SRP, etc.) - uppercase 2-4 chars';
COMMENT ON COLUMN communities.settings IS 'Branding, rules, contact info stored as JSONB';
COMMENT ON COLUMN communities.status IS 'active = accepting users/slots, inactive = read-only';

-- Step 2: Add community_code to existing tables (idempotent)
DO $$
BEGIN
  -- Add column to user_profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'community_code'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN community_code TEXT;
  END IF;

  -- Add column to parking_slots if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parking_slots' AND column_name = 'community_code'
  ) THEN
    ALTER TABLE parking_slots ADD COLUMN community_code TEXT;
  END IF;
END $$;

-- Step 3: Insert LMR community (idempotent with ON CONFLICT)
INSERT INTO communities (community_code, name, display_name, address, city, settings) VALUES (
  'LMR',
  'Lumiere',
  'Lumiere Residences',
  'Pasig Blvd, Pasig City',
  'Metro Manila',
  '{
    "branding": {
      "primaryColor": "#1a56db",
      "tagline": "Park smarter at Lumiere",
      "origin": "organic"
    },
    "features": {
      "requestQuote": true,
      "instantBooking": true,
      "guestParking": false
    },
    "rules": {
      "maxBookingDays": 30,
      "cancellationHours": 24,
      "requireApproval": false
    },
    "contact": {
      "buildingManagement": "",
      "email": ""
    }
  }'::jsonb
) ON CONFLICT (community_code) DO NOTHING;

-- Step 4: Backfill existing data to LMR (idempotent)
UPDATE user_profiles
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

UPDATE parking_slots
  SET community_code = 'LMR'
  WHERE community_code IS NULL;

-- Step 5: Make community_code NOT NULL after backfill (idempotent)
DO $$
BEGIN
  -- Set NOT NULL on user_profiles.community_code if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
      AND column_name = 'community_code'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN community_code SET NOT NULL;
  END IF;

  -- Set NOT NULL on parking_slots.community_code if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parking_slots'
      AND column_name = 'community_code'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE parking_slots ALTER COLUMN community_code SET NOT NULL;
  END IF;
END $$;

-- Step 6: Add foreign keys for referential integrity (idempotent)
DO $$
BEGIN
  -- Add FK on user_profiles if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_community'
      AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT fk_user_community
      FOREIGN KEY (community_code)
      REFERENCES communities(community_code)
      ON DELETE RESTRICT;
  END IF;

  -- Add FK on parking_slots if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_slot_community'
      AND table_name = 'parking_slots'
  ) THEN
    ALTER TABLE parking_slots
      ADD CONSTRAINT fk_slot_community
      FOREIGN KEY (community_code)
      REFERENCES communities(community_code)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 7: Add indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_user_community ON user_profiles(community_code);
CREATE INDEX IF NOT EXISTS idx_slot_community ON parking_slots(community_code);
CREATE INDEX IF NOT EXISTS idx_community_status ON communities(status) WHERE status = 'active';

-- Step 8: Add trigger for updated_at on communities (idempotent)
DROP TRIGGER IF EXISTS communities_updated_at ON communities;
CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Step 9: Create RLS policy for communities table (idempotent)
-- Enable RLS if not already enabled
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "public_read_active_communities" ON communities;

-- Create policy
CREATE POLICY "public_read_active_communities" ON communities
  FOR SELECT
  USING (status = 'active');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check LMR community exists
SELECT
  community_code,
  name,
  display_name,
  status,
  created_at
FROM communities
WHERE community_code = 'LMR';

-- Check all users assigned to LMR
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN community_code = 'LMR' THEN 1 END) as lmr_users,
  COUNT(CASE WHEN community_code IS NULL THEN 1 END) as unassigned_users
FROM user_profiles;

-- Check all slots assigned to LMR
SELECT
  COUNT(*) as total_slots,
  COUNT(CASE WHEN community_code = 'LMR' THEN 1 END) as lmr_slots,
  COUNT(CASE WHEN community_code IS NULL THEN 1 END) as unassigned_slots
FROM parking_slots;

-- Verify foreign keys exist
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table
FROM pg_constraint
WHERE conname LIKE 'fk_%community'
ORDER BY conname;

-- Verify indexes exist
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%community%'
ORDER BY tablename, indexname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
