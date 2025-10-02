-- Migration 005: Create donations table
CREATE TABLE IF NOT EXISTS donations (
  donation_id SERIAL PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  message TEXT,
  status TEXT CHECK (status IN ('pending','completed','failed')) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
