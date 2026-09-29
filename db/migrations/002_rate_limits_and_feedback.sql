-- Rate limits and feedback. Safe to re-run.

-- Per-key fixed-window counters (login per email and per IP, signup,
-- contact reveals, feedback). Kept in Postgres because serverless instances
-- share no memory; the old in-memory limiter reset on every cold start.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- "Feedback" button submissions.
--   SELECT created_at, kind, message, contact, page FROM feedback ORDER BY created_at DESC;
CREATE TABLE IF NOT EXISTS feedback (
  id         BIGSERIAL PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('problem', 'idea', 'other')),
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  contact    TEXT CHECK (contact IS NULL OR char_length(contact) <= 200),
  page       TEXT CHECK (page IS NULL OR char_length(page) <= 300),
  user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 300),
  user_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
