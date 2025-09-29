-- =============================================================================
-- COMPLETE DATABASE RESET SCRIPT
-- Run this in Supabase SQL Editor to wipe everything clean
-- WARNING: This will delete ALL users and data - use only in development!
-- =============================================================================

-- Step 1: Drop all your application tables first (to avoid FK constraint issues)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 2: Drop all RLS policies (they reference tables that will be recreated)
-- Note: If tables are dropped, policies are automatically dropped too, but being explicit

-- Step 3: Clear auth.users (THIS IS THE KEY PART)
-- This will delete all authenticated users
DELETE FROM auth.users;

-- Step 4: Clear any auth-related tables that might have references
-- These are Supabase internal tables - clear them too
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Step 5: Reset sequences (so IDs start from 1 again)
-- Note: These will be recreated when you run the new schema
-- but if you want to be thorough:
DROP SEQUENCE IF EXISTS parking_slots_slot_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bookings_booking_id_seq CASCADE;
DROP SEQUENCE IF EXISTS payments_payment_id_seq CASCADE;

-- Step 6: Verify everything is clean
-- These should return 0 rows:
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as identities_count FROM auth.identities;

-- =============================================================================
-- Now you can run schema_v3_unified.sql with a completely clean slate!
-- =============================================================================