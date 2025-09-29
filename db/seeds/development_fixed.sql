-- =============================================================================
-- Development Seed Data (Fixed for Clean DB Reset)
-- Run this after schema_v3_unified.sql + complete database reset
-- Creates auth.users first, then profiles, then slots and bookings
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- CREATE AUTH USERS FIRST (with proper password hashing)
-- Note: These are development-only test users with simple passwords
-- =============================================================================

-- Insert test users into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated',
  'authenticated',
  'david@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'eva@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
);

-- Create corresponding identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com"}', 'email', NOW(), NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@example.com"}', 'email', NOW(), NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@example.com"}', 'email', NOW(), NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"david@example.com"}', 'email', NOW(), NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"eva@example.com"}', 'email', NOW(), NOW(), NOW());

-- =============================================================================
-- NOW CREATE USER PROFILES (with proper FK references)
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin');

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to specific users)
('A-001', 'covered', 'available', '11111111-1111-1111-1111-111111111111', 'Near main entrance - Alice owned'),
('A-002', 'covered', 'available', '22222222-2222-2222-2222-222222222222', 'Near elevator - Bob owned'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Shared when fixed'),
('A-004', 'covered', 'available', '44444444-4444-4444-4444-444444444444', 'Corner spot - David owned'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access');

-- =============================================================================
-- SAMPLE BOOKINGS (mix of owned and shared slots)
-- =============================================================================
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
-- Alice booking her own slot
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'confirmed', 'Alice using her owned slot A-001'),

-- Bob booking a shared slot
('22222222-2222-2222-2222-222222222222', 5, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Bob using shared slot B-001'),

-- David booking his own slot tomorrow
('44444444-4444-4444-4444-444444444444', 4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 'David booking his owned A-004 for tomorrow'),

-- Eva booking visitor slot
('55555555-5555-5555-5555-555555555555', 9, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

-- Past booking (completed)
('11111111-1111-1111-1111-111111111111', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'completed', 'Alice past booking'),

-- Cancelled booking
('22222222-2222-2222-2222-222222222222', 7, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', 'cancelled', 'Bob cancelled this booking');

-- =============================================================================
-- SAMPLE PAYMENTS (for testing payment features)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'gcash', 'completed', 'GC2024001'),
(2, 75.00, 'cash', 'completed', 'CASH001'),
(3, 150.00, 'bank_transfer', 'pending', 'BT2024001'),
(4, 0.00, 'free', 'completed', 'FREE001'), -- Visitor slots might be free
(5, 100.00, 'gcash', 'completed', 'GC2024002'),
(6, 75.00, 'cash', 'refunded', 'CASH002'); -- Refunded due to cancellation

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify everything was created
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles
UNION ALL  
SELECT 'Parking Slots', COUNT(*) FROM parking_slots
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments;

-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Show who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;

-- =============================================================================
-- TEST USER CREDENTIALS
-- =============================================================================
/*
You can now log in with these test accounts:

alice@example.com / password123 (resident, owns A-001)
bob@example.com / password123 (resident, owns A-002)  
david@example.com / password123 (resident, owns A-004)
eva@example.com / password123 (resident, no owned slots)
admin@example.com / admin123 (admin user)

Test the slot ownership features:
- Alice should see A-001 as "Your Slot"
- Alice should be able to book A-001 anytime it's available
- Alice should NOT be able to book A-002 (Bob's slot)
- Alice CAN book shared slots (B-001, B-002, etc.)
- Admin should see all slots and be able to assign ownership
*/