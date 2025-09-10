-- =============================================================================
-- FILE: wipe_and_seed_testing.sql (Testing-friendly)
-- Stage 1 seed for Supabase local/dev testing
-- FK to auth.users temporarily removed to allow arbitrary UUIDs
-- =============================================================================

-- -----------------------------
-- DROP TABLES
-- -----------------------------
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- -----------------------------
-- USER PROFILES
-- -----------------------------
CREATE TABLE user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- FK to auth.users temporarily removed (local/dev testing only; DO NOT use in production)
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample test users
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Resident', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Resident', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'HOA', 'carol@example.com', '09170001122', 'ADMIN-01', 'admin');

-- -----------------------------
-- PARKING SLOTS
-- -----------------------------
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample slots
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('V-001', 'visitor', 'available', 'Visitor parking');

-- -----------------------------
-- BOOKINGS
-- -----------------------------
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL, -- FK temporarily removed
    slot_id INT NOT NULL REFERENCES parking_slots (slot_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT booking_not_in_past CHECK (start_time >= NOW() - INTERVAL '1 hour')
);

-- Sample bookings (user_id matches our test users)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hour', 'confirmed', 'First test booking'),
('22222222-2222-2222-2222-222222222222', 2, NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', 'confirmed', 'Second test booking');

-- -----------------------------
-- PAYMENTS
-- -----------------------------
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings (booking_id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT CHECK (payment_method IN ('cash','gcash','bank_transfer','free')),
    reference_number TEXT,
    status TEXT CHECK (status IN ('pending','completed','failed','refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample payments
INSERT INTO payments (booking_id, amount, payment_method, status)
VALUES
(1, 100.00, 'cash', 'completed'),
(2, 150.00, 'gcash', 'pending');
