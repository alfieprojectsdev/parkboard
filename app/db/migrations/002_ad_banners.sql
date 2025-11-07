-- Migration: 002_ad_banners.sql
-- Purpose: Create advertising banners system for community businesses
-- Idempotent: YES (safe to run multiple times)
-- Platform: Standard PostgreSQL (works on local, Neon, Supabase)
-- Rollback: See app/db/migrations/rollback/002_ad_banners_rollback.sql
-- Date: 2025-10-30
-- Phase: 2.5 - Advertising Banners (Minimal MVP Redesign)

-- ==============================================================================
-- BUSINESS CONTEXT
-- ==============================================================================
-- Sister (Elena) requested: "Can we get advertising banners first while in
-- development stage?"
--
-- Purpose:
--   - Revenue: ₱1,500-3,750/month to cover platform costs
--   - Community-first: FREE ads for LMR resident businesses during beta (3 months)
--   - Support LMR entrepreneurs with exposure
--   - Non-intrusive monetization (simpler than payment integration)
--
-- Beta Policy:
--   - LMR resident businesses: FREE for 3 months
--   - Must provide: business_owner_unit (unit number verification)
--   - After beta: Paid advertising model
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- AD_BANNERS TABLE
-- ==============================================================================
-- Stores advertising banner information and analytics

CREATE TABLE IF NOT EXISTS ad_banners (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business Information
  business_name TEXT NOT NULL,
  business_owner_unit TEXT NOT NULL,  -- Unit number of business owner (for verification)
  business_contact TEXT,               -- Phone/email for inquiries

  -- Banner Content
  banner_image_url TEXT NOT NULL,     -- URL to banner image (hosted externally or uploaded)
  banner_alt_text TEXT,               -- Accessibility: alt text for image
  target_url TEXT,                     -- Optional: where banner links to (website, Facebook, etc.)

  -- Placement & Display
  placement TEXT NOT NULL DEFAULT 'header'
    CHECK (placement IN ('header', 'sidebar', 'footer', 'inline')),
  display_priority INTEGER DEFAULT 0,  -- Higher = shown first (for multiple banners)

  -- Status & Scheduling
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,               -- NULL = no expiration

  -- Analytics
  impressions INTEGER DEFAULT 0,      -- How many times banner was shown
  clicks INTEGER DEFAULT 0,           -- How many times banner was clicked

  -- Beta Program
  is_beta_free BOOLEAN DEFAULT true,  -- TRUE = free beta ad (LMR resident)

  -- Metadata
  notes TEXT,                         -- Admin notes, approval status, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_priority CHECK (display_priority >= 0)
);

-- Comments for clarity
COMMENT ON TABLE ad_banners IS 'Advertising banners for community businesses - FREE for LMR residents during beta';
COMMENT ON COLUMN ad_banners.business_owner_unit IS 'Unit number of business owner - verifies LMR residency';
COMMENT ON COLUMN ad_banners.placement IS 'Where banner appears: header, sidebar, footer, or inline';
COMMENT ON COLUMN ad_banners.display_priority IS 'Higher priority banners shown first (0 = lowest)';
COMMENT ON COLUMN ad_banners.impressions IS 'Count of times banner was displayed to users';
COMMENT ON COLUMN ad_banners.clicks IS 'Count of times banner was clicked';
COMMENT ON COLUMN ad_banners.is_beta_free IS 'TRUE = free beta program (3 months), FALSE = paid ad (post-beta)';

-- ==============================================================================
-- INDEXES
-- ==============================================================================

-- Active banners by placement (most common query)
-- Note: Can't use NOW() in index predicate (not immutable), so filter in query instead
CREATE INDEX IF NOT EXISTS idx_banners_active_placement
  ON ad_banners(active, placement, display_priority DESC, end_date);

COMMENT ON INDEX idx_banners_active_placement IS 'Optimizes fetching active banners for specific placement - filter end_date in query';

-- Business owner lookup (for verification/management)
CREATE INDEX IF NOT EXISTS idx_banners_owner_unit
  ON ad_banners(business_owner_unit);

COMMENT ON INDEX idx_banners_owner_unit IS 'Allows business owners to manage their ads';

-- Analytics queries (impressions/clicks by date range)
CREATE INDEX IF NOT EXISTS idx_banners_analytics
  ON ad_banners(created_at, impressions, clicks);

COMMENT ON INDEX idx_banners_analytics IS 'Optimizes analytics queries (most viewed, best CTR)';

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Auto-update updated_at timestamp (reuse existing function from 001)
DROP TRIGGER IF EXISTS trigger_banners_updated_at ON ad_banners;
CREATE TRIGGER trigger_banners_updated_at
  BEFORE UPDATE ON ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TRIGGER trigger_banners_updated_at ON ad_banners IS 'Auto-updates updated_at on banner modifications';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Future: Add admin role for banner management
-- For now: Open read access (public marketplace), restricted writes

ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active banners (public marketplace)
DROP POLICY IF EXISTS "public_view_active_banners" ON ad_banners;
CREATE POLICY "public_view_active_banners" ON ad_banners
  FOR SELECT
  USING (
    active = true
    AND (end_date IS NULL OR end_date > NOW())
  );

COMMENT ON POLICY "public_view_active_banners" ON ad_banners IS
  'Public can view active, non-expired banners';

-- TODO: Add admin policy for banner management
-- This requires adding 'role' column to user_profiles (future enhancement)
-- CREATE POLICY "admins_manage_banners" ON ad_banners FOR ALL USING (is_admin());

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to get active banner for specific placement
CREATE OR REPLACE FUNCTION get_active_banner(p_placement TEXT)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  banner_image_url TEXT,
  banner_alt_text TEXT,
  target_url TEXT,
  impressions INTEGER,
  clicks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.business_name,
    b.banner_image_url,
    b.banner_alt_text,
    b.target_url,
    b.impressions,
    b.clicks
  FROM ad_banners b
  WHERE b.active = true
    AND b.placement = p_placement
    AND (b.end_date IS NULL OR b.end_date > NOW())
  ORDER BY b.display_priority DESC, b.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_banner IS
  'Fetches highest-priority active banner for given placement (header/sidebar/footer/inline)';

-- Function to increment impression counter
CREATE OR REPLACE FUNCTION increment_banner_impression(p_banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ad_banners
  SET impressions = impressions + 1
  WHERE id = p_banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_banner_impression IS
  'Increments impression counter when banner is displayed';

-- Function to increment click counter
CREATE OR REPLACE FUNCTION increment_banner_click(p_banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ad_banners
  SET clicks = clicks + 1
  WHERE id = p_banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_banner_click IS
  'Increments click counter when banner is clicked - returns click-through rate (CTR)';

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Run these to verify migration success

-- Check table exists
SELECT tablename, schemaname
FROM pg_tables
WHERE tablename = 'ad_banners';

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'ad_banners'
ORDER BY indexname;

-- Check triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ad_banners';

-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'ad_banners'
ORDER BY policyname;

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%banner%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- ==============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================================================
-- Uncomment to insert sample beta ad

/*
INSERT INTO ad_banners (
  business_name,
  business_owner_unit,
  business_contact,
  banner_image_url,
  banner_alt_text,
  target_url,
  placement,
  display_priority,
  is_beta_free,
  notes
) VALUES (
  'Tita Elena''s Homemade Pastries',
  '10A',
  '09171234567',
  'https://placeholder.com/800x200',
  'Fresh homemade pastries delivered to your door',
  'https://facebook.com/TitaElenasPastries',
  'header',
  10,
  true,
  'Beta program - FREE ad for LMR resident business owner (3 months)'
);
*/

-- ==============================================================================
-- EXPECTED OUTPUT
-- ==============================================================================
--
-- Table: ad_banners (1 table)
-- Indexes: 4 (including primary key)
--   - ad_banners_pkey (PRIMARY KEY)
--   - idx_banners_active_placement
--   - idx_banners_owner_unit
--   - idx_banners_analytics
--
-- Triggers: 1
--   - trigger_banners_updated_at
--
-- RLS Policies: 1
--   - public_view_active_banners (SELECT)
--
-- Functions: 3
--   - get_active_banner(TEXT)
--   - increment_banner_impression(UUID)
--   - increment_banner_click(UUID)
--
-- Sample Query (get header banner):
--   SELECT * FROM get_active_banner('header');
--
-- Sample Analytics Query (CTR):
--   SELECT
--     business_name,
--     impressions,
--     clicks,
--     CASE WHEN impressions > 0
--       THEN ROUND((clicks::NUMERIC / impressions * 100), 2)
--       ELSE 0
--     END as ctr_percentage
--   FROM ad_banners
--   WHERE active = true
--   ORDER BY ctr_percentage DESC;
-- ==============================================================================
