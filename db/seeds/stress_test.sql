-- =============================================================================
-- Stress Test Seed Data - LUMIERE CONDO SCALE (realistic large dataset)
-- Based on: 1,655 Viber group members, likely 800-1,200 parking slots
-- Run this after schema_v3_unified.sql for REAL performance testing
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- GENERATE 1,000 PARKING SLOTS (realistic for Lumiere-scale condo)
-- Multi-tower, multi-level parking structure
-- =============================================================================

-- North Tower - Premium covered (P1-P6) - 150 slots per level = 900 total
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'NT-P' || level || '-' || LPAD(slot_num::text, 3, '0'),
  'covered',
  CASE 
    WHEN random() < 0.05 THEN 'maintenance'
    WHEN random() < 0.02 THEN 'reserved'
    ELSE 'available'
  END,
  NULL, -- Will assign owners later
  'North Tower Level P' || level || ' - Premium covered'
FROM generate_series(1, 6) level,
     generate_series(1, 150) slot_num;

-- South Tower - Mixed covered/uncovered (B1-B3) - 100 slots per level = 300 total  
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'ST-B' || level || '-' || LPAD(slot_num::text, 3, '0'),
  CASE WHEN slot_num <= 50 THEN 'covered' ELSE 'uncovered' END,
  CASE 
    WHEN random() < 0.08 THEN 'maintenance'
    ELSE 'available'
  END,
  NULL,
  'South Tower Level B' || level || ' - ' || 
  CASE WHEN slot_num <= 50 THEN 'Covered' ELSE 'Uncovered' END
FROM generate_series(1, 3) level,
     generate_series(1, 100) slot_num;

-- Ground level visitor parking - 20 slots
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'VIS-' || LPAD(generate_series(1, 20)::text, 3, '0'),
  'visitor',
  'available',
  NULL,
  'Ground level visitor parking'
FROM generate_series(1, 20);

-- =============================================================================
-- GENERATE 800 TEST USERS (reflects real condo occupancy)
-- Lumiere context: 1,655 Viber members, but not all have cars
-- Estimate: ~50% car ownership = 800 potential app users
-- =============================================================================

-- Generate residents (750 users) - spread across many units
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
SELECT 
  ('10000000-0000-0000-' || LPAD(tower::text, 4, '0') || '-' || LPAD(generate_series(1, 750)::text, 8, '0'))::uuid,
  'Resident ' || generate_series(1, 750),
  CASE 
    WHEN generate_series(1, 750) % 2 = 0 THEN 'NT-'  -- North Tower
    ELSE 'ST-'  -- South Tower
  END || 
  LPAD((generate_series(1, 750) % 50 + 1)::text, 2, '0') || 
  CASE (generate_series(1, 750) % 4)
    WHEN 0 THEN 'A'
    WHEN 1 THEN 'B' 
    WHEN 2 THEN 'C'
    ELSE 'D'
  END,
  'resident' || generate_series(1, 750) || '@lumiere.ph',
  '0917' || LPAD((1000000 + generate_series(1, 750))::text, 7, '0'),
  CASE 
    WHEN generate_series(1, 750) % 8 = 0 THEN NULL -- 12.5% don't have cars
    ELSE 'LUM-' || LPAD(generate_series(1, 750)::text, 4, '0')
  END,
  'resident'
FROM generate_series(1, 750),
     generate_series(1, 2) tower;

-- Generate admin/management users (5 users)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
SELECT 
  ('20000000-0000-0000-0000-' || LPAD(generate_series(1, 5)::text, 12, '0'))::uuid,
  CASE generate_series(1, 5)
    WHEN 1 THEN 'Property Manager'
    WHEN 2 THEN 'Security Chief'
    WHEN 3 THEN 'HOA President' 
    WHEN 4 THEN 'Maintenance Head'
    ELSE 'Admin Assistant'
  END,
  'MGMT-' || generate_series(1, 5),
  'admin' || generate_series(1, 5) || '@lumiere.ph',
  '0918' || LPAD((3000000 + generate_series(1, 5))::text, 7, '0'),
  'MGMT-' || LPAD(generate_series(1, 5)::text, 3, '0'),
  'admin'
FROM generate_series(1, 5);

-- =============================================================================
-- ASSIGN SLOT OWNERSHIP (70% of premium slots - reflects deeded parking reality)
-- =============================================================================

-- Assign North Tower premium slots (deeded parking common in high-end condos)
-- About 630 out of 900 NT slots get owners (70% ownership rate)
WITH random_assignments AS (
  SELECT 
    ps.slot_id,
    up.id as user_id,
    ROW_NUMBER() OVER (PARTITION BY ps.slot_id ORDER BY random()) as rn
  FROM parking_slots ps
  CROSS JOIN user_profiles up
  WHERE ps.slot_number LIKE 'NT-P%'
    AND ps.status = 'available'
    AND up.role = 'resident'
    AND up.vehicle_plate IS NOT NULL
)
UPDATE parking_slots ps
SET owner_id = ra.user_id
FROM random_assignments ra
WHERE ps.slot_id = ra.slot_id 
  AND ra.rn = 1
  AND ps.slot_id <= (SELECT COUNT(*) * 0.7 FROM parking_slots WHERE slot_number LIKE 'NT-P%');

-- Assign some South Tower covered slots (30% ownership rate)
WITH st_assignments AS (
  SELECT 
    ps.slot_id,
    up.id as user_id,
    ROW_NUMBER() OVER (PARTITION BY ps.slot_id ORDER BY random()) as rn
  FROM parking_slots ps
  CROSS JOIN user_profiles up
  WHERE ps.slot_number LIKE 'ST-B%'
    AND ps.slot_type = 'covered'
    AND ps.status = 'available'
    AND up.role = 'resident'
    AND up.vehicle_plate IS NOT NULL
  LIMIT 45  -- 30% of ~150 covered ST slots
)
UPDATE parking_slots ps
SET owner_id = st.user_id
FROM st_assignments st
WHERE ps.slot_id = st.slot_id AND st.rn = 1;

-- =============================================================================
-- GENERATE REALISTIC BOOKING VOLUME (2,000 bookings)
-- Based on Viber chat frequency - very active booking community
-- =============================================================================

-- Recent bookings (next 14 days) - 400 bookings
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT 
  up.id,
  ps.slot_id,
  NOW() + (random() * INTERVAL '14 days'),
  NOW() + (random() * INTERVAL '14 days') + INTERVAL '3 hours' + (random() * INTERVAL '8 hours'),
  CASE 
    WHEN random() < 0.85 THEN 'confirmed'
    ELSE 'cancelled'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Regular weekly booking'
    WHEN random() < 0.5 THEN 'Visitor coming over'
    WHEN random() < 0.7 THEN 'Weekend plans'
    ELSE 'Stress test booking #' || generate_series(1, 400)
  END
FROM generate_series(1, 400),
LATERAL (
  SELECT id FROM user_profiles WHERE role = 'resident' ORDER BY random() LIMIT 1
) up,
LATERAL (
  SELECT slot_id FROM parking_slots 
  WHERE status = 'available' 
    AND (owner_id = up.id OR owner_id IS NULL)
  ORDER BY random() 
  LIMIT 1
) ps;

-- Historical bookings (past 60 days) - 1,600 bookings
-- Reflects the high activity level seen in Viber group
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT 
  up.id,
  ps.slot_id,
  NOW() - (random() * INTERVAL '60 days'),
  NOW() - (random() * INTERVAL '60 days') + INTERVAL '2 hours' + (random() * INTERVAL '10 hours'),
  CASE 
    WHEN random() < 0.6 THEN 'completed'
    WHEN random() < 0.85 THEN 'cancelled'
    ELSE 'no_show'
  END,
  CASE 
    WHEN random() < 0.2 THEN 'Weekly parking rental'
    WHEN random() < 0.4 THEN 'Visitor parking for guest'
    WHEN random() < 0.6 THEN 'Weekend outing'
    WHEN random() < 0.8 THEN 'Business trip parking'
    ELSE 'Stress test historical #' || generate_series(1, 1600)
  END
FROM generate_series(1, 1600),
LATERAL (
  SELECT id FROM user_profiles WHERE role = 'resident' ORDER BY random() LIMIT 1
) up,
LATERAL (
  SELECT slot_id FROM parking_slots 
  WHERE status = 'available'
    AND (owner_id = up.id OR owner_id IS NULL)
  ORDER BY random() 
  LIMIT 1
) ps;

-- =============================================================================
-- GENERATE PAYMENT RECORDS (reflects ₱3K/month mentioned in Viber context)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
SELECT 
  b.booking_id,
  CASE ps.slot_type
    WHEN 'covered' THEN 
      CASE ps.slot_number
        WHEN LIKE 'NT-P%' THEN 200.00 + (random() * 100) -- Premium North Tower
        ELSE 120.00 + (random() * 50) -- South Tower covered
      END
    WHEN 'uncovered' THEN 75.00 + (random() * 25)
    WHEN 'visitor' THEN 50.00 + (random() * 20) -- Visitor fee
  END,
  CASE 
    WHEN random() < 0.4 THEN 'gcash'  -- Popular in PH
    WHEN random() < 0.6 THEN 'cash'
    WHEN random() < 0.8 THEN 'bank_transfer'
    ELSE 'free'  -- Some visitor slots might be free
  END,
  CASE 
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status = 'cancelled' THEN 'refunded'
    WHEN b.status = 'no_show' THEN 'completed' -- Still charged for no-show
    ELSE 'pending'
  END,
  'LUM-' || EXTRACT(year FROM b.created_at) || '-' || LPAD(b.booking_id::text, 6, '0')
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.status IN ('completed', 'cancelled', 'no_show', 'confirmed');

-- =============================================================================
-- LUMIERE-SCALE PERFORMANCE TEST SUMMARY
-- =============================================================================
/*
This dataset creates REALISTIC LUMIERE CONDO SCALE:
- 1,220 parking slots (900 NT premium + 300 ST mixed + 20 visitor)
- 755 users (750 residents + 5 admins) - reflects ~45% of 1,655 Viber members having cars
- 675 owned slots (70% NT + 30% ST covered) - realistic deeded parking ratio
- 2,000 bookings (400 future + 1,600 historical) - matches Viber activity level
- ~1,800 payment records - realistic transaction volume

PERFORMANCE BENCHMARKS TO TEST:
- SlotGrid rendering 1,220 slots (paginate if needed!)
- User search across 755 profiles
- Booking history with 2,000 records (pagination essential)
- Admin dashboard with real-world data volumes
- Database query performance under load
- Mobile performance with large datasets

VIBER GROUP CONTEXT INSIGHTS APPLIED:
- Heavy booking activity (as seen in chat frequency)
- Mix of owned/shared slots (P6 mentions show ownership variety)
- Premium pricing for covered slots
- High user engagement (1,655 members suggests active community)
- Payment via GCash (popular in Philippines)

This is REAL-WORLD STRESS TESTING for a successful deployment!
*/

-- Verify the massive dataset
SELECT 'LUMIERE SCALE DATASET' as info, 
       'Ready for real-world stress testing' as status;

SELECT 
  'Parking Slots' as category, 
  COUNT(*) as count,
  'Multi-tower, multi-level structure' as notes
FROM parking_slots
UNION ALL
SELECT 'Users', COUNT(*), '~45% of 1,655 Viber members with cars' FROM user_profiles
UNION ALL
SELECT 'Bookings', COUNT(*), 'High-activity booking community' FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*), 'Reflects ₱3K/month rental market' FROM payments;

-- Check realistic ownership distribution
SELECT 
  CASE 
    WHEN slot_number LIKE 'NT-P%' THEN 'North Tower Premium'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'covered' THEN 'South Tower Covered'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'uncovered' THEN 'South Tower Uncovered'
    ELSE 'Visitor'
  END as area,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  ROUND(COUNT(owner_id)::numeric / COUNT(*) * 100, 1) as ownership_percentage
FROM parking_slots 
GROUP BY 
  CASE 
    WHEN slot_number LIKE 'NT-P%' THEN 'North Tower Premium'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'covered' THEN 'South Tower Covered'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'uncovered' THEN 'South Tower Uncovered'
    ELSE 'Visitor'
  END
ORDER BY ownership_percentage DESC;