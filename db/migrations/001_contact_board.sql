-- ParkBoard v2: contact board schema.
-- From db/schema_v2.sql (2026-06-17) minus its DROP statements, which now
-- live in db/reset_v1_tables.sql. Safe to re-run.
--
-- One condo (Lumiere Residences). A resident posts a slot; logged-in
-- neighbours browse and reveal the owner's phone/Viber; they arrange the
-- rest offline. No bookings, prices, payments or multi-tenancy.

CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,              -- stored lowercased by the app
  password_hash TEXT NOT NULL,                     -- bcrypt
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  unit_number   TEXT NOT NULL CHECK (char_length(unit_number) BETWEEN 1 AND 20),
  phone         TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  contact_viber TEXT CHECK (contact_viber IS NULL OR char_length(contact_viber) <= 60),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The whole point of an account is a way for neighbours to reach you.
  CONSTRAINT phone_or_viber CHECK (phone IS NOT NULL OR contact_viber IS NOT NULL)
);

-- Belt and braces for case: the app lowercases, this refuses Foo@x vs foo@x.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON user_profiles (LOWER(email));

COMMENT ON TABLE user_profiles IS 'Resident accounts. Read by NextAuth credentials login via pg.';
COMMENT ON COLUMN user_profiles.phone IS 'Revealed only by GET /api/slots/:id/contact to logged-in residents';
COMMENT ON COLUMN user_profiles.contact_viber IS 'Revealed only by GET /api/slots/:id/contact to logged-in residents';

CREATE TABLE IF NOT EXISTS parking_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_level    TEXT NOT NULL CHECK (location_level IN ('P1','P2','P3','P4','P5','P6')),
  location_tower    TEXT NOT NULL CHECK (location_tower IN ('East Tower','North Tower','West Tower')),
  location_landmark TEXT CHECK (location_landmark IS NULL OR char_length(location_landmark) <= 100),
  available_from    TIMESTAMPTZ NOT NULL,
  available_until   TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','taken','expired')),
  notes             TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (available_until > available_from)
);

CREATE INDEX IF NOT EXISTS idx_slots_status   ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_dates    ON parking_slots(available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_slots_owner    ON parking_slots(owner_id);

COMMENT ON COLUMN parking_slots.status IS 'available = open, taken = owner marked it taken, expired = removed by owner or past available_until';

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_slots_updated_at ON parking_slots;
CREATE TRIGGER trigger_slots_updated_at
  BEFORE UPDATE ON parking_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mark slots past their window as expired on every write. Reads also filter
-- on available_until, so a quiet board never shows stale slots either.
CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;
  UPDATE parking_slots SET status = 'expired'
  WHERE available_until < NOW() AND status = 'available';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expire_slots ON parking_slots;
CREATE TRIGGER trigger_expire_slots
  AFTER INSERT OR UPDATE ON parking_slots
  FOR EACH STATEMENT EXECUTE FUNCTION expire_old_slots();
