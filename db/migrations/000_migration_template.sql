-- =============================================================================
-- Migration: [DESCRIPTION]
-- Date: 2025-09-25
-- Author: Alfie Pelicano
-- =============================================================================

-- Add your migration SQL here
-- Example:
-- ALTER TABLE bookings ADD COLUMN new_field TEXT;
-- CREATE INDEX idx_bookings_new_field ON bookings(new_field);

-- Remember to:
-- 1. Test on development database first
-- 2. Add corresponding rollback instructions in comments
-- 3. Update any affected RLS policies
-- 4. Document breaking changes

-- Rollback instructions (commented):
-- DROP INDEX IF EXISTS idx_bookings_new_field;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS new_field;
