-- =============================================================================
-- FILE 5: useful_queries.sql (Development Helper Queries)
-- =============================================================================

-- Check available slots for a time period
SELECT ps.slot_number, ps.slot_type, ps.status
FROM parking_slots ps
WHERE ps.status = 'available'
AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.slot_id = ps.slot_id 
    AND b.status = 'confirmed'
    AND b.start_time < '2025-01-15 18:00:00'  -- replace with end time
    AND b.end_time > '2025-01-15 08:00:00'    -- replace with start time
);

-- Get user's current bookings
SELECT b.booking_id, ps.slot_number, b.start_time, b.end_time, b.status
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.user_id = 'USER-UUID-HERE'
AND b.status IN ('confirmed')
ORDER BY b.start_time;

-- Admin view: All bookings for today
SELECT 
    up.name, 
    up.unit_number,
    ps.slot_number, 
    b.start_time, 
    b.end_time, 
    b.status
FROM bookings b
JOIN user_profiles up ON b.user_id = up.id
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE DATE(b.start_time) = CURRENT_DATE
ORDER BY b.start_time;

-- Check for booking conflicts (useful for validation)
SELECT 
    b1.booking_id as booking1,
    b2.booking_id as booking2,
    b1.slot_id,
    b1.start_time, b1.end_time,
    b2.start_time, b2.end_time
FROM bookings b1
JOIN bookings b2 ON b1.slot_id = b2.slot_id 
WHERE b1.booking_id != b2.booking_id
AND b1.status = 'confirmed' 
AND b2.status = 'confirmed'
AND b1.start_time < b2.end_time 
AND b1.end_time > b2.start_time;