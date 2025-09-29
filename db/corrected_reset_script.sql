-- =============================================================================
-- COMPLETE DATABASE RESET - Run this FIRST (Corrected)
-- =============================================================================

-- Drop application tables (if they exist)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Clear auth tables
DELETE FROM auth.users;
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Reset sequences (if they exist)
DROP SEQUENCE IF EXISTS parking_slots_slot_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bookings_booking_id_seq CASCADE;
DROP SEQUENCE IF EXISTS payments_payment_id_seq CASCADE;

-- Verify clean slate (only check tables that should still exist)
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Check that application tables are gone
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
    THEN 'user_profiles table still exists' 
    ELSE 'user_profiles table successfully dropped' 
  END as status;