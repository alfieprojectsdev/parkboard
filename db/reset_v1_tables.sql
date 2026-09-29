-- DESTRUCTIVE. Drops the v1 marketplace tables (and any v2 tables) so the v2
-- migrations can be applied to an existing database that only ever held test
-- data. The recommended path is a fresh Neon branch instead, which needs none
-- of this (see docs/PRODUCTION_READINESS.md).
--
--   psql "$DATABASE_URL" -f db/reset_v1_tables.sql     (or paste into the Neon SQL editor)
--   npm run db:migrate
--
-- These statements were the top of db/schema_v2.sql until 2026-09-29.

BEGIN;

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_price() CASCADE;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS schema_migrations;

COMMIT;
