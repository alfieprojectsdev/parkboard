-- =============================================================================
-- Development Seed Data (Updated for Schema v3 with Slot Ownership)
-- Run this after schema_v3_unified.sql for development/testing
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to users after they're created)
('A-001', 'covered', 'available', NULL, 'Near main entrance - Premium covered'),
('A-002', 'covered', 'available', NULL, 'Near elevator - Premium covered'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Premium covered'),
('A-004', 'covered', 'available', NULL, 'Corner spot - Premium covered'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),
('B-005', 'uncovered', 'available', NULL, 'Standard spot - Shaded area'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access'),
('V-003', 'visitor', 'available', NULL, 'Visitor parking - Temporary only');

-- =============================================================================
-- TEST USER PROFILES
-- Note: These use fake UUIDs for development testing only
-- In production, users are created through auth signup
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin'),

-- Test user without vehicle
('66666666-6666-6666-6666-666666666666', 'Frank Walker', '301A', 'frank@example.com', '09177777888', NULL, 'resident');

-- =============================================================================
-- ASSIGN SLOT OWNERSHIP (after users are created)
-- =============================================================================
-- Assign some slots to specific users
UPDATE parking_slots SET owner_id = '11111111-1111-1111-1111-111111111111' WHERE slot_number = 'A-001'; -- Alice owns A-001
UPDATE parking_slots SET owner_id = '22222222-2222-2222-2222-222222222222' WHERE slot_number = 'A-002'; -- Bob owns A-002
UPDATE parking_slots SET owner_id = '44444444-4444-4444-4444-444444444444' WHERE slot_number = 'A-004'; -- David owns A-004

-- Leave A-003 unowned (shared), plus all B and V slots remain shared

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
('55555555-5555-5555-5555-555555555555', 10, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

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
-- VERIFICATION QUERIES (uncomment to run)
-- =============================================================================
/*
-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Check user types
SELECT role, COUNT(*) FROM user_profiles GROUP BY role;

-- Check booking statuses
SELECT status, COUNT(*) FROM bookings GROUP BY status;

-- Check who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;
*/