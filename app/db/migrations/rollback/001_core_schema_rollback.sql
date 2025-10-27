-- Rollback: 001_core_schema.sql
-- Purpose: Remove all tables, functions, and policies created by 001_core_schema.sql
-- Idempotent: YES (safe to run even if objects don't exist)
-- Date: 2025-10-27
-- WARNING: This will DELETE ALL DATA in users and parking_slots tables!

BEGIN;

-- ==============================================================================
-- DROP POLICIES (must drop before tables)
-- ==============================================================================

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "slots_select" ON parking_slots;
DROP POLICY IF EXISTS "slots_insert" ON parking_slots;
DROP POLICY IF EXISTS "slots_update" ON parking_slots;
DROP POLICY IF EXISTS "slots_delete" ON parking_slots;

-- ==============================================================================
-- DROP TRIGGERS (must drop before functions)
-- ==============================================================================

DROP TRIGGER IF EXISTS trigger_expire_slots ON parking_slots;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_slots_updated_at ON parking_slots;

-- ==============================================================================
-- DROP FUNCTIONS
-- ==============================================================================

DROP FUNCTION IF EXISTS expire_old_slots() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ==============================================================================
-- DROP TABLES (CASCADE to remove dependencies)
-- ==============================================================================

DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Should return empty results if rollback successful

-- Check tables don't exist
SELECT tablename
FROM pg_tables
WHERE tablename IN ('users', 'parking_slots');

-- Check functions don't exist
SELECT proname
FROM pg_proc
WHERE proname IN ('expire_old_slots', 'update_updated_at');

-- ==============================================================================
-- EXPECTED OUTPUT: Empty results for all queries
-- ==============================================================================
