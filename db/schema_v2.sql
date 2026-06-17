-- ============================================================================
-- ParkBoard v2 — CONTACT BOARD schema (single source of truth)
-- ============================================================================
-- Purpose : Strip-to-core rewrite. A bulletin board for one condo (Lumiere):
--           post a slot -> neighbour browses -> app reveals owner contact ->
--           they coordinate offline. NO bookings, NO pricing, NO multi-tenant.
-- Platform: Neon (standard PostgreSQL). Apply to a FRESH Neon branch/database.
-- Auth    : NextAuth v5 credentials (JWT). Login reads user_profiles via pg.
-- Date    : 2026-06-17
--
-- WHAT THIS REPLACES (deliberately dropped vs the old optimized schema):
--   - bookings table + calculate_booking_price() trigger + EXCLUDE constraint
--   - communities table + community_code columns (single community in v2)
--   - parking_slots.slot_number / slot_type / price_per_hour
--   - NextAuth Account / Session / VerificationToken tables (JWT needs no store)
--   - RLS policies (auth.uid() never worked w/ NextAuth; API enforces ownership)
--
-- HOW TO APPLY (after rotating the leaked Neon password):
--   Fresh branch (recommended): create a new Neon branch, point DATABASE_URL at
--   it, then:  psql "$DATABASE_URL" -f db/schema_v2.sql
--   Existing DB w/ throwaway test data: the DROPs below reset it in place.
--
-- DEPENDENCIES this unblocks (later v2 steps):
--   Step 3 — auth.ts login query: drop  AND community_code = $2  filter.
--   Step 3 — signup: write user_profiles via pg (not Supabase auth.admin).
--   Step 4 — slots pages: query these columns via API routes (not Supabase).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Drop old marketplace cruft (safe: pre-launch, test data only)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
-- NextAuth DB tables — unused under JWT credentials strategy
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_price() CASCADE;

-- Reset the two core tables to the v2 shape (greenfield)
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ----------------------------------------------------------------------------
-- 1. user_profiles  (name kept for login/signup compatibility)
-- ----------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                 -- bcrypt; required for credentials login
  name          TEXT NOT NULL,
  unit_number   TEXT NOT NULL,                 -- e.g. "10A", "15B"

  -- Contact methods surfaced by the "Reveal contact" action.
  -- App enforces at least one is set (phone or viber).
  phone         TEXT,
  contact_viber TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);

COMMENT ON TABLE  user_profiles            IS 'Resident accounts — one per unit. Read by NextAuth credentials login via pg.';
COMMENT ON COLUMN user_profiles.phone      IS 'Phone (SMS/call) — revealed to logged-in neighbours';
COMMENT ON COLUMN user_profiles.contact_viber IS 'Viber number/username — revealed to logged-in neighbours';

-- ----------------------------------------------------------------------------
-- 2. parking_slots  (location-based; no price, no slot_number)
-- ----------------------------------------------------------------------------
CREATE TABLE parking_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Location replaces slot_number
  location_level   TEXT NOT NULL CHECK (location_level IN ('P1','P2','P3','P4','P5','P6')),
  location_tower   TEXT NOT NULL CHECK (location_tower IN ('East Tower','North Tower','West Tower')),
  location_landmark TEXT,                        -- optional: "near elevator"

  -- Availability window
  available_from   TIMESTAMPTZ NOT NULL,
  available_until  TIMESTAMPTZ NOT NULL,

  status           TEXT NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','taken','expired')),
  notes            TEXT,                          -- "compact car only", etc.

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (available_until > available_from)
);

CREATE INDEX idx_slots_status   ON parking_slots(status);
CREATE INDEX idx_slots_dates    ON parking_slots(available_from, available_until);
CREATE INDEX idx_slots_location ON parking_slots(location_level, location_tower);
CREATE INDEX idx_slots_owner    ON parking_slots(owner_id);

COMMENT ON TABLE  parking_slots        IS 'Posted slots, location-identified. Browse -> reveal owner contact -> coordinate offline.';
COMMENT ON COLUMN parking_slots.status IS 'available = open, taken = claimed, expired = past available_until';

-- ----------------------------------------------------------------------------
-- 3. Triggers (kept from MVP)
-- ----------------------------------------------------------------------------
-- updated_at maintenance
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-expire slots past their window (statement-level sweep on writes)
CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS trigger AS $$
BEGIN
  -- Recursion guard: the UPDATE below re-fires this AFTER trigger; skip the
  -- redundant nested pass (CodeRabbit, PR #1).
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;
  UPDATE parking_slots
    SET status = 'expired'  -- updated_at maintained by trigger_slots_updated_at
  WHERE available_until < NOW() AND status = 'available';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_slots
  AFTER INSERT OR UPDATE ON parking_slots
  FOR EACH STATEMENT EXECUTE FUNCTION expire_old_slots();

COMMIT;

-- ============================================================================
-- VERIFY
--   \dt                              -- expect: user_profiles, parking_slots
--   SELECT proname FROM pg_proc      -- expect: update_updated_at, expire_old_slots
--     WHERE proname IN ('update_updated_at','expire_old_slots');
-- ============================================================================
