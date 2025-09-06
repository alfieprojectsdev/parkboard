-- schema_v1.sql
-- ParkBoard MVP Database Schema (Hotel Booking Pattern)
-- Version 1 - Frozen for 30 days

-- Drop tables in reverse dependency order (for re-runs in dev)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- ==============================
-- USERS TABLE
-- ==============================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident'
);

-- ==============================
-- PARKING SLOTS TABLE
-- ==============================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('covered', 'uncovered')) NOT NULL,
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available'
);

-- ==============================
-- BOOKINGS TABLE
-- ==============================
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed'
);

-- ==============================
-- PAYMENTS TABLE (optional for MVP)
-- ==============================
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method TEXT CHECK (method IN ('cash', 'gcash', 'bank_transfer'))
);

-- ==============================
-- ADMINS TABLE (optional if not using role column in USERS)
-- ==============================
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    permissions TEXT
);

-- ==============================
-- SAMPLE DATA FOR DEV TESTING
-- ==============================

-- Users
INSERT INTO users (name, unit_number, email, phone, vehicle_plate, role)
VALUES
('Alice Santos', 'A-101', 'alice@example.com', '09170001111', 'ABC-1234', 'resident'),
('Bob Reyes', 'B-202', 'bob@example.com', '09170002222', 'XYZ-5678', 'resident'),
('Carlos Admin', 'C-303', 'admin@example.com', '09170003333', NULL, 'admin');

-- Parking Slots
INSERT INTO parking_slots (slot_number, type, status)
VALUES
('P1', 'covered', 'available'),
('P2', 'covered', 'available'),
('P3', 'uncovered', 'maintenance');

-- Bookings
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status)
VALUES
(1, 1, '2025-08-14 08:00:00', '2025-08-14 18:00:00', 'confirmed');

-- Payments (optional example)
INSERT INTO payments (booking_id, amount, method)
VALUES
(1, 200.00, 'gcash');

-- Admins (optional example)
INSERT INTO admins (user_id, permissions)
VALUES
(3, 'full_access');