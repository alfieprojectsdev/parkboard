-- =============================================================================
-- FILE 3: seed_data.sql (Test Data for Development)
-- Run this after RLS policies
-- =============================================================================

-- =============================================================================
-- Parking Slots Seed Data
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, description) VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking'),
('A1', 'covered', 'available', 'Near elevator'),
('B2', 'uncovered', 'available', 'Close to entrance');

-- =============================================================================
-- Sample User Profiles (Insert via Supabase Auth first, then update here)
-- NOTE: You'll need to create auth.users entries first via Supabase Auth UI
-- Then run these INSERTs with the actual UUIDs
-- =============================================================================
-- Example structure (replace with actual UUIDs after auth signup):
/*
INSERT INTO user_profiles (id, name, unit_number, email, role) VALUES
('UUID-FROM-AUTH-SIGNUP-1', 'Alice Santos', 'A-101', 'alice@example.com', 'resident'),
('UUID-FROM-AUTH-SIGNUP-2', 'Bob Reyes', 'B-202', 'bob@example.com', 'resident'),  
('UUID-FROM-AUTH-SIGNUP-3', 'Admin User', 'MGMT', 'admin@example.com', 'admin');
*/

-- Seed: Add test users and slots

-- Insert users (replace UUIDs with real ones from Supabase dashboard)
INSERT INTO user_profiles (id, name, unit_number, email, role, vehicle_plate)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Resident', '101', 'alice@example.com', 'resident', 'ABC123'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Admin', '102', 'bob@example.com', 'admin', 'XYZ789');