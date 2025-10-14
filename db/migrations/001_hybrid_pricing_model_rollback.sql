-- ============================================================================
-- ROLLBACK: Hybrid Pricing Model
-- ============================================================================
-- Version: 001
-- Date: 2025-10-13
-- Description: Revert hybrid pricing changes back to explicit-only pricing
--
-- ⚠️ WARNING: This will DELETE all "Request Quote" slots!
-- ⚠️ Only run this if you need to completely remove the hybrid pricing feature
-- ============================================================================

-- ============================================================================
-- STEP 1: Remove Request Quote slots (if any exist)
-- ============================================================================

-- Check how many Request Quote slots exist before deletion
SELECT COUNT(*) as slots_to_delete
FROM parking_slots
WHERE price_per_hour IS NULL;

-- ⚠️ DELETE all slots with no explicit price
-- Uncomment the line below to execute:
-- DELETE FROM parking_slots WHERE price_per_hour IS NULL;

-- Alternative: Set a default price instead of deleting
-- UPDATE parking_slots SET price_per_hour = 50.00 WHERE price_per_hour IS NULL;

-- ============================================================================
-- STEP 2: Restore original constraints
-- ============================================================================

-- Drop the new conditional constraint
ALTER TABLE parking_slots
  DROP CONSTRAINT IF EXISTS parking_slots_price_check;

-- Restore NOT NULL constraint
ALTER TABLE parking_slots
  ALTER COLUMN price_per_hour SET NOT NULL;

-- Restore original CHECK constraint
ALTER TABLE parking_slots
  ADD CONSTRAINT parking_slots_price_per_hour_check
  CHECK (price_per_hour > 0);

-- ============================================================================
-- STEP 3: Restore original trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_price_per_hour DECIMAL(10,2);
  v_duration_hours DECIMAL(10,2);
BEGIN
  -- Get slot hourly rate
  SELECT price_per_hour INTO v_price_per_hour
  FROM parking_slots WHERE slot_id = NEW.slot_id;

  -- Calculate duration in hours (fractional)
  v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

  -- Set total price (override any client-provided value)
  NEW.total_price := v_price_per_hour * v_duration_hours;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_booking_price() IS
  'Auto-calculates total_price from slot rate and duration - SECURITY: prevents client manipulation';

-- ============================================================================
-- STEP 4: Remove helper function
-- ============================================================================

DROP FUNCTION IF EXISTS slot_allows_instant_booking(INT);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify NOT NULL constraint was restored
SELECT
  attname,
  attnotnull
FROM pg_attribute
WHERE attrelid = 'parking_slots'::regclass
  AND attname = 'price_per_hour';

-- Verify CHECK constraint was restored
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parking_slots'::regclass
  AND conname = 'parking_slots_price_per_hour_check';

-- Verify all slots have prices (should return 0)
SELECT COUNT(*) as slots_without_price
FROM parking_slots
WHERE price_per_hour IS NULL;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Expected results:
-- ✅ price_per_hour is NOT NULL again
-- ✅ Original CHECK constraint restored
-- ✅ Original trigger function restored
-- ✅ No slots with NULL prices
-- ✅ Helper function removed

-- Next steps:
-- 1. Revert frontend UI changes
-- 2. Remove "Request Quote" option from create form
-- 3. Remove NULL price tests
-- 4. Update documentation

-- ============================================================================
