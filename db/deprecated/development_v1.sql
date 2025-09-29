-- =============================================================================
-- Development Seed Data
-- Extracted from wipe_and_seed_testing.sql
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- Test user profiles (using fake UUIDs for development)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Resident', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Resident', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'HOA', 'carol@example.com', '09170001122', 'ADMIN-01', 'admin');

-- Sample parking slots
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Sample bookings (future dates)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Test booking for Alice'),
('22222222-2222-2222-2222-222222222222', 2, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '6 hours', 'confirmed', 'Test booking for Bob');

-- Sample payments
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'cash', 'completed', 'CASH001'),
(2, 150.00, 'gcash', 'pending', 'GC002');
