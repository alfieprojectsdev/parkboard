-- Rollback Migration: 002_ad_banners_rollback.sql
-- Purpose: Rollback advertising banners system
-- Date: 2025-10-30
-- WARNING: This will DELETE all banner data!

BEGIN;

-- Drop helper functions
DROP FUNCTION IF EXISTS increment_banner_click(UUID);
DROP FUNCTION IF EXISTS increment_banner_impression(UUID);
DROP FUNCTION IF EXISTS get_active_banner(TEXT);

-- Drop table (CASCADE removes indexes, triggers, policies)
DROP TABLE IF EXISTS ad_banners CASCADE;

COMMIT;

-- Verification: Confirm table is gone
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_name = 'ad_banners'
  AND table_schema = 'public';
-- Expected: 0
