# Entity Relationship Diagram (ERD) — schema\_v2

This ERD reflects the current schema as defined in `schema_v2.sql`, with RLS temporarily suspended.

---

## Tables

### **user\_profiles**

* `id` (uuid, PK, FK → auth.users.id)
* `name` (text, not null)
* `unit_number` (text, not null)
* `email` (text, not null)
* `phone` (text)
* `vehicle_plate` (text)
* `role` (text, check: 'resident', 'admin'; default 'resident')
* `created_at` (timestamptz, default now)
* `updated_at` (timestamptz, default now)

**Indexes**

* idx\_user\_profiles\_email (email)

---

### **parking\_slots**

* `slot_id` (serial, PK)
* `slot_number` (text, unique, not null)
* `slot_type` (text, check: 'covered', 'uncovered', 'visitor'; default 'uncovered')
* `status` (text, check: 'available', 'maintenance', 'reserved'; default 'available')
* `description` (text)
* `created_at` (timestamptz, default now)
* `updated_at` (timestamptz, default now)

---

### **bookings**

* `booking_id` (serial, PK)
* `user_id` (uuid, FK → auth.users.id, not null)
* `slot_id` (int, FK → parking\_slots.slot\_id, not null)
* `start_time` (timestamptz, not null)
* `end_time` (timestamptz, not null)
* `status` (text, check: 'confirmed', 'cancelled', 'completed', 'no\_show'; default 'confirmed')
* `notes` (text)
* `created_at` (timestamptz, default now)
* `updated_at` (timestamptz, default now)

**Constraints**

* `valid_booking_time`: end\_time > start\_time
* `booking_not_in_past`: start\_time ≥ now - 1 hour (grace period)

**Indexes**

* idx\_bookings\_user\_id (user\_id)
* idx\_bookings\_slot\_id (slot\_id)
* idx\_bookings\_start\_time (start\_time)
* idx\_bookings\_status (status)

---

### **payments** (optional for MVP)

* `payment_id` (serial, PK)
* `booking_id` (int, FK → bookings.booking\_id, not null)
* `amount` (numeric(10,2), not null, check: ≥0)
* `payment_date` (timestamptz, default now)
* `payment_method` (text, check: 'cash', 'gcash', 'bank\_transfer', 'free')
* `reference_number` (text)
* `status` (text, check: 'pending', 'completed', 'failed', 'refunded'; default 'pending')
* `created_at` (timestamptz, default now)

---

## Relationships

* `user_profiles.id` → `auth.users.id` (1:1)
* `bookings.user_id` → `auth.users.id` (many bookings per user)
* `bookings.slot_id` → `parking_slots.slot_id` (many bookings per slot)
* `payments.booking_id` → `bookings.booking_id` (1:1)

---

# Seeder Script: `seed_testing.sql`

```sql
-- =============================================================================
-- FILE: seed_testing.sql
-- Purpose: Populate test data for schema_v2.sql
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- Sample users (20 total: ~10 renters, ~10 owners, with 3 admins among owners)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
    -- Renters
    (gen_random_uuid(), 'Alice Renter', '1A', 'alice.renter@example.com', '09170000001', 'AAA111', 'resident'),
    (gen_random_uuid(), 'Bob Renter', '1B', 'bob.renter@example.com', '09170000002', 'BBB222', 'resident'),
    (gen_random_uuid(), 'Charlie Renter', '1C', 'charlie.renter@example.com', '09170000003', 'CCC333', 'resident'),
    (gen_random_uuid(), 'Dana Renter', '1D', 'dana.renter@example.com', '09170000004', 'DDD444', 'resident'),
    (gen_random_uuid(), 'Eve Renter', '1E', 'eve.renter@example.com', '09170000005', 'EEE555', 'resident'),
    (gen_random_uuid(), 'Frank Renter', '2A', 'frank.renter@example.com', '09170000006', 'FFF666', 'resident'),
    (gen_random_uuid(), 'Grace Renter', '2B', 'grace.renter@example.com', '09170000007', 'GGG777', 'resident'),
    (gen_random_uuid(), 'Hank Renter', '2C', 'hank.renter@example.com', '09170000008', 'HHH888', 'resident'),
    (gen_random_uuid(), 'Ivy Renter', '2D', 'ivy.renter@example.com', '09170000009', 'III999', 'resident'),
    (gen_random_uuid(), 'Jake Renter', '2E', 'jake.renter@example.com', '09170000010', 'JJJ000', 'resident'),

    -- Owners (some admins)
    (gen_random_uuid(), 'Karl Owner', '3A', 'karl.owner@example.com', '09170000011', 'KAR111', 'resident'),
    (gen_random_uuid(), 'Lana Owner', '3B', 'lana.owner@example.com', '09170000012', 'LAN222', 'resident'),
    (gen_random_uuid(), 'Mona Owner', '3C', 'mona.owner@example.com', '09170000013', 'MON333', 'admin'),
    (gen_random_uuid(), 'Ned Owner', '3D', 'ned.owner@example.com', '09170000014', 'NED444', 'resident'),
    (gen_random_uuid(), 'Omar Owner', '3E', 'omar.owner@example.com', '09170000015', 'OMA555', 'admin'),
    (gen_random_uuid(), 'Paula Owner', '4A', 'paula.owner@example.com', '09170000016', 'PAU666', 'resident'),
    (gen_random_uuid(), 'Quinn Owner', '4B', 'quinn.owner@example.com', '09170000017', 'QUI777', 'resident'),
    (gen_random_uuid(), 'Ruth Owner', '4C', 'ruth.owner@example.com', '09170000018', 'RUT888', 'resident'),
    (gen_random_uuid(), 'Sam Owner', '4D', 'sam.owner@example.com', '09170000019', 'SAM999', 'admin'),
    (gen_random_uuid(), 'Tina Owner', '4E', 'tina.owner@example.com', '09170000020', 'TIN000', 'resident');

-- Sample parking slots (15 total)
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
    ('S1', 'covered', 'available', 'Near elevator'),
    ('S2', 'covered', 'available', 'Compact car only'),
    ('S3', 'uncovered', 'available', 'Shaded corner'),
    ('S4', 'uncovered', 'maintenance', 'Temporary repair'),
    ('S5', 'visitor', 'available', 'Visitor slot near lobby'),
    ('S6', 'covered', 'reserved', 'Assigned to Unit 3A'),
    ('S7', 'covered', 'reserved', 'Assigned to Unit 3B'),
    ('S8', 'covered', 'reserved', 'Assigned to Unit 3C'),
    ('S9', 'covered', 'reserved', 'Assigned to Unit 3D'),
    ('S10', 'covered', 'reserved', 'Assigned to Unit 3E'),
    ('S11', 'uncovered', 'available', 'Back row'),
    ('S12', 'uncovered', 'available', 'Near exit'),
    ('S13', 'visitor', 'available', 'Lobby overflow'),
    ('S14', 'visitor', 'available', 'Overflow #2'),
    ('S15', 'covered', 'available', 'Premium slot');

-- Sample bookings (5 examples)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT id, 1, NOW() + interval '1 hour', NOW() + interval '2 hours', 'confirmed', 'Test booking'
FROM user_profiles WHERE email = 'alice.renter@example.com';

INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT id, 2, NOW() + interval '3 hours', NOW() + interval '4 hours', 'confirmed', 'Reserved for Bob'
FROM user_profiles WHERE email = 'bob.renter@example.com';

INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT id, 5, NOW() + interval '5 hours', NOW() + interval '6 hours', 'confirmed', 'Visitor slot booking'
FROM user_profiles WHERE email = 'charlie.renter@example.com';

INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT id, 6, NOW() + interval '7 hours', NOW() + interval '8 hours', 'confirmed', 'Owner assigned slot'
FROM user_profiles WHERE email = 'karl.owner@example.com';

INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT id, 7, NOW() + interval '9 hours', NOW() + interval '10 hours', 'confirmed', 'Admin slot test'
FROM user_profiles WHERE email = 'mona.owner@example.com';

-- Sample payments (linked to bookings)
INSERT INTO payments (booking_id, amount, payment_method, reference_number, status)
SELECT booking_id, 100.00, 'gcash', 'REF12345', 'completed'
FROM bookings WHERE notes = 'Test booking';

INSERT INTO payments (booking_id, amount, payment_method, reference_number, status)
SELECT booking_id, 120.00, 'cash', 'REF67890', 'completed'
FROM bookings WHERE notes = 'Reserved for Bob';
```

---

**Notes:**

* This seed script generates \~20 users (half renters, half owners, with 3 admins).
* 15 parking slots, some reserved, some available.
* Bookings and payments seeded to validate relationships.
* Can be extended with random data generators later if needed.
