-- =============================================================================
-- Migration 006: Create donations table
-- STATUS: ARCHIVED - Feature removed from production
-- Date: 2025-09-29
-- 
-- NOTE: This migration was created but never run in production.
-- The donations feature has been archived for future consideration.
-- Do NOT run this migration unless reinstating the feature.
-- =============================================================================

/*
-- COMMENTED OUT - DO NOT RUN
-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  donation_id SERIAL PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'PHP',
  message TEXT,
  donation_type TEXT DEFAULT 'general' CHECK (donation_type IN ('general', 'maintenance', 'community', 'emergency')),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user lookups
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Users can view their own donations
CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own donations
CREATE POLICY "Users can create own donations"
  ON donations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON donations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Admins can update donation status
CREATE POLICY "Admins can update donation status"
  ON donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Insert sample data
INSERT INTO donations (user_id, amount, currency, message, donation_type, status)
SELECT
  id,
  (ARRAY[50.00, 100.00, 250.00, 500.00])[floor(random() * 4 + 1)],
  'PHP',
  (ARRAY['For building maintenance', 'Community fund', 'Thank you!', 'Happy to contribute'])[floor(random() * 4 + 1)],
  (ARRAY['general', 'maintenance', 'community'])[floor(random() * 3 + 1)],
  'completed'
FROM user_profiles
WHERE role = 'resident'
LIMIT 5;

*/